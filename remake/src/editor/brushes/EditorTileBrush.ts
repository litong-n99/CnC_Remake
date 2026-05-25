import type { CPos } from '../../game/terrain/Coordinates';
import type { TerrainTemplateInfo, TerrainTile, TileSet } from '../../game/terrain/TileSet';
import type { TerrainGrid, CellData } from '../../game/terrain/TerrainGrid';
import { LandType } from '../../game/terrain/TerrainGrid';
import { EditorTileAction } from '../actions/EditorAction';

/**
 * OpenRA-style terrain tile brush.
 *
 * Holds a selected {@link TerrainTemplateInfo} and can paint it onto the
 * {@link TerrainGrid} at any cell coordinate.  Multi-cell templates
 * (e.g. 2×2 cliffs) are placed with the top-left corner at the brush
 * position.  `pickAny` templates randomise their index per placement.
 *
 * Source: OpenRA.Mods.Common/EditorBrushes/EditorTileBrush.cs
 */
export class EditorTileBrush {
  constructor(
    private readonly terrainGrid: TerrainGrid,
    private tileSet: TileSet | null,
    private template: TerrainTemplateInfo | null = null
  ) {}

  /** Select the template to paint. */
  selectTemplate(template: TerrainTemplateInfo | null): void {
    this.template = template;
  }

  getTemplate(): TerrainTemplateInfo | null {
    return this.template;
  }

  setTileSet(tileSet: TileSet | null): void {
    this.tileSet = tileSet;
  }

  /**
   * Paint the current template at `cpos` (top-left corner).
   * Returns an {@link EditorTileAction} for undo support.
   */
  paintCell(cpos: CPos): EditorTileAction | null {
    if (!this.template || !this.tileSet) return null;

    const changes: Array<{
      readonly cpos: CPos;
      readonly oldData: CellData;
      readonly newData: CellData;
    }> = [];

    const { width: tw, height: th } = this.template.size;

    for (let dy = 0; dy < th; dy++) {
      for (let dx = 0; dx < tw; dx++) {
        const x = cpos.x + dx;
        const y = cpos.y + dy;
        if (!this.terrainGrid.getCellLayer().contains(x, y)) continue;

        const idx = dy * tw + dx;
        const tileInfo = this.template.tiles[idx];
        if (!tileInfo) continue;

        const oldData = this.terrainGrid.getCellLayer().get(x, y);
        const tile: TerrainTile = {
          type: this.template.id,
          index: this.resolveIndex(idx),
        };

        // Compute LandType fallback from the tile's terrain type name
        const typeName = this.tileSet.terrainTypes[tileInfo.terrainType]?.type;
        const landType = this.nameToLandType(typeName);

        const newData: CellData = { landType, terrainTile: tile };
        changes.push({ cpos: { x, y }, oldData, newData });
      }
    }

    if (changes.length === 0) return null;

    const action = new EditorTileAction(this.terrainGrid, changes);
    action.do();
    return action;
  }

