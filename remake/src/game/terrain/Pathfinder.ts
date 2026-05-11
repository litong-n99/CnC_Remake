/**
 * A* 寻路 — 基于格子地图的四方向路径搜索。
 *
 * 对应 C++ `Find_Path()`（UNIT.CPP / FOOT.CPP）的简化 TS 实现。
 * 启发函数使用曼哈顿距离，适合四方向（无对角线）网格。
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

export class Pathfinder {
  private readonly width: number;
  private readonly height: number;
  private readonly isPassable: (x: number, y: number) => boolean;

  constructor(width: number, height: number, isPassable: (x: number, y: number) => boolean) {
    this.width = width;
    this.height = height;
    this.isPassable = isPassable;
  }

  /**
   * A* 寻路。
   * @returns 从起点到终点的格子路径（含起点和终点），无路径时返回 `null`。
   */
  findPath(startX: number, startY: number, endX: number, endY: number): PathNode[] | null {
    if (!this.isInside(endX, endY) || !this.isPassable(endX, endY)) return null;

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

      // 四方向邻居
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];

      for (const n of neighbors) {
        const key = `${n.x},${n.y}`;
        if (closedSet.has(key)) continue;
        if (!this.isInside(n.x, n.y)) continue;
        if (!this.isPassable(n.x, n.y)) continue;

        const g = current.g + 1;
        const existing = openSet.find((o) => o.x === n.x && o.y === n.y);

        if (!existing) {
          const h = this.heuristic(n.x, n.y, endX, endY);
          openSet.push({ x: n.x, y: n.y, g, h, f: g + h, parent: current });
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

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
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
