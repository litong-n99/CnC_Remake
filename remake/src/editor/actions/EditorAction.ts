import type { CPos } from '../../game/terrain/Coordinates';
import type { CellData } from '../../game/terrain/TerrainGrid';
import type { ResourceCell } from '../../game/economy/ResourceLayer';
import type { TerrainGrid } from '../../game/terrain/TerrainGrid';
import type { ResourceLayer } from '../../game/economy/ResourceLayer';

/**
 * Editor action base class — supports Do/Undo for the map editor.
 *
 * Source: OpenRA.Mods.Common/EditorBrushes/EditorAction.cs
 */
export abstract class EditorAction {
  abstract do(): void;
  abstract undo(): void;
  abstract getDescription(): string;

  /**
   * Attempt to merge another action into this one (e.g. drag painting).
   * Returns the merged action, or null if merge is not possible.
   */
  merge(_other: EditorAction): EditorAction | null {
    return null;
  }
}

/** A single cell change for terrain tiles. */
interface TerrainChange {
  readonly cpos: CPos;
  readonly oldData: CellData;
  readonly newData: CellData;
}

/**
 * Terrain tile placement action — records old/new CellData for every
 * affected cell so undo can restore the exact previous state.
 */
export class EditorTileAction extends EditorAction {
  constructor(
    private readonly terrainGrid: TerrainGrid,
    private readonly changes: readonly TerrainChange[]
  ) {
    super();
  }

  do(): void {
    for (const c of this.changes) {
      this.terrainGrid.setCellData(c.cpos.x, c.cpos.y, c.newData);
    }
  }

  undo(): void {
    for (let i = this.changes.length - 1; i >= 0; i--) {
      const c = this.changes[i];
      this.terrainGrid.setCellData(c.cpos.x, c.cpos.y, c.oldData);
    }
  }

  getDescription(): string {
    return `Paint ${this.changes.length} cell(s)`;
  }

  merge(other: EditorAction): EditorAction | null {
    if (!(other instanceof EditorTileAction)) return null;
    // Merge if same terrain grid and no overlapping cells
    const myCells = new Set(this.changes.map((c) => `${c.cpos.x},${c.cpos.y}`));
    for (const c of other.changes) {
      if (myCells.has(`${c.cpos.x},${c.cpos.y}`)) return null;
    }
    return new EditorTileAction(this.terrainGrid, [...this.changes, ...other.changes]);
  }
}

/** A single cell change for resources. */
interface ResourceChange {
  readonly cpos: CPos;
  readonly oldCell: ResourceCell;
  readonly newCell: ResourceCell;
}

/**
 * Resource placement action — records old/new ResourceCell for undo.
 */
export class EditorResourceAction extends EditorAction {
  constructor(
    private readonly resourceLayer: ResourceLayer,
    private readonly changes: readonly ResourceChange[]
  ) {
    super();
  }

  do(): void {
    for (const c of this.changes) {
      this.resourceLayer.set(c.cpos.x, c.cpos.y, c.newCell.type, c.newCell.density);
    }
  }

  undo(): void {
    for (let i = this.changes.length - 1; i >= 0; i--) {
      const c = this.changes[i];
      this.resourceLayer.set(c.cpos.x, c.cpos.y, c.oldCell.type, c.oldCell.density);
    }
  }

  getDescription(): string {
    return `Resource ${this.changes.length} cell(s)`;
  }
}
