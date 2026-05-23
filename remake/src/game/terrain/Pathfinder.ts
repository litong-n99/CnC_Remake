import { BlockedByActor } from '../unit/BlockedByActor';
import type { LandType } from './TerrainGrid';
import { HierarchicalPathfinder } from './HierarchicalPathfinder';

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

  /** Hierarchical domain index — O(1) reachability pre-check. */
  readonly hierarchical: HierarchicalPathfinder;

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
    this.hierarchical = new HierarchicalPathfinder(width, height, isPassable);
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
    // O(1) domain check — if start/end are in different terrain domains,
    // no path can exist regardless of actor blocking.
    if (!this.hierarchical.areConnected(startX, startY, endX, endY)) return null;

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
          // 检查 Locomotor 地形代价：正交相邻格子对此单位是否可通行
          if (getTerrainCost && getTerrainCost(hx, current.y) <= 0) continue;
          if (getTerrainCost && getTerrainCost(current.x, vy) <= 0) continue;
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
   * 根据 biasSeed 对邻居遍历顺序做 Fisher-Yates 洗牌。
   * 不同 seed 产生完全不同的扩展顺序，让多个单位从相似起点出发时
   * 自然分散到不同路径上，避免全部挤在同一条最优路线上。
   */
  private getNeighborsWithBias(seed: number): readonly Neighbor[] {
    const dirs = [...Pathfinder.NEIGHBORS];
    let s = seed === 0 ? 12345 : Math.abs(seed);
    for (let i = dirs.length - 1; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    return dirs;
  }

  // ── Task 23.14: Bidirectional A* ──

  /**
   * 双向 A* 寻路。
   * 从起点和终点同时扩展，在大地图上通常比单向 A* 减少 30%+ 搜索空间。
   * 保持与 `findPath` 相同的参数和返回值语义。
   */
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

    // 正向（起点 → 终点）
    const forwardOpen: AStarNode[] = [];
    const forwardClosed = new Set<string>();
    const forwardG = new Map<string, number>();
    const forwardParent = new Map<string, AStarNode>();

    // 反向（终点 → 起点）
    const backwardOpen: AStarNode[] = [];
    const backwardClosed = new Set<string>();
    const backwardG = new Map<string, number>();
    const backwardParent = new Map<string, AStarNode>();

    const startNode: AStarNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
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
      h: this.heuristic(endX, endY, startX, startY),
      f: 0,
      parent: null,
    };
    endNode.f = endNode.g + endNode.h;
    backwardOpen.push(endNode);
    backwardG.set(`${endX},${endY}`, 0);

    let bestMeeting: { node: AStarNode; totalG: number } | null = null;
    const neighbors = biasSeed !== 0 ? this.getNeighborsWithBias(biasSeed) : Pathfinder.NEIGHBORS;

    while (forwardOpen.length > 0 && backwardOpen.length > 0) {
      // 选择 f 更小的方向扩展
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

      // 如果两个方向的最小 f 都超过了当前 bestMeeting，可以终止
      const minF = Math.min(
        forwardOpen.length > 0 ? forwardOpen[0].f : Infinity,
        backwardOpen.length > 0 ? backwardOpen[0].f : Infinity
      );
      if (bestMeeting && minF >= bestMeeting.totalG) {
        break;
      }

      for (const offset of neighbors) {
        const nx = current.x + offset.x;
        const ny = current.y + offset.y;
        const nKey = `${nx},${ny}`;

        if (!this.isInside(nx, ny)) continue;
        if (!this.isPassable(nx, ny)) continue;
        const isEndCell = nx === endX && ny === endY;
        if (!isEndCell && (dynamicBlocked.has(nKey) || extraBlocked?.has(nKey))) continue;
        if (!allowBlockedEnd && isEndCell && (dynamicBlocked.has(nKey) || extraBlocked?.has(nKey))) continue;

        const terrainCost = getTerrainCost?.(nx, ny) ?? 1;
        if (terrainCost <= 0) continue;

        if (Math.abs(offset.x) === 1 && Math.abs(offset.y) === 1) {
          const hx = current.x + offset.x;
          const vy = current.y + offset.y;
          if (!this.isPassable(hx, current.y)) continue;
          if (!this.isPassable(current.x, vy)) continue;
          if (dynamicBlocked.has(`${hx},${current.y}`) || extraBlocked?.has(`${hx},${current.y}`)) continue;
          if (dynamicBlocked.has(`${current.x},${vy}`) || extraBlocked?.has(`${current.x},${vy}`)) continue;
          if (getTerrainCost && getTerrainCost(hx, current.y) <= 0) continue;
          if (getTerrainCost && getTerrainCost(current.x, vy) <= 0) continue;
        }

        const g = current.g + offset.cost / terrainCost;
        const gMap = useForward ? forwardG : backwardG;
        const parentMap = useForward ? forwardParent : backwardParent;
        const existingG = gMap.get(nKey);

        if (existingG === undefined || g < existingG) {
          gMap.set(nKey, g);
          parentMap.set(nKey, current);
          const h = useForward ? this.heuristic(nx, ny, endX, endY) : this.heuristic(nx, ny, startX, startY);
          const node: AStarNode = { x: nx, y: ny, g, h, f: g + h, parent: null };
          const open = useForward ? forwardOpen : backwardOpen;
          // 按 f 值插入到正确位置（保持有序）
          this.insertSorted(open, node);
        }
      }
    }

    if (!bestMeeting) return null;

    // 重建路径：从相遇点分别回溯到起点和终点
    const forwardPart = this.reconstructPathBidirectional(bestMeeting.node, forwardParent, startX, startY);
    const backwardPart = this.reconstructPathBidirectional(bestMeeting.node, backwardParent, endX, endY);
    // 去掉相遇点的重复
    backwardPart.shift();
    return [...forwardPart, ...backwardPart];
  }

  /**
   * Predicate Search — 搜索到第一个满足条件的格子即停止。
   * 用于 MoveWithinRange（找环形范围内的可达格子）等场景。
   *
   * @param predicate 返回 true 时停止搜索并返回路径
   * @param getHeuristic 可选的启发函数，默认使用到起点的切比雪夫距离
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

    const neighbors = biasSeed !== 0 ? this.getNeighborsWithBias(biasSeed) : Pathfinder.NEIGHBORS;

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

      for (const offset of neighbors) {
        const nx = current.x + offset.x;
        const ny = current.y + offset.y;
        const key = `${nx},${ny}`;

        if (closedSet.has(key)) continue;
        if (!this.isInside(nx, ny)) continue;
        if (!this.isPassable(nx, ny)) continue;
        if (dynamicBlocked.has(key) || extraBlocked?.has(key)) continue;

        const terrainCost = getTerrainCost?.(nx, ny) ?? 1;
        if (terrainCost <= 0) continue;

        if (Math.abs(offset.x) === 1 && Math.abs(offset.y) === 1) {
          const hx = current.x + offset.x;
          const vy = current.y + offset.y;
          if (!this.isPassable(hx, current.y)) continue;
          if (!this.isPassable(current.x, vy)) continue;
          if (dynamicBlocked.has(`${hx},${current.y}`) || extraBlocked?.has(`${hx},${current.y}`)) continue;
          if (dynamicBlocked.has(`${current.x},${vy}`) || extraBlocked?.has(`${current.x},${vy}`)) continue;
          if (getTerrainCost && getTerrainCost(hx, current.y) <= 0) continue;
          if (getTerrainCost && getTerrainCost(current.x, vy) <= 0) continue;
        }

        const g = current.g + offset.cost / terrainCost;
        const existing = openSet.find((o) => o.x === nx && o.y === ny);

        if (!existing) {
          // Predicate search 中启发函数使用 0（Dijkstra 行为），
          // 因为不知道目标在哪里，无法估计剩余代价。
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

  /** 从有序 openSet 中取出 f 最小的节点（小顶堆简化版：数组已按 f 排序）。 */
  private popBest(openSet: AStarNode[]): AStarNode {
    return openSet.shift()!;
  }

  /** 按 f 值升序插入 openSet。 */
  private insertSorted(openSet: AStarNode[], node: AStarNode): void {
    let i = 0;
    while (i < openSet.length && openSet[i].f < node.f) i++;
    openSet.splice(i, 0, node);
  }

  /** 双向 A* 路径重建：从 meetingNode 回溯到指定起点。 */
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
      if (visited.has(key)) break; // 环检测
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
