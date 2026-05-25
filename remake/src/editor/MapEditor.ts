import type { TerrainGrid, CellData } from '../game/terrain/TerrainGrid';
import type { ResourceLayer } from '../game/economy/ResourceLayer';
import type { TileSet, TerrainTemplateInfo } from '../game/terrain/TileSet';
import type { Viewport } from '../game/terrain/Viewport';
import type { CPos } from '../game/terrain/Coordinates';
import type { MapYaml, MapBinData, MapTile, MapResourceCell } from '../game/terrain/MapFormat';
import { EditorAction } from './actions/EditorAction';
import { EditorTileBrush } from './brushes/EditorTileBrush';
import { EditorResourceBrush } from './brushes/EditorResourceBrush';
import { LandType } from '../game/terrain/TerrainGrid';

export type EditorTool = 'tile' | 'resource';

/**
 * Map Editor — manages brushes, undo/redo, and OpenRA map export.
 *
 * Replaces the previous WIP stub with a functional implementation.
 *
 * Source: OpenRA.Mods.Common/EditorBrushes/EditorDefaultBrush.cs
 */
export class MapEditor {
  private readonly tileBrush: EditorTileBrush;
  private readonly resourceBrush: EditorResourceBrush;
  private undoStack: EditorAction[] = [];
  private redoStack: EditorAction[] = [];
  private currentTool: EditorTool = 'tile';
  private isPainting = false;
  private lastPaintedCell = '';
  private boundHandlers: {
    mousedown: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    mouseup: () => void;
  } | null = null;

  constructor(
    private readonly terrainGrid: TerrainGrid,
    private readonly resourceLayer: ResourceLayer,
    private tileSet: TileSet | null,
    private readonly viewport: Viewport | null = null
  ) {
    this.tileBrush = new EditorTileBrush(terrainGrid, tileSet, null);
    this.resourceBrush = new EditorResourceBrush(resourceLayer);
  }

  // ── TileSet management ──

  setTileSet(tileSet: TileSet | null): void {
    this.tileSet = tileSet;
    this.tileBrush.setTileSet(tileSet);
    this.tileBrush.selectTemplate(null);
  }

  getTileSet(): TileSet | null {
    return this.tileSet;
  }

  // ── Tool selection ──

  selectTool(tool: EditorTool): void {
    this.currentTool = tool;
  }

  getCurrentTool(): EditorTool {
    return this.currentTool;
  }

  selectTileBrush(templateId: number): boolean {
    if (!this.tileSet) return false;
    const template = this.tileSet.templates.get(templateId) ?? null;
    this.tileBrush.selectTemplate(template);
    this.currentTool = 'tile';
    return template !== null;
  }

  getSelectedTemplate(): TerrainTemplateInfo | null {
    return this.tileBrush.getTemplate();
  }

  selectResourceBrush(resourceType: number): void {
    this.resourceBrush.selectResourceType(resourceType);
    this.currentTool = 'resource';
  }

  // ── Painting (programmatic entry-point) ──

  paintCell(cpos: CPos): boolean {
    const action = this.currentTool === 'tile' ? this.tileBrush.paintCell(cpos) : this.resourceBrush.paintCell(cpos);
    if (!action) return false;
    this.pushAction(action);
    return true;
  }

  floodFill(cpos: CPos): boolean {
    const action = this.tileBrush.floodFill(cpos);
    if (!action) return false;
    this.pushAction(action);
    return true;
  }

  // ── Undo / Redo ──

  undo(): boolean {
    const action = this.undoStack.pop();
    if (!action) return false;
    action.undo();
    this.redoStack.push(action);
    return true;
  }

