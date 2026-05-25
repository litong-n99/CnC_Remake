import { Scene, Mesh, Vector3, VertexBuffer, Color3, Color4 } from '@babylonjs/core';
import { MeshBuilder } from '@babylonjs/core';
import { TerrainMaterial } from '../../renderer/materials/TerrainMaterial';
import { createProceduralTextures } from '../../renderer/terrain/ProceduralTextures';
import { TerrainSplatMaterial } from '../../renderer/terrain/TerrainSplatMaterial';
import { DynamicTexture, Texture } from '@babylonjs/core';
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
  private splatMaterial: TerrainSplatMaterial | null = null;
  private splatMap: DynamicTexture | null = null;
  private splatMap2: DynamicTexture | null = null;
  private textureMode = false;
  private waterTime = 0;

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
    const uvs: number[] = [];

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

        // UVs for splat mapping — each cell maps to one pixel in the splat texture
        const u0 = x / width;
        const u1 = (x + 1) / width;
        const v0 = y / height;
        const v1 = (y + 1) / height;
        uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
      }
    }

    this.terrainMesh = new Mesh('terrain', scene);
    this.terrainMesh.setVerticesData(VertexBuffer.PositionKind, positions, true);
    this.terrainMesh.setVerticesData(VertexBuffer.ColorKind, colors, true);
    this.terrainMesh.setVerticesData(VertexBuffer.UVKind, uvs, true);
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
    this.updateSplatCell(x, y);
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

  // ── Texture Splatting Mode (Task 9.4) ──

  /**
   * Switch from vertex-colour rendering to texture-splatting rendering.
   * Generates procedural textures and builds a splat-map from current cell data.
   */
  enableTextureMode(scene: Scene): void {
    if (this.textureMode) return;
    this.textureMode = true;

    const w = this.cellLayer.getWidth();
    const h = this.cellLayer.getHeight();

    // Create splat-map textures (one pixel per cell, 8 channels across two textures)
    this.splatMap = new DynamicTexture('splatMap', { width: w, height: h }, scene, false);
    this.splatMap.wrapU = Texture.CLAMP_ADDRESSMODE;
    this.splatMap.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.splatMap.updateSamplingMode(Texture.NEAREST_NEAREST);

    this.splatMap2 = new DynamicTexture('splatMap2', { width: w, height: h }, scene, false);
    this.splatMap2.wrapU = Texture.CLAMP_ADDRESSMODE;
    this.splatMap2.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.splatMap2.updateSamplingMode(Texture.NEAREST_NEAREST);

    // Build splat data from current cells
    this.rebuildSplatMap();

    // Create procedural layer textures
    const tex = createProceduralTextures(scene);

    // Create shader material
    this.splatMaterial = new TerrainSplatMaterial(
      scene,
      tex.grass,
      tex.road,
      tex.water,
      tex.rock,
      tex.beach,
      tex.rough,
      tex.tiberium,
      tex.snow,
      this.splatMap,
      this.splatMap2,
      4.0
    );

    if (this.terrainMesh) {
      this.terrainMesh.material = this.splatMaterial.getMaterial();
      this.terrainMesh.useVertexColors = false;
    }
  }

  private landTypeToSplat(landType: LandType): {
    r1: number;
    g1: number;
    b1: number;
    a1: number;
    r2: number;
    g2: number;
    b2: number;
    a2: number;
  } {
    // splatMap1: R=grass, G=road, B=water, A=rock
    // splatMap2: R=beach, G=rough, B=tiberium, A=snow
    switch (landType) {
      case LandType.Clear:
        return { r1: 255, g1: 0, b1: 0, a1: 0, r2: 0, g2: 0, b2: 0, a2: 0 };
      case LandType.Road:
        return { r1: 0, g1: 255, b1: 0, a1: 0, r2: 0, g2: 0, b2: 0, a2: 0 };
      case LandType.Water:
      case LandType.River:
        return { r1: 0, g1: 0, b1: 255, a1: 0, r2: 0, g2: 0, b2: 0, a2: 0 };
      case LandType.Rock:
        return { r1: 0, g1: 0, b1: 0, a1: 255, r2: 0, g2: 0, b2: 0, a2: 0 };
      case LandType.Wall:
        return { r1: 0, g1: 0, b1: 0, a1: 255, r2: 0, g2: 0, b2: 0, a2: 0 };
      case LandType.Tiberium:
        return { r1: 0, g1: 0, b1: 0, a1: 0, r2: 0, g2: 0, b2: 255, a2: 0 };
      case LandType.Beach:
        return { r1: 0, g1: 0, b1: 0, a1: 0, r2: 255, g2: 0, b2: 0, a2: 0 };
      case LandType.Rough:
        return { r1: 0, g1: 0, b1: 0, a1: 0, r2: 0, g2: 255, b2: 0, a2: 0 };
      default:
        return { r1: 255, g1: 0, b1: 0, a1: 0, r2: 0, g2: 0, b2: 0, a2: 0 };
    }
  }

  private readonly transitionRadius = 2;

  /** Types that should never blend (cliffs, walls). */
  private isHardEdgeType(lt: LandType): boolean {
    return lt === LandType.Rock || lt === LandType.Wall;
  }

  /** True if any 4-neighbor has a different, non-hard landType. */
  private isBoundaryCell(x: number, y: number): boolean {
    const lt = this.cellLayer.get(x, y).landType;
    if (this.isHardEdgeType(lt)) return false;
    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!this.cellLayer.contains(nx, ny)) continue;
      const nlt = this.cellLayer.get(nx, ny).landType;
      if (nlt !== lt && !this.isHardEdgeType(nlt)) return true;
    }
    return false;
  }

  /**
   * Compute blended splat for a boundary cell.
   * Own landType is weighted at 70%; each differing 4-neighbor contributes 7.5%.
   * This produces a narrow 1-cell transition band (~82–90% dominant terrain).
   */
  private blurSplatAt(x: number, y: number, _radius: number): ReturnType<typeof this.landTypeToSplat> {
    const own = this.landTypeToSplat(this.cellLayer.get(x, y).landType);

    let r1 = own.r1 * 0.7,
      g1 = own.g1 * 0.7,
      b1 = own.b1 * 0.7,
      a1 = own.a1 * 0.7;
    let r2 = own.r2 * 0.7,
      g2 = own.g2 * 0.7,
      b2 = own.b2 * 0.7,
      a2 = own.a2 * 0.7;
    let totalWeight = 0.7;

    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (!this.cellLayer.contains(nx, ny)) continue;
      const nlt = this.cellLayer.get(nx, ny).landType;
      if (nlt === this.cellLayer.get(x, y).landType) continue;
      if (this.isHardEdgeType(nlt)) continue;
      const neighbor = this.landTypeToSplat(nlt);
      r1 += neighbor.r1 * 0.075;
      g1 += neighbor.g1 * 0.075;
      b1 += neighbor.b1 * 0.075;
      a1 += neighbor.a1 * 0.075;
      r2 += neighbor.r2 * 0.075;
      g2 += neighbor.g2 * 0.075;
      b2 += neighbor.b2 * 0.075;
      a2 += neighbor.a2 * 0.075;
      totalWeight += 0.075;
    }

    return {
      r1: Math.round(r1 / totalWeight),
      g1: Math.round(g1 / totalWeight),
      b1: Math.round(b1 / totalWeight),
      a1: Math.round(a1 / totalWeight),
      r2: Math.round(r2 / totalWeight),
      g2: Math.round(g2 / totalWeight),
      b2: Math.round(b2 / totalWeight),
      a2: Math.round(a2 / totalWeight),
    };
  }

  private rebuildSplatMap(): void {
    if (!this.splatMap || !this.splatMap2) return;
    const ctx1 = this.splatMap.getContext();
    const ctx2 = this.splatMap2.getContext();
    const w = this.cellLayer.getWidth();
    const h = this.cellLayer.getHeight();

    ctx1.clearRect(0, 0, w, h);
    ctx2.clearRect(0, 0, w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const splat = this.isBoundaryCell(x, y)
          ? this.blurSplatAt(x, y, this.transitionRadius)
          : this.landTypeToSplat(this.cellLayer.get(x, y).landType);

        ctx1.fillStyle = `rgba(${splat.r1},${splat.g1},${splat.b1},${splat.a1 / 255})`;
        ctx1.fillRect(x, y, 1, 1);
        ctx2.fillStyle = `rgba(${splat.r2},${splat.g2},${splat.b2},${splat.a2 / 255})`;
        ctx2.fillRect(x, y, 1, 1);
      }
    }
    this.splatMap.update();
    this.splatMap2.update();
  }

  private updateSplatCell(x: number, y: number): void {
    if (!this.splatMap || !this.splatMap2 || !this.textureMode) return;

    const r = this.transitionRadius;
    const ctx1 = this.splatMap.getContext();
    const ctx2 = this.splatMap2.getContext();

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!this.cellLayer.contains(nx, ny)) continue;

        const splat = this.isBoundaryCell(nx, ny)
          ? this.blurSplatAt(nx, ny, r)
          : this.landTypeToSplat(this.cellLayer.get(nx, ny).landType);

        ctx1.fillStyle = `rgba(${splat.r1},${splat.g1},${splat.b1},${splat.a1 / 255})`;
        ctx1.fillRect(nx, ny, 1, 1);
        ctx2.fillStyle = `rgba(${splat.r2},${splat.g2},${splat.b2},${splat.a2 / 255})`;
        ctx2.fillRect(nx, ny, 1, 1);
      }
    }

    this.splatMap.update();
    this.splatMap2.update();
  }

  isTextureMode(): boolean {
    return this.textureMode;
  }

  /** Debug helper — returns computed splat weights for a cell (Task 10.2 e2e). */
  debugGetSplatWeights(
    x: number,
    y: number
  ): { splat1: [number, number, number, number]; splat2: [number, number, number, number] } | undefined {
    if (!this.textureMode) return undefined;
    const splat = this.isBoundaryCell(x, y)
      ? this.blurSplatAt(x, y, this.transitionRadius)
      : this.landTypeToSplat(this.cellLayer.get(x, y).landType);
    return {
      splat1: [splat.r1, splat.g1, splat.b1, splat.a1],
      splat2: [splat.r2, splat.g2, splat.b2, splat.a2],
    };
  }

  /** Per-frame update — drives water animation time uniform. */
  update(dt: number): void {
    if (this.splatMaterial) {
      this.waterTime += dt * 0.001;
      this.splatMaterial.updateTime(this.waterTime);
    }
  }

  /** Dispose terrain mesh, grid lines, and material. */
  dispose(): void {
    this.terrainMesh?.dispose();
    this.terrainMesh = null;
    this.gridLines?.dispose();
    this.gridLines = null;
    this.terrainMaterial.dispose();
    this.splatMaterial?.dispose();
    this.splatMap?.dispose();
    this.splatMap2?.dispose();
  }
}
