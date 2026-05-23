/**
 * 格子级单位占用映射 — OpenRA ActorMap 简化版。
 *
 * 每个单位只在其当前 `Math.round(x), Math.round(y)` 位置注册。
 * key = `"x,y"`, value = 该格子内的单位 ID 集合。
 *
 * Source: OpenRA.Mods.Common/Traits/World/ActorMap.cs
 */
export class ActorMap {
  private static instance: ActorMap | null = null;

  // key = "x,y", value = Set<unitId>
  private cells = new Map<string, Set<string>>();

  static getInstance(): ActorMap {
    if (!ActorMap.instance) {
      ActorMap.instance = new ActorMap();
    }
    return ActorMap.instance;
  }

  private getKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /** 单位占据指定格子。 */
  occupy(id: string, x: number, y: number): void {
    const key = this.getKey(x, y);
    let set = this.cells.get(key);
    if (!set) {
      set = new Set<string>();
      this.cells.set(key, set);
    }
    set.add(id);
  }

  /** 单位离开指定格子。 */
  vacate(id: string, x: number, y: number): void {
    const key = this.getKey(x, y);
    const set = this.cells.get(key);
    if (set) {
      set.delete(id);
      if (set.size === 0) {
        this.cells.delete(key);
      }
    }
  }

  /** 单位从一个格子移动到另一个格子（原子操作）。 */
  move(id: string, fromX: number, fromY: number, toX: number, toY: number): void {
    this.vacate(id, fromX, fromY);
    this.occupy(id, toX, toY);
  }

  /** 获取指定格子内的所有单位 ID。 */
  getOccupants(x: number, y: number): readonly string[] {
    const key = this.getKey(x, y);
    const set = this.cells.get(key);
    return set ? Array.from(set) : [];
  }

  /** 指定格子是否被占用（至少有一个单位）。 */
  isOccupied(x: number, y: number): boolean {
    const key = this.getKey(x, y);
    const set = this.cells.get(key);
    return set !== undefined && set.size > 0;
  }

  /** 获取指定格子内的单位数量。 */
  getOccupantCount(x: number, y: number): number {
    const key = this.getKey(x, y);
    const set = this.cells.get(key);
    return set ? set.size : 0;
  }

  /** 获取所有被占用的格子坐标集合（格式 `"x,y"`）。 */
  getAllOccupiedCells(): ReadonlySet<string> {
    return new Set(this.cells.keys());
  }

  /** 清除所有占用记录（用于新游戏或重置）。 */
  clear(): void {
    this.cells.clear();
  }

  /** 释放所有资源。 */
  dispose(): void {
    this.clear();
    ActorMap.instance = null;
  }
}
