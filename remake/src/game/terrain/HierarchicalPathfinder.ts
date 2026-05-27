/**
 * Hierarchical Pathfinding — Domain Index + Abstract Graph
 * Task 122: HPF 抽象图 + 抽象启发式引导
 *
 * OpenRA 对标: `OpenRA.Mods.Common/Pathfinder/HierarchicalPathFinder.cs`
 *
 * 核心思想：
 * 1. Domain Index: 对整张地图基于地形可通行性做 flood-fill，为每个连通区域分配
 *    domain ID。寻路前 O(1) 比较起点/终点的 domain ID，不同时直接返回 null。
 * 2. Abstract Graph (Task 122): 将地图划分为 10×10 的 grid，每个 grid 内的每个
 *    domain 形成一个抽象节点。相邻 grid 之间检查边界连通性，建立抽象边。
 *    长距离寻路时，用抽象路径的剩余代价引导局部 A* 的启发值，减少搜索节点数。
 */

export interface AbstractNode {
  readonly gridX: number;
  readonly gridY: number;
  readonly domainId: number;
  /** 该抽象节点包含的格子坐标列表。 */
  readonly cells: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  /** 该抽象节点的中心格子坐标。 */
  readonly centerX: number;
  readonly centerY: number;
}

export interface AbstractEdge {
  readonly from: { readonly gridX: number; readonly gridY: number; readonly domainId: number };
  readonly to: { readonly gridX: number; readonly gridY: number; readonly domainId: number };
  /** 穿越边界的代价（格子数近似）。 */
  readonly cost: number;
}

export class HierarchicalPathfinder {
  private readonly width: number;
  private readonly height: number;
  private readonly isPassable: (x: number, y: number) => boolean;
  private readonly gridSize = 10;

  /** domainIds[y][x] = domainId，-1 表示不可通行。 */
  private domainIds: number[][] = [];
  private domainCount = 0;

  // ── Task 122: 抽象图 ──
  private abstractNodes = new Map<string, AbstractNode[]>();
  private abstractEdges = new Map<string, AbstractEdge[]>();
  private abstractGraphBuilt = false;

  constructor(width: number, height: number, isPassable: (x: number, y: number) => boolean) {
    this.width = width;
    this.height = height;
    this.isPassable = isPassable;
    this.rebuild();
  }

