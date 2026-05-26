import type { IPathGraph, PathGraphContext, PathNode } from './IPathGraph';
import { BlockedByActor } from '../unit/BlockedByActor';

/**
 * GroundPathGraph — 地面层寻路图。
 *
 * 将 Pathfinder 中原来的邻居生成、阻塞检查、地形代价、
 * 对角线剪枝等逻辑迁移至此，使 Pathfinder 专注于 A* 算法本身。
 *
 * OpenRA 对标：`OpenRA.Mods.Common/Pathfinder/DensePathGraph.cs`
 */
export class GroundPathGraph implements IPathGraph {
  private readonly width: number;
  private readonly height: number;
  private readonly isPassableFn: (x: number, y: number) => boolean;
  private readonly getBlockedCells?: (check?: BlockedByActor) => ReadonlySet<string>;
  private readonly getHeight?: (x: number, y: number) => number;

  /** 八方向邻居偏移（直线=1，对角线=√2）。 */
  private static readonly NEIGHBORS: ReadonlyArray<{
    readonly x: number;
    readonly y: number;
    readonly cost: number;
  }> = [
    { x: 1, y: 0, cost: 1 },
    { x: -1, y: 0, cost: 1 },
    { x: 0, y: 1, cost: 1 },
    { x: 0, y: -1, cost: 1 },
    { x: 1, y: 1, cost: 1.414 },
    { x: 1, y: -1, cost: 1.414 },
    { x: -1, y: 1, cost: 1.414 },
    { x: -1, y: -1, cost: 1.414 },
  ];

  /**
   * Directed Neighbors — Task 127
   * 根据父节点方向裁剪邻居集合，避免搜索可从父节点更便宜到达的格子。
   * 索引顺序对应 NEIGHBORS: [E, W, S, N, SE, NE, SW, NW]
   * 映射自 OpenRA DensePathGraph.DirectedNeighbors
   */
  private static readonly DIRECTED_NEIGHBORS: ReadonlyArray<ReadonlyArray<number>> = [
    /* from E  (0) */ [3, 5, 0, 4, 2],
    /* from W  (1) */ [1, 7, 3, 5, 0],
    /* from S  (2) */ [0, 4, 2],
    /* from N  (3) */ [7, 3, 5],
    /* from SE (4) */ [5, 0, 4, 2, 6],
    /* from NE (5) */ [7, 3, 5, 0, 4],
    /* from SW (6) */ [7, 1, 6, 2, 4],
    /* from NW (7) */ [7, 3, 5, 1, 6],
  ];

  /** Lane Bias 默认成本 */
  private static readonly DEFAULT_LANE_BIAS_COST = 1;

  constructor(
    width: number,
    height: number,
    isPassable: (x: number, y: number) => boolean,
    getBlockedCells?: (check?: BlockedByActor) => ReadonlySet<string>,
    getHeight?: (x: number, y: number) => number
  ) {
    this.width = width;
    this.height = height;
    this.isPassableFn = isPassable;
    this.getBlockedCells = getBlockedCells;
    this.getHeight = getHeight;
  }

