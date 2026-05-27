import { ParticleSystem, Scene, Vector3, Color4, Texture } from '@babylonjs/core';

/**
 * GPU-accelerated particle effect manager for explosions, smoke, and muzzle flashes.
 *
 * Uses Babylon.js `ParticleSystem` (CPU-based but highly optimised) with object
 * pooling so 50+ simultaneous explosions do not create GPU-pressure spikes.
 *
 * In the future this can be upgraded to `GPUParticleSystem` when WebGL 2.0
 * compute shaders are guaranteed across all target browsers.
 *
 * Source: REDALERT/BULLET.CPP (explosion / warhead visual effects)
 */
export class ParticleManager {
  private static instance: ParticleManager | null = null;
  static getInstance(): ParticleManager {
    if (!ParticleManager.instance) {
      ParticleManager.instance = new ParticleManager();
    }
    return ParticleManager.instance;
  }
  static reset(): void {
    ParticleManager.instance?.dispose();
    ParticleManager.instance = null;
  }

  private scene: Scene | null = null;
  private pool: PooledParticleSystem[] = [];
  private activeCount = 0;
  private disposed = false;

  /** Maximum pooled systems (prevents unbounded memory growth). */
  private readonly maxPoolSize = 60;
  /** Particles per explosion. */
  private readonly particlesPerSystem = 80;

  init(scene: Scene): void {
    this.scene = scene;
  }

  /**
   * Spawn an explosion effect at the given world position.
   * Returns `true` if a pooled system was activated, `false` if the pool
   * is exhausted (graceful degradation — the hit still registers visually
   * via other means such as the bullet mesh itself).
   */
  spawnExplosion(worldX: number, worldY: number, worldZ: number): boolean {
    if (this.disposed || !this.scene) return false;

    const ps = this.acquire();
    if (!ps) return false;

    ps.system.emitter = new Vector3(worldX, worldY, worldZ);
    ps.system.manualEmitCount = this.particlesPerSystem;
    ps.system.start();
    ps.inUse = true;
    ps.returnTime = performance.now() + 1000; // return to pool after 1s
    this.activeCount++;
    return true;
  }

  /** Number of currently active (non-recycled) particle systems. */
  getActiveCount(): number {
    return this.activeCount;
  }

  /** Total number of systems in the pool (active + idle). */
  getPoolSize(): number {
    return this.pool.length;
  }

  /** Per-frame housekeeping — recycle expired systems to the idle pool. */
  update(): void {
    if (this.disposed) return;
    const now = performance.now();
    for (const entry of this.pool) {
      if (entry.inUse && now >= entry.returnTime) {
        entry.system.stop();
        entry.system.reset();
        entry.inUse = false;
        this.activeCount--;
      }
    }
  }

  private acquire(): PooledParticleSystem | null {
    // Reuse an idle system
    const idle = this.pool.find((p) => !p.inUse);
    if (idle) return idle;

    // Pool exhausted — create a new one if under the cap
    if (this.pool.length >= this.maxPoolSize) return null;

    const system = this.createExplosionSystem();
    const entry: PooledParticleSystem = {
      system,
      inUse: false,
      returnTime: 0,
    };
    this.pool.push(entry);
    return entry;
  }

  private createExplosionSystem(): ParticleSystem {
    const scene = this.scene!;
    const name = `explosion_ps_${this.pool.length}`;
    const ps = new ParticleSystem(name, this.particlesPerSystem, scene);

    // No external texture — particle system works fine without one
    // (renders as coloured squares / points depending on platform)
    ps.particleTexture = this.getDefaultTexture();

    ps.emitter = Vector3.Zero();
    ps.minEmitBox = new Vector3(-0.05, -0.05, -0.05);
    ps.maxEmitBox = new Vector3(0.05, 0.05, 0.05);

    ps.color1 = new Color4(1.0, 0.6, 0.0, 1.0); // bright orange
    ps.color2 = new Color4(1.0, 0.2, 0.0, 1.0); // deep red
    ps.colorDead = new Color4(0.2, 0.0, 0.0, 0.0); // fade to black/transparent

    ps.minSize = 0.08;
    ps.maxSize = 0.25;
    ps.minLifeTime = 0.2;
    ps.maxLifeTime = 0.5;
    ps.emitRate = 0; // we use manualEmitCount for one-shot bursts
    ps.blendMode = ParticleSystem.BLENDMODE_ONEONE;
    ps.gravity = new Vector3(0, 0.5, 0); // slight upward drift (smoke-like)
    ps.direction1 = new Vector3(-1, 0.5, -1);
    ps.direction2 = new Vector3(1, 0.5, 1);
    ps.minAngularSpeed = 0;
    ps.maxAngularSpeed = Math.PI;
    ps.minEmitPower = 1.0;
    ps.maxEmitPower = 3.0;
    ps.updateSpeed = 0.02;

    return ps;
  }

  /** Re-use a single 1×1 white pixel texture for all particle systems. */
  private defaultTexture: Texture | null = null;
  private getDefaultTexture(): Texture {
    if (!this.defaultTexture && this.scene) {
      this.defaultTexture = new Texture(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        this.scene
      );
    }
    return this.defaultTexture!;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.pool) {
      entry.system.dispose();
    }
    this.pool = [];
    this.activeCount = 0;
    this.defaultTexture?.dispose();
    this.defaultTexture = null;
  }
}

interface PooledParticleSystem {
  system: ParticleSystem;
  inUse: boolean;
  returnTime: number;
}
