/**
 * SyncHash — Task 66
 *
 * Deterministic hash of the full world state for lockstep desync detection.
 * Computed every N frames (default 30) and sent to the server for comparison.
 *
 * OpenRA 对标: OrderManager.SyncHash
 */

import { GameObjectManager } from './objects/GameObjectManager';
import { HouseManager } from './house/HouseManager';

/** Simple 32-bit FNV-1a hash for speed and determinism. */
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface SyncHashOptions {
  intervalFrames?: number;
}

export class SyncHash {
  private intervalFrames: number;
  private lastComputedFrame = -1;
  private lastHash = '';

  constructor(options: SyncHashOptions = {}) {
    this.intervalFrames = options.intervalFrames ?? 30;
  }

  /** Should we compute a hash on this frame? */
  shouldCompute(frame: number): boolean {
    return frame > 0 && frame % this.intervalFrames === 0;
  }

  /**
   * Compute a deterministic hash of the current world state.
   * Includes: units (pos, health), buildings (pos, health), houses (credits), random seed.
   */
  compute(frame: number, randomSeed = 0): string {
    const manager = GameObjectManager.getInstance();
    const houseManager = HouseManager.getInstance();

    const parts: string[] = [];
    parts.push(`F${frame}`);
    parts.push(`S${randomSeed}`);

    // Units — sorted by id for determinism
    const units = manager
      .getUnits()
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const u of units) {
      parts.push(`U:${u.id},${Math.round(u.x)},${Math.round(u.y)},${Math.round(u.health)}`);
    }

    // Buildings — sorted by id
    const buildings = manager
      .getBuildings()
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
    for (const b of buildings) {
      parts.push(`B:${b.id},${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.health)}`);
    }

    // Houses — sorted by id
    const houses = houseManager
      .getAllHouses()
      .slice()
      .sort((a, b) => a.id - b.id);
    for (const h of houses) {
      parts.push(`H:${h.id},${Math.round(h.credits)},${Math.round(h.power)}`);
    }

    const stateString = parts.join('|');
    const hashValue = fnv1a32(stateString);
    this.lastHash = hashValue.toString(16).padStart(8, '0');
    this.lastComputedFrame = frame;
    return this.lastHash;
  }

  getLastHash(): string {
    return this.lastHash;
  }

  getLastComputedFrame(): number {
    return this.lastComputedFrame;
  }

  /** Compare two hashes and return true if they match. */
  static compare(a: string, b: string): boolean {
    return a === b;
  }
}
