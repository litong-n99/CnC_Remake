import { CellLayer, type CPos } from '../terrain/CellLayer';
import type { TerrainGrid } from '../terrain/TerrainGrid';

/**
 * ResourceLayer — Manages harvestable resources (Tiberium / Ore) on the map.
 *
 * Each cell stores:
 *   - type   : resource type index (0 = none)
 *   - density: 0–255 (harvestable amount)
 *
 * Growth logic (per tick):
 *   - Existing resources grow by GrowthRate up to MaxDensity
 *   - Empty adjacent Clear cells may receive new resource via SpreadRate
 *
 * Source: OpenRA.Mods.Common/Traits/World/ResourceLayer.cs
 */

export interface ResourceTypeInfo {
  readonly name: string;
  /** Terrain type name that this resource covers (e.g. "Clear"). */
  readonly terrainType: string;
  readonly maxDensity: number;
  /** Probability [0,1] to increase density by 1 per tick. */
  readonly growthRate: number;
  /** Probability [0,1] to spread to an adjacent empty cell per tick. */
  readonly spreadRate: number;
  /** Credits per density unit harvested. */
  readonly value: number;
}

export interface ResourceCell {
  readonly type: number;
  readonly density: number;
}

export type ResourceCellChangedHandler = (cell: CPos, oldCell: ResourceCell, newCell: ResourceCell) => void;

export class ResourceLayer {
  private readonly layer: CellLayer<ResourceCell>;
  private readonly listeners: ResourceCellChangedHandler[] = [];
  private readonly typeInfos: ReadonlyMap<number, ResourceTypeInfo>;

  constructor(width: number, height: number, typeInfos: readonly ResourceTypeInfo[]) {
    this.layer = new CellLayer<ResourceCell>(width, height, { type: 0, density: 0 });
    this.typeInfos = new Map(typeInfos.map((t, i) => [i + 1, t])); // index 1-based; 0 = none

    // Forward CellLayer events to ResourceLayer listeners
    this.layer.onCellEntryChanged((cell, oldV, newV) => {
      for (const cb of this.listeners) {
        cb(cell, oldV, newV);
      }
    });
  }

  // ── Read ──

  get(x: number, y: number): ResourceCell {
    return this.layer.get(x, y);
  }

  getDensity(x: number, y: number): number {
    return this.layer.get(x, y).density;
  }

  getType(x: number, y: number): number {
    return this.layer.get(x, y).type;
  }

  /** True when the cell has harvestable resource (>0 density). */
  isHarvestable(x: number, y: number): boolean {
    return this.layer.get(x, y).density > 0;
  }

  // ── Write ──

  /** Set resource type + density at a cell. */
  set(x: number, y: number, type: number, density: number): void {
    if (!this.layer.contains(x, y)) return;
    const clampedDensity = Math.max(0, Math.min(255, density));
    this.layer.set(x, y, { type, density: clampedDensity });
  }

  /** Add density (capped at max).  Returns actual amount added. */
  addDensity(x: number, y: number, amount: number): number {
    const cell = this.layer.get(x, y);
    if (cell.type === 0) return 0;
    const info = this.typeInfos.get(cell.type);
    const max = info?.maxDensity ?? 255;
    const newDensity = Math.min(max, cell.density + amount);
    const added = newDensity - cell.density;
    if (added > 0) {
      this.layer.set(x, y, { type: cell.type, density: newDensity });
    }
    return added;
  }

  /** Reduce density (floor at 0).  Returns actual amount removed. */
  harvest(x: number, y: number, amount: number): number {
    const cell = this.layer.get(x, y);
    if (cell.density <= 0) return 0;
    const newDensity = Math.max(0, cell.density - amount);
    const removed = cell.density - newDensity;
    if (removed > 0) {
      this.layer.set(x, y, { type: cell.type, density: newDensity });
    }
    return removed;
  }

  // ── Events ──

  onCellChanged(handler: ResourceCellChangedHandler): () => void {
    this.listeners.push(handler);
    return () => {
      const i = this.listeners.indexOf(handler);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  // ── Growth / Spread ──

  /**
   * Advance resource simulation by one tick.
   *
   * @param terrainGrid  — used to check terrain type for spread eligibility
   * @param getTerrainTypeName — callback to resolve terrain type name at (x,y)
   */
  tick(_terrainGrid: TerrainGrid, getTerrainTypeName: (x: number, y: number) => string | undefined): void {
    const w = this.layer.getWidth();
    const h = this.layer.getHeight();

    // Phase 1: growth
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = this.layer.get(x, y);
        if (cell.type === 0 || cell.density <= 0) continue;
        const info = this.typeInfos.get(cell.type);
        if (!info) continue;

        if (Math.random() < info.growthRate && cell.density < info.maxDensity) {
          this.layer.set(x, y, { type: cell.type, density: cell.density + 1 });
        }
      }
    }

    // Phase 2: spread (to avoid order-dependency we collect candidates first)
    const candidates: Array<{ x: number; y: number; type: number }> = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = this.layer.get(x, y);
        if (cell.type === 0 || cell.density <= 0) continue;
        const info = this.typeInfos.get(cell.type);
        if (!info || info.spreadRate <= 0) continue;

        if (Math.random() < info.spreadRate) {
          // Pick a random neighbour
          const dirs = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
          ];
          const dir = dirs[Math.floor(Math.random() * dirs.length)];
          const nx = x + dir.x;
          const ny = y + dir.y;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;

          const neighbour = this.layer.get(nx, ny);
          if (neighbour.type !== 0) continue; // already has resource

          // Check terrain compatibility
          const terrainName = getTerrainTypeName(nx, ny)?.toLowerCase();
          if (terrainName && terrainName !== info.terrainType.toLowerCase()) {
            // Only spread onto matching terrain type (typically "Clear")
            continue;
          }

          candidates.push({ x: nx, y: ny, type: cell.type });
        }
      }
    }

    for (const c of candidates) {
      const existing = this.layer.get(c.x, c.y);
      if (existing.type === 0) {
        this.layer.set(c.x, c.y, { type: c.type, density: 1 });
      }
    }
  }

  // ── Queries ──

  /** Return all cells that have harvestable resource. */
  getHarvestableCells(): Array<{ x: number; y: number; type: number; density: number }> {
    const result: Array<{ x: number; y: number; type: number; density: number }> = [];
    this.layer.forEach((cell, x, y) => {
      if (cell.density > 0) {
        result.push({ x, y, type: cell.type, density: cell.density });
      }
    });
    return result;
  }

  getWidth(): number {
    return this.layer.getWidth();
  }

  getHeight(): number {
    return this.layer.getHeight();
  }
}
