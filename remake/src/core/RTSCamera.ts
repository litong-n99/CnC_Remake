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
  /** Whether to enable pointer lock on left-click (default: `true`). */
  pointerLock?: boolean;
}

/**
 * RTS-style camera controller for Babylon.js.
 *
 * Features:
 * - Fixed isometric-style angle (configurable `alpha`/`beta`).
 * - Mouse-wheel zoom with damping.
 * - Right-click drag to pan (pixel-perfect ground-plane tracking).
 * - Screen-edge auto-scroll.
 * - Pointer lock: click canvas to capture the cursor; press Esc to release.
 */
export class RTSCamera {
  private camera: ArcRotateCamera;
  private scene: Scene;
  private engine: Engine;

  private readonly options: Required<RTSCameraOptions>;

  private targetZoom: number;
  private isRightDragging = false;
  private isMouseOverCanvas = false;
  private isPointerLocked = false;
  private mouseX = 0;
  private mouseY = 0;
  private panningStartPoint: Vector3 | null = null;
  private panningStartTarget: Vector3 | null = null;
  private rightClickPending = false;
  private rightDragStartX = 0;
  private rightDragStartY = 0;

  /** 右键单击回调（非拖拽）。参数为屏幕像素坐标。 */
  onRightClick: ((screenX: number, screenY: number) => void) | null = null;
  /** 左键单击回调。参数为屏幕像素坐标。 */
  onLeftClick: ((screenX: number, screenY: number) => void) | null = null;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundMouseEnter: (e: MouseEvent) => void;
  private boundMouseLeave: (e: MouseEvent) => void;
  private boundWindowBlur: () => void;
  private boundContextMenu: (e: MouseEvent) => void;
  private boundClick: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundPointerLockChange: () => void;
  private boundPointerLockError: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  private cursorDiv: HTMLDivElement | null = null;

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
      pointerLock: options.pointerLock ?? true,
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
    this.boundMouseEnter = this.handleMouseEnter.bind(this);
    this.boundMouseLeave = this.handleMouseLeave.bind(this);
    this.boundWindowBlur = this.handleWindowBlur.bind(this);
    this.boundContextMenu = this.handleContextMenu.bind(this);
    this.boundClick = this.handleClick.bind(this);
    this.boundWheel = this.handleWheel.bind(this);
    this.boundPointerLockChange = this.handlePointerLockChange.bind(this);
    this.boundPointerLockError = this.handlePointerLockError.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);

    this.renderCallback = this.update.bind(this);

    this.setupCursor();
    this.setupInputHandlers();
    this.setupPointerObservable();
    this.scene.onBeforeRenderObservable.add(this.renderCallback);
  }

  // ── HTML cursor (visible only when pointer lock is active) ──

  private setupCursor(): void {
    if (!this.options.pointerLock) return;

    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.width = '12px';
    div.style.height = '12px';
    div.style.border = '2px solid #ffffff';
    div.style.backgroundColor = 'rgba(255,255,255,0.25)';
    div.style.pointerEvents = 'none';
    div.style.zIndex = '99999';
    div.style.display = 'none';
    document.body.appendChild(div);

    this.cursorDiv = div;
  }

  // ── Babylon pointer observable (runs before GUI picking) ──

  private setupPointerObservable(): void {
    this.scene.onPrePointerObservable.add(
      () => {
        if (!this.isPointerLocked) return;
        const canvas = this.engine.getRenderingCanvas();
        if (!canvas) return;
        const dpr = canvas.width / canvas.getBoundingClientRect().width;
        // Feed virtual cursor into Babylon so GUI (Sidebar) picking works.
        this.scene.pointerX = this.mouseX * dpr;
        this.scene.pointerY = this.mouseY * dpr;
      },
      undefined,
      true // insertFirst — run before GUI's own observer
    );
  }

  // ── Input wiring ──

  private setupInputHandlers(): void {
    const canvas = this.engine.getRenderingCanvas();
    if (!canvas) return;

    canvas.addEventListener('mousemove', this.boundMouseMove);
    canvas.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    canvas.addEventListener('mouseenter', this.boundMouseEnter);
    canvas.addEventListener('mouseleave', this.boundMouseLeave);
    window.addEventListener('blur', this.boundWindowBlur);
    canvas.addEventListener('contextmenu', this.boundContextMenu);
    canvas.addEventListener('click', this.boundClick);
    canvas.addEventListener('wheel', this.boundWheel, { passive: false });
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);
    document.addEventListener('pointerlockerror', this.boundPointerLockError);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  /**
   * Track mouse position in canvas-local coordinates (0,0 = top-left of canvas).
   * In pointer-lock mode we accumulate movementX/Y and also feed the value
   * into Babylon's scene.pointerX/pointerY so GUI (Sidebar) stays interactive.
   */
  private handleMouseMove(e: MouseEvent): void {
    const canvas = this.engine.getRenderingCanvas();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (this.isPointerLocked) {
      this.mouseX += e.movementX;
      this.mouseY += e.movementY;
      // Clamp to canvas bounds so edge-scroll still works logically.
      this.mouseX = Math.max(0, Math.min(rect.width - 1, this.mouseX));
      this.mouseY = Math.max(0, Math.min(rect.height - 1, this.mouseY));
    } else {
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    }

    if (this.isRightDragging) {
      this.handlePan(this.mouseX, this.mouseY);
      const dragDist = Math.abs(this.mouseX - this.rightDragStartX) + Math.abs(this.mouseY - this.rightDragStartY);
      if (dragDist > 5) {
        this.rightClickPending = false;
      }
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 2) {
      // Right button — start panning
      this.isRightDragging = true;
      this.rightClickPending = true;
      this.rightDragStartX = this.mouseX;
      this.rightDragStartY = this.mouseY;
      this.panningStartPoint = this.raycastToGround(this.mouseX, this.mouseY);
      this.panningStartTarget = this.camera.target.clone();
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 2) {
      const wasPending = this.rightClickPending;
      this.isRightDragging = false;
      this.rightClickPending = false;
      this.panningStartPoint = null;
      this.panningStartTarget = null;

      // In pointer-lock mode contextmenu is unreliable; fire onRightClick
      // here when the right-button press was a click rather than a drag.
      if (this.isPointerLocked && wasPending && this.onRightClick) {
        this.onRightClick(this.mouseX, this.mouseY);
      }
    }
  }

  private handleClick(_e: MouseEvent): void {
    // Request pointer lock on left-click so the cursor is captured for RTS play.
    if (this.options.pointerLock && !this.isPointerLocked) {
      const canvas = this.engine.getRenderingCanvas();
      if (canvas) {
        try {
          canvas.requestPointerLock();
        } catch (err) {
          console.warn('Pointer lock request failed:', err);
        }
      }
    }

    if (this.onLeftClick) {
      // Use tracked mouse position so pointer-lock works correctly.
      this.onLeftClick(this.mouseX, this.mouseY);
    }
  }

  private handleMouseEnter(): void {
    this.isMouseOverCanvas = true;
  }

  private handleMouseLeave(): void {
    this.isMouseOverCanvas = false;
    // Release any stuck drag when the cursor leaves the canvas.
    this.isRightDragging = false;
    this.panningStartPoint = null;
    this.panningStartTarget = null;
  }

  private handleWindowBlur(): void {
    this.isMouseOverCanvas = false;
    this.isRightDragging = false;
    this.panningStartPoint = null;
    this.panningStartTarget = null;
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    // In pointer-lock mode we rely on handleMouseUp for right-click detection.
    if (!this.isPointerLocked && this.onRightClick) {
      this.onRightClick(this.mouseX, this.mouseY);
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    this.targetZoom += delta * 5;
    this.targetZoom = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, this.targetZoom));
  }

  private handlePointerLockChange(): void {
    const canvas = this.engine.getRenderingCanvas();
    const wasLocked = this.isPointerLocked;
    this.isPointerLocked = canvas !== null && document.pointerLockElement === canvas;
    if (this.isPointerLocked && !wasLocked) {
      // eslint-disable-next-line no-console
      console.info('Pointer lock acquired');
    } else if (!this.isPointerLocked && wasLocked) {
      // eslint-disable-next-line no-console
      console.info('Pointer lock released');
      // Reset drag state when lock is lost.
      this.isRightDragging = false;
      this.panningStartPoint = null;
      this.panningStartTarget = null;
    }
  }

  private handlePointerLockError(): void {
    console.warn('Pointer lock error — request was denied or failed');
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isPointerLocked) {
      document.exitPointerLock();
    }
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
   * Cast a ray from the camera through the given canvas-local pixel and
   * intersect it with the mathematical ground plane `y = 0`.
   *
   * `canvasX`/`canvasY` are relative to the canvas top-left (CSS pixels).
   */
  private raycastToGround(canvasX: number, canvasY: number): Vector3 | null {
    const canvas = this.engine.getRenderingCanvas();
    if (!canvas) return null;

    const dpr = canvas.width / canvas.getBoundingClientRect().width;
    const x = canvasX * dpr;
    const y = canvasY * dpr;

    const ray = this.scene.createPickingRay(x, y, null, this.camera);

    if (Math.abs(ray.direction.y) < 0.0001) {
      return null;
    }

    const t = -ray.origin.y / ray.direction.y;
    if (t < 0) {
      return null;
    }

    return ray.origin.add(ray.direction.scale(t));
  }

  /**
   * Convert a canvas-local pixel coordinate to a ground-plane (y = 0) world
   * coordinate. Returns `null` if the ray is parallel to the ground.
   */
  screenToGround(canvasX: number, canvasY: number): Vector3 | null {
    return this.raycastToGround(canvasX, canvasY);
  }

  /**
   * Current mouse position in render-buffer coordinates.
   * Accounts for device-pixel-ratio and pointer-lock virtual cursor.
   */
  getPointerPosition(): { x: number; y: number } {
    const canvas = this.engine.getRenderingCanvas();
    if (!canvas) return { x: 0, y: 0 };
    const dpr = canvas.width / canvas.getBoundingClientRect().width;
    return { x: this.mouseX * dpr, y: this.mouseY * dpr };
  }

  // ── Per-frame update ──

  private update(): void {
    // Zoom damping
    const diff = this.targetZoom - this.camera.radius;
    if (Math.abs(diff) > 0.01) {
      this.camera.radius += diff * this.options.zoomDamping;
    }

    // HTML cursor position update
    if (this.cursorDiv) {
      this.cursorDiv.style.display = this.isPointerLocked ? 'block' : 'none';
      if (this.isPointerLocked) {
        const canvas = this.engine.getRenderingCanvas();
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          this.cursorDiv.style.left = `${rect.left + this.mouseX - 6}px`;
          this.cursorDiv.style.top = `${rect.top + this.mouseY - 6}px`;
        }
      }
    }

    // Edge scrolling
    if (this.isRightDragging) return;

    // Pointer lock active: mouse is confined to the canvas, so edge-scroll
    // is always valid.  Pointer lock inactive: only scroll when the real
    // cursor is over the canvas.
    if (!this.isPointerLocked && !this.isMouseOverCanvas) return;

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
      canvas.removeEventListener('mouseenter', this.boundMouseEnter);
      canvas.removeEventListener('mouseleave', this.boundMouseLeave);
      canvas.removeEventListener('contextmenu', this.boundContextMenu);
      canvas.removeEventListener('click', this.boundClick);
      canvas.removeEventListener('wheel', this.boundWheel);
    }
    window.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('blur', this.boundWindowBlur);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
    document.removeEventListener('pointerlockerror', this.boundPointerLockError);
    window.removeEventListener('keydown', this.boundKeyDown);

    if (this.isPointerLocked) {
      document.exitPointerLock();
    }

    if (this.cursorDiv) {
      this.cursorDiv.remove();
    }
    this.camera.dispose();
  }
}
