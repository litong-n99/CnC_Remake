/**
 * Multi-layer coordinate system — OpenRA-style CPos / MPos / PPos / WPos.
 *
 * Source: OpenRA.Game/Map/CPos.cs + MPos.cs + PPos.cs + WPos.cs +
 *         WVec.cs + WDist.cs + CVec.cs
 *
 * This module defines every coordinate type used in the engine and the
 * bidirectional conversion rules between them.
 *
 * WDist (world-distance) is the atomic unit.  One cell is:
 *   - Rectangular grid : 1024 WDist
 *   - Isometric grid   : 1448 WDist (diagonal)
 *
 * Babylon.js world units are obtained by dividing WDist by the respective
 * constant above.
 */

// ── Type aliases ──

/** World distance — smallest addressable world unit (integer). */
export type WDist = number;

/** World vector — difference between two WPos values. */
export interface WVec {
  readonly x: WDist;
  readonly y: WDist;
  readonly z: WDist;
}

/** Cell vector — difference between two CPos values (no layer). */
export interface CVec {
  readonly x: number;
  readonly y: number;
}

/** Logical cell coordinate.  The optional `layer` supports multi-floor maps. */
export interface CPos {
  readonly x: number;
  readonly y: number;
  readonly layer?: number;
}

/** Map (array) coordinate.  For rectangular grids u=x, v=y.
 *  For isometric grids u=(x-y)/2, v=x+y. */
export interface MPos {
  readonly u: number;
  readonly v: number;
}

/** Projected coordinate — used for rendering and Shroud.
 *  In isometric mode one MPos may project to multiple PPos (cliff overhang). */
export interface PPos {
  readonly u: number;
  readonly v: number;
}

/** World position.  Units are WDist. */
export interface WPos {
  readonly x: WDist;
  readonly y: WDist;
  readonly z: WDist;
}

// ── Factory helpers ──

export function cpos(x: number, y: number, layer = 0): CPos {
  return { x, y, layer };
}

export function mpos(u: number, v: number): MPos {
  return { u, v };
}

export function ppos(u: number, v: number): PPos {
  return { u, v };
}

export function wpos(x: WDist, y: WDist, z: WDist): WPos {
  return { x, y, z };
}

export function wvec(x: WDist, y: WDist, z: WDist): WVec {
  return { x, y, z };
}

export function cvec(x: number, y: number): CVec {
  return { x, y };
}

// ── Equality ──

export function cposEquals(a: CPos, b: CPos): boolean {
  return a.x === b.x && a.y === b.y && (a.layer ?? 0) === (b.layer ?? 0);
}

export function mposEquals(a: MPos, b: MPos): boolean {
  return a.u === b.u && a.v === b.v;
}

export function pposEquals(a: PPos, b: PPos): boolean {
  return a.u === b.u && a.v === b.v;
}

export function wposEquals(a: WPos, b: WPos): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

// ── World-distance constants ──

/** WDist per cell edge on a rectangular grid. */
export const WDIST_PER_CELL_RECT = 1024;

/** WDist per cell diagonal on an isometric grid. */
export const WDIST_PER_CELL_ISO = 1448;

// ── CPos ↔ MPos ──

/** Convert logical cell coordinate to map (array) coordinate. */
export function cposToMPos(cpos: CPos, gridType: 'Rectangular' | 'RectangularIsometric'): MPos {
  if (gridType === 'RectangularIsometric') {
    return {
      u: (cpos.x - cpos.y) / 2,
      v: cpos.x + cpos.y,
    };
  }
  return { u: cpos.x, v: cpos.y };
}

/** Convert map (array) coordinate to logical cell coordinate. */
export function mposToCPos(mpos: MPos, gridType: 'Rectangular' | 'RectangularIsometric'): CPos {
  if (gridType === 'RectangularIsometric') {
    return {
      x: (mpos.u * 2 + mpos.v) / 2,
      y: (mpos.v - mpos.u * 2) / 2,
    };
  }
  return { x: mpos.u, y: mpos.v };
}

// ── MPos ↔ PPos ──

/** Convert map coordinate to projected coordinate.
 *  For rectangular grids this is the identity mapping.
 *  For isometric grids with height, one MPos may map to multiple PPos
 *  (overhang); this function returns the primary projection. */
export function mposToPPos(mpos: MPos, _gridType: 'Rectangular' | 'RectangularIsometric'): PPos {
  // Height-aware overhang projection is stubbed until Task 23.29 (Height)
  return { u: mpos.u, v: mpos.v };
}

// ── CPos ↔ WPos ──

