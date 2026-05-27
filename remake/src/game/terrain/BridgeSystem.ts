/**
 * Bridge System — Task 87
 *
 * Bridges can be destroyed (cells become water/impassable)
 * and repaired by engineers (cells restored).
 *
 * OpenRA 对标: BridgeHut.cs + Bridge.cs
 */

import { LandType } from './TerrainGrid';
import type { TerrainGrid } from './TerrainGrid';

export interface BridgeSegment {
  x: number;
  y: number;
  originalLandType: LandType;
}

export interface Bridge {
  id: string;
  segments: BridgeSegment[];
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  isRepairing: boolean;
  repairProgress: number;
}

export class BridgeSystem {
  private bridges = new Map<string, Bridge>();
  private terrain: TerrainGrid;

  constructor(terrain: TerrainGrid) {
    this.terrain = terrain;
  }

  /** Register a new bridge on the terrain. */
  addBridge(id: string, segments: Array<{ x: number; y: number }>, maxHealth = 500): Bridge {
    const bridgeSegments: BridgeSegment[] = segments.map((s) => ({
      x: s.x,
      y: s.y,
      originalLandType: this.terrain.getCellLandType(s.x, s.y),
    }));

    const bridge: Bridge = {
      id,
      segments: bridgeSegments,
      health: maxHealth,
      maxHealth,
      isDestroyed: false,
      isRepairing: false,
      repairProgress: 0,
    };

    this.bridges.set(id, bridge);
    return bridge;
  }

  /** Apply damage to a bridge. If health reaches 0, destroy it. */
  damageBridge(id: string, amount: number): void {
    const bridge = this.bridges.get(id);
    if (!bridge || bridge.isDestroyed) return;

    bridge.health = Math.max(0, bridge.health - amount);
    if (bridge.health === 0) {
      this.destroyBridge(id);
    }
  }

  /** Destroy the bridge and turn its cells into water. */
  destroyBridge(id: string): void {
    const bridge = this.bridges.get(id);
    if (!bridge) return;

    bridge.isDestroyed = true;
    bridge.health = 0;
    for (const seg of bridge.segments) {
      this.terrain.setCellLandType(seg.x, seg.y, LandType.Water);
    }
  }

  /** Start repair (engineer entered). */
  startRepair(id: string): void {
    const bridge = this.bridges.get(id);
    if (!bridge || !bridge.isDestroyed) return;
    bridge.isRepairing = true;
    bridge.repairProgress = 0;
  }

  /** Advance repair progress. When complete, restore the bridge. */
  tickRepair(id: string, amount = 0.02): void {
    const bridge = this.bridges.get(id);
    if (!bridge || !bridge.isRepairing) return;

    bridge.repairProgress += amount;
    if (bridge.repairProgress >= 1) {
      this.restoreBridge(id);
    }
  }

  /** Restore the bridge to its original land type. */
  restoreBridge(id: string): void {
    const bridge = this.bridges.get(id);
    if (!bridge) return;

    bridge.isDestroyed = false;
    bridge.isRepairing = false;
    bridge.repairProgress = 0;
    bridge.health = bridge.maxHealth;

    for (const seg of bridge.segments) {
      this.terrain.setCellLandType(seg.x, seg.y, seg.originalLandType);
    }
  }

  getBridge(id: string): Bridge | undefined {
    return this.bridges.get(id);
  }

  getAllBridges(): Bridge[] {
    return Array.from(this.bridges.values());
  }

  removeBridge(id: string): boolean {
    return this.bridges.delete(id);
  }
}
