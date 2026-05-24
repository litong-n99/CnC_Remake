import { Scene, Mesh, Vector3, VertexBuffer, Color3, Color4 } from '@babylonjs/core';
import { MeshBuilder } from '@babylonjs/core';
import { TerrainMaterial } from '../../renderer/materials/TerrainMaterial';
import { CellLayer, type CellEntryChangedHandler } from './CellLayer';
import { MapGrid } from './MapGrid';
import type { TileSet, TerrainTile } from './TileSet';
import { DefaultTileCache } from './DefaultTileCache';

/**
 * Terrain types translated from the original C&C `LandType` enum
 * (`DEFINES.H` lines 2926–2940).
 */
export enum LandType {
  Clear = 0,
  Road = 1,
  Water = 2,
  Rock = 3,
  Wall = 4,
  Tiberium = 5,
  Beach = 6,
  Rough = 7,
  River = 8,
}

/** Per-cell data.  landType is kept for backward compatibility;
 * terrainTile references the TileSet template system (Task 9.2). */
export interface CellData {
  landType: LandType;
  terrainTile?: import('./TileSet').TerrainTile;
}

/**
 * Cell-based terrain grid rendered as a **single unified mesh** with vertex
 * colours.  This eliminates the inter-cell gaps that appear when using
 * thousands of individual GroundMesh tiles.
 *
 * Each cell owns 4 independent vertices (not shared with neighbours) so
 * colour boundaries are perfectly sharp.  A wireframe line-grid overlay
 * can optionally be shown for debugging.
 *
 * Task 9.1 upgrade: internal storage migrated from raw `CellData[][]` to
 * `CellLayer<CellData>` with event-driven updates.
 */
export class TerrainGrid {
  private cellLayer: CellLayer<CellData>;
  private mapGrid: MapGrid;
  private tileCache: DefaultTileCache | null = null;
  private terrainMesh: Mesh | null = null;
  private gridLines: Mesh | null = null;
  private terrainMaterial: TerrainMaterial;

  constructor(scene: Scene, width = 64, height = 64) {
    this.cellLayer = new CellLayer<CellData>(width, height, { landType: LandType.Clear });
    this.mapGrid = new MapGrid();
    this.terrainMaterial = new TerrainMaterial(scene);

    this.createMesh(scene);
    this.createGridLines(scene);
  }

  // ── TileSet integration ──

  /** Load a TileSet and rebuild the tile cache.  Does NOT change existing cell data. */
  async loadTileSet(tileSet: TileSet): Promise<void> {
    this.tileCache = new DefaultTileCache(tileSet);
  }

  getTileSet(): TileSet | null {
    return this.tileCache?.getTileSet() ?? null;
  }

  getTileCache(): DefaultTileCache | null {
    return this.tileCache;
  }

  /** Set a cell to a specific template tile.  Triggers CellEntryChanged. */
  setTerrainTile(x: number, y: number, tile: TerrainTile): void {
    if (!this.cellLayer.contains(x, y)) return;
    const old = this.cellLayer.get(x, y);
    const landType = this.tileCache?.getLandTypeFallback(tile) ?? old.landType;
    this.cellLayer.set(x, y, { landType, terrainTile: tile });
    this.updateCellColor(x, y);
  }

  /** Read the TerrainTile for a cell (undefined if not set). */
  getTerrainTile(x: number, y: number): TerrainTile | undefined {
    return this.cellLayer.get(x, y).terrainTile;
  }

  // ── Cell data ──

  /** Access the underlying CellLayer for advanced consumers (e.g. MapLoader, ResourceLayer). */
  getCellLayer(): CellLayer<CellData> {
    return this.cellLayer;
  }

  /** Access the MapGrid for coordinate conversions. */
  getMapGrid(): MapGrid {
    return this.mapGrid;
  }

  /** Subscribe to cell-level terrain changes. */
  onCellEntryChanged(handler: CellEntryChangedHandler<CellData>): () => void {
    return this.cellLayer.onCellEntryChanged(handler);
  }

  // ── Geometry construction ──

  private createMesh(scene: Scene): void {
    const positions: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    const width = this.cellLayer.getWidth();
    const height = this.cellLayer.getHeight();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const x0 = x - width / 2;
        const x1 = x0 + 1;
        const z0 = y - height / 2;
        const z1 = z0 + 1;

        const baseIndex = positions.length / 3;

        // 4 independent vertices per cell (no sharing → sharp colour boundaries)
        positions.push(
          x0,
          0,
          z0, // bottom-left
          x1,
          0,
          z0, // bottom-right
          x1,
          0,
          z1, // top-right
          x0,
          0,
          z1 // top-left
        );

        // 2 triangles per cell
        indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);

