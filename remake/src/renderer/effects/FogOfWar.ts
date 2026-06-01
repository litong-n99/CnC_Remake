/**
 * 战争迷雾系统 — Task 31
 *
 * 使用 Babylon.js DynamicTexture 在 TerrainGrid 上方叠加迷雾层。
 * 三个状态：
 *   - Shroud（未探索）：纯黑不透明
 *   - Fog（已探索但无视野）：半透明灰色
 *   - Visible（有视野）：完全透明
 *
 * 单位视野半径固定 10 格（可配置）。
 */

import { Scene, Mesh, MeshBuilder, DynamicTexture, StandardMaterial, Color3, Texture } from '@babylonjs/core';
import { ShroudRenderer } from './ShroudRenderer';
import { RenderLayer, setRenderLayer } from '../RenderLayer';

export enum CellVisibility {
  Shroud = 0, // 未探索 — 黑色
  Fog = 1, // 已探索但当前无视野 — 半透明灰
  Visible = 2, // 当前有视野 — 透明
}

export interface FogOfWarOptions {
  /** 地图宽度（格子数）。 */
  width: number;
  /** 地图高度（格子数）。 */
  height: number;
  /** 单位视野半径（格子数）。 */
  sightRadius?: number;
  /** 迷雾层高度偏移（世界单位）。 */
  heightOffset?: number;
}

/**
 * 战争迷雾管理器。
 *
 * 维护每个格子的可见性状态，并通过 DynamicTexture 渲染到覆盖整个地图的平面上。
 */
export class FogOfWar {
  private width: number;
  private height: number;
  private readonly sightRadius: number;
  private readonly heightOffset: number;

  private visibility: Uint8Array;
  private fogMesh: Mesh | null = null;
  private fogTexture: DynamicTexture | null = null;
  private fogMaterial: StandardMaterial | null = null;

  /** 2D Canvas context for pixel manipulation. */
  private ctx: CanvasRenderingContext2D | null = null;
  private imageData: ImageData | null = null;
  private shroudRenderer: ShroudRenderer | null = null;

  constructor(options: FogOfWarOptions) {
    this.width = options.width;
    this.height = options.height;
    this.sightRadius = options.sightRadius ?? 10;
    this.heightOffset = options.heightOffset ?? 0.15;

    // 初始全部为 Shroud
    this.visibility = new Uint8Array(this.width * this.height);
    this.visibility.fill(CellVisibility.Shroud);
  }

  /** 重新调整尺寸（战役地图加载后 terrain resize 时调用）。 */
  resize(width: number, height: number, scene: Scene): void {
    if (width === this.width && height === this.height) return;

    // 释放旧资源
    this.fogMesh?.dispose();
    this.fogTexture?.dispose();
    this.fogMaterial?.dispose();
    this.fogMesh = null;
    this.fogTexture = null;
    this.fogMaterial = null;
    this.ctx = null;
    this.imageData = null;
    this.shroudRenderer = null;

    this.width = width;
    this.height = height;
    this.visibility = new Uint8Array(this.width * this.height);
    this.visibility.fill(CellVisibility.Shroud);

    this.create(scene);
  }

  /** 获取关联的 ShroudRenderer（Task 9.7）。 */
  getShroudRenderer(): ShroudRenderer | null {
    return this.shroudRenderer;
  }

  /** 在场景中创建迷雾覆盖层。 */
  create(scene: Scene): void {
    // 创建与地图同尺寸的平面（位于地形上方）
    const worldW = this.width;
    const worldH = this.height;
    this.fogMesh = MeshBuilder.CreatePlane('fogOfWar', { width: worldW, height: worldH, updatable: false }, scene);
    this.fogMesh.rotation.x = Math.PI / 2; // 水平放置
    this.fogMesh.position.y = this.heightOffset;
    this.fogMesh.position.x = 0;
    this.fogMesh.position.z = 0;

    // 创建 DynamicTexture（1 像素 = 1 格子）
    this.fogTexture = new DynamicTexture('fogTexture', { width: this.width, height: this.height }, scene, false);
    this.fogTexture.hasAlpha = true;
    this.fogTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
    this.fogTexture.wrapV = Texture.CLAMP_ADDRESSMODE;

    // 获取 canvas context
    const canvas = this.fogTexture.getContext();
    this.ctx = canvas as unknown as CanvasRenderingContext2D;

    // 创建材质
    this.fogMaterial = new StandardMaterial('fogMaterial', scene);
    this.fogMaterial.diffuseTexture = this.fogTexture;
    this.fogMaterial.useAlphaFromDiffuseTexture = true;
    this.fogMaterial.emissiveColor = new Color3(1, 1, 1);
    this.fogMaterial.disableLighting = true;
    this.fogMaterial.backFaceCulling = false;

    this.fogMesh.material = this.fogMaterial;
    setRenderLayer(this.fogMesh, RenderLayer.Transparent);

    // 初始化 ShroudRenderer
    this.shroudRenderer = new ShroudRenderer(this, this.width, this.height);
    this.shroudRenderer.markAllDirty();

    // 初始绘制全黑
    this.fullRedraw();
  }

