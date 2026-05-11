import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';

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
 * Cell-based terrain grid.
 *
 * Creates a `width × height` array of 1×1 ground meshes, each assigned a
 * {@link StandardMaterial} coloured according to its {@link LandType}.
 * Materials are cached and shared across cells of the same type.
 *
 * The grid is centred on the origin: cell `(0,0)` sits at world
 * `(-width/2+0.5, 0, -height/2+0.5)` and cell `(width-1, height-1)` at
 * `(width/2-0.5, 0, height/2-0.5)`.
 */
export class TerrainGrid {
  private width: number;
  private height: number;
  private cells: CellData[][];
  private cellMeshes: Map<string, Mesh>;
  private materials: Map<LandType, StandardMaterial>;

  constructor(scene: Scene, width = 64, height = 64) {
    this.width = width;
    this.height = height;
    this.cells = [];
    this.cellMeshes = new Map();
    this.materials = new Map();

    this.initializeCells();
    this.createMeshes(scene);
  }

  // ── Initialisation ──

  private initializeCells(): void {
    for (let y = 0; y < this.height; y++) {
      const row: CellData[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({ landType: LandType.Clear });
      }
      this.cells.push(row);
    }
  }

  private createMeshes(scene: Scene): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const mesh = MeshBuilder.CreateGround(`cell_${x}_${y}`, { width: 1, height: 1, subdivisions: 1 }, scene);
        mesh.position.x = x - this.width / 2 + 0.5;
        mesh.position.z = y - this.height / 2 + 0.5;
        mesh.position.y = 0;

        mesh.material = this.getMaterialForLandType(this.cells[y][x].landType, scene);
        this.cellMeshes.set(`${x},${y}`, mesh);
      }
    }
  }

  // ── Materials ──

  private getMaterialForLandType(type: LandType, scene: Scene): StandardMaterial {
    const existing = this.materials.get(type);
    if (existing) return existing;

    const mat = new StandardMaterial(`mat_land_${LandType[type]}`, scene);
    mat.diffuseColor = this.getColorForLandType(type);
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    this.materials.set(type, mat);
    return mat;
  }

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

  /** Change the terrain type of a cell and update its mesh material. */
  setCellLandType(x: number, y: number, landType: LandType): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.cells[y][x].landType = landType;

    const mesh = this.cellMeshes.get(`${x},${y}`);
    if (mesh) {
      const scene = mesh.getScene();
      if (scene) {
        mesh.material = this.getMaterialForLandType(landType, scene);
      }
    }
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
   *
   * Useful for visually verifying that material switching works.
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

        // Carve a circular Clear area in the middle.
        const dx = x - cx + 0.5;
        const dy = y - cy + 0.5;
        if (Math.sqrt(dx * dx + dy * dy) < 8) {
          type = LandType.Clear;
        }

        this.setCellLandType(x, y, type);
      }
    }
  }

  // ── Lifecycle ──

  /** Dispose every cell mesh and cached material. */
  dispose(): void {
    for (const mesh of this.cellMeshes.values()) {
      mesh.dispose();
    }
    this.cellMeshes.clear();

    for (const material of this.materials.values()) {
      material.dispose();
    }
    this.materials.clear();
  }
}
