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

  constructor(
    width: number,
    height: number,
    isPassable: (x: number, y: number) => boolean,
    getBlockedCells?: (check?: BlockedByActor) => ReadonlySet<string>
  ) {
    this.width = width;
    this.height = height;
    this.isPassableFn = isPassable;
    this.getBlockedCells = getBlockedCells;
  }

  getConnections(
    node: PathNode,
    context?: PathGraphContext
  ): ReadonlyArray<{ readonly node: PathNode; readonly cost: number }> {
    const result: Array<{ readonly node: PathNode; readonly cost: number }> = [];
    const neighbors = this.getNeighborsWithBias(context?.biasSeed ?? 0);

    const dynamicBlocked = this.getBlockedCells?.(context?.check ?? BlockedByActor.All) ?? new Set<string>();
    const extraBlocked = context?.extraBlocked;
    const getTerrainCost = context?.getTerrainCost;

    for (const offset of neighbors) {
      const nx = node.x + offset.x;
      const ny = node.y + offset.y;

      if (!this.isInside({ x: nx, y: ny })) continue;
      if (!this.isPassableFn(nx, ny)) continue;

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

      result.push({ node: { x: nx, y: ny }, cost: offset.cost / terrainCost });
    }

    return result;
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
