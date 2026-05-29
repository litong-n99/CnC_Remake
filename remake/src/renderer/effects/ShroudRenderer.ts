/**
 * ShroudRenderer — Task 9.7
 * OpenRA 对标: `OpenRA.Game/Graphics/ShroudRenderer.cs`
 *
 * 战争迷雾边缘贴图渲染系统。
 * 使用 bitfield 描述 8 邻居可见性状态，索引到 sprite 序列的对应帧，
 * 实现平滑的 Shroud / Fog 边缘过渡。
 *
 * Dummy 阶段：边缘效果通过 ImageData alpha 渐变模拟，保持框架可运行。
 */

import { FogOfWar, CellVisibility } from './FogOfWar';

/** 8 方向边缘 bitfield（与 OpenRA ShroudEdges 对齐）。 */
export enum ShroudEdges {
  None = 0,
  TopLeft = 1 << 0,
  Top = 1 << 1,
  TopRight = 1 << 2,
  Left = 1 << 3,
  Right = 1 << 4,
  BottomLeft = 1 << 5,
  Bottom = 1 << 6,
  BottomRight = 1 << 7,
}

/** 8 邻居查询结果的顺序：[TL, T, TR, L, R, BL, B, BR]。 */
export type NeighborsVisibility = [
  CellVisibility, // TopLeft
  CellVisibility, // Top
  CellVisibility, // TopRight
  CellVisibility, // Left
  CellVisibility, // Right
  CellVisibility, // BottomLeft
  CellVisibility, // Bottom
  CellVisibility, // BottomRight
];

/**
 * 查询指定格子的 8 邻居可见性状态。
 * @returns 长度为 8 的数组，顺序为 [TL, T, TR, L, R, BL, B, BR]。
 */
export function getNeighborsVisibility(fog: FogOfWar, x: number, y: number): NeighborsVisibility {
  return [
    fog.getVisibility(x - 1, y - 1), // TL
    fog.getVisibility(x, y - 1), // T
    fog.getVisibility(x + 1, y - 1), // TR
    fog.getVisibility(x - 1, y), // L
    fog.getVisibility(x + 1, y), // R
    fog.getVisibility(x - 1, y + 1), // BL
    fog.getVisibility(x, y + 1), // B
    fog.getVisibility(x + 1, y + 1), // BR
  ];
}

/**
 * 根据 8 邻居可见性计算边缘 bitfield。
 * 规则：当前格子为 Shroud/Fog 时，若某方向邻居为 Visible，则该方向有边缘。
 * 当前格子为 Visible 时，无边缘。
 */
export function getEdges(neighbors: NeighborsVisibility, self: CellVisibility): number {
  if (self === CellVisibility.Visible) return ShroudEdges.None;

  let edges = ShroudEdges.None;
  const visible = (v: CellVisibility) => v === CellVisibility.Visible;

  if (visible(neighbors[0])) edges |= ShroudEdges.TopLeft;
  if (visible(neighbors[1])) edges |= ShroudEdges.Top;
  if (visible(neighbors[2])) edges |= ShroudEdges.TopRight;
  if (visible(neighbors[3])) edges |= ShroudEdges.Left;
  if (visible(neighbors[4])) edges |= ShroudEdges.Right;
  if (visible(neighbors[5])) edges |= ShroudEdges.BottomLeft;
  if (visible(neighbors[6])) edges |= ShroudEdges.Bottom;
  if (visible(neighbors[7])) edges |= ShroudEdges.BottomRight;

  return edges;
}

/**
 * 将边缘 bitfield 映射到 sprite frame 索引（OpenRA 风格）。
 * 256 种组合预映射到 48 个常用边缘图案（简化版）。
 */