        const color = this.getColorForLandType(this.cellLayer.get(x, y).landType);
        for (let i = 0; i < 4; i++) {
          colors.push(color.r, color.g, color.b, 1);
        }
      }
    }

    this.terrainMesh = new Mesh('terrain', scene);
    this.terrainMesh.setVerticesData(VertexBuffer.PositionKind, positions, true);
    this.terrainMesh.setVerticesData(VertexBuffer.ColorKind, colors, true);
    this.terrainMesh.setIndices(indices);
    this.terrainMesh.useVertexColors = true;
    this.terrainMesh.material = this.terrainMaterial.getMaterial();
    this.terrainMesh.createNormals(true);
  }

  private createGridLines(scene: Scene): void {
    const lines: Vector3[][] = [];
    const lineColor = new Color4(0.3, 0.3, 0.3, 0.4);
    const colors: Color4[][] = [];

    const width = this.cellLayer.getWidth();
    const height = this.cellLayer.getHeight();

    // Vertical grid lines
    for (let x = 0; x <= width; x++) {
      const wx = x - width / 2;
      lines.push([new Vector3(wx, 0.005, -height / 2), new Vector3(wx, 0.005, height / 2)]);
      colors.push([lineColor, lineColor]);
    }

    // Horizontal grid lines
    for (let y = 0; y <= height; y++) {
      const wz = y - height / 2;
      lines.push([new Vector3(-width / 2, 0.005, wz), new Vector3(width / 2, 0.005, wz)]);
      colors.push([lineColor, lineColor]);
    }

    this.gridLines = MeshBuilder.CreateLineSystem('terrainGrid', { lines, colors }, scene);
  }

  // ── Colour mapping ──

  private getColorForLandType(type: LandType): Color3 {
    switch (type) {
      case LandType.Clear:
        return new Color3(0.25, 0.45, 0.2);
      case LandType.Road:
        return new Color3(0.45, 0.42, 0.38);
      case LandType.Water:
        return new Color3(0.15, 0.35, 0.55);
      case LandType.Rock:
        return new Color3(0.4, 0.35, 0.3);
      case LandType.Wall:
        return new Color3(0.55, 0.55, 0.5);
      case LandType.Tiberium:
        return new Color3(0.1, 0.75, 0.25);
      case LandType.Beach:
        return new Color3(0.8, 0.72, 0.5);
      case LandType.Rough:
        return new Color3(0.35, 0.3, 0.22);
      case LandType.River:
        return new Color3(0.2, 0.45, 0.5);
      default:
        return new Color3(0.5, 0.5, 0.5);
    }
  }

  // ── Public API (backward-compatible) ──

  /** Change the terrain type of a cell and update its vertex colour. */
  setCellLandType(x: number, y: number, landType: LandType): void {
    if (!this.cellLayer.contains(x, y)) return;
    this.cellLayer.set(x, y, { landType });
    this.updateCellColor(x, y);
  }

  /** Read the terrain type of a cell. */
  getCellLandType(x: number, y: number): LandType {
    return this.cellLayer.get(x, y).landType;
  }

  getWidth(): number {
    return this.cellLayer.getWidth();
  }

  getHeight(): number {
    return this.cellLayer.getHeight();
  }

  /**
   * Paint a test pattern divided into quadrants:
   * - top-left: Water, top-right: Road
   * - bottom-left: Rock, bottom-right: Tiberium
   * - centre circle: Clear
   */
  generateTestPattern(): void {
    const width = this.cellLayer.getWidth();
    const height = this.cellLayer.getHeight();
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let type = LandType.Clear;

        if (x < cx && y < cy) {
          type = LandType.Water;
        } else if (x >= cx && y < cy) {
          type = LandType.Road;
        } else if (x < cx && y >= cy) {
          type = LandType.Rock;
        } else {
          type = LandType.Tiberium;
        }

        const dx = x - cx + 0.5;
        const dy = y - cy + 0.5;
        if (Math.sqrt(dx * dx + dy * dy) < 8) {
          type = LandType.Clear;
        }

        this.setCellLandType(x, y, type);
      }
    }
  }

  // ── Internal helpers ──

  private updateCellColor(x: number, y: number): void {
    if (!this.terrainMesh) return;

    const colors = this.terrainMesh.getVerticesData(VertexBuffer.ColorKind);
    if (!colors) return;

    const width = this.cellLayer.getWidth();
    const color = this.getColorForLandType(this.cellLayer.get(x, y).landType);
    const cellIndex = (y * width + x) * 4 * 4; // 4 verts × 4 components

    for (let i = 0; i < 4; i++) {
      colors[cellIndex + i * 4] = color.r;
      colors[cellIndex + i * 4 + 1] = color.g;
      colors[cellIndex + i * 4 + 2] = color.b;
    }

    this.terrainMesh.updateVerticesData(VertexBuffer.ColorKind, colors);
  }

  // ── Lifecycle ──

  /** Dispose terrain mesh, grid lines, and material. */
  dispose(): void {
    this.terrainMesh?.dispose();
    this.terrainMesh = null;
    this.gridLines?.dispose();
    this.gridLines = null;
    this.terrainMaterial.dispose();
  }
}