  redo(): boolean {
    const action = this.redoStack.pop();
    if (!action) return false;
    action.do();
    this.undoStack.push(action);
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoDescription(): string | null {
    const action = this.undoStack[this.undoStack.length - 1];
    return action?.getDescription() ?? null;
  }

  // ── Mouse interaction (optional, for future UI) ──

  attachToCanvas(canvas: HTMLCanvasElement): void {
    this.detach();

    const mousedown = (e: MouseEvent) => {
      if (e.button !== 0) return; // left button only
      const cpos = this.viewport?.viewToCell(e.clientX, e.clientY);
      if (!cpos) return;

      if (e.shiftKey) {
        this.floodFill(cpos);
        return;
      }

      this.isPainting = true;
      this.lastPaintedCell = `${cpos.x},${cpos.y}`;
      this.paintCell(cpos);
    };

    const mousemove = (e: MouseEvent) => {
      if (!this.isPainting) return;
      const cpos = this.viewport?.viewToCell(e.clientX, e.clientY);
      if (!cpos) return;
      const key = `${cpos.x},${cpos.y}`;
      if (key === this.lastPaintedCell) return;
      this.lastPaintedCell = key;
      this.paintCell(cpos);
    };

    const mouseup = () => {
      this.isPainting = false;
      this.lastPaintedCell = '';
    };

    canvas.addEventListener('mousedown', mousedown);
    canvas.addEventListener('mousemove', mousemove);
    window.addEventListener('mouseup', mouseup);

    this.boundHandlers = { mousedown, mousemove, mouseup };
  }

  detach(): void {
    if (!this.boundHandlers) return;
    const canvas = this.viewport ? document.getElementById('app') : null;
    if (canvas) {
      canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
      canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
    }
    window.removeEventListener('mouseup', this.boundHandlers.mouseup);
    this.boundHandlers = null;
  }

  // ── Export to OpenRA format ──

  /**
   * Export the current map state as OpenRA `MapYaml` + `MapBinData`.
   */
  exportToOpenRA(): { mapYaml: MapYaml; mapBin: MapBinData } {
    const w = this.terrainGrid.getWidth();
    const h = this.terrainGrid.getHeight();

    const tiles: MapTile[] = [];
    const heights: number[] = [];
    const resources: MapResourceCell[] = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = this.terrainGrid.getCellLayer().get(x, y);
        const tile = this.cellDataToMapTile(cell);
        tiles.push(tile);

        // Height: read from terrainTile info if available, else 0
        let height = 0;
        if (cell.terrainTile && this.tileSet) {
          const template = this.tileSet.templates.get(cell.terrainTile.type);
          const info = template?.tiles[cell.terrainTile.index];
          if (info) height = info.height;
        }
        heights.push(height);

        const res = this.resourceLayer.get(x, y);
        resources.push({ type: res.type, density: res.density });
      }
    }

    const cellCount = w * h;
    const header = {
      format: 11,
      width: w,
      height: h,
      tilesOffset: 17,
      heightsOffset: 17 + cellCount * 3,
      resourcesOffset: 17 + cellCount * 4,
    };

    const mapBin: MapBinData = { header, tiles, heights, resources };

    const mapYaml: MapYaml = {
      MapFormat: 11,
      RequiresMod: 'ra',
      Title: 'CnC Remake Export',
      Author: 'MapEditor',
      Tileset: this.tileSet?.name ?? 'TEMPERAT',
      MapSize: { width: w, height: h },
      Bounds: { x: 0, y: 0, width: w, height: h },
      Visibility: 'Lobby',
      Categories: ['Conquest'],
      Players: [
        {
          id: 'Neutral',
          name: 'Neutral',
          ownsWorld: true,
          nonCombatant: true,
          playable: false,
          faction: 'Random',
        },
      ],
      Actors: [],
    };

    return { mapYaml, mapBin };
  }

  // ── Internal helpers ──

  private pushAction(action: EditorAction): void {
    // Try to merge with the last action (for drag painting)
    const last = this.undoStack[this.undoStack.length - 1];
    if (last) {
      const merged = last.merge(action);
      if (merged) {
        this.undoStack[this.undoStack.length - 1] = merged;
        return;
      }
    }
    this.undoStack.push(action);
    this.redoStack = []; // clear redo on new action
  }

  /** Convert a CellData to the nearest MapTile for export. */
  private cellDataToMapTile(cell: CellData): MapTile {
    if (cell.terrainTile) {
      return { type: cell.terrainTile.type, index: cell.terrainTile.index };
    }
    // Fallback: landType → default tile type
    return { type: this.landTypeToDefaultType(cell.landType), index: 0 };
  }

  private landTypeToDefaultType(lt: LandType): number {
    switch (lt) {
      case LandType.Clear:
        return 1;
      case LandType.Water:
        return 0;
      case LandType.Rock:
        return 2;
      case LandType.Road:
        return 3;
      case LandType.Tiberium:
        return 5;
      case LandType.Beach:
        return 6;
      case LandType.Rough:
        return 7;
      case LandType.River:
        return 8;
      case LandType.Wall:
        return 4;
      default:
        return 1;
    }
  }
}
