import { ActorMap } from '../world/ActorMap';
import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';
import { getLocomotor } from '../rules/Locomotor';
import { Unit } from '../objects/Unit';

/**
 * 碾压逻辑 — Task 23.17
 *
 * OpenRA 对标: `Locomotor.Crushes` + `Crushable` trait
 *
 * 机制：
 * 1. WarnCrush：车辆进入格子前，通知格子中的 crushable 单位。
 *    75% 概率尝试 Nudge 躲避（需要周围有空闲格子）。
 * 2. OnCrush：车辆到达格子后，对仍未离开的可碾压单位执行击杀。
 *
 * 可碾压判定：
 * - 目标单位必须 sharesCell（步兵）
 * - 目标单位的 definition.crushClass 非空
 * - 碾压者的 locomotor.crushes 包含目标的 crushClass
 */
export class Crushable {
  private static warnProbability = 0.75;

  /** 设置 WarnCrush 触发概率（仅用于测试）。 */
  static setWarnProbability(p: number): void {
    Crushable.warnProbability = Math.max(0, Math.min(1, p));
  }

  /** 获取当前 WarnCrush 概率。 */
  static getWarnProbability(): number {
    return Crushable.warnProbability;
  }

  /**
   * 判断目标单位是否可被碾压者碾压。
   */
  static isCrushable(target: Unit, crusher: Unit): boolean {
    const targetLoc = getLocomotor(target.definition.locomotion);
    const crusherLoc = getLocomotor(crusher.definition.locomotion);
    // 目标必须 sharesCell（步兵），且 crusher 的 crushes 包含目标的类别
    const crushClass = target.definition.crushClass;
    return (
      targetLoc.sharesCell &&
      crushClass !== undefined &&
      crushClass.length > 0 &&
      crusherLoc.crushes.includes(crushClass)
    );
  }

  /**
   * WarnCrush — 进入格子前通知 occupant 躲避。
   * @returns 成功躲避的单位数量
   */
  static warnCrush(cellX: number, cellY: number, crusherId: string): number {
    const occupants = ActorMap.getInstance().getOccupants(cellX, cellY);
    const crusher = GameObjectManager.getInstance().get(crusherId);
    if (!crusher || crusher.type !== GameObjectType.Unit) return 0;

    let nudged = 0;
    for (const id of occupants) {
      if (id === crusherId) continue;
      const obj = GameObjectManager.getInstance().get(id);
      if (!obj || obj.type !== GameObjectType.Unit || !obj.isAlive()) continue;
      const unit = obj as Unit;
      if (!Crushable.isCrushable(unit, crusher as Unit)) continue;

      // 75% 概率（可调）触发 Nudge 躲避
      if (Math.random() <= Crushable.warnProbability) {
        if (Crushable.tryNudge(unit)) {
          nudged++;
        }
      }
    }
    return nudged;
  }

  /**
   * OnCrush — 到达格子后击杀未被躲开的 crushable 单位。
   * @returns 被击杀的单位数量
   */
  static onCrush(cellX: number, cellY: number, crusherId: string): number {
    const occupants = ActorMap.getInstance().getOccupants(cellX, cellY);
    const crusher = GameObjectManager.getInstance().get(crusherId);
    if (!crusher || crusher.type !== GameObjectType.Unit) return 0;

    let crushed = 0;
    for (const id of occupants) {
      if (id === crusherId) continue;
      const obj = GameObjectManager.getInstance().get(id);
      if (!obj || obj.type !== GameObjectType.Unit || !obj.isAlive()) continue;
      const unit = obj as Unit;
      if (!Crushable.isCrushable(unit, crusher as Unit)) continue;

      // 执行击杀：直接扣除全部血量，进入 Dying 状态
      unit.logic.takeDamage(unit.logic.currentHealth + 1);
      crushed++;
    }
    return crushed;
  }

  /** 尝试将 crushable 单位 Nudge 到相邻空闲格。 */
  private static tryNudge(unit: Unit): boolean {
    const cx = Math.round(unit.x);
    const cy = Math.round(unit.y);
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: 1, y: 1 },
    ];

    for (const dir of dirs) {
      const nx = cx + dir.x;
      const ny = cy + dir.y;
      // 简化的 Nudge：检查格子是否为空（不检查地形，假设周围地形可通行）
      if (ActorMap.getInstance().getOccupants(nx, ny).length === 0) {
        ActorMap.getInstance().vacate(unit.id, cx, cy);
        unit.x = nx;
        unit.y = ny;
        unit.logic.x = nx;
        unit.logic.y = ny;
        unit.logic.fromCellX = nx;
        unit.logic.fromCellY = ny;
        unit.logic.toCellX = nx;
        unit.logic.toCellY = ny;
        ActorMap.getInstance().occupy(unit.id, nx, ny);
        return true;
      }
    }
    return false;
  }
}
