/**
 * Move 命令处理器
 * Source: harness/07_DEPTH0_OPENRA_GAP_ANALYSIS.md — Task 140
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
    const ok = u.logic.moveTo(Math.round(target.x), Math.round(target.y), this.pathfinder);
    return {
      success: ok,
      message: ok ? `Moving to (${target.x}, ${target.y})` : `Cannot move to (${target.x}, ${target.y})`,
    };
  }
}
