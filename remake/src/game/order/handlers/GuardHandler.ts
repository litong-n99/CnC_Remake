/**
 * Guard 命令处理器 — Task 26
 * 简化版：跟随目标单位（移动到目标位置）
 * 未来可扩展为保持警戒距离、自动攻击接近的敌人
 */

import type { GameOrder, OrderHandler, OrderResult } from '../GameOrder';
import { GameObjectManager } from '../../objects/GameObjectManager';
import { GameObjectType } from '../../objects/GameObject';
import { Unit } from '../../objects/Unit';
import type { Pathfinder } from '../../terrain/Pathfinder';

export class GuardHandler implements OrderHandler {
  readonly orderString = 'Guard' as const;

  constructor(private readonly pathfinder: Pathfinder) {}

  execute(order: GameOrder): OrderResult {
    const { subjectId, target } = order;
    if (target.type !== 'actor' || !target.actorId) {
      return { success: false, message: 'Guard requires actor target' };
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

    // Simplified Guard: move to target's position (follow)
    // Future: maintain guard distance, attack enemies that approach the guarded unit
    const ok = u.logic.moveTo(t.x, t.y, this.pathfinder);
    u.logic.attackTarget = undefined;

    return {
      success: ok,
      message: ok ? `Guard: ${u.definition.name} → ${t.definition.name}` : `Guard failed for ${u.definition.name}`,
    };
  }
}
