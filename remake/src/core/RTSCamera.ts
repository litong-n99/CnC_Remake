import { ArcRotateCamera, Vector3, Scene, Engine } from '@babylonjs/core';

export interface RTSCameraOptions {
  /** Camera name (default: `'rtsCamera'`). */
  name?: string;
  /** Initial target position on the ground plane (default: `Vector3.Zero()`). */
  target?: Vector3;
  /** Initial distance from target in world units (default: `50`). */
  initialZoom?: number;
  /** Minimum zoom distance (default: `20`). */
  minZoom?: number;
  /** Maximum zoom distance (default: `100`). */
  maxZoom?: number;
  /** Vertical orbit angle from the Y axis — 0 = top-down, π/2 = horizontal (default: `π/4` ≈ 45°). */
  beta?: number;
  /** Horizontal orbit angle around the Y axis (default: `−π/4`). */
  alpha?: number;
  /** Distance from screen edge in pixels that triggers auto-scroll (default: `20`). */
  edgeThreshold?: number;
  /** Edge-scroll speed in world units per frame at 60 fps (default: `0.5`). */
  edgeScrollSpeed?: number;
  /** Zoom interpolation factor per frame, 0–1 (default: `0.1`). */
  zoomDamping?: number;
}

/**
 * RTS-style camera controller for Babylon.js.
 *
 * Features:
 * - Fixed isometric-style angle (configurable `alpha`/`beta`).
 * - Mouse-wheel zoom with damping.
 * - Right-click drag to pan (pixel-perfect ground-plane tracking).
 * - Screen-edge auto-scroll.
 *
 * The camera is implemented as an {@link ArcRotateCamera} with all default
 * inputs cleared so every interaction is explicitly controlled.
 */
export class RTSCamera {
  private camera: ArcRotateCamera;
  private scene: Scene;
  private engine: Engine;

  private readonly options: Required<RTSCameraOptions>;

  private targetZoom: number;
  private isRightDragging = false;
  private mouseX = 0;
  private mouseY = 0;
  private panningStartPoint: Vector3 | null = null;
  private panningStartTarget: Vector3 | null = null;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundContextMenu: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;

  private renderCallback: () => void;

  constructor(scene: Scene, engine: Engine, options: RTSCameraOptions = {}) {
    this.scene = scene;
    this.engine = engine;

    this.options = {
      name: options.name ?? 'rtsCamera',
      target: options.target ?? Vector3.Zero(),
      initialZoom: options.initialZoom ?? 50,
      minZoom: options.minZoom ?? 20,
      maxZoom: options.maxZoom ?? 100,
      beta: options.beta ?? Math.PI / 4,
      alpha: options.alpha ?? -Math.PI / 4,
      edgeThreshold: options.edgeThreshold ?? 20,
      edgeScrollSpeed: options.edgeScrollSpeed ?? 0.5,
      zoomDamping: options.zoomDamping ?? 0.1,
    };

    this.targetZoom = this.options.initialZoom;

    this.camera = new ArcRotateCamera(
      this.options.name,
      this.options.alpha,
      this.options.beta,
      this.options.initialZoom,
      this.options.target.clone(),
      scene
    );

    // Remove all built-in camera inputs (orbit, zoom, pan) — we handle everything.
    this.camera.inputs.clear();
    this.camera.lowerRadiusLimit = this.options.minZoom;
    this.camera.upperRadiusLimit = this.options.maxZoom;

    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundContextMenu = this.handleContextMenu.bind(this);
    this.boundWheel = this.handleWheel.bind(this);

    this.renderCallback = this.update.bind(this);

    this.setupInputHandlers();
    this.scene.onBeforeRenderObservable.add(this.renderCallback);
  }

  // ── Input wiring ──

  private setupInputHandlers(): void {
    const canvas = this.engine.getRenderingCanvas();
    if (!canvas) return;

    canvas.addEventListener('mousemove', this.boundMouseMove);
    canvas.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    canvas.addEventListener('contextmenu', this.boundContextMenu);
    canvas.addEventListener('wheel', this.boundWheel, { passive: false });
  }