export function getEdgeSpriteIndex(edges: number): number {
  // 简化的索引映射：根据活跃边数 + 对称模式分组
  const edgeCount =
    (edges & ShroudEdges.TopLeft ? 1 : 0) +
    (edges & ShroudEdges.Top ? 1 : 0) +
    (edges & ShroudEdges.TopRight ? 1 : 0) +
    (edges & ShroudEdges.Left ? 1 : 0) +
    (edges & ShroudEdges.Right ? 1 : 0) +
    (edges & ShroudEdges.BottomLeft ? 1 : 0) +
    (edges & ShroudEdges.Bottom ? 1 : 0) +
    (edges & ShroudEdges.BottomRight ? 1 : 0);

  if (edgeCount === 0) return 0;
  if (edgeCount >= 7) return 47;

  // 根据具体模式返回 1–46 的索引
  // 四边（无角）= 1
  if (edges === (ShroudEdges.Top | ShroudEdges.Right | ShroudEdges.Bottom | ShroudEdges.Left)) return 1;
  // 四角（无边）= 2
  if (edges === (ShroudEdges.TopLeft | ShroudEdges.TopRight | ShroudEdges.BottomLeft | ShroudEdges.BottomRight))
    return 2;
  // 单一边 = 3–10
  if (edges === ShroudEdges.Top) return 3;
  if (edges === ShroudEdges.Right) return 4;
  if (edges === ShroudEdges.Bottom) return 5;
  if (edges === ShroudEdges.Left) return 6;
  // 单一角 = 7–10
  if (edges === ShroudEdges.TopLeft) return 7;
  if (edges === ShroudEdges.TopRight) return 8;
  if (edges === ShroudEdges.BottomRight) return 9;
  if (edges === ShroudEdges.BottomLeft) return 10;

  // 其他组合按边数映射
  return 10 + edgeCount;
}

/**
 * Shroud 渲染器 — 管理边缘贴图的增量更新。
 */
export class ShroudRenderer {
  private readonly fog: FogOfWar;
  private readonly width: number;
  private readonly height: number;
  private dirtyCells = new Set<number>();

  constructor(fog: FogOfWar, width: number, height: number) {
    this.fog = fog;
    this.width = width;
    this.height = height;
  }

  /** 标记指定格子 dirty，并脏化 8 邻居（边缘相互影响）。 */
  updateShroudCell(x: number, y: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.dirtyCells.add(y * this.width + x);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          this.dirtyCells.add(ny * this.width + nx);
        }
      }
    }
  }

  /** 获取指定格子的边缘 bitfield（实时计算）。 */
  getCellEdges(x: number, y: number): number {
    const neighbors = getNeighborsVisibility(this.fog, x, y);
    const self = this.fog.getVisibility(x, y);
    return getEdges(neighbors, self);
  }

  /** 获取所有 dirty 格子的边缘信息（用于渲染更新）。 */
  getDirtyEdgeData(): Array<{ x: number; y: number; edges: number; spriteIndex: number }> {
    const result: Array<{ x: number; y: number; edges: number; spriteIndex: number }> = [];
    for (const idx of this.dirtyCells) {
      const x = idx % this.width;
      const y = Math.floor(idx / this.width);
      const edges = this.getCellEdges(x, y);
      if (edges !== ShroudEdges.None) {
        result.push({ x, y, edges, spriteIndex: getEdgeSpriteIndex(edges) });
      }
    }
    return result;
  }

  /** 清除 dirty 标记。 */
  clearDirty(): void {
    this.dirtyCells.clear();
  }

  /** 全量标记所有格子 dirty（初始化或地图切换时）。 */
  markAllDirty(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.dirtyCells.add(y * this.width + x);
      }
    }
  }

  /**
   * 在 ImageData 上绘制边缘效果（Dummy 阶段：alpha 渐变模拟）。
   * 对 Shroud/Fog 格子的边缘区域降低 alpha，形成平滑过渡。
   */
  applyEdgesToImageData(imageData: ImageData): void {
    const data = imageData.data;
    const w = this.width;
    const h = this.height;

    for (const idx of this.dirtyCells) {
      const x = idx % w;
      const y = Math.floor(idx / w);
      const edges = this.getCellEdges(x, y);
      if (edges === ShroudEdges.None) continue;

      // Canvas Y 轴与地形 Y 轴反向，需要翻转
      const pixelY = h - 1 - y;
      const offset = (pixelY * w + x) * 4;
      const self = this.fog.getVisibility(x, y);

      // Dummy 阶段：根据边缘方向调整 alpha，模拟平滑过渡
      let alphaAdjustment = 0;
      if (edges & (ShroudEdges.Top | ShroudEdges.Bottom | ShroudEdges.Left | ShroudEdges.Right)) {
        alphaAdjustment += 30; // 正交边：更明显的过渡
      }
      if (edges & (ShroudEdges.TopLeft | ShroudEdges.TopRight | ShroudEdges.BottomLeft | ShroudEdges.BottomRight)) {
        alphaAdjustment += 15; // 对角边：轻微过渡
      }

      if (self === CellVisibility.Shroud) {
        data[offset + 3] = Math.max(160, (data[offset + 3] ?? 255) - alphaAdjustment);
      } else if (self === CellVisibility.Fog) {
        data[offset + 3] = Math.max(80, (data[offset + 3] ?? 160) - alphaAdjustment);
      }
    }
  }
}
