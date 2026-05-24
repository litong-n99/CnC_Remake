import { BlockedByActor } from '../unit/BlockedByActor';
import type { LandType } from './TerrainGrid';
import { HierarchicalPathfinder } from './HierarchicalPathfinder';
import { GroundPathGraph } from './GroundPathGraph';
import type { PathNode, PathGraphContext } from './IPathGraph';

/**
 * A* 寻路 — 基于 IPathGraph 抽象的多层寻路器。
 *
 * Task 23.19 重构：将邻居生成逻辑迁移到 GroundPathGraph，
 * Pathfinder 专注于 A* 算法框架，支持未来切换多层图（隧道、地下等）。
 *
 * 对应 C++ `Find_Path()`（UNIT.CPP / FOOT.CPP）的简化 TS 实现。
 */

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export { PathNode };

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

  /** Hierarchical domain index — O(1) reachability pre-check. */
  readonly hierarchical: HierarchicalPathfinder;

  /** Ground layer path graph — Task 23.19 抽象后的邻居生成器。 */
  readonly groundGraph: GroundPathGraph;

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
    this.hierarchical = new HierarchicalPathfinder(width, height, isPassable);
    this.groundGraph = new GroundPathGraph(width, height, isPassable, getBlockedCells);
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

    // ── Task 23.13: Hierarchical quick reject ──
    if (!this.hierarchical.areConnected(startX, startY, endX, endY)) return null;

    const dynamicBlocked = this.getBlockedCells?.(check) ?? new Set<string>();
    if (!allowBlockedEnd && (dynamicBlocked.has(`${endX},${endY}`) || extraBlocked?.has(`${endX},${endY}`)))
      return null;

    const openSet: AStarNode[] = [];
    const closedSet = new Set<string>();

    const startNode: AStarNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.groundGraph.getHeuristic({ x: startX, y: startY }, { x: endX, y: endY }),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    const graphContext: PathGraphContext = {
      getTerrainCost,
      biasSeed,
    };

    while (openSet.length > 0) {
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

      const connections = this.groundGraph.getConnections({ x: current.x, y: current.y }, graphContext);
      for (const conn of connections) {
        const nx = conn.node.x;
        const ny = conn.node.y;
        const key = `${nx},${ny}`;

        if (closedSet.has(key)) continue;

        // ── 动态阻塞检查（搜索级别，GroundPathGraph 不过滤阻塞）──
        const isEndCell = nx === endX && ny === endY;
        if (!isEndCell && (dynamicBlocked.has(key) || extraBlocked?.has(key))) continue;
        if (!allowBlockedEnd && isEndCell && (dynamicBlocked.has(key) || extraBlocked?.has(key))) continue;

        const g = current.g + conn.cost;
        const existing = openSet.find((o) => o.x === nx && o.y === ny);

        if (!existing) {
          const h = this.groundGraph.getHeuristic({ x: nx, y: ny }, { x: endX, y: endY });
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

  /** 检查指定格子是否在地图范围内且地形可通行。 */
  isCellPassable(x: number, y: number): boolean {
    return this.groundGraph.isPassable({ x, y });
  }

  // ── Task 23.14: Bidirectional A* ──

  findPathBidirectional(
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
    if (!this.hierarchical.areConnected(startX, startY, endX, endY)) return null;

    const dynamicBlocked = this.getBlockedCells?.(check) ?? new Set<string>();
    if (!allowBlockedEnd && (dynamicBlocked.has(`${endX},${endY}`) || extraBlocked?.has(`${endX},${endY}`)))
      return null;

    const forwardOpen: AStarNode[] = [];
    const forwardClosed = new Set<string>();
    const forwardG = new Map<string, number>();
    const forwardParent = new Map<string, AStarNode>();

    const backwardOpen: AStarNode[] = [];
    const backwardClosed = new Set<string>();
    const backwardG = new Map<string, number>();
    const backwardParent = new Map<string, AStarNode>();

    const startNode: AStarNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.groundGraph.getHeuristic({ x: startX, y: startY }, { x: endX, y: endY }),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    forwardOpen.push(startNode);
    forwardG.set(`${startX},${startY}`, 0);

    const endNode: AStarNode = {
      x: endX,
      y: endY,
      g: 0,
      h: this.groundGraph.getHeuristic({ x: endX, y: endY }, { x: startX, y: startY }),
      f: 0,
      parent: null,
    };
    endNode.f = endNode.g + endNode.h;
    backwardOpen.push(endNode);
    backwardG.set(`${endX},${endY}`, 0);

    let bestMeeting: { node: AStarNode; totalG: number } | null = null;

    const graphContext: PathGraphContext = {
      getTerrainCost,
      biasSeed,
    };

    while (forwardOpen.length > 0 && backwardOpen.length > 0) {
      const forwardF = forwardOpen[0].f;
      const backwardF = backwardOpen[0].f;
      const useForward = forwardF <= backwardF;

      const current = useForward ? this.popBest(forwardOpen) : this.popBest(backwardOpen);
      const key = `${current.x},${current.y}`;

      if (useForward) {
        if (forwardClosed.has(key)) continue;
        forwardClosed.add(key);
        if (backwardClosed.has(key) || backwardG.has(key)) {
          const bg = backwardG.get(key) ?? Infinity;
          const total = (forwardG.get(key) ?? Infinity) + bg;
          if (!bestMeeting || total < bestMeeting.totalG) {
            bestMeeting = { node: current, totalG: total };
          }
        }
      } else {
        if (backwardClosed.has(key)) continue;
        backwardClosed.add(key);
        if (forwardClosed.has(key) || forwardG.has(key)) {
          const fg = forwardG.get(key) ?? Infinity;
          const total = fg + (backwardG.get(key) ?? Infinity);
          if (!bestMeeting || total < bestMeeting.totalG) {
            bestMeeting = { node: current, totalG: total };
          }
        }
      }

      const minF = Math.min(
        forwardOpen.length > 0 ? forwardOpen[0].f : Infinity,
        backwardOpen.length > 0 ? backwardOpen[0].f : Infinity
      );
      if (bestMeeting && minF >= bestMeeting.totalG) {
        break;
      }

      const connections = this.groundGraph.getConnections({ x: current.x, y: current.y }, graphContext);
      for (const conn of connections) {
        const nx = conn.node.x;
        const ny = conn.node.y;
        const nKey = `${nx},${ny}`;

        if (!this.isInside(nx, ny)) continue;
        if (!this.isPassable(nx, ny)) continue;

        const isEndCell = nx === endX && ny === endY;
        if (!isEndCell && (dynamicBlocked.has(nKey) || extraBlocked?.has(nKey))) continue;
        if (!allowBlockedEnd && isEndCell && (dynamicBlocked.has(nKey) || extraBlocked?.has(nKey))) continue;

        const g = current.g + conn.cost;
        const gMap = useForward ? forwardG : backwardG;
        const parentMap = useForward ? forwardParent : backwardParent;
        const existingG = gMap.get(nKey);

        if (existingG === undefined || g < existingG) {
          gMap.set(nKey, g);
          parentMap.set(nKey, current);
          const h = useForward
            ? this.groundGraph.getHeuristic({ x: nx, y: ny }, { x: endX, y: endY })
            : this.groundGraph.getHeuristic({ x: nx, y: ny }, { x: startX, y: startY });
          const node: AStarNode = { x: nx, y: ny, g, h, f: g + h, parent: null };
          const open = useForward ? forwardOpen : backwardOpen;
          this.insertSorted(open, node);
        }
      }
    }

    if (!bestMeeting) return null;

    const forwardPart = this.reconstructPathBidirectional(bestMeeting.node, forwardParent, startX, startY);
    const backwardPart = this.reconstructPathBidirectional(bestMeeting.node, backwardParent, endX, endY);
    backwardPart.shift();
    return [...forwardPart, ...backwardPart];
  }

  /**
   * Predicate Search — 搜索到第一个满足条件的格子即停止。
   * 用于 MoveWithinRange（找环形范围内的可达格子）等场景。
   */
  findPathToPredicate(
    startX: number,
    startY: number,
    predicate: (x: number, y: number) => boolean,
    maxDistance = Infinity,
    extraBlocked?: ReadonlySet<string>,
    check = BlockedByActor.All,
    biasSeed = 0,
    getTerrainCost?: (x: number, y: number) => number
  ): PathNode[] | null {
    const dynamicBlocked = this.getBlockedCells?.(check) ?? new Set<string>();

    const openSet: AStarNode[] = [];
    const closedSet = new Set<string>();

    const startNode: AStarNode = {
      x: startX,
      y: startY,
      g: 0,
      h: 0,
      f: 0,
      parent: null,
    };
    openSet.push(startNode);

    const graphContext: PathGraphContext = {
      getTerrainCost,
      biasSeed,
    };

    while (openSet.length > 0) {
      let currentIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIdx].f) currentIdx = i;
      }
      const current = openSet[currentIdx];

      if (predicate(current.x, current.y)) {
        return this.reconstructPath(current);
      }

      openSet.splice(currentIdx, 1);
      closedSet.add(`${current.x},${current.y}`);

      if (current.g >= maxDistance) continue;

      const connections = this.groundGraph.getConnections({ x: current.x, y: current.y }, graphContext);
      for (const conn of connections) {
        const nx = conn.node.x;
        const ny = conn.node.y;
        const key = `${nx},${ny}`;

        if (closedSet.has(key)) continue;
        if (dynamicBlocked.has(key) || extraBlocked?.has(key)) continue;

        const g = current.g + conn.cost;
        const existing = openSet.find((o) => o.x === nx && o.y === ny);

        if (!existing) {
          openSet.push({ x: nx, y: ny, g, h: 0, f: g, parent: current });
        } else if (g < existing.g) {
          existing.g = g;
          existing.f = g + existing.h;
          existing.parent = current;
        }
      }
    }

    return null;
  }

  // ── Helpers ──

  private popBest(openSet: AStarNode[]): AStarNode {
    return openSet.shift()!;
  }

  private insertSorted(openSet: AStarNode[], node: AStarNode): void {
    let i = 0;
    while (i < openSet.length && openSet[i].f < node.f) i++;
    openSet.splice(i, 0, node);
  }

  private reconstructPathBidirectional(
    meetingNode: AStarNode,
    parentMap: Map<string, AStarNode>,
    startX: number,
    startY: number
  ): PathNode[] {
    const path: PathNode[] = [{ x: meetingNode.x, y: meetingNode.y }];
    let key = `${meetingNode.x},${meetingNode.y}`;
    const visited = new Set<string>([key]);

    while (parentMap.has(key)) {
      const parent = parentMap.get(key)!;
      key = `${parent.x},${parent.y}`;
      if (visited.has(key)) break;
      visited.add(key);
      path.unshift({ x: parent.x, y: parent.y });
      if (parent.x === startX && parent.y === startY) break;
    }
    return path;
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