/** Convert cell coordinate to the centre of that cell in WPos.
 *  Y (height) is always 0 here; elevation is added by the caller
 *  once Task 23.29 (Height) is implemented. */
export function cposToWPos(cpos: CPos, gridType: 'Rectangular' | 'RectangularIsometric'): WPos {
  if (gridType === 'RectangularIsometric') {
    // Isometric cell centre:
    //   x = (u + 0.5) * WDIST_PER_CELL_ISO
    //   z = (v + 0.5) * WDIST_PER_CELL_ISO
    // But in CPos terms we project via MPos first.
    const mp = cposToMPos(cpos, gridType);
    return {
      x: Math.round((mp.u + 0.5) * WDIST_PER_CELL_ISO),
      y: 0,
      z: Math.round((mp.v + 0.5) * WDIST_PER_CELL_ISO),
    };
  }
  return {
    x: cpos.x * WDIST_PER_CELL_RECT + WDIST_PER_CELL_RECT / 2,
    y: 0,
    z: cpos.y * WDIST_PER_CELL_RECT + WDIST_PER_CELL_RECT / 2,
  };
}

/** Convert world position to the containing cell (floor). */
export function wposToCPos(wpos: WPos, gridType: 'Rectangular' | 'RectangularIsometric'): CPos {
  if (gridType === 'RectangularIsometric') {
    const u = Math.floor(wpos.x / WDIST_PER_CELL_ISO - 0.5);
    const v = Math.floor(wpos.z / WDIST_PER_CELL_ISO - 0.5);
    return mposToCPos({ u, v }, gridType);
  }
  return {
    x: Math.floor(wpos.x / WDIST_PER_CELL_RECT),
    y: Math.floor(wpos.z / WDIST_PER_CELL_RECT),
  };
}

// ── WPos ↔ Babylon Vector3 ──

/** Convert WPos to Babylon.js Vector3 (world units).
 *  1 cell = `worldUnitsPerCell` Babylon units (default 1.0). */
export function wposToBabylon(
  wpos: WPos,
  gridType: 'Rectangular' | 'RectangularIsometric',
  worldUnitsPerCell = 1.0
): { x: number; y: number; z: number } {
  const scale =
    gridType === 'RectangularIsometric'
      ? worldUnitsPerCell / WDIST_PER_CELL_ISO
      : worldUnitsPerCell / WDIST_PER_CELL_RECT;
  return {
    x: wpos.x * scale,
    y: wpos.y * scale,
    z: wpos.z * scale,
  };
}

/** Convert Babylon.js Vector3 (world units) to WPos. */
export function babylonToWPos(
  v: { x: number; y: number; z: number },
  gridType: 'Rectangular' | 'RectangularIsometric',
  worldUnitsPerCell = 1.0
): WPos {
  const scale =
    gridType === 'RectangularIsometric'
      ? WDIST_PER_CELL_ISO / worldUnitsPerCell
      : WDIST_PER_CELL_RECT / worldUnitsPerCell;
  return {
    x: Math.round(v.x * scale),
    y: Math.round(v.y * scale),
    z: Math.round(v.z * scale),
  };
}

// ── WVec arithmetic ──

export function wvecAdd(a: WVec, b: WVec): WVec {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function wvecSub(a: WVec, b: WVec): WVec {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function wvecScale(v: WVec, s: number): WVec {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function wvecLengthSq(v: WVec): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

export function wvecLength(v: WVec): number {
  return Math.sqrt(wvecLengthSq(v));
}

export function wvecNormalize(v: WVec): WVec {
  const len = wvecLength(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/** Horizontal length (ignoring Y). */
export function wvecLengthHorizontal(v: WVec): number {
  return Math.sqrt(v.x * v.x + v.z * v.z);
}

/** Horizontal yaw in radians (angle on XZ plane, 0 = +X). */
export function wvecYaw(v: WVec): number {
  return Math.atan2(v.z, v.x);
}

// ── CVec arithmetic ──

export function cvecAdd(a: CVec, b: CVec): CVec {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function cvecSub(a: CVec, b: CVec): CVec {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function cvecLengthSq(v: CVec): number {
  return v.x * v.x + v.y * v.y;
}

export function cvecLength(v: CVec): number {
  return Math.sqrt(cvecLengthSq(v));
}

// ── Distance helpers ──

/** Chebyshev distance between two CPos (cell steps). */
export function cposDistanceChebyshev(a: CPos, b: CPos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** Euclidean distance between two CPos (in cells). */
export function cposDistanceEuclidean(a: CPos, b: CPos): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** World-distance between two WPos. */
export function wposDistance(a: WPos, b: WPos): WDist {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
}
