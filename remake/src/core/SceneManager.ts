import { Scene, Color4 } from '@babylonjs/core';
import { EngineManager } from './EngineManager';

/**
 * Singleton manager for the Babylon.js Scene.
 *
 * Owns the scene graph, the render loop, and provides helpers for
 * bulk cleanup of meshes, lights, cameras and materials.
 */
export class SceneManager {
  private static instance: SceneManager | null = null;

  private scene: Scene | null = null;
  private renderLoopCallback: (() => void) | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  /**
   * Create a new Scene bound to the supplied (or default) engine.
   *
   * @param engine - Babylon Engine instance. Defaults to {@link EngineManager#getEngine}.
   * @returns The newly created Scene.
   */
  initialize(engine = EngineManager.getInstance().getEngine()): Scene {
    if (this.initialized && this.scene) {
      return this.scene;
    }

    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0, 0, 0, 1);

    this.initialized = true;
    return this.scene;
  }

  /** @throws if called before {@link initialize}. */
  getScene(): Scene {
    if (!this.scene) {
      throw new Error('[SceneManager] Not initialized — call initialize() first');
    }
    return this.scene;
  }

  /** Start the engine render loop tied to this scene. */
  runRenderLoop(): void {
    const engine = EngineManager.getInstance().getEngine();

    this.renderLoopCallback = () => {
      this.scene?.render();
    };
    engine.runRenderLoop(this.renderLoopCallback);
  }

  /** Stop the render loop registered by this manager. */
  stopRenderLoop(): void {
    if (!this.renderLoopCallback) {
      return;
    }

    const engine = EngineManager.getInstance().getEngine();
    engine.stopRenderLoop(this.renderLoopCallback);
    this.renderLoopCallback = null;
  }

  /**
   * Dispose every mesh, light, camera, material and texture in the scene
   * while keeping the Scene itself alive. Useful when switching levels
   * without tearing down the engine.
   */
  clear(): void {
    if (!this.scene) {
      return;
    }

    // Copy arrays before iterating because disposal mutates the original lists.
    [...this.scene.meshes].forEach((mesh) => mesh.dispose(false, true));
    [...this.scene.lights].forEach((light) => light.dispose());
    [...this.scene.cameras].forEach((camera) => camera.dispose());
    [...this.scene.materials].forEach((material) => material.dispose());
    [...this.scene.textures].forEach((texture) => texture.dispose());
  }

  /**
   * Halt the render loop, dispose the scene, and release the singleton.
   * The Engine is **not** disposed here — that is {@link EngineManager}'s responsibility.
   */
  dispose(): void {
    if (!this.initialized) {
      return;
    }

    this.stopRenderLoop();

    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }

    this.initialized = false;
    SceneManager.instance = null;
  }
}