  private handleMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (this.isRightDragging) {
      this.handlePan(e.clientX, e.clientY);
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 2) {
      // Right button
      this.isRightDragging = true;
      this.panningStartPoint = this.raycastToGround(e.clientX, e.clientY);
      this.panningStartTarget = this.camera.target.clone();
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 2) {
      this.isRightDragging = false;
      this.panningStartPoint = null;
      this.panningStartTarget = null;
    }
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    this.targetZoom += delta * 5;
    this.targetZoom = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, this.targetZoom));
  }

  // ── Panning ──

  private handlePan(screenX: number, screenY: number): void {
    if (!this.panningStartPoint || !this.panningStartTarget) return;

    const currentGroundPoint = this.raycastToGround(screenX, screenY);
    if (!currentGroundPoint) return;

    const delta = this.panningStartPoint.subtract(currentGroundPoint);
    this.camera.target.copyFrom(this.panningStartTarget.add(delta));
  }

  /**
   * Cast a ray from the camera through the given screen pixel and intersect
   * it with the mathematical ground plane `y = 0`.
   */
  private raycastToGround(screenX: number, screenY: number): Vector3 | null {
    const ray = this.scene.createPickingRay(screenX, screenY, null, this.camera);

    if (Math.abs(ray.direction.y) < 0.0001) {
      return null;
    }

    const t = -ray.origin.y / ray.direction.y;
    if (t < 0) {
      return null;
    }

    return ray.origin.add(ray.direction.scale(t));
  }

  // ── Per-frame update ──

  private update(): void {
    // Zoom damping
    const diff = this.targetZoom - this.camera.radius;
    if (Math.abs(diff) > 0.01) {
      this.camera.radius += diff * this.options.zoomDamping;
    }

    // Edge scrolling
    if (this.isRightDragging) return;

    const canvas = this.engine.getRenderingCanvas();
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const right = this.getGroundRight();
    const forward = this.getGroundForward();

    let dx = 0;
    let dz = 0;

    if (this.mouseX < this.options.edgeThreshold) {
      dx -= this.options.edgeScrollSpeed;
    }
    if (this.mouseX > rect.width - this.options.edgeThreshold) {
      dx += this.options.edgeScrollSpeed;
    }
    if (this.mouseY < this.options.edgeThreshold) {
      dz += this.options.edgeScrollSpeed;
    }
    if (this.mouseY > rect.height - this.options.edgeThreshold) {
      dz -= this.options.edgeScrollSpeed;
    }

    if (dx !== 0 || dz !== 0) {
      const move = right.scale(dx).add(forward.scale(dz));
      this.camera.target.addInPlace(move);
    }
  }

  // ── Helpers ──

  /** Camera view direction projected onto the XZ ground plane. */
  private getGroundForward(): Vector3 {
    const dir = this.camera.getDirection(new Vector3(0, 0, 1));
    dir.y = 0;
    if (dir.lengthSquared() < 0.0001) {
      return new Vector3(0, 0, 1);
    }
    return dir.normalize();
  }

  /** Camera right direction projected onto the XZ ground plane. */
  private getGroundRight(): Vector3 {
    const dir = this.camera.getDirection(new Vector3(1, 0, 0));
    dir.y = 0;
    if (dir.lengthSquared() < 0.0001) {
      return new Vector3(1, 0, 0);
    }
    return dir.normalize();
  }

  // ── Public API ──

  /** The underlying Babylon.js camera instance. */
  getCamera(): ArcRotateCamera {
    return this.camera;
  }

  /** Current look-at target on the ground plane. */
  getTarget(): Vector3 {
    return this.camera.target;
  }

  /** Teleport the look-at target. */
  setTarget(target: Vector3): void {
    this.camera.target.copyFrom(target);
  }

  /** Release event listeners, render-loop callback and camera resources. */
  dispose(): void {
    this.scene.onBeforeRenderObservable.removeCallback(this.renderCallback);

    const canvas = this.engine.getRenderingCanvas();
    if (canvas) {
      canvas.removeEventListener('mousemove', this.boundMouseMove);
      canvas.removeEventListener('mousedown', this.boundMouseDown);
      canvas.removeEventListener('contextmenu', this.boundContextMenu);
      canvas.removeEventListener('wheel', this.boundWheel);
    }
    window.removeEventListener('mouseup', this.boundMouseUp);

    this.camera.dispose();
  }
}
