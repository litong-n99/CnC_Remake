import { Scene, Mesh, VertexBuffer } from '@babylonjs/core';
import type { CellLayer } from './CellLayer';
import type { CellData, LandType } from './TerrainGrid';
import { TerrainGrid } from './TerrainGrid';

/**
 * LOD configuration for a single terrain level.
 *
 * `step` controls vertex density reduction:
 * - step = 1 → full resolution (original mesh)
 * - step = 2 → each quad covers 2×2 cells (vertex count ↓ 75%)
 * - step = 4 → each quad covers 4×4 cells (vertex count ↓ ~94%)
 *
 * `distance` is the camera-to-mesh distance at which this LOD becomes active.
 */
export interface LODLevel {
  step: number;
  distance: number;
}

/**
 * Terrain LOD manager.
 *
 * Generates simplified meshes for distant terrain using Babylon.js
 * `addLODLevel`.  Each LOD mesh uses the dominant land-type colour and
 * average height of the cells it covers.  Because LOD meshes are only
 * visible at distance, minor colour mismatches are imperceptible.
 *
 * Source: REDALERT/DISPLAY.CPP (tile-draw distance culling concepts)
 */
export class TerrainLOD {
  private lodMeshes: Mesh[] = [];
  private disposed = false;

  constructor(
    private scene: Scene,
    private cellLayer: CellLayer<CellData>,
    private getColorForLandType: (type: LandType) => import('@babylonjs/core').Color3
  ) {}

  /**
   * Attach LOD levels to an existing terrain mesh.
   *
   * @param mainMesh   the high-resolution terrain mesh
   * @param levels     ordered by increasing distance (closest first)
   */
  setupLODs(mainMesh: Mesh, levels: LODLevel[]): void {
    if (this.disposed) return;

    for (const level of levels) {
      if (level.step <= 1) continue; // step 1 is the original mesh
      const lodMesh = this.createLODMesh(level.step);
      mainMesh.addLODLevel(level.distance, lodMesh);
      this.lodMeshes.push(lodMesh);
    }
  }

  /** Create a simplified terrain mesh where each quad covers `step × step` cells. */
  private createLODMesh(step: number): Mesh {
    const positions: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    const width = this.cellLayer.getWidth();
    const height = this.cellLayer.getHeight();

    // Number of simplified quads in each axis
    const cols = Math.ceil(width / step);
    const rows = Math.ceil(height / step);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Cell range covered by this LOD quad
        const cellX0 = col * step;
        const cellY0 = row * step;
        const cellX1 = Math.min(cellX0 + step, width);
        const cellY1 = Math.min(cellY0 + step, height);

        // World bounds of the quad (same as original terrain grid layout)
        const wx0 = cellX0 - width / 2;
        const wx1 = cellX1 - width / 2;
        const wz0 = cellY0 - height / 2;
        const wz1 = cellY1 - height / 2;

        // Compute averaged colour & height across covered cells so LOD
        // better preserves narrow features (rivers, roads) when downsampled.
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let sumH = 0;
        let count = 0;
        for (let cy = cellY0; cy < cellY1; cy++) {
          for (let cx = cellX0; cx < cellX1; cx++) {
            if (!this.cellLayer.contains(cx, cy)) continue;
            const cell = this.cellLayer.get(cx, cy);
            const c = this.getColorForLandType(cell.landType);
            sumR += c.r;
            sumG += c.g;
            sumB += c.b;
            sumH += cell.height ?? 0;
            count++;
          }
        }
        const avgR = count > 0 ? sumR / count : 0.5;
        const avgG = count > 0 ? sumG / count : 0.5;
        const avgB = count > 0 ? sumB / count : 0.5;
        const avgH = count > 0 ? sumH / count : 0;
        const color = { r: avgR, g: avgG, b: avgB } as import('@babylonjs/core').Color3;
        const h = avgH * TerrainGrid.HEIGHT_SCALE;

        const baseIndex = positions.length / 3;

        // 4 corners of the big quad
        positions.push(
          wx0,
          h,
          wz0, // bottom-left
          wx1,
          h,
          wz0, // bottom-right
          wx1,
          h,
          wz1, // top-right
          wx0,
          h,
          wz1 // top-left
        );

        // 2 triangles per quad
        indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);

        for (let i = 0; i < 4; i++) {
          colors.push(color.r, color.g, color.b, 1);
        }
      }
    }

    const mesh = new Mesh(`terrainLOD_step${step}`, this.scene);
    mesh.setVerticesData(VertexBuffer.PositionKind, positions, true);
    mesh.setVerticesData(VertexBuffer.ColorKind, colors, true);
    mesh.setIndices(indices);
    mesh.useVertexColors = true;
    mesh.createNormals(true);

    // Inherit material from main mesh if available; otherwise vertex colours suffice
    return mesh;
  }

  /** Total number of active LOD meshes. */
  getLODCount(): number {
    return this.lodMeshes.length;
  }

  /** Vertex count of a specific LOD mesh (for e2e validation). */
  getLODVertexCount(index: number): number {
    const mesh = this.lodMeshes[index];
    return mesh ? mesh.getTotalVertices() : 0;
  }

  /** Dispose all generated LOD meshes. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const mesh of this.lodMeshes) {
      mesh.dispose();
    }
    this.lodMeshes = [];
  }
}
