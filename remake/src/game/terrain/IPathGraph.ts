import type { BlockedByActor } from '../unit/BlockedByActor';

/**
 * PathNode — 寻路图的基本节点（格子坐标）。
 */
export interface PathNode {
  readonly x: number;
  readonly y: number;
}

/**
 * 寻路图上下文 — 每次 A* 搜索时传入的动态参数。
 *
 * 不同搜索可能使用不同的阻塞级别（BlockedByActor）、
 * 额外阻塞集合（extraBlocked）或地形代价回调（getTerrainCost）。
 */
export interface PathGraphContext {
  readonly extraBlocked?: ReadonlySet<string>;
  readonly check?: BlockedByActor;
  readonly getTerrainCost?: (x: number, y: number) => number;
  readonly biasSeed?: number;
}

/**
 * IPathGraph — 寻路图抽象接口。
 *
 * 将 A* 算法与邻居生成解耦，使 Pathfinder 可以支持多层移动
 * （地面、隧道、地下、跳跃喷气、高架桥等）。
 *
 * OpenRA 对标：
 *   - `OpenRA.Mods.Common/Pathfinder/IPathGraph.cs`
 *   - `OpenRA.Mods.Common/Pathfinder/DensePathGraph.cs`
 */
export interface IPathGraph {
  /**
   * 获取从指定节点出发的所有有效连接。
   * @param node 当前节点
   * @param context 搜索上下文（动态阻塞、地形代价等）
   * @returns 邻居节点及其边代价列表
   */
  getConnections(
    node: PathNode,
    context?: PathGraphContext
  ): ReadonlyArray<{ readonly node: PathNode; readonly cost: number }>;

  /**
   * 启发函数 — 估计从 a 到 b 的剩余代价。
   * 不同图（地面/空中/地下）可能使用不同的距离度量。
   */
  getHeuristic(a: PathNode, b: PathNode): number;

  /** 节点是否在图的有效范围内且可通行。 */
  isInside(node: PathNode): boolean;

  /** 检查节点是否可通过（不检查动态阻塞，只检查地形/层本身）。 */
  isPassable(node: PathNode): boolean;
}
