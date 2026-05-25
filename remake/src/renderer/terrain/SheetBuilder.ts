import { DynamicTexture, Scene } from '@babylonjs/core';
import type { SpriteFrame } from './SpriteLoader';

/**
 * SheetBuilder — packs multiple SpriteFrames into a single texture atlas.
 *
 * Uses a simple row-packing algorithm (similar to OpenRA's SheetBuilder).
 * All frames are written into a CPU-side canvas, then uploaded as one
 * DynamicTexture.  This minimizes draw calls because every frame in the
 * atlas shares the same Babylon.js Texture.
 */

export interface AtlasSlot {
  /** Normalized UV min (inclusive). */
  readonly u: number;
  readonly v: number;
  /** Normalized UV max (inclusive). */
  readonly u2: number;
  readonly v2: number;
  /** Pixel rect inside the atlas. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export class SheetBuilder {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private currentX = 0;
  private currentY = 0;
  private rowHeight = 0;
  private readonly padding = 1;
  private readonly slots = new Map<string, AtlasSlot>();

  constructor(
    private readonly width: number,
    private readonly height: number
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
  }

  /** Attempt to allocate space for a frame. Returns null if atlas is full. */
  allocate(id: string, frame: SpriteFrame): AtlasSlot | null {
    const w = frame.width + this.padding * 2;
    const h = frame.height + this.padding * 2;

    if (w > this.width) return null;

    if (this.currentX + w > this.width) {
      // Start new row
      this.currentX = 0;
      this.currentY += this.rowHeight;
      this.rowHeight = 0;
    }

    if (this.currentY + h > this.height) {
      return null; // Atlas full
    }

    const slot: AtlasSlot = {
      u: (this.currentX + this.padding) / this.width,
      v: (this.currentY + this.padding) / this.height,
      u2: (this.currentX + this.padding + frame.width) / this.width,
      v2: (this.currentY + this.padding + frame.height) / this.height,
      x: this.currentX + this.padding,
      y: this.currentY + this.padding,
      width: frame.width,
      height: frame.height,
    };

    // Write frame data into atlas canvas
    const imageData = new ImageData(new Uint8ClampedArray(frame.data), frame.width, frame.height);
    this.ctx.putImageData(imageData, slot.x, slot.y);

    this.currentX += w;
    this.rowHeight = Math.max(this.rowHeight, h);
    this.slots.set(id, slot);
    return slot;
  }

  /** Build a Babylon.js DynamicTexture from the current atlas canvas. */
  buildTexture(scene: Scene, name = 'terrainAtlas'): DynamicTexture {
    const tex = new DynamicTexture(name, { width: this.width, height: this.height }, scene, false);
    tex.update();
    // Copy our atlas canvas onto the DynamicTexture's canvas
    const destCtx = tex.getContext() as CanvasRenderingContext2D;
    destCtx.drawImage(this.canvas, 0, 0);
    tex.update();
    tex.wrapU = 1; // CLAMP_ADDRESSMODE
    tex.wrapV = 1;
    return tex;
  }

  getSlot(id: string): AtlasSlot | undefined {
    return this.slots.get(id);
  }

  getSlotCount(): number {
    return this.slots.size;
  }
}
