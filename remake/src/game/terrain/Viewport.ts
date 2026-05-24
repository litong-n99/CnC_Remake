import type { Scene, Camera } from '@babylonjs/core';
import { Vector3, Viewport as BabylonViewport } from '@babylonjs/core';
import type { CPos, WPos } from './Coordinates';
import { wposToCPos, wposToBabylon } from './Coordinates';
import type { MapGrid } from './MapGrid';

/**
 * Viewport — Screen ↔ World ↔ Cell coordinate conversion.
 *
 * Source: OpenRA.Game/Graphics/Viewport.cs
 *
 * Provides:
 *   - viewToWorld : screen pixel → ground-plane WPos (raycast)
 *   - worldToView : WPos → screen pixel (projection)
 *   - viewToCell  : screen pixel → CPos (view → world → cell)
 *
 * The ground plane is assumed to be y = 0 (flat terrain).
 * Height-aware raycasting is stubbed for Task 23.29 (Height).
 */

export interface ViewportOptions {
  /** HTML canvas element (or its id). */
  canvas: HTMLCanvasElement | string;
  /** Camera used for projection. */
  camera: Camera;
  /** Scene used for raycasting. */
  scene: Scene;
  /** Map grid for cell conversion. */
  mapGrid: MapGrid;
}

export class Viewport {
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: Camera;
  private readonly scene: Scene;
  private readonly mapGrid: MapGrid;

  constructor(options: ViewportOptions) {
    if (typeof options.canvas === 'string') {
      const el = document.getElementById(options.canvas);
      if (!el || !(el instanceof HTMLCanvasElement)) {
        throw new Error(`Viewport: canvas "${options.canvas}" not found`);
      }
      this.canvas = el;
    } else {
      this.canvas = options.canvas;
    }
    this.camera = options.camera;
    this.scene = options.scene;
    this.mapGrid = options.mapGrid;
  }

  // ── Screen → World ──

  /**
   * Convert a screen pixel coordinate to a world position on the ground plane (y = 0).
   * Returns `null` if the ray is parallel to the ground plane.
   */
  viewToWorld(screenX: number, screenY: number): WPos | null {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left) * dpr;
    const y = (screenY - rect.top) * dpr;

    const ray = this.scene.createPickingRay(x, y, null, this.camera);

    if (Math.abs(ray.direction.y) < 0.0001) {
      return null; // Ray parallel to ground
    }

    const t = -ray.origin.y / ray.direction.y;
    if (t < 0) {
      return null; // Ground is behind the camera
    }

    const hit = ray.origin.add(ray.direction.scale(t));
    return this.mapGrid.babylonToWPos({ x: hit.x, y: hit.y, z: hit.z });
  }

  /**
   * Convert a screen pixel coordinate to the containing cell.
   * Returns `null` if the ray does not intersect the ground plane.
   */
  viewToCell(screenX: number, screenY: number): CPos | null {
    const wpos = this.viewToWorld(screenX, screenY);
    if (!wpos) return null;
    return wposToCPos(wpos, this.mapGrid.type);
  }

  // ── World → Screen ──

  /**
   * Convert a world position to screen pixel coordinates.
   * Returns `{ x: -1, y: -1 }` if the point is behind the camera.
   */
  worldToView(wpos: WPos): { x: number; y: number } {
    const world = wposToBabylon(wpos, this.mapGrid.type, this.mapGrid.cellSize);
    const v3 = new Vector3(world.x, world.y, world.z);
    const engine = this.camera.getEngine();
    const projected = Vector3.Project(
      v3,
      this.camera.getWorldMatrix(),
      this.camera.getTransformationMatrix(),
      new BabylonViewport(0, 0, engine.getRenderWidth(), engine.getRenderHeight())
    );

    // projected.x/y are in DPR-scaled canvas pixels
    const dpr = window.devicePixelRatio || 1;
    return {
      x: projected.x / dpr,
      y: projected.y / dpr,
    };
  }

  // ── Helpers ──

  /** Canvas CSS pixel size. */
  getSize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }
}
