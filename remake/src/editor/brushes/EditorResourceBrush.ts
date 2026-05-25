import type { CPos } from '../../game/terrain/Coordinates';
import type { ResourceLayer } from '../../game/economy/ResourceLayer';
import { EditorResourceAction } from '../actions/EditorAction';

/**
 * OpenRA-style resource brush.
 *
 * Adds density to a single cell.  Shift-drag (handled by the caller)
 * allows batch painting.
 *
 * Source: OpenRA.Mods.Common/EditorBrushes/EditorResourceBrush.cs
 */
export class EditorResourceBrush {
  /** 1-based type index into the ResourceLayer's type table. 0 = none. */
  private resourceType = 1;
  private addAmount = 50;

  constructor(private readonly resourceLayer: ResourceLayer) {}

  selectResourceType(typeIndex: number): void {
    this.resourceType = typeIndex;
  }

  getResourceType(): number {
    return this.resourceType;
  }

  setAddAmount(amount: number): void {
    this.addAmount = amount;
  }

  /**
   * Add resource density at `cpos`.
   * Returns an {@link EditorResourceAction} for undo support.
   */
  paintCell(cpos: CPos): EditorResourceAction | null {
    const oldCell = this.resourceLayer.get(cpos.x, cpos.y);
    const actualAdded = this.resourceLayer.addDensity(cpos.x, cpos.y, this.addAmount);
    if (actualAdded === 0) return null;

    const newCell = this.resourceLayer.get(cpos.x, cpos.y);

    return new EditorResourceAction(this.resourceLayer, [
      {
        cpos,
        oldCell,
        newCell,
      },
    ]);
  }
}
