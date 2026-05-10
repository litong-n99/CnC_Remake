import { Engine } from '@babylonjs/core';

export type EngineInitOptions = ConstructorParameters<typeof Engine>[2];

/**
 * Singleton manager for the Babylon.js rendering engine.
 *
 * Handles canvas creation, engine instantiation, window resize,
 * and complete disposal of GPU resources. Mirrors the role of
 * the original C&C WIN32LIB initialisation and message-loop setup.
 */
export class EngineManager {
  private static instance: EngineManager | null = null;

  private engine: Engine | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private resizeHandler: (() => void) | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): EngineManager {
    if (!EngineManager.instance) {
      EngineManager.instance = new EngineManager();
    }
    return EngineManager.instance;
  }

  /**
   * Create the canvas, build the Engine, and wire up the resize listener.
   *
   * @param containerId - ID of the DOM element that will host the canvas.
   * @param antialias   - Whether to enable antialiasing (default true).
   * @param options     - Babylon EngineOptions forwarded to the constructor.
   */
  initialize(containerId = 'app', antialias = true, options?: EngineInitOptions): void {
    if (this.initialized) {
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`[EngineManager] Container #${containerId} not found`);
    }

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'renderCanvas';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);

    this.engine = new Engine(this.canvas, antialias, options);

    this.resizeHandler = () => {
      this.engine?.resize();
    };
    window.addEventListener('resize', this.resizeHandler);

    this.initialized = true;
  }

  /** @throws if called before {@link initialize}. */
  getEngine(): Engine {
    if (!this.engine) {
      throw new Error('[EngineManager] Not initialized — call initialize() first');
    }
    return this.engine;
  }

  /** @throws if called before {@link initialize}. */
  getCanvas(): HTMLCanvasElement {
    if (!this.canvas) {
      throw new Error('[EngineManager] Not initialized — call initialize() first');
    }
    return this.canvas;
  }

  /** Trigger a manual engine resize (rarely needed; resize events are handled automatically). */
  resize(): void {
    this.engine?.resize();
  }

  /**
   * Tear down the engine, remove the canvas from the DOM, and release
   * the singleton reference so the manager can be re-created later.
   */
  dispose(): void {
    if (!this.initialized) {
      return;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
      this.canvas = null;
    }

    this.initialized = false;
    EngineManager.instance = null;
  }
}
