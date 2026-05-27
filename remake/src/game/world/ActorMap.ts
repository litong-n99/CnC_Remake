import { LocomotorCache } from './LocomotorCache';
import { SubCell, INFANTRY_SUBCELLS } from '../terrain/SubCell';

/**
 * 格子级单位占用映射 + Bin 空间划分 — OpenRA ActorMap 简化版。
 *
 * - Cell 映射：key = `"x,y"`, value = 单位 ID 集合。
 * - Bin 划分：每格 10×10 世界单位，加速范围查询。
 *
 * Source: OpenRA.Mods.Common/Traits/World/ActorMap.cs
 */
export class ActorMap {
  private static instance: ActorMap | null = null;

  // key = "x,y", value = Map<unitId, SubCell>
  private cells = new Map<string, Map<string, SubCell>>();

  // Bin spatial partition: bin size = 10 world units
  private readonly BIN_SIZE = 10;
  private bins = new Map<string, Set<string>>();
  private actorPositions = new Map<string, { x: number; y: number }>();

  static getInstance(): ActorMap {
    if (!ActorMap.instance) {
      ActorMap.instance = new ActorMap();
    }
    return ActorMap.instance;
  }

  private getKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private getBinKey(x: number, y: number): string {
    return `${Math.floor(x / this.BIN_SIZE)},${Math.floor(y / this.BIN_SIZE)}`;
  }

  /** 单位占据指定格子（带 SubCell）。 */
  occupy(id: string, x: number, y: number, subCell = SubCell.FullCell): void {
    const key = this.getKey(x, y);
    let map = this.cells.get(key);
    if (!map) {
      map = new Map<string, SubCell>();
      this.cells.set(key, map);
    }
    map.set(id, subCell);
    LocomotorCache.getInstance().markDirty(x, y);

    // Update bin
    this.updateBin(id, x, y);
  }

  /** 单位离开指定格子。 */
  vacate(id: string, x: number, y: number): void {
    const key = this.getKey(x, y);
    const map = this.cells.get(key);
    if (map) {
      map.delete(id);
      if (map.size === 0) {
        this.cells.delete(key);
      }
    }
    LocomotorCache.getInstance().markDirty(x, y);
  }

  /** 单位从一个格子移动到另一个格子（原子操作）。 */
  move(id: string, fromX: number, fromY: number, toX: number, toY: number): void {
    this.vacate(id, fromX, fromY);
    this.occupy(id, toX, toY);
  }

  /** 获取指定格子内的所有单位 ID。 */
  getOccupants(x: number, y: number): readonly string[] {
    const key = this.getKey(x, y);
    const map = this.cells.get(key);
    return map ? Array.from(map.keys()) : [];
  }

  /** 为步兵分配第一个可用的 SubCell。 */
  getAvailableSubCell(x: number, y: number): SubCell {
    const map = this.cells.get(this.getKey(x, y));
    const used = new Set(map?.values() ?? []);
    for (const sc of INFANTRY_SUBCELLS) {
      if (!used.has(sc)) return sc;
    }
    return SubCell.FullCell;
  }

  /** 查询某格子内指定单位的 SubCell。 */
  getSubCell(x: number, y: number, id: string): SubCell | undefined {
    return this.cells.get(this.getKey(x, y))?.get(id);
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

  // ── Bin 空间划分（Task 131）──

  private updateBin(id: string, x: number, y: number): void {
    // Remove from old bin
    const oldPos = this.actorPositions.get(id);
    if (oldPos) {
      const oldBinKey = this.getBinKey(oldPos.x, oldPos.y);
      const oldBin = this.bins.get(oldBinKey);
      if (oldBin) {
        oldBin.delete(id);
        if (oldBin.size === 0) this.bins.delete(oldBinKey);
      }
    }
    // Add to new bin
    const newBinKey = this.getBinKey(x, y);
    let newBin = this.bins.get(newBinKey);
    if (!newBin) {
      newBin = new Set<string>();
      this.bins.set(newBinKey, newBin);
    }
    newBin.add(id);
    this.actorPositions.set(id, { x, y });
  }

  /** Query actors inside an axis-aligned box (world coordinates). */
  actorsInBox(minX: number, minY: number, maxX: number, maxY: number): string[] {
    const result = new Set<string>();
    const minBinX = Math.floor(minX / this.BIN_SIZE);
    const minBinY = Math.floor(minY / this.BIN_SIZE);
    const maxBinX = Math.floor(maxX / this.BIN_SIZE);
    const maxBinY = Math.floor(maxY / this.BIN_SIZE);

    for (let bx = minBinX; bx <= maxBinX; bx++) {
      for (let by = minBinY; by <= maxBinY; by++) {
        const bin = this.bins.get(`${bx},${by}`);
        if (!bin) continue;
        for (const id of bin) {
          const pos = this.actorPositions.get(id);
          if (!pos) continue;
          if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
            result.add(id);
          }
        }
      }
    }
    return Array.from(result);
  }

  /** Query actors inside a circle (world coordinates). */
  actorsInCircle(centerX: number, centerY: number, radius: number): string[] {
    const result: string[] = [];
    const candidates = this.actorsInBox(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    for (const id of candidates) {
      const pos = this.actorPositions.get(id);
      if (!pos) continue;
      const dx = pos.x - centerX;
      const dy = pos.y - centerY;
      if (dx * dx + dy * dy <= radius * radius) {
        result.push(id);
      }
    }
    return result;
  }

  /** 清除所有占用记录（用于新游戏或重置）。 */
  clear(): void {
    this.cells.clear();
    this.bins.clear();
    this.actorPositions.clear();
    LocomotorCache.getInstance().clear();
  }

  /** 释放所有资源。 */
  dispose(): void {
    this.clear();
    ActorMap.instance = null;
  }
}