  /** 重新计算所有 domain 和抽象图（当地形变化时调用）。 */
  rebuild(): void {
    this.domainIds = Array.from({ length: this.height }, () => Array(this.width).fill(-1));
    this.domainCount = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.domainIds[y][x] === -1 && this.isPassable(x, y)) {
          this.floodFill(x, y, this.domainCount);
          this.domainCount++;
        }
      }
    }

    this.buildAbstractGraph();
  }

  /** 获取指定格子的 domain ID，不可通行返回 -1。 */
  getDomain(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
    return this.domainIds[y]?.[x] ?? -1;
  }

  /**
   * O(1) 判断两个格子是否在同一个连通 domain 中。
   * 任一格子不可通行时返回 false。
   */
  areConnected(x1: number, y1: number, x2: number, y2: number): boolean {
    const d1 = this.getDomain(x1, y1);
    const d2 = this.getDomain(x2, y2);
    return d1 !== -1 && d1 === d2;
  }

  /** 当前 domain 总数。 */
  getDomainCount(): number {
    return this.domainCount;
  }

  /** 统计每个 domain 包含的格子数（调试用）。 */
  getDomainSizes(): Map<number, number> {
    const sizes = new Map<number, number>();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const id = this.domainIds[y][x];
        if (id !== -1) {
          sizes.set(id, (sizes.get(id) ?? 0) + 1);
        }
      }
    }
    return sizes;
  }

  // ── Task 122: 抽象图 API ──

  /** 抽象图是否已构建。 */
  isAbstractGraphBuilt(): boolean {
    return this.abstractGraphBuilt;
  }

  /** 获取所有抽象节点的总数。 */
  getAbstractNodeCount(): number {
    let count = 0;
    for (const nodes of this.abstractNodes.values()) {
      count += nodes.length;
    }
    return count;
  }

  /** 获取所有抽象边的总数。 */
  getAbstractEdgeCount(): number {
    let count = 0;
    for (const edges of this.abstractEdges.values()) {
      count += edges.length;
    }
    return count;
  }

  /** 获取指定 grid 内的所有抽象节点。 */
  getAbstractNodesInGrid(gridX: number, gridY: number): AbstractNode[] {
    return this.abstractNodes.get(`${gridX},${gridY}`) ?? [];
  }

  /** 获取指定抽象节点的所有出边。 */
  getAbstractEdgesFrom(gridX: number, gridY: number, domainId: number): AbstractEdge[] {
    return this.abstractEdges.get(`${gridX},${gridY},${domainId}`) ?? [];
  }

  /**
   * 获取抽象启发值：从 (x1,y1) 到 (x2,y2) 的抽象路径剩余代价估计。
   * 如果两点在同一抽象节点内，返回 0。
   * 否则返回抽象节点中心之间的 Chebyshev 距离（简化版）。
   */
  getAbstractHeuristic(x1: number, y1: number, x2: number, y2: number): number {
    if (!this.abstractGraphBuilt) return 0;

    const node1 = this.findAbstractNode(x1, y1);
    const node2 = this.findAbstractNode(x2, y2);

    if (!node1 || !node2) return 0;
    if (node1.gridX === node2.gridX && node1.gridY === node2.gridY && node1.domainId === node2.domainId) {
      return 0;
    }

    const dx = Math.abs(node1.centerX - node2.centerX);
    const dy = Math.abs(node1.centerY - node2.centerY);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  }

  /** 查找指定格子所属的抽象节点。 */
  private findAbstractNode(x: number, y: number): AbstractNode | null {
    const gx = Math.floor(x / this.gridSize);
    const gy = Math.floor(y / this.gridSize);
    const nodes = this.abstractNodes.get(`${gx},${gy}`);
    if (!nodes) return null;

    const domainId = this.getDomain(x, y);
    return nodes.find((n) => n.domainId === domainId) ?? null;
  }

  // ── 抽象图构建 ──

  /** 构建抽象图：每个 grid 内的每个 domain 形成一个抽象节点。 */
  private buildAbstractGraph(): void {
    this.abstractNodes.clear();
    this.abstractEdges.clear();

    const gridW = Math.ceil(this.width / this.gridSize);
    const gridH = Math.ceil(this.height / this.gridSize);

    // 1. 创建抽象节点
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const nodes = this.buildAbstractNodesForGrid(gx, gy);
        if (nodes.length > 0) {
          this.abstractNodes.set(`${gx},${gy}`, nodes);
        }
      }
    }

    // 2. 建立抽象边（相邻 grid 之间）
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        this.buildAbstractEdgesForGrid(gx, gy, gridW, gridH);
      }
    }

    this.abstractGraphBuilt = true;
  }

  /** 为单个 grid 创建抽象节点。 */
  private buildAbstractNodesForGrid(gx: number, gy: number): AbstractNode[] {
    const startX = gx * this.gridSize;
    const startY = gy * this.gridSize;
    const endX = Math.min(startX + this.gridSize, this.width);
    const endY = Math.min(startY + this.gridSize, this.height);

    // 收集该 grid 内每个 domain 的格子
    const domainCells = new Map<number, Array<{ x: number; y: number }>>();

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const domainId = this.domainIds[y][x];
        if (domainId !== -1) {
          let cells = domainCells.get(domainId);
          if (!cells) {
            cells = [];
            domainCells.set(domainId, cells);
          }
          cells.push({ x, y });
        }
      }
    }

    const nodes: AbstractNode[] = [];
    for (const [domainId, cells] of domainCells) {
      // 计算中心点
      let sumX = 0;
      let sumY = 0;
      for (const c of cells) {
        sumX += c.x;
        sumY += c.y;
      }
      const centerX = Math.floor(sumX / cells.length);
      const centerY = Math.floor(sumY / cells.length);

      nodes.push({
        gridX: gx,
        gridY: gy,
        domainId,
        cells,
        centerX,
        centerY,
      });
    }

    return nodes;
  }

  /** 为单个 grid 建立与相邻 grid 的抽象边。 */
  private buildAbstractEdgesForGrid(gx: number, gy: number, gridW: number, gridH: number): void {
    const nodes = this.abstractNodes.get(`${gx},${gy}`);
    if (!nodes) return;

    const directions = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
    ];

    for (const node of nodes) {
      const edges: AbstractEdge[] = [];

      for (const dir of directions) {
        const ngx = gx + dir.dx;
        const ngy = gy + dir.dy;
        if (ngx < 0 || ngx >= gridW || ngy < 0 || ngy >= gridH) continue;

        const neighborNodes = this.abstractNodes.get(`${ngx},${ngy}`);
        if (!neighborNodes) continue;

        // 检查边界连通性：若两个 grid 中有相同 domain ID 的格子相邻，则建立边
        for (const neighbor of neighborNodes) {
          if (this.areGridsConnectedByDomain(node, neighbor)) {
            const cost = Math.max(Math.abs(node.centerX - neighbor.centerX), Math.abs(node.centerY - neighbor.centerY));
            edges.push({
              from: { gridX: gx, gridY: gy, domainId: node.domainId },
              to: { gridX: ngx, gridY: ngy, domainId: neighbor.domainId },
              cost,
            });
            // 反向边
            const reverseKey = `${ngx},${ngy},${neighbor.domainId}`;
            const reverseEdges = this.abstractEdges.get(reverseKey) ?? [];
            reverseEdges.push({
              from: { gridX: ngx, gridY: ngy, domainId: neighbor.domainId },
              to: { gridX: gx, gridY: gy, domainId: node.domainId },
              cost,
            });
            this.abstractEdges.set(reverseKey, reverseEdges);
          }
        }
      }

      if (edges.length > 0) {
        this.abstractEdges.set(`${gx},${gy},${node.domainId}`, edges);
      }
    }
  }

  /** 判断两个抽象节点是否通过边界上的相邻格子连通（相同 domain）。 */
  private areGridsConnectedByDomain(a: AbstractNode, b: AbstractNode): boolean {
    if (a.domainId !== b.domainId) return false;

    // 检查 a 的格子中是否有与 b 的格子四方向相邻的
    for (const ca of a.cells) {
      for (const cb of b.cells) {
        const dx = Math.abs(ca.x - cb.x);
        const dy = Math.abs(ca.y - cb.y);
        if (dx + dy === 1) return true;
      }
    }
    return false;
  }

  /** 四方向 flood-fill 标记一个连通区域。 */
  private floodFill(startX: number, startY: number, domainId: number): void {
    const queue: Array<[number, number]> = [[startX, startY]];
    this.domainIds[startY][startX] = domainId;

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;

      const neighbors: Array<[number, number]> = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
        if (this.domainIds[ny][nx] !== -1) continue;
        if (!this.isPassable(nx, ny)) continue;

        this.domainIds[ny][nx] = domainId;
        queue.push([nx, ny]);
      }
    }
  }
}
