/**
 * CellLayer<T> — OpenRA-style generic terrain data layer.
 *
 * A flat one-dimensional array backs a 2-D cell grid.  This is both
 * memory-efficient (no nested arrays) and cache-friendly when iterating
 * over the whole map.
 *
 * Source: OpenRA.Game/Map/CellLayer.cs + CellLayerBase.cs
 */

import type { CPos } from './Coordinates';
export { type CPos, cpos, cposEquals } from './Coordinates';

/**
 * Signature for listeners that react to a single cell changing its value.
 */
export type CellEntryChangedHandler<T> = (cell: CPos, oldValue: T, newValue: T) => void;

export class CellLayer<T> {
  private readonly entries: T[];
  private readonly listeners: CellEntryChangedHandler<T>[] = [];

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly defaultValue: T
  ) {
    this.entries = new Array<T>(width * height);
    for (let i = 0; i < this.entries.length; i++) {
      this.entries[i] = defaultValue;
    }
  }

  // ── Index helpers ──

  private idx(x: number, y: number): number {
    return y * this.width + x;
  }

  /** True when (x,y) is inside the map bounds. */
  contains(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // ── Read ──

  get(x: number, y: number): T;
  get(cell: CPos): T;
  get(xOrCell: number | CPos, y?: number): T {
    if (typeof xOrCell === 'object') {
      return this.get(xOrCell.x, xOrCell.y);
    }
    const x = xOrCell;
    if (y === undefined || !this.contains(x, y)) {
      return this.defaultValue;
    }
    return this.entries[this.idx(x, y)];
  }

  // ── Write ──

  set(x: number, y: number, value: T): void;
  set(cell: CPos, value: T): void;
  set(xOrCell: number | CPos, yOrValue: number | T, value?: T): void {
    let x: number;
    let y: number;
    let v: T;

    if (typeof xOrCell === 'object') {
      x = xOrCell.x;
      y = xOrCell.y;
      v = yOrValue as T;
    } else {
      x = xOrCell;
      y = yOrValue as number;
      v = value as T;
    }

    if (!this.contains(x, y)) return;

    const i = this.idx(x, y);
    const old = this.entries[i];
    if (old === v) return; // no change → no event

    this.entries[i] = v;
    const cell: CPos = { x, y, layer: 0 };
    for (const cb of this.listeners) {
      cb(cell, old, v);
    }
  }

  // ── Batch write without duplicate events ──

  setRaw(x: number, y: number, value: T): void {
    if (!this.contains(x, y)) return;
    this.entries[this.idx(x, y)] = value;
  }

  // ── Events ──

  onCellEntryChanged(handler: CellEntryChangedHandler<T>): () => void {
    this.listeners.push(handler);
    return () => {
      const i = this.listeners.indexOf(handler);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  // ── Dimensions ──

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  // ── Iteration ──

  /** Iterate every cell in row-major order. */
  forEach(callback: (value: T, x: number, y: number) => void): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        callback(this.entries[this.idx(x, y)], x, y);
      }
    }
  }

  /** Map every cell to a new value. */
  map<U>(mapper: (value: T, x: number, y: number) => U): CellLayer<U> {
    const result = new CellLayer<U>(this.width, this.height, mapper(this.defaultValue, 0, 0));
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        result.setRaw(x, y, mapper(this.entries[this.idx(x, y)], x, y));
      }
    }
    return result;
  }
}

/**
 * ProjectedCellLayer<T> — A PPos-indexed array without events.
 *
 * Used by the Shroud / Fog-of-War system where the projection coordinate
 * space (screen-space) may differ from the logical cell space (e.g. cliffs).
 */
export class ProjectedCellLayer<T> {
  private readonly entries: T[];

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly defaultValue: T
  ) {
    this.entries = new Array<T>(width * height).fill(defaultValue);
  }

  private idx(u: number, v: number): number {
    return v * this.width + u;
  }

  get(u: number, v: number): T {
    if (u < 0 || u >= this.width || v < 0 || v >= this.height) return this.defaultValue;
    return this.entries[this.idx(u, v)];
  }

  set(u: number, v: number, value: T): void {
    if (u < 0 || u >= this.width || v < 0 || v >= this.height) return;
    this.entries[this.idx(u, v)] = value;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}
