import { BlockedByActor } from '../unit/BlockedByActor';
import type { LandType } from './TerrainGrid';

/**
 * A* 寻路 — 基于格子地图的**八方向**路径搜索，支持动态阻塞（建筑 footprint）。
 *
 * 对应 C++ `Find_Path()`（UNIT.CPP / FOOT.CPP）的简化 TS 实现。
 * C++ 原版定义了 `#define DIAGONAL`，支持八方向移动（含对角线）。
 * 启发函数使用切比雪夫距离，适合八方向网格。
 */

export interface PathNode {
  readonly x: number;
  readonly y: number;
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

interface Neighbor {
  readonly x: number;
  readonly y: number;
  readonly cost: number;
}

export class Pathfinder {
  private readonly width: number;
  private readonly height: number;
  private readonly isPassable: (x: number, y: number) => boolean;
  private readonly getBlockedCells?: (check?: BlockedByActor) => ReadonlySet<string>;

  /**
   * Optional callback to query the terrain type at a cell.
   * Used together with `getTerrainCost` in `findPath` to compute
   * per-locomotor A* edge costs.
   */
  readonly getTerrainType?: (x: number, y: number) => LandType;

  /** 八方向邻居（含对角线），代价：直线=1，对角线=√2。 */
  private static readonly NEIGHBORS: readonly Neighbor[] = [
    { x: 1, y: 0, cost: 1 },
    { x: -1, y: 0, cost: 1 },
    { x: 0, y: 1, cost: 1 },
    { x: 0, y: -1, cost: 1 },
    { x: 1, y: 1, cost: 1.414 },
    { x: 1, y: -1, cost: 1.414 },
    { x: -1, y: 1, cost: 1.414 },
    { x: -1, y: -1, cost: 1.414 },
  ];

  constructor(
    width: number,
    height: number,
    isPassable: (x: number, y: number) => boolean,
    getBlockedCells?: (check?: BlockedByActor) => ReadonlySet<string>,
    getTerrainType?: (x: number, y: number) => LandType
  ) {
    this.width = width;
    this.height = height;
    this.isPassable = isPassable;
    this.getBlockedCells = getBlockedCells;
    this.getTerrainType = getTerrainType;
  }

  /**
   * A* 寻路（八方向）。
   * @param extraBlocked 可选的额外阻塞格子集合（格式 `"x,y"`），用于单位间动态避障。
   * @param getTerrainCost 可选的地形代价回调，返回该格子的速度倍率（0 = 不可通行）。
   *                       当提供时，A* 边代价 = `distance / terrainCost`。
   * @returns 从起点到终点的格子路径（含起点和终点），无路径时返回 `null`。
   */
  findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    extraBlocked?: ReadonlySet<string>,
    check = BlockedByActor.All,
    biasSeed = 0,
    allowBlockedEnd = false,
    getTerrainCost?: (x: number, y: number) => number
  ): PathNode[] | null {
    if (!this.isInside(endX, endY) || !this.isPassable(endX, endY)) return null;

    const dynamicBlocked = this.getBlockedCells?.(check) ?? new Set<string>();
    // 默认情况下终点被阻塞时直接失败；allowBlockedEnd=true 时允许终点被动态/单位占用，
    // 因为对方可能正在离开。只拒绝地形不可通行（上面已检查）。
    if (!allowBlockedEnd && (dynamicBlocked.has(`${endX},${endY}`) || extraBlocked?.has(`${endX},${endY}`)))
      return null;

    const openSet: AStarNode[] = [];
    const closedSet = new Set<string>();

    const startNode: AStarNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
      // 取出 f 最小的节点
      let currentIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIdx].f) currentIdx = i;
      }
      const current = openSet[currentIdx];

      if (current.x === endX && current.y === endY) {
        return this.reconstructPath(current);
      }

      openSet.splice(currentIdx, 1);
      closedSet.add(`${current.x},${current.y}`);

      const neighbors = biasSeed !== 0 ? this.getNeighborsWithBias(biasSeed) : Pathfinder.NEIGHBORS;
      for (const offset of neighbors) {
        const nx = current.x + offset.x;
        const ny = current.y + offset.y;
        const key = `${nx},${ny}`;

        if (closedSet.has(key)) continue;
        if (!this.isInside(nx, ny)) continue;
        if (!this.isPassable(nx, ny)) continue;
        // allowBlockedEnd: 终点允许被动态阻塞（单位占用），因为对方可能正在离开
        const isEndCell = nx === endX && ny === endY;
        if (!isEndCell && (dynamicBlocked.has(key) || extraBlocked?.has(key))) continue;
        if (!allowBlockedEnd && isEndCell && (dynamicBlocked.has(key) || extraBlocked?.has(key))) continue;

        // ── 地形代价（Locomotor TerrainSpeeds）──
        // 若提供了 getTerrainCost，按 Locomotor 的速度倍率调整边代价。
        // terrainCost <= 0 表示该地形对此 Locomotor 不可通行。
        const terrainCost = getTerrainCost?.(nx, ny) ?? 1;
        if (terrainCost <= 0) continue;

        // ── 对角线剪枝（Corner Cutting）──
        // 沿对角线移动时，必须确保两个正交相邻格子也可通行，
        // 否则单位会"穿过"墙角。
        if (Math.abs(offset.x) === 1 && Math.abs(offset.y) === 1) {
          const hx = current.x + offset.x;
          const vy = current.y + offset.y;
          if (!this.isPassable(hx, current.y)) continue;
          if (!this.isPassable(current.x, vy)) continue;
          if (dynamicBlocked.has(`${hx},${current.y}`) || extraBlocked?.has(`${hx},${current.y}`)) continue;
          if (dynamicBlocked.has(`${current.x},${vy}`) || extraBlocked?.has(`${current.x},${vy}`)) continue;
        }

        const g = current.g + offset.cost / terrainCost;
        const existing = openSet.find((o) => o.x === nx && o.y === ny);

        if (!existing) {
          const h = this.heuristic(nx, ny, endX, endY);
          openSet.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
        } else if (g < existing.g) {
          existing.g = g;
          existing.f = g + existing.h;
          existing.parent = current;
        }
      }
    }

    return null;
  }

  private isInside(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /** 检查指定格子是否在地图范围内且地形可通行。
   * 用于 UnitMovement nudge 时的快速地形检查。
   */
  isCellPassable(x: number, y: number): boolean {
    return this.isInside(x, y) && this.isPassable(x, y);
  }

  /** 八方向启发函数：切比雪夫距离（max(|dx|, |dy|)）。 */
  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    // 切比雪夫距离适合八方向：直线移动代价 1，对角线代价 ≈1.414
    return Math.max(dx, dy) + (Math.sqrt(2) - 1) * Math.min(dx, dy);
  }

  /**
   * 根据 biasSeed 调整邻居遍历顺序。
   * seed 为偶数：保持默认（优先南/东）
   * seed 为奇数：交换南北优先级（优先北/东）
   * 这让不同单位在绕路时自然分流到不同侧。
   */
  private getNeighborsWithBias(seed: number): readonly Neighbor[] {
    const dirs = [...Pathfinder.NEIGHBORS];
    if (seed % 2 === 1) {
      // 交换 "下" 和 "上" 的遍历顺序（索引 2 和 3）
      [dirs[2], dirs[3]] = [dirs[3], dirs[2]];
    }
    return dirs;
  }

  private reconstructPath(endNode: AStarNode): PathNode[] {
    const path: PathNode[] = [];
    let current: AStarNode | null = endNode;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }
}