  /**
   * Flood-fill the current template over all connected cells that share
   * the same terrain-type name as the cell at `startCpos`.
   *
   * BFS is used; the fill only spreads to 4-neighbours with the same
   * terrain type.  Each replacement uses the current template, stepping
   * by template size.
   */
  floodFill(startCpos: CPos): EditorTileAction | null {
    if (!this.template || !this.tileSet) return null;

    const startCell = this.terrainGrid.getCellLayer().get(startCpos.x, startCpos.y);
    const startTypeName = this.getTerrainTypeName(startCell);
    if (!startTypeName) return null;

    const { width: tw, height: th } = this.template.size;
    const w = this.terrainGrid.getWidth();
    const h = this.terrainGrid.getHeight();

    // BFS to find all connected cells with the same terrain type
    const visited = new Set<string>();
    const toFill: CPos[] = [];
    const queue: CPos[] = [startCpos];
    visited.add(`${startCpos.x},${startCpos.y}`);

    while (queue.length > 0) {
      const current = queue.shift()!;
      toFill.push(current);

      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (const [dx, dy] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const key = `${nx},${ny}`;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (visited.has(key)) continue;

        const neighbor = this.terrainGrid.getCellLayer().get(nx, ny);
        const neighborType = this.getTerrainTypeName(neighbor);
        if (neighborType === startTypeName) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    // Replace each cell in the flood region with the current template.
    // For multi-cell templates we place one template per cell (1×1 stepping).
    const changes: Array<{
      readonly cpos: CPos;
      readonly oldData: CellData;
      readonly newData: CellData;
    }> = [];

    for (const cell of toFill) {
      // For multi-cell templates, only place when the cell is a valid
      // top-left corner (i.e. enough room for the full footprint).
      if (cell.x + tw > w || cell.y + th > h) continue;

      for (let dy = 0; dy < th; dy++) {
        for (let dx = 0; dx < tw; dx++) {
          const x = cell.x + dx;
          const y = cell.y + dy;
          const idx = dy * tw + dx;
          const tileInfo = this.template.tiles[idx];
          if (!tileInfo) continue;

          // Skip if this cell was already changed by an earlier placement
          const changeKey = `${x},${y}`;
          if (changes.some((c) => `${c.cpos.x},${c.cpos.y}` === changeKey)) continue;

          const oldData = this.terrainGrid.getCellLayer().get(x, y);
          const tile: TerrainTile = {
            type: this.template.id,
            index: this.resolveIndex(idx),
          };
          const typeName = this.tileSet.terrainTypes[tileInfo.terrainType]?.type;
          const landType = this.nameToLandType(typeName);
          const newData: CellData = { landType, terrainTile: tile };
          changes.push({ cpos: { x, y }, oldData, newData });
        }
      }
    }

    if (changes.length === 0) return null;

    const action = new EditorTileAction(this.terrainGrid, changes);
    action.do();
    return action;
  }

  /** Resolve the concrete index for a template cell. */
  private resolveIndex(baseIdx: number): number {
    if (!this.template) return baseIdx;
    if (this.template.pickAny) {
      return Math.floor(Math.random() * this.template.tiles.length);
    }
    return baseIdx;
  }

  /** Extract the terrain-type name from a CellData (via its terrainTile or landType fallback). */
  private getTerrainTypeName(cell: CellData): string | undefined {
    if (!this.tileSet) return undefined;
    if (cell.terrainTile) {
      const template = this.tileSet.templates.get(cell.terrainTile.type);
      if (template) {
        const info = template.tiles[cell.terrainTile.index];
        if (info) {
          return this.tileSet.terrainTypes[info.terrainType]?.type;
        }
      }
    }
    // Fallback: map LandType enum back to a terrain-type name
    return this.landTypeToName(cell.landType);
  }

  private landTypeToName(lt: LandType): string | undefined {
    switch (lt) {
      case LandType.Clear:
        return 'Clear';
      case LandType.Road:
        return 'Road';
      case LandType.Water:
        return 'Water';
      case LandType.Rock:
        return 'Rock';
      case LandType.Wall:
        return 'Wall';
      case LandType.Tiberium:
        return 'Tiberium';
      case LandType.Beach:
        return 'Beach';
      case LandType.Rough:
        return 'Rough';
      case LandType.River:
        return 'River';
      default:
        return undefined;
    }
  }

  /** Map a terrain-type name to our simplified {@link LandType} enum. */
  private nameToLandType(name: string | undefined): LandType {
    if (!name) return LandType.Clear;
    switch (name.toLowerCase()) {
      case 'clear':
        return LandType.Clear;
      case 'road':
      case 'pavement':
        return LandType.Road;
      case 'water':
        return LandType.Water;
      case 'rock':
      case 'cliff':
        return LandType.Rock;
      case 'wall':
        return LandType.Wall;
      case 'tiberium':
      case 'ore':
        return LandType.Tiberium;
      case 'beach':
      case 'shore':
        return LandType.Beach;
      case 'rough':
        return LandType.Rough;
      case 'river':
        return LandType.River;
      default:
        return LandType.Clear;
    }
  }
}
