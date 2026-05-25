import { ShaderMaterial, Texture, Scene } from '@babylonjs/core';

/**
 * Custom ShaderMaterial for texture-splatting terrain.
 *
 * Uses two splat-map textures (8 channels total) to blend 8 terrain layers:
 *   splatMap1:  R=grass, G=road, B=water, A=rock
 *   splatMap2:  R=beach, G=rough, B=tiberium, A=snow
 *
 * Water layer receives dynamic UV perturbation via the `time` uniform.
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
uniform sampler2D beachTex;
uniform sampler2D roughTex;
uniform sampler2D tiberiumTex;
uniform sampler2D snowTex;
uniform sampler2D splatMap;
uniform sampler2D splatMap2;

uniform float texScale;
uniform float time;

void main(void) {
  vec4 splat1 = texture2D(splatMap, vUV);
  vec4 splat2 = texture2D(splatMap2, vUV);
  float total = splat1.r + splat1.g + splat1.b + splat1.a
              + splat2.r + splat2.g + splat2.b + splat2.a;

  vec2 tiledUV = vUV * texScale;

  // Water animation: gentle UV perturbation
  vec2 waterUV = tiledUV + vec2(
    sin(time * 1.5 + tiledUV.y * 8.0) * 0.015,
    cos(time * 1.2 + tiledUV.x * 8.0) * 0.015
  );

  vec4 grass     = texture2D(grassTex,     tiledUV);
  vec4 road      = texture2D(roadTex,      tiledUV);
  vec4 water     = texture2D(waterTex,     waterUV);
  vec4 rock      = texture2D(rockTex,      tiledUV);
  vec4 beach     = texture2D(beachTex,     tiledUV);
  vec4 rough     = texture2D(roughTex,     tiledUV);
  vec4 tiberium  = texture2D(tiberiumTex,  tiledUV);
  vec4 snow      = texture2D(snowTex,      tiledUV);

  vec4 color = grass     * splat1.r
             + road      * splat1.g
             + water     * splat1.b
             + rock      * splat1.a
             + beach     * splat2.r
             + rough     * splat2.g
             + tiberium  * splat2.b
             + snow      * splat2.a;

  if (total < 0.001) {
    gl_FragColor = grass;
    return;
  }

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
    beach: Texture,
    rough: Texture,
    tiberium: Texture,
    snow: Texture,
    splatMap: Texture,
    splatMap2: Texture,
    texScale = 4.0
  ) {
    this.material = new ShaderMaterial(
      'terrainSplat',
      scene,
      { vertexSource: VERTEX_SHADER, fragmentSource: FRAGMENT_SHADER },
      {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'texScale', 'time'],
        samplers: [
          'grassTex',
          'roadTex',
          'waterTex',
          'rockTex',
          'beachTex',
          'roughTex',
          'tiberiumTex',
          'snowTex',
          'splatMap',
          'splatMap2',
        ],
      }
    );

    this.material.setTexture('grassTex', grass);
    this.material.setTexture('roadTex', road);
    this.material.setTexture('waterTex', water);
    this.material.setTexture('rockTex', rock);
    this.material.setTexture('beachTex', beach);
    this.material.setTexture('roughTex', rough);
    this.material.setTexture('tiberiumTex', tiberium);
    this.material.setTexture('snowTex', snow);
    this.material.setTexture('splatMap', splatMap);
    this.material.setTexture('splatMap2', splatMap2);
    this.material.setFloat('texScale', texScale);
    this.material.setFloat('time', 0.0);
  }

  getMaterial(): ShaderMaterial {
    return this.material;
  }

  updateSplatMap(splatMap: Texture, splatMap2: Texture): void {
    this.material.setTexture('splatMap', splatMap);
    this.material.setTexture('splatMap2', splatMap2);
  }

  updateTime(time: number): void {
    this.material.setFloat('time', time);
  }

  dispose(): void {
    this.material.dispose();
  }
}