  getConnections(
    node: PathNode,
    context?: PathGraphContext
  ): ReadonlyArray<{ readonly node: PathNode; readonly cost: number }> {
    const result: Array<{ readonly node: PathNode; readonly cost: number }> = [];
    let neighbors = this.getNeighborsWithBias(context?.biasSeed ?? 0);
    const getTerrainCost = context?.getTerrainCost;

    // ── Task 127: Directed Neighbors 裁剪 ──
    if (context?.parentNode) {
      const dx = node.x - context.parentNode.x;
      const dy = node.y - context.parentNode.y;
      const dirIdx = this.getNeighborIndex(dx, dy);
      if (dirIdx >= 0) {
        const allowed = new Set(GroundPathGraph.DIRECTED_NEIGHBORS[dirIdx]);
        const filtered: Array<{ readonly x: number; readonly y: number; readonly cost: number }> = [];
        for (let i = 0; i < GroundPathGraph.NEIGHBORS.length; i++) {
          if (allowed.has(i)) {
            filtered.push(GroundPathGraph.NEIGHBORS[i]);
            continue;
          }
          // 被排除的邻居：检查从 parentNode 到该邻居是否实际可达
          // 如果因为地形/阻塞无法从 parentNode 直接到达，则保留
          const off = GroundPathGraph.NEIGHBORS[i];
          const nx = node.x + off.x;
          const ny = node.y + off.y;
          const pdx = nx - context.parentNode.x;
          const pdy = ny - context.parentNode.y;
          if (Math.abs(pdx) > 1 || Math.abs(pdy) > 1) {
            filtered.push(off); // 距离超过 1，parentNode 无法直接到达
            continue;
          }
          // 检查对角线剪枝（如果从 parentNode 到邻居是对角线）
          if (Math.abs(pdx) === 1 && Math.abs(pdy) === 1) {
            const hx = context.parentNode.x + pdx;
            const vy = context.parentNode.y + pdy;
            if (!this.isPassableFn(hx, context.parentNode.y) || !this.isPassableFn(context.parentNode.x, vy)) {
              filtered.push(off);
              continue;
            }
            if (getTerrainCost?.(hx, context.parentNode.y) !== undefined) {
              const t1 = getTerrainCost(hx, context.parentNode.y);
              if (t1 <= 0) {
                filtered.push(off);
                continue;
              }
            }
            if (getTerrainCost?.(context.parentNode.x, vy) !== undefined) {
              const t2 = getTerrainCost(context.parentNode.x, vy);
              if (t2 <= 0) {
                filtered.push(off);
                continue;
              }
            }
          }
          // 可以从 parentNode 直接到达，排除（节省搜索节点）
        }
        neighbors = filtered;
      }
    }

    const dynamicBlocked = this.getBlockedCells?.(context?.check ?? BlockedByActor.All) ?? new Set<string>();
    const extraBlocked = context?.extraBlocked;
    const laneBias = context?.laneBias ?? false;
    const laneBiasCost = context?.laneBiasCost ?? GroundPathGraph.DEFAULT_LANE_BIAS_COST;
    const inReverse = context?.inReverse ?? false;

    for (const offset of neighbors) {
      const nx = node.x + offset.x;
      const ny = node.y + offset.y;

      if (!this.isInside({ x: nx, y: ny })) continue;
      if (!this.isPassableFn(nx, ny)) continue;

      // ── Task 130: Height discontinuity check ──
      if (this.getHeight) {
        const hSrc = this.getHeight(node.x, node.y);
        const hDst = this.getHeight(nx, ny);
        if (Math.abs(hSrc - hDst) > 1) continue; // Cliff — impassable
      }

      const key = `${nx},${ny}`;
      if (dynamicBlocked.has(key)) continue;
      if (extraBlocked?.has(key)) continue;

      // ── 对角线剪枝（Corner Cutting）──
      if (Math.abs(offset.x) === 1 && Math.abs(offset.y) === 1) {
        const hx = node.x + offset.x;
        const vy = node.y + offset.y;
        if (!this.isPassableFn(hx, node.y)) continue;
        if (!this.isPassableFn(node.x, vy)) continue;
        if (dynamicBlocked.has(`${hx},${node.y}`) || extraBlocked?.has(`${hx},${node.y}`)) continue;
        if (dynamicBlocked.has(`${node.x},${vy}`) || extraBlocked?.has(`${node.x},${vy}`)) continue;
        if (getTerrainCost && getTerrainCost(hx, node.y) <= 0) continue;
        if (getTerrainCost && getTerrainCost(node.x, vy) <= 0) continue;
      }

      // ── 地形代价 ──
      const terrainCost = getTerrainCost?.(nx, ny) ?? 1;
      if (terrainCost <= 0) continue;

      let cost = offset.cost / terrainCost;

      // ── Task 127: Lane Bias ──
      if (laneBias) {
        const ux = (nx + (inReverse ? 1 : 0)) & 1;
        const uy = (ny + (inReverse ? 1 : 0)) & 1;
        if ((ux === 0 && offset.y < 0) || (ux === 1 && offset.y > 0)) cost += laneBiasCost;
        if ((uy === 0 && offset.x < 0) || (uy === 1 && offset.x > 0)) cost += laneBiasCost;
      }

      result.push({ node: { x: nx, y: ny }, cost });
    }

    return result;
  }

  /** 根据偏移量查找在 NEIGHBORS 中的索引，用于 Directed Neighbors */
  private getNeighborIndex(dx: number, dy: number): number {
    for (let i = 0; i < GroundPathGraph.NEIGHBORS.length; i++) {
      if (GroundPathGraph.NEIGHBORS[i].x === dx && GroundPathGraph.NEIGHBORS[i].y === dy) return i;
    }
    return -1;
  }

  getHeuristic(a: PathNode, b: PathNode): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.max(dx, dy) + (Math.sqrt(2) - 1) * Math.min(dx, dy);
  }

  isInside(node: PathNode): boolean {
    return node.x >= 0 && node.x < this.width && node.y >= 0 && node.y < this.height;
  }

  isPassable(node: PathNode): boolean {
    return this.isInside(node) && this.isPassableFn(node.x, node.y);
  }

  /** 基于 biasSeed 对邻居遍历顺序做 Fisher-Yates 洗牌。 */
  private getNeighborsWithBias(seed: number): ReadonlyArray<{
    readonly x: number;
    readonly y: number;
    readonly cost: number;
  }> {
    if (seed === 0) return GroundPathGraph.NEIGHBORS;
    const dirs = [...GroundPathGraph.NEIGHBORS];
    let s = Math.abs(seed);
    for (let i = dirs.length - 1; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    return dirs;
  }
}
