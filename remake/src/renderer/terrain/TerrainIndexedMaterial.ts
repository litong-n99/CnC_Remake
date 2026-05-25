import { ShaderMaterial, Texture, Scene } from '@babylonjs/core';

/**
 * Custom ShaderMaterial for palette-indexed sprite rendering.
 *
 * C&C original sprites are stored as 8-bit indexed images + a 256-entry palette.
 * OpenRA packs 4 indexed sprites into the RGBA channels of a single texture.
 * This shader supports both modes via the `channel` uniform.
 *
 * Usage:
 *   - `indexedTex`: single-channel (LUMINANCE) or RGBA texture where each
 *     channel stores a palette index [0,255] mapped to [0,1].
 *   - `paletteTex`: 256×1 RGBA texture where texel i is the colour for index i.
 *   - `channel`: 0=R, 1=G, 2=B, 3=A. For LUMINANCE textures use channel=0.
 *
 * Palette index 0 is treated as fully transparent (discard).
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

uniform sampler2D indexedTex;
uniform sampler2D paletteTex;
uniform int channel;

void main(void) {
  vec4 indexed = texture2D(indexedTex, vUV);

  float idx;
  if (channel == 0)       idx = indexed.r;
  else if (channel == 1)  idx = indexed.g;
  else if (channel == 2)  idx = indexed.b;
  else                    idx = indexed.a;

  // Index 0 is the transparent background colour in C&C palettes
  if (idx < 0.001) {
    discard;
  }

  // Map normalized index [0,1] (representing 0..255) to palette texel centre.
  // 256 palette entries span u=[0,1]; each texel is 1/256 wide.
  float paletteU = idx * (255.0 / 256.0) + 0.5 / 256.0;
  vec4 color = texture2D(paletteTex, vec2(paletteU, 0.5));

  gl_FragColor = color;
}
`;

export class TerrainIndexedMaterial {
  private material: ShaderMaterial;

  constructor(scene: Scene, indexedTex: Texture, paletteTex: Texture, channel = 0) {
    this.material = new ShaderMaterial(
      'terrainIndexed',
      scene,
      { vertexSource: VERTEX_SHADER, fragmentSource: FRAGMENT_SHADER },
      {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'channel'],
        samplers: ['indexedTex', 'paletteTex'],
      }
    );

    this.material.setTexture('indexedTex', indexedTex);
    this.material.setTexture('paletteTex', paletteTex);
    this.material.setInt('channel', channel);
    this.material.backFaceCulling = false;
  }

  getMaterial(): ShaderMaterial {
    return this.material;
  }

  setChannel(channel: number): void {
    this.material.setInt('channel', channel);
  }

  dispose(): void {
    this.material.dispose();
  }
}
