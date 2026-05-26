/**
 * Attack-Move 命令处理器 — Task 47
 *
 * 单位向目标位置移动，途中自动攻击遇到的敌人。
 * 简化实现：先移动到目标位置，在 tickIdle 中检测附近敌人并开火。
 */

import type { GameOrder, OrderHandler, OrderResult } from '../GameOrder';
import { GameObjectManager } from '../../objects/GameObjectManager';
import { GameObjectType } from '../../objects/GameObject';
import { Unit } from '../../objects/Unit';
import type { Pathfinder } from '../../terrain/Pathfinder';
import { UnitState } from '../../unit/UnitState';

export class AttackMoveHandler implements OrderHandler {
  readonly orderString = 'AttackMove' as const;

  constructor(private readonly pathfinder: Pathfinder) {}

  execute(order: GameOrder): OrderResult {
    const { subjectId, target } = order;
    if (target.type !== 'ground' || target.x === undefined || target.y === undefined) {
      return { success: false, message: 'AttackMove requires ground target' };
    }

    const manager = GameObjectManager.getInstance();
    const subject = manager.get(subjectId);
    if (!subject) {
      return { success: false, message: `Unit "${subjectId}" not found` };
    }
    if (subject.type !== GameObjectType.Unit) {
      return { success: false, message: `Subject "${subjectId}" is not a unit` };
    }

    const u = subject as Unit;
    const tx = Math.round(target.x);
    const ty = Math.round(target.y);

    // 先移动到目标位置
    const ok = u.logic.moveTo(tx, ty, this.pathfinder);
    if (ok) {
      u.logic.stateMachine.transition(UnitState.Moving);
      // 设置 attack-move 目标，用于途中索敌
      u.logic.attackMoveTarget = { x: tx, y: ty };
    }

    return {
      success: ok,
      message: ok ? `AttackMove to (${tx}, ${ty})` : `Cannot attack-move to (${tx}, ${ty})`,
    };
  }
}
