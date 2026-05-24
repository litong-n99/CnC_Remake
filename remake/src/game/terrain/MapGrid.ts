import type { CPos } from './CellLayer';
import {
  type MPos,
  type WPos,
  cposToMPos,
  mposToCPos,
  cposToWPos,
  wposToCPos,
  wposToBabylon,
  babylonToWPos,
  WDIST_PER_CELL_RECT,
  WDIST_PER_CELL_ISO,
} from './Coordinates';

/**
 * MapGrid — Defines the geometric rules of the game grid.
 *
 * Source: OpenRA.Game/Map/MapGrid.cs
 *
 * Supports both Rectangular and RectangularIsometric grids.
 * The grid determines:
 *   - World-unit size of one cell
 *   - How CPos maps to world coordinates (WPos)
 *   - How CPos maps to array coordinates (MPos)
 *   - Sub-cell offsets for infantry sharing
 */

export type GridType = 'Rectangular' | 'RectangularIsometric';

export interface MapGridOptions {
  type?: GridType;
  tileSize?: { width: number; height: number };
  /** Default sub-cell offsets (world units).  Index 0 = FullCell, rest = infantry positions. */
  subCellOffsets?: { x: number; z: number }[];
  /** How many Babylon world units one logical cell occupies. */
  cellSize?: number;
}

const DEFAULT_SUB_CELL_OFFSETS = [
  { x: 0, z: 0 }, // FullCell
  { x: -0.25, z: -0.25 }, // TopLeft
  { x: 0.25, z: -0.25 }, // TopRight
  { x: 0, z: 0 }, // Center (same as FullCell for now)
  { x: -0.25, z: 0.25 }, // BottomLeft
  { x: 0.25, z: 0.25 }, // BottomRight
];

export class MapGrid {
  readonly type: GridType;
  readonly tileSize: { width: number; height: number };
  readonly subCellOffsets: { readonly x: number; readonly z: number }[];
  /** Babylon world units per cell edge. */
  readonly cellSize: number;

  constructor(options: MapGridOptions = {}) {
    this.type = options.type ?? 'Rectangular';
    this.tileSize = options.tileSize ?? { width: 24, height: 24 };
    this.subCellOffsets = options.subCellOffsets ?? DEFAULT_SUB_CELL_OFFSETS;
    this.cellSize = options.cellSize ?? 1;
  }

  // ── CPos ↔ MPos ──

  /** Logical cell → array coordinate. */
  toMPos(cpos: CPos): MPos {
    return cposToMPos(cpos, this.type);
  }

  /** Array coordinate → logical cell. */
  fromMPos(mpos: MPos): CPos {
    return mposToCPos(mpos, this.type);
  }

  // ── CPos ↔ WPos ──

  /** Centre of a cell in WPos (y = 0 for flat ground). */
  centerOfCellWPos(cpos: CPos): WPos {
    return cposToWPos(cpos, this.type);
  }

  /** Sub-cell centre in WPos, relative to the cell centre. */
  centerOfSubCellWPos(cpos: CPos, subCellIndex: number): WPos {
    const cellCenter = this.centerOfCellWPos(cpos);
    const offset = this.subCellOffsets[subCellIndex] ?? this.subCellOffsets[0];
    // Sub-cell offsets are in Babylon world units; convert to WDist
    const scale =
      this.type === 'RectangularIsometric' ? WDIST_PER_CELL_ISO / this.cellSize : WDIST_PER_CELL_RECT / this.cellSize;
    return {
      x: Math.round(cellCenter.x + offset.x * scale),
      y: 0,
      z: Math.round(cellCenter.z + offset.z * scale),
    };
  }

  /** Convert world WPos to the containing cell (floor). */
  cellContainingWPos(wpos: WPos): CPos {
    return wposToCPos(wpos, this.type);
  }

  // ── WPos ↔ Babylon Vector3 ──

  /** Convert WPos to Babylon.js world units. */
  wposToBabylon(wpos: WPos): { x: number; y: number; z: number } {
    return wposToBabylon(wpos, this.type, this.cellSize);
  }

  /** Convert Babylon.js world units to WPos. */
  babylonToWPos(v: { x: number; y: number; z: number }): WPos {
    return babylonToWPos(v, this.type, this.cellSize);
  }

  // ── Legacy convenience API (kept for backward compatibility) ──

  /** Centre of a cell in Babylon world coordinates (y = 0 for flat ground). */
  centerOfCell(cpos: CPos): { x: number; y: number; z: number } {
    return this.wposToBabylon(this.centerOfCellWPos(cpos));
  }

  /** Sub-cell centre in Babylon world coordinates. */
  centerOfSubCell(cpos: CPos, subCellIndex: number): { x: number; y: number; z: number } {
    return this.wposToBabylon(this.centerOfSubCellWPos(cpos, subCellIndex));
  }

  /** Convert Babylon world position to the containing cell. */
  cellContaining(worldX: number, worldZ: number): { x: number; y: number } {
    const wpos = this.babylonToWPos({ x: worldX, y: 0, z: worldZ });
    const cpos = this.cellContainingWPos(wpos);
    return { x: cpos.x, y: cpos.y };
  }

  // ── WDist helpers ──

  /** WDist per cell edge for this grid type. */
  get wdistPerCell(): number {
    return this.type === 'RectangularIsometric' ? WDIST_PER_CELL_ISO : WDIST_PER_CELL_RECT;
  }

  // ── Neighbour search ──

  /** Pre-computed neighbour vectors sorted by distance, useful for annulus searches. */
  getTilesByDistance(maxDistance: number): { readonly x: number; readonly y: number }[][] {
    const buckets: { x: number; y: number }[][] = [];
    for (let d = 0; d <= maxDistance; d++) {
      buckets[d] = [];
    }

    for (let dy = -maxDistance; dy <= maxDistance; dy++) {
      for (let dx = -maxDistance; dx <= maxDistance; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev distance for rectangular grid
        if (dist <= maxDistance) {
          buckets[dist].push({ x: dx, y: dy });
        }
      }
    }
    return buckets;
  }
}