  /** 根据所有单位位置更新视野。 */
  update(unitPositions: ReadonlyArray<{ x: number; y: number; team?: number }>): void {
    const w = this.width;
    const h = this.height;
    const size = w * h;

    // 第一步：将所有 Visible 降级为 Fog（假设没有单位能看到它）
    for (let i = 0; i < size; i++) {
      if (this.visibility[i] === CellVisibility.Visible) {
        this.visibility[i] = CellVisibility.Fog;
      }
    }

    // 第二步：根据单位位置标记 Visible
    for (const unit of unitPositions) {
      const cx = Math.round(unit.x);
      const cy = Math.round(unit.y);
      this.revealCircle(cx, cy, this.sightRadius);
    }

    // 第三步：标记 changed cells dirty 并更新纹理
    this.shroudRenderer?.markAllDirty();
    this.updateTexture();
  }

  /**
   * 获取指定格子在纹理上的像素颜色（RGBA）。
   * 用于 e2e 测试验证迷雾纹理与地形坐标对齐。
   */
  getPixelColor(x: number, y: number): { r: number; g: number; b: number; a: number } | null {
    if (!this.ctx || x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    const pixelY = this.height - 1 - y;
    const imageData = this.ctx.getImageData(x, pixelY, 1, 1);
    const d = imageData.data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] };
  }

  /** 获取指定格子的可见性状态。 */
  getVisibility(x: number, y: number): CellVisibility {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return CellVisibility.Shroud;
    }
    return this.visibility[y * this.width + x] as CellVisibility;
  }

  /** 手动设置某个区域的可见性（用于测试或地图初始化）。 */
  setVisibility(x: number, y: number, state: CellVisibility): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.visibility[y * this.width + x] = state;
  }

  /** 暴露整个迷雾数据（只读）供外部查询。 */
  getVisibilityArray(): Readonly<Uint8Array> {
    return this.visibility;
  }

  /** 释放资源。 */
  dispose(): void {
    this.fogMesh?.dispose();
    this.fogTexture?.dispose();
    this.fogMaterial?.dispose();
    this.fogMesh = null;
    this.fogTexture = null;
    this.fogMaterial = null;
    this.ctx = null;
    this.imageData = null;
  }

  // ── 内部方法 ──

  /** 圆形视野揭示。 */
  private revealCircle(cx: number, cy: number, radius: number): void {
    const rSq = radius * radius;
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= rSq) {
          this.visibility[y * this.width + x] = CellVisibility.Visible;
        }
      }
    }
  }

  /** 根据 visibility 数组更新 DynamicTexture。 */
  private updateTexture(): void {
    if (!this.ctx) return;

    const w = this.width;
    const h = this.height;

    // 使用 ImageData 批量更新像素（比逐像素 fillRect 快得多）
    if (!this.imageData || this.imageData.width !== w || this.imageData.height !== h) {
      this.imageData = this.ctx.createImageData(w, h);
    }

    const data = this.imageData.data;
    // DynamicTexture 的 Canvas Y 轴（0=顶部）与地形 Y 轴（0=底部，Z=-h/2）反向。
    // 需要将地形坐标 y 翻转为像素坐标 pixelY = h - 1 - y。
    for (let y = 0; y < h; y++) {
      const pixelY = h - 1 - y;
      for (let x = 0; x < w; x++) {
        const state = this.visibility[y * w + x];
        const offset = (pixelY * w + x) * 4;
        switch (state) {
          case CellVisibility.Shroud:
            data[offset] = 0;
            data[offset + 1] = 0;
            data[offset + 2] = 0;
            data[offset + 3] = 255; // 完全不透明黑色
            break;
          case CellVisibility.Fog:
            data[offset] = 20;
            data[offset + 1] = 20;
            data[offset + 2] = 25;
            data[offset + 3] = 160; // 半透明灰蓝
            break;
          case CellVisibility.Visible:
            data[offset] = 0;
            data[offset + 1] = 0;
            data[offset + 2] = 0;
            data[offset + 3] = 0; // 完全透明
            break;
        }
      }
    }

    // Task 9.7: 应用边缘贴图效果
    this.shroudRenderer?.applyEdgesToImageData(this.imageData);

    this.ctx.putImageData(this.imageData, 0, 0);
    this.fogTexture?.update();
    this.shroudRenderer?.clearDirty();
  }

  /** 全量重绘（初始化用）。 */
  private fullRedraw(): void {
    this.updateTexture();
  }
}
// test change 1780017427
