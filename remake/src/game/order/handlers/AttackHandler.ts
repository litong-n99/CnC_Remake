/**
 * Attack 命令处理器 — Task 26
 * Source: docs/(ARCHIVED)TASK_BREAKDOWN.md — Task 26
 * OpenRA 对标: OpenRA.Mods.Common/Orders/AttackOrderTargeter
 */

import type { GameOrder, OrderHandler, OrderResult } from '../GameOrder';
import { GameObjectManager } from '../../objects/GameObjectManager';
import { GameObjectType } from '../../objects/GameObject';
import { Unit } from '../../objects/Unit';
import { UnitState } from '../../unit/UnitState';

export class AttackHandler implements OrderHandler {
  readonly orderString = 'Attack' as const;

  execute(order: GameOrder): OrderResult {
    const { subjectId, target } = order;
    if (target.type !== 'actor' || !target.actorId) {
      return { success: false, message: 'Attack requires actor target' };
    }

    const manager = GameObjectManager.getInstance();
    const subject = manager.get(subjectId);
    if (!subject) {
      return { success: false, message: `Unit "${subjectId}" not found` };
    }
    if (subject.type !== GameObjectType.Unit) {
      return { success: false, message: `Subject "${subjectId}" is not a unit` };
    }

    const targetObj = manager.get(target.actorId);
    if (!targetObj) {
      return { success: false, message: `Target "${target.actorId}" not found` };
    }
    if (targetObj.type !== GameObjectType.Unit) {
      return { success: false, message: `Target "${target.actorId}" is not a unit` };
    }

    const u = subject as Unit;
    const t = targetObj as Unit;

    if (order.queued) {
      u.logic.enqueueCommand('attack', { x: t.x, y: t.y });
      return {
        success: true,
        message: `Queued attack: ${u.definition.name} → ${t.definition.name}`,
      };
    }

    // Set attack target (will be used by combat logic in future Tasks)
    u.logic.attackTarget = { x: t.x, y: t.y };
    if (u.definition.hasTurret) {
      u.logic.stateMachine.transition(UnitState.TurretTracking);
    }

    return {
      success: true,
      message: `Attack: ${u.definition.name} → ${t.definition.name}`,
    };
  }
}
