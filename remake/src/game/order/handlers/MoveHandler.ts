/**
 * Move 命令处理器
 * Source: harness/DEPTH0_OPENRA_GAP_ANALYSIS.md — Task 140
 */

import type { GameOrder, OrderHandler, OrderResult } from '../GameOrder';
import { GameObjectManager } from '../../objects/GameObjectManager';
import { GameObjectType } from '../../objects/GameObject';
import { Unit } from '../../objects/Unit';
import type { Pathfinder } from '../../terrain/Pathfinder';

export class MoveHandler implements OrderHandler {
  readonly orderString = 'Move' as const;

  constructor(private readonly pathfinder: Pathfinder) {}

  execute(order: GameOrder): OrderResult {
    const { subjectId, target } = order;
    if (target.type !== 'ground' || target.x === undefined || target.y === undefined) {
      return { success: false, message: 'Move requires ground target' };
    }

    const manager = GameObjectManager.getInstance();
    const unit = manager.get(subjectId);
    if (!unit) {
      return { success: false, message: `Unit "${subjectId}" not found` };
    }
    if (unit.type !== GameObjectType.Unit) {
      return { success: false, message: `Subject "${subjectId}" is not a unit` };
    }

    const u = unit as Unit;
    const tx = Math.round(target.x);
    const ty = Math.round(target.y);

    if (order.queued) {
      u.logic.setCommandQueuePathfinder(this.pathfinder);
      u.logic.enqueueCommand('move', { x: tx, y: ty });
      return {
        success: true,
        message: `Queued move to (${tx}, ${ty})`,
      };
    }

    const ok = u.logic.moveTo(tx, ty, this.pathfinder);
    return {
      success: ok,
      message: ok ? `Moving to (${tx}, ${ty})` : `Cannot move to (${tx}, ${ty})`,
    };
  }
}
