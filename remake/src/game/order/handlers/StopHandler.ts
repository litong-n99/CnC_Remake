/**
 * Stop 命令处理器
 * Source: harness/07_DEPTH0_OPENRA_GAP_ANALYSIS.md — Task 140
 */

import type { GameOrder, OrderHandler, OrderResult } from '../GameOrder';
import { GameObjectManager } from '../../objects/GameObjectManager';
import { GameObjectType } from '../../objects/GameObject';
import { Unit } from '../../objects/Unit';

export class StopHandler implements OrderHandler {
  readonly orderString = 'Stop' as const;

  execute(order: GameOrder): OrderResult {
    const { subjectId } = order;
    const manager = GameObjectManager.getInstance();
    const unit = manager.get(subjectId);
    if (!unit) {
      return { success: false, message: `Unit "${subjectId}" not found` };
    }
    if (unit.type !== GameObjectType.Unit) {
      return { success: false, message: `Subject "${subjectId}" is not a unit` };
    }

    const u = unit as Unit;
    u.logic.movement.cancelMovement(u.logic);
    return { success: true, message: `Stopped ${subjectId}` };
  }
}
