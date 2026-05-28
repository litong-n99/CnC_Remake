import type { IPathGraph, PathGraphContext, PathNode } from './IPathGraph';
import { GroundPathGraph } from './GroundPathGraph';
import { LandType } from './TerrainGrid';

/**
 * WaterPathGraph — 水面层寻路图。
 *
 * 仅 Water / Beach / River 格子可通行，供海军单位（Locomotion.Float）使用。
 * 内部复用 GroundPathGraph 的邻居生成、对角线剪枝、Directed Neighbors、Lane Bias 等优化。
 *
 * OpenRA 对标：`OpenRA.Mods.Common/Pathfinder/DensePathGraph.cs`（Water 层变体）
 */
export class WaterPathGraph implements IPathGraph {
  private readonly graph: GroundPathGraph;

  constructor(
    width: number,
    height: number,
    getTerrainType: (x: number, y: number) => LandType,
    getBlockedCells?: (check?: import('../unit/BlockedByActor').BlockedByActor) => ReadonlySet<string>
  ) {
    const isWaterPassable = (x: number, y: number): boolean => {
      const t = getTerrainType(x, y);
      return t === LandType.Water || t === LandType.Beach || t === LandType.River;
    };
    this.graph = new GroundPathGraph(width, height, isWaterPassable, getBlockedCells);
  }

  getConnections(
    node: PathNode,
    context?: PathGraphContext
  ): ReadonlyArray<{ readonly node: PathNode; readonly cost: number }> {
    return this.graph.getConnections(node, context);
  }

  getHeuristic(a: PathNode, b: PathNode): number {
    return this.graph.getHeuristic(a, b);
  }

  isInside(node: PathNode): boolean {
    return this.graph.isInside(node);
  }

  isPassable(node: PathNode): boolean {
    return this.graph.isPassable(node);
  }
}
