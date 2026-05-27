/**
 * Trigger System — Task 131
 *
 * CellTrigger: fired when an actor enters/leaves a specific cell.
 * ProximityTrigger: fired when an actor enters/leaves a radius/box region.
 *
 * OpenRA 对标: CellTrigger / ProximityTrigger
 */

import { ActorMap } from './ActorMap';

export type TriggerCallback = (actorId: string) => void;

export interface CellTrigger {
  id: string;
  x: number;
  y: number;
  onEnter: TriggerCallback;
  onExit: TriggerCallback;
  currentOccupants: Set<string>;
}

export interface ProximityTrigger {
  id: string;
  centerX: number;
  centerY: number;
  radius: number;
  onEnter: TriggerCallback;
  onExit: TriggerCallback;
  currentActors: Set<string>;
}

export class SpatialTriggerSystem {
  private cellTriggers = new Map<string, CellTrigger>();
  private proximityTriggers = new Map<string, ProximityTrigger>();

  addCellTrigger(id: string, x: number, y: number, onEnter: TriggerCallback, onExit: TriggerCallback): CellTrigger {
    const trigger: CellTrigger = {
      id,
      x,
      y,
      onEnter,
      onExit,
      currentOccupants: new Set(),
    };
    this.cellTriggers.set(id, trigger);
    return trigger;
  }

  removeCellTrigger(id: string): boolean {
    return this.cellTriggers.delete(id);
  }

  addProximityTrigger(
    id: string,
    centerX: number,
    centerY: number,
    radius: number,
    onEnter: TriggerCallback,
    onExit: TriggerCallback
  ): ProximityTrigger {
    const trigger: ProximityTrigger = {
      id,
      centerX,
      centerY,
      radius,
      onEnter,
      onExit,
      currentActors: new Set(),
    };
    this.proximityTriggers.set(id, trigger);
    return trigger;
  }

  removeProximityTrigger(id: string): boolean {
    return this.proximityTriggers.delete(id);
  }

  /** Evaluate all triggers. Call this every logic tick. */
  tick(): void {
    const actorMap = ActorMap.getInstance();

    // CellTriggers
    for (const trigger of this.cellTriggers.values()) {
      const occupants = new Set(actorMap.getOccupants(trigger.x, trigger.y));

      // Enter events
      for (const id of occupants) {
        if (!trigger.currentOccupants.has(id)) {
          trigger.currentOccupants.add(id);
          trigger.onEnter(id);
        }
      }

      // Exit events
      for (const id of trigger.currentOccupants) {
        if (!occupants.has(id)) {
          trigger.currentOccupants.delete(id);
          trigger.onExit(id);
        }
      }
    }

    // ProximityTriggers
    for (const trigger of this.proximityTriggers.values()) {
      const actors = new Set(actorMap.actorsInCircle(trigger.centerX, trigger.centerY, trigger.radius));

      for (const id of actors) {
        if (!trigger.currentActors.has(id)) {
          trigger.currentActors.add(id);
          trigger.onEnter(id);
        }
      }

      for (const id of trigger.currentActors) {
        if (!actors.has(id)) {
          trigger.currentActors.delete(id);
          trigger.onExit(id);
        }
      }
    }
  }

  clear(): void {
    this.cellTriggers.clear();
    this.proximityTriggers.clear();
  }
}
