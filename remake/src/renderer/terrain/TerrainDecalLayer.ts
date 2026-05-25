import { Scene, Mesh, StandardMaterial, Texture, Color3, VertexData } from '@babylonjs/core';
import type { AtlasSlot } from './SheetBuilder';

/**
 * TerrainDecalLayer — overlays precise sprite tiles on top of the
 * texture-splatting terrain surface.
 *
 * Each decal is a single quad positioned flush with the ground plane
 * (y = 0.01 to avoid z-fighting).  Decals use the atlas texture from
 * DefaultTileCache so one material + one texture handles every decal,
 * minimizing draw-call overhead.
 *
 * Task 10.5: "底层 shader 自然过渡 + 上层 sprite 精确还原" 的混合视觉.
 */

export interface DecalOptions {
  /** World X position of the decal centre. */
  x: number;
  /** World Z position of the decal centre. */
  z: number;
  /** Width in world units. */
  width: number;
  /** Height in world units. */
  height: number;
  /** UV coordinates inside the atlas texture. */
  atlasSlot: AtlasSlot;
  /** Parent mesh (for transform inheritance, usually the terrain mesh). */
  parent?: Mesh;
}

export class TerrainDecalLayer {
  private readonly scene: Scene;
  private material: StandardMaterial;
  private decals = new Map<string, Mesh>();

  constructor(scene: Scene, atlasTexture: Texture) {
    this.scene = scene;
    this.material = new StandardMaterial('decalMat', scene);
    this.material.diffuseTexture = atlasTexture;
    this.material.specularColor = new Color3(0, 0, 0);
    this.material.backFaceCulling = false;
    this.material.transparencyMode = 2; // Alpha blend
    this.material.useAlphaFromDiffuseTexture = true;
  }

  /** Add or replace a decal at the given cell key. */
  add(key: string, options: DecalOptions): Mesh {
    this.remove(key);

    const { x, z, width, height, atlasSlot, parent } = options;

    // Build a simple quad centered at (x, 0.01, z)
    const hw = width / 2;
    const hh = height / 2;
    const positions = [x - hw, 0.01, z - hh, x + hw, 0.01, z - hh, x + hw, 0.01, z + hh, x - hw, 0.01, z + hh];
    const indices = [0, 1, 2, 0, 2, 3];
    const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    const uvs = [
      atlasSlot.u,
      atlasSlot.v2,
      atlasSlot.u2,
      atlasSlot.v2,
      atlasSlot.u2,
      atlasSlot.v,
      atlasSlot.u,
      atlasSlot.v,
    ];

    const mesh = new Mesh(`decal_${key}`, this.scene, parent ?? undefined);
    const vd = new VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.normals = normals;
    vd.uvs = uvs;
    vd.applyToMesh(mesh);

    mesh.material = this.material;
    mesh.isPickable = false;

    this.decals.set(key, mesh);
    return mesh;
  }

  /** Remove a single decal. */
  remove(key: string): void {
    const mesh = this.decals.get(key);
    if (mesh) {
      mesh.dispose();
      this.decals.delete(key);
    }
  }

  /** Clear every decal. */
  clear(): void {
    for (const mesh of this.decals.values()) {
      mesh.dispose();
    }
    this.decals.clear();
  }

  getDecalCount(): number {
    return this.decals.size;
  }

  dispose(): void {
    this.clear();
    this.material.dispose();
  }
}
