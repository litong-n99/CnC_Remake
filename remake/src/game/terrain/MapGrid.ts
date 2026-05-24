import type { CPos } from './CellLayer';

/**
 * MapGrid — Defines the geometric rules of the game grid.
 *
 * Source: OpenRA.Game/Map/MapGrid.cs
 *
 * Currently supports only Rectangular grids (isometric support is reserved
 * for Task 9.5).  The grid determines:
 *   - World-unit size of one cell
 *   - How CPos maps to world coordinates
 *   - Sub-cell offsets for infantry sharing
 */

export type GridType = 'Rectangular' | 'RectangularIsometric';

export interface MapGridOptions {
  type?: GridType;
  tileSize?: { width: number; height: number };
  /** Default sub-cell offsets (world units).  Index 0 = FullCell, rest = infantry positions. */
  subCellOffsets?: { x: number; z: number }[];
  /** How many world units one logical cell occupies (for rectangular). */
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
  readonly cellSize: number;

  constructor(options: MapGridOptions = {}) {
    this.type = options.type ?? 'Rectangular';
    this.tileSize = options.tileSize ?? { width: 24, height: 24 };
    this.subCellOffsets = options.subCellOffsets ?? DEFAULT_SUB_CELL_OFFSETS;
    this.cellSize = options.cellSize ?? 1;
  }

  /** Centre of a cell in world coordinates (y = 0 for flat ground). */
  centerOfCell(cpos: CPos): { x: number; y: number; z: number } {
    if (this.type === 'Rectangular') {
      return {
        x: cpos.x * this.cellSize + this.cellSize / 2,
        y: 0,
        z: cpos.y * this.cellSize + this.cellSize / 2,
      };
    }
    // Isometric placeholder — to be implemented in Task 9.5
    return {
      x: cpos.x * this.cellSize + this.cellSize / 2,
      y: 0,
      z: cpos.y * this.cellSize + this.cellSize / 2,
    };
  }

  /** Sub-cell centre in world coordinates, relative to the cell centre. */
  centerOfSubCell(cpos: CPos, subCellIndex: number): { x: number; y: number; z: number } {
    const cellCenter = this.centerOfCell(cpos);
    const offset = this.subCellOffsets[subCellIndex] ?? this.subCellOffsets[0];
    return {
      x: cellCenter.x + offset.x,
      y: 0,
      z: cellCenter.z + offset.z,
    };
  }

  /** Convert world position to the containing cell (Rectangular only). */
  cellContaining(worldX: number, worldZ: number): { x: number; y: number } {
    if (this.type === 'Rectangular') {
      return {
        x: Math.floor(worldX / this.cellSize),
        y: Math.floor(worldZ / this.cellSize),
      };
    }
    // Isometric placeholder
    return {
      x: Math.floor(worldX / this.cellSize),
      y: Math.floor(worldZ / this.cellSize),
    };
  }

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
