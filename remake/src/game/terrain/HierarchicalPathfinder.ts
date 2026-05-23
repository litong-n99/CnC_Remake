/**
 * Hierarchical Pathfinding — Domain Index
 *
 * OpenRA 对标: `OpenRA.Mods.Common/Pathfinder/HierarchicalPathFinder.cs`
 *
 * 核心思想：对整张地图基于地形可通行性做 flood-fill，为每个连通区域分配
 * domain ID。寻路前 O(1) 比较起点/终点的 domain ID，不同时直接返回 null，
 * 避免 A* 遍历整张地图才发现不可达。
 *
 * 当前只实现 terrain-only 层（isPassable 决定连通性），建筑阻塞由 A* 处理。
 * 如需 terrain+immovable 层，可在建筑变动时调用 rebuild()。
 */

export class HierarchicalPathfinder {
  private readonly width: number;
  private readonly height: number;
  private readonly isPassable: (x: number, y: number) => boolean;

  /** domainIds[y][x] = domainId，-1 表示不可通行。 */
  private domainIds: number[][] = [];
  private domainCount = 0;

  constructor(width: number, height: number, isPassable: (x: number, y: number) => boolean) {
    this.width = width;
    this.height = height;
    this.isPassable = isPassable;
    this.rebuild();
  }

  /** 重新计算所有 domain（当地形变化时调用）。 */
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
