import type { Scene } from '@babylonjs/core';
import { BUILDING_DEFINITIONS } from '../rules/BuildingDefinitions';
import type { House } from '../house/House';
import { ConstructionQueue, QueueStatus } from '../building/ConstructionQueue';
import { TechTree } from '../building/TechTree';
import type { TerrainGrid } from '../terrain/TerrainGrid';
import { getBuildingFootprint } from '../rules/BuildingDefinitions';
import { ActorMap } from '../world/ActorMap';

/**
 * AI Base Builder — Task 82
 *
 * Automates base expansion for an AI house:
 * 1. Follows a build order (power → refinery → barracks → war factory → …)
 * 2. Starts construction when queue is idle and prerequisites are met
 * 3. Places completed buildings at valid locations near the base center
 *
 * Source: OpenRA.Mods.Common/Traits/BotModules/BotModule.cs
 *         origin/REDALERT/House.CPP (AI production logic)
 */
export class BaseBuilderAI {
  private queue: ConstructionQueue;
  private buildOrder: string[];
  private buildIndex = 0;
  private baseCenterX: number;
  private baseCenterY: number;

  constructor(
    private house: House,
    private terrain: TerrainGrid,
    private scene: Scene,
    buildOrder?: string[]
  ) {
    this.queue = new ConstructionQueue(house);
    this.buildOrder = buildOrder ?? this.defaultBuildOrder();
    this.baseCenterX = Math.round(terrain.getWidth() / 2);
    this.baseCenterY = Math.round(terrain.getHeight() / 2);
  }

  /** Default AI build order for a functional base. */
  private defaultBuildOrder(): string[] {
    return [
      'PowerPlant',
      'OreRefinery',
      'Barracks',
      'WarFactory',
      'Radar',
      'PowerPlant',
      'WarFactory',
      'Turret',
      'Turret',
    ];
  }

  /** Called every logic tick (e.g. once per second or per frame). */
  tick(deltaTime: number): void {
    this.queue.tick(deltaTime);

    switch (this.queue.status) {
      case QueueStatus.Idle:
        this.tryStartNextBuilding();
        break;
      case QueueStatus.Ready:
        this.tryPlaceReadyBuilding();
        break;
      case QueueStatus.Building:
        // waiting for construction to finish
        break;
    }
  }

  /** Current build order index (for debug / e2e). */
  getBuildIndex(): number {
    return this.buildIndex;
  }

  /** Current queue status. */
  getQueueStatus(): QueueStatus {
    return this.queue.status;
  }

  /** Whether the AI has completed its entire build order. */
  isComplete(): boolean {
    return this.buildIndex >= this.buildOrder.length && this.queue.status === QueueStatus.Idle;
  }

  /** Number of buildings successfully placed by this AI. */
  getPlacedCount(): number {
    return this.placedCount;
  }

  private placedCount = 0;

  private tryStartNextBuilding(): void {
    if (this.buildIndex >= this.buildOrder.length) return;

    const key = this.buildOrder[this.buildIndex];
    const def = BUILDING_DEFINITIONS[key];
    if (!def) {
      this.buildIndex++;
      return;
    }

    if (!TechTree.canBuildBuilding(def, this.house, false)) {
      // prerequisites not met — skip for now, will retry next tick
      return;
    }

    const started = this.queue.startBuilding(def);
    if (started) {
      this.buildIndex++;
    }
  }

  private tryPlaceReadyBuilding(): void {
    const loc = this.findPlacementLocation();
    if (!loc) return;

    const building = this.queue.placeBuilding(loc.x, loc.y, this.scene);
    if (building) {
      this.placedCount++;
      // Update base center to average of placed buildings (slow drift toward expansion)
      this.baseCenterX = Math.round((this.baseCenterX * this.placedCount + loc.x) / (this.placedCount + 1));
      this.baseCenterY = Math.round((this.baseCenterY * this.placedCount + loc.y) / (this.placedCount + 1));
    }
  }

  /**
   * Spiral search for a valid building placement location.
   * Starts at base center and expands outward.
   */
  private findPlacementLocation(): { x: number; y: number } | null {
    const def = this.queue.currentDefinition;
    if (!def) return null;

    const footprint = getBuildingFootprint(def);
    const maxRadius = Math.max(this.terrain.getWidth(), this.terrain.getHeight());

    for (let radius = 1; radius < maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const cx = this.baseCenterX + dx;
          const cy = this.baseCenterY + dy;
          if (this.isValidPlacement(cx, cy, footprint)) {
            return { x: cx, y: cy };
          }
        }
      }
    }
    return null;
  }

  private isValidPlacement(
    cx: number,
    cy: number,
    footprint: readonly { readonly dx: number; readonly dy: number }[]
  ): boolean {
    for (const cell of footprint) {
      const x = cx + cell.dx;
      const y = cy + cell.dy;
      if (!this.terrain.getCellLayer().contains(x, y)) return false;
      if (this.terrain.getCellLandType(x, y) === 2 /* Water */) return false; // Water
      if (this.terrain.getCellLandType(x, y) === 3 /* Rock */) return false; // Rock
      if (ActorMap.getInstance().isOccupied(x, y)) return false;
    }
    return true;
  }
}
