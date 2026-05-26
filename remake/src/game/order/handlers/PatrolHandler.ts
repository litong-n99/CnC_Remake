/**
 * Patrol 巡逻命令处理器 — Task 48
 *
 * 单位在两点之间循环移动。
 * 简化实现：记录路径点列表，到达一个点后前往下一个。
 */

import type { GameOrder, OrderHandler, OrderResult } from '../GameOrder';
import { GameObjectManager } from '../../objects/GameObjectManager';
import { GameObjectType } from '../../objects/GameObject';
import { Unit } from '../../objects/Unit';
import type { Pathfinder } from '../../terrain/Pathfinder';
import { UnitState } from '../../unit/UnitState';

export class PatrolHandler implements OrderHandler {
  readonly orderString = 'Patrol' as const;

  constructor(private readonly pathfinder: Pathfinder) {}

  execute(order: GameOrder): OrderResult {
    const { subjectId, target } = order;
    if (target.type !== 'ground' || target.x === undefined || target.y === undefined) {
      return { success: false, message: 'Patrol requires ground target' };
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

    // 巡逻路径：当前位置 → 目标位置
    const waypoints = [
      { x: Math.round(u.x), y: Math.round(u.y) },
      { x: tx, y: ty },
    ];

    u.logic.setPatrol(waypoints, this.pathfinder);
    u.logic.stateMachine.transition(UnitState.Moving);

    return {
      success: true,
      message: `Patrol between (${waypoints[0].x}, ${waypoints[0].y}) and (${tx}, ${ty})`,
    };
  }
}
