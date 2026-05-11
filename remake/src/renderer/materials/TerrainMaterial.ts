import { StandardMaterial, Color3, Scene } from '@babylonjs/core';

export interface TerrainMaterialOptions {
  /** Specular highlight colour (default: dark grey). */
  specularColor?: Color3;
}

/**
 * Material wrapper for terrain rendering.
 *
 * The current implementation is a **dummy** (placeholder) using a single
 * {@link StandardMaterial} with vertex-colour support.  This lets the
 * {@link TerrainGrid} paint each cell with a distinct colour while keeping
 * everything in one draw call.
 *
 * When real texture assets become `ready`, this class will be upgraded to
 * a custom shader that performs texture splatting (grass / road / water / cliff).
 */
export class TerrainMaterial {
  private material: StandardMaterial;

  constructor(scene: Scene, options: TerrainMaterialOptions = {}) {
    this.material = new StandardMaterial('terrainMat', scene);
    this.material.specularColor = options.specularColor ?? new Color3(0.05, 0.05, 0.05);
  }

  /** The underlying Babylon material.  Assign this to `mesh.material`. */
  getMaterial(): StandardMaterial {
    return this.material;
  }

  dispose(): void {
    this.material.dispose();
  }
}
