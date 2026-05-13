import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';

/**
 * 单位碰撞与避障系统 — Task 19（简单版）。
 *
 * 对应 C++ 中 `DriveClass::AI()` 的简易碰撞处理逻辑。
 * 当前为简化实现：
 * - 移动前检查下一步位置是否与其他单位重叠
 * - 若被阻挡则收集阻挡单位所在格子，重新寻路时绕过这些格子
 * - 不考虑主动绕行（Phase 15+ 可引入力向量避障）
 */
export class UnitCollision {
  /** 单位之间的最小安全间距（格）。 */
  static readonly MIN_SEPARATION = 0.75;

  /** 最大等待时间（毫秒），超过后尝试重新寻路。 */
  static readonly MAX_WAIT_TIME = 1200;

  /**
   * 检查指定位置是否被其他存活单位占据。
   * @param x          要检查的格子 X 坐标
   * @param y          要检查的格子 Y 坐标
   * @param excludeId  需要排除的单位 ID（自身）
   * @returns true 表示该位置被阻挡
   */
  static isPositionBlocked(x: number, y: number, excludeId: string): boolean {
    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getAll()) {
      if (!obj.isAlive()) continue;
      if (obj.id === excludeId) continue;
      // 目前仅单位之间避障；建筑作为静态障碍已在 Pathfinder 中处理
      if (obj.type !== GameObjectType.Unit) continue;

      const dx = obj.x - x;
      const dy = obj.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < this.MIN_SEPARATION * this.MIN_SEPARATION) {
        return true;
      }
    }
    return false;
  }

  /**
   * 获取所有其他存活单位当前占据的格子集合（用于 A* 动态避障）。
   * @param excludeId 需要排除的单位 ID（自身）
   * @returns Set<"x,y"> 格式的格子坐标集合
   */
  static getBlockedCells(excludeId: string): Set<string> {
    const blocked = new Set<string>();
    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getAll()) {
      if (!obj.isAlive()) continue;
      if (obj.id === excludeId) continue;
      if (obj.type !== GameObjectType.Unit) continue;
      // 占据当前所在格子（四舍五入到整数格）
      blocked.add(`${Math.round(obj.x)},${Math.round(obj.y)}`);
    }
    return blocked;
  }
}
