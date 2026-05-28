/**
 * SpriteRenderable — Task-SPR1: Sprite 渲染管线
 * OpenRA 对标: `OpenRA.Game/Graphics/SpriteRenderable.cs`
 *
 * 2D billboard 精灵渲染器：平面网格 + 纹理/颜色，始终面向相机。
 */

import { MeshBuilder, StandardMaterial, Texture, Color3, Mesh, type Scene } from '@babylonjs/core';
import { RenderLayer, setRenderLayer } from '../RenderLayer';

export interface SpriteRenderableOptions {
  readonly width: number;
  readonly height: number;
  readonly color?: Color3;
  readonly textureUrl?: string;
}

export class SpriteRenderable {
  mesh: Mesh;
  material: StandardMaterial;

  constructor(scene: Scene, name: string, options: SpriteRenderableOptions) {
    this.mesh = MeshBuilder.CreatePlane(
      name,
      {
        width: options.width,
        height: options.height,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      scene
    );

    this.material = new StandardMaterial(`${name}-mat`, scene);
    this.material.diffuseColor = options.color ?? Color3.White();
    this.material.specularColor = Color3.Black();
    this.material.emissiveColor = options.color ?? Color3.White();
    this.material.backFaceCulling = false;

    if (options.textureUrl) {
      this.material.diffuseTexture = new Texture(options.textureUrl, scene);
      this.material.emissiveColor = Color3.White();
    }

    this.mesh.material = this.material;
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    setRenderLayer(this.mesh, RenderLayer.Sprite);
  }

  setPosition(x: number, y: number, z: number): void {
    this.mesh.position.set(x, y, z);
  }

  setVisible(visible: boolean): void {
    this.mesh.isVisible = visible;
  }

  dispose(): void {
    this.mesh.dispose();
    this.material.dispose();
  }
}
