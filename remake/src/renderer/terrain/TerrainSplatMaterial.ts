import { ShaderMaterial, Texture, Scene } from '@babylonjs/core';

/**
 * Custom ShaderMaterial for texture-splatting terrain.
 *
 * Uses a splat-map texture where each pixel's RGBA channels control the
 * blend weight of 4 terrain layers (grass / road / water / rock).
 */

const VERTEX_SHADER = `
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;

void main(void) {
  gl_Position = worldViewProjection * vec4(position, 1.0);
  vUV = uv;
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUV;

uniform sampler2D grassTex;
uniform sampler2D roadTex;
uniform sampler2D waterTex;
uniform sampler2D rockTex;
uniform sampler2D splatMap;

uniform float texScale;

void main(void) {
  vec4 splat = texture2D(splatMap, vUV);
  float total = splat.r + splat.g + splat.b + splat.a;
  if (total < 0.001) {
    // No splat data — default to grass
    gl_FragColor = texture2D(grassTex, vUV * texScale);
    return;
  }

  vec2 tiledUV = vUV * texScale;
  vec4 grass = texture2D(grassTex, tiledUV);
  vec4 road  = texture2D(roadTex,  tiledUV);
  vec4 water = texture2D(waterTex, tiledUV);
  vec4 rock  = texture2D(rockTex,  tiledUV);

  vec4 color = grass * splat.r
             + road  * splat.g
             + water * splat.b
             + rock  * splat.a;

  color /= total;
  gl_FragColor = color;
}
`;

export class TerrainSplatMaterial {
  private material: ShaderMaterial;

  constructor(
    scene: Scene,
    grass: Texture,
    road: Texture,
    water: Texture,
    rock: Texture,
    splatMap: Texture,
    texScale = 4.0
  ) {
    this.material = new ShaderMaterial(
      'terrainSplat',
      scene,
      { vertexSource: VERTEX_SHADER, fragmentSource: FRAGMENT_SHADER },
      {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'texScale'],
        samplers: ['grassTex', 'roadTex', 'waterTex', 'rockTex', 'splatMap'],
      }
    );

    this.material.setTexture('grassTex', grass);
    this.material.setTexture('roadTex', road);
    this.material.setTexture('waterTex', water);
    this.material.setTexture('rockTex', rock);
    this.material.setTexture('splatMap', splatMap);
    this.material.setFloat('texScale', texScale);
  }

  getMaterial(): ShaderMaterial {
    return this.material;
  }

  updateSplatMap(splatMap: Texture): void {
    this.material.setTexture('splatMap', splatMap);
  }

  dispose(): void {
    this.material.dispose();
  }
}
