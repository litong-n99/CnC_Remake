import { Scene, Color4 } from '@babylonjs/core';
import { EngineManager } from './EngineManager';

/**
 * Scene manager supporting multiple scenes with a single engine.
 *
 * The active scene is rendered each frame. Call {@link switchScene}
 * to swap between menu, game, loading, etc.
 */
export class SceneManager {
  private static instance: SceneManager | null = null;

  private scenes = new Map<string, Scene>();
  private activeSceneId: string | null = null;
  private renderLoopCallback: (() => void) | null = null;

  private constructor() {}

  static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  /** Create a new named Scene bound to the default engine. */
  createScene(id: string, clearColor = new Color4(0, 0, 0, 1)): Scene {
    const engine = EngineManager.getInstance().getEngine();
    const scene = new Scene(engine);
    scene.clearColor = clearColor;
    this.scenes.set(id, scene);
    return scene;
  }

  /** Retrieve a previously created scene by id. */
  getScene(id: string): Scene | undefined {
    return this.scenes.get(id);
  }

  /** Get the currently active scene (the one being rendered). */
  getActiveScene(): Scene | undefined {
    if (!this.activeSceneId) return undefined;
    return this.scenes.get(this.activeSceneId);
  }

  /** Switch the render loop to a different scene. */
  switchScene(id: string): void {
    const scene = this.scenes.get(id);
    if (!scene) {
      throw new Error(`[SceneManager] Scene "${id}" not found`);
    }
    this.activeSceneId = id;
  }

  /** Start the engine render loop (renders the active scene each frame). */
  runRenderLoop(): void {
    if (this.renderLoopCallback) return;

    const engine = EngineManager.getInstance().getEngine();
    this.renderLoopCallback = () => {
      this.getActiveScene()?.render();
    };
    engine.runRenderLoop(this.renderLoopCallback);
  }

  /** Stop the render loop registered by this manager. */
  stopRenderLoop(): void {
    if (!this.renderLoopCallback) return;

    const engine = EngineManager.getInstance().getEngine();
    engine.stopRenderLoop(this.renderLoopCallback);
    this.renderLoopCallback = null;
  }

  /** Dispose a specific scene and remove it from the manager. */
  disposeScene(id: string): void {
    const scene = this.scenes.get(id);
    if (scene) {
      scene.dispose();
      this.scenes.delete(id);
    }
    if (this.activeSceneId === id) {
      this.activeSceneId = null;
    }
  }

  /** Dispose every scene and release the singleton. */
  dispose(): void {
    this.stopRenderLoop();

    for (const [, scene] of this.scenes) {
      scene.dispose();
    }
    this.scenes.clear();
    this.activeSceneId = null;
    SceneManager.instance = null;
  }
}
