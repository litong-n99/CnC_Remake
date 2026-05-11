import { Scene, Mesh, Vector3, VertexBuffer, Color3, Color4 } from '@babylonjs/core';
import { MeshBuilder } from '@babylonjs/core';
import { TerrainMaterial } from '../../renderer/materials/TerrainMaterial';

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

/** Per-cell data.  Currently only stores terrain type; future fields (overlay, height, etc.) go here. */
export interface CellData {
  landType: LandType;
}

/**
 * Cell-based terrain grid rendered as a **single unified mesh** with vertex
 * colours.  This eliminates the inter-cell gaps that appear when using
 * thousands of individual GroundMesh tiles.
 *
 * Each cell owns 4 independent vertices (not shared with neighbours) so
 * colour boundaries are perfectly sharp.  A wireframe line-grid overlay
 * can optionally be shown for debugging.
 */
export class TerrainGrid {
  private width: number;
  private height: number;
  private cells: CellData[][];
  private terrainMesh: Mesh | null = null;
  private gridLines: Mesh | null = null;
  private terrainMaterial: TerrainMaterial;

  constructor(scene: Scene, width = 64, height = 64) {
    this.width = width;
    this.height = height;
    this.cells = [];
    this.terrainMaterial = new TerrainMaterial(scene);

    this.initializeCells();
    this.createMesh(scene);
    this.createGridLines(scene);
  }

  // ── Cell data ──

  private initializeCells(): void {
    for (let y = 0; y < this.height; y++) {
      const row: CellData[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({ landType: LandType.Clear });
      }
      this.cells.push(row);
    }
  }

  // ── Geometry construction ──

  private createMesh(scene: Scene): void {
    const positions: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const x0 = x - this.width / 2;
        const x1 = x0 + 1;
        const z0 = y - this.height / 2;
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

        const color = this.getColorForLandType(this.cells[y][x].landType);
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

    // Vertical grid lines
    for (let x = 0; x <= this.width; x++) {
      const wx = x - this.width / 2;
      lines.push([new Vector3(wx, 0.005, -this.height / 2), new Vector3(wx, 0.005, this.height / 2)]);
      colors.push([lineColor, lineColor]);
    }

    // Horizontal grid lines
    for (let y = 0; y <= this.height; y++) {
      const wz = y - this.height / 2;
      lines.push([new Vector3(-this.width / 2, 0.005, wz), new Vector3(this.width / 2, 0.005, wz)]);
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

  // ── Public API ──

  /** Change the terrain type of a cell and update its vertex colour. */
  setCellLandType(x: number, y: number, landType: LandType): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.cells[y][x].landType = landType;
    this.updateCellColor(x, y);
  }

  /** Read the terrain type of a cell. */
  getCellLandType(x: number, y: number): LandType {
    return this.cells[y]?.[x]?.landType ?? LandType.Clear;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  /**
   * Paint a test pattern divided into quadrants:
   * - top-left: Water, top-right: Road
   * - bottom-left: Rock, bottom-right: Tiberium
   * - centre circle: Clear
   */
  generateTestPattern(): void {
    const cx = Math.floor(this.width / 2);
    const cy = Math.floor(this.height / 2);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
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

    const color = this.getColorForLandType(this.cells[y][x].landType);
    const cellIndex = (y * this.width + x) * 4 * 4; // 4 verts × 4 components

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
