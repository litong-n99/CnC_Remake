import { Scene, DirectionalLight, HemisphericLight, ShadowGenerator, Vector3, Color3 } from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';

export interface LightingOptions {
  /** Direction the sunlight travels (default: `new Vector3(0.5, -1, 0.5)`). */
  sunDirection?: Vector3;
  /** Intensity of the directional sun light (default: `1.2`). */
  sunIntensity?: number;
  /** Colour of the ambient sky light (default: `new Color3(0.3, 0.3, 0.35)`). */
  ambientColor?: Color3;
  /** Intensity of the ambient light (default: `0.6`). */
  ambientIntensity?: number;
  /** Shadow-map texture size — power of two (default: `2048`). */
  shadowMapSize?: number;
  /** Whether to create the shadow generator (default: `true`). */
  enableShadows?: boolean;
}

/**
 * Manages the scene lighting rig: a hemispheric ambient fill plus a
 * directional "sun" that casts shadow-mapped shadows.
 *
 * Shadow quality defaults to blurred exponential shadow maps (BESM)
 * with a 32-pixel blur kernel and medium filtering quality.  This
 * gives soft contact shadows while staying well within 60 FPS budgets
 * for RTS-scale scenes.
 *
 * Usage:
 * ```ts
 * const lighting = new Lighting(scene);
 * lighting.addShadowCaster(box);
 * lighting.enableShadowsOnMesh(ground);
 * ```
 */
export class Lighting {
  private sun: DirectionalLight;
  private ambient: HemisphericLight;
  private shadowGenerator: ShadowGenerator | null = null;

  private readonly options: Required<LightingOptions>;

  constructor(scene: Scene, options: LightingOptions = {}) {
    this.options = {
      sunDirection: options.sunDirection ?? new Vector3(0.5, -1, 0.5).normalize(),
      sunIntensity: options.sunIntensity ?? 1.2,
      ambientColor: options.ambientColor ?? new Color3(0.3, 0.3, 0.35),
      ambientIntensity: options.ambientIntensity ?? 0.6,
      shadowMapSize: options.shadowMapSize ?? 2048,
      enableShadows: options.enableShadows ?? true,
    };

    // ── Ambient fill ──
    this.ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    this.ambient.diffuse = this.options.ambientColor;
    this.ambient.intensity = this.options.ambientIntensity;
    this.ambient.groundColor = new Color3(0.1, 0.1, 0.1);

    // ── Directional sun ──
    this.sun = new DirectionalLight('sun', this.options.sunDirection, scene);
    this.sun.intensity = this.options.sunIntensity;

    // Position the light far behind the direction vector so the
    // orthographic shadow frustum covers a broad area.
    this.sun.position = this.options.sunDirection.scale(-80);

    // ── Shadow generator ──
    if (this.options.enableShadows) {
      this.shadowGenerator = new ShadowGenerator(this.options.shadowMapSize, this.sun);
      this.configureShadows();
    }
  }

  private configureShadows(): void {
    if (!this.shadowGenerator) return;

    // Blurred exponential shadow map = soft shadows + good performance.
    this.shadowGenerator.filter = ShadowGenerator.FILTER_BLUREXPONENTIALSHADOWMAP;
    this.shadowGenerator.blurKernel = 32;
    this.shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;

    // Bias to eliminate shadow acne on shallow angles.
    this.shadowGenerator.bias = 0.0005;
    this.shadowGenerator.normalBias = 0.02;

    // Slight darkness so shadows aren't pitch-black.
    this.shadowGenerator.darkness = 0.3;
  }

  /**
   * Register a mesh (and optionally its descendants) as a shadow caster.
   * Casters write into the shadow map each frame.
   */
  addShadowCaster(mesh: AbstractMesh, includeDescendants = true): void {
    this.shadowGenerator?.addShadowCaster(mesh, includeDescendants);
  }

  /**
   * Enable shadow receiving on a mesh.  Receivers sample the shadow map
   * in their fragment shader.
   */
  enableShadowsOnMesh(mesh: AbstractMesh): void {
    mesh.receiveShadows = true;
  }

  /** Repoint the sun and update its shadow frustum. */
  setSunDirection(direction: Vector3): void {
    this.sun.direction = direction;
    this.sun.position = direction.scale(-80);
  }

  /** The underlying shadow generator, or `null` if shadows are disabled. */
  getShadowGenerator(): ShadowGenerator | null {
    return this.shadowGenerator;
  }

  /** Release lights and shadow resources. */
  dispose(): void {
    this.shadowGenerator?.dispose();
    this.sun.dispose();
    this.ambient.dispose();
  }
}
