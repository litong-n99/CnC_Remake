import { ActorMap } from '../world/ActorMap';

/**
 * 单位碰撞与避障系统 — Task 23.2（ActorMap 重构版）。
 *
 * 对应 C++ 中 `DriveClass::AI()` 的简易碰撞处理逻辑。
 * 关键变更：
 * - 浮点距离检测（MIN_SEPARATION）已彻底移除
 * - 改为查询 ActorMap 的格子级占用状态
 * - 建筑阻塞仍由 Pathfinder 动态回调处理，此处不再包含建筑
 */
export class UnitCollision {
  /**
   * 检查指定位置是否被其他存活单位占据。
   * @param x          要检查的格子 X 坐标
   * @param y          要检查的格子 Y 坐标
   * @param excludeId  需要排除的单位 ID（自身）
   * @returns true 表示该位置被其他单位阻挡
   */
  static isPositionBlocked(x: number, y: number, excludeId: string): boolean {
    const cx = Math.round(x);
    const cy = Math.round(y);
    const occupants = ActorMap.getInstance().getOccupants(cx, cy);
    return occupants.some((id) => id !== excludeId);
  }

  /**
   * 获取所有被其他单位占据的格子集合（用于 A* 单位间动态避障）。
   * 建筑阻塞已由 Pathfinder 动态回调处理，此处不再包含建筑。
   * @param excludeId 需要排除的单位 ID（自身）
   * @returns Set<"x,y"> 格式的格子坐标集合
   */
  static getBlockedCells(excludeId: string): Set<string> {
    const blocked = new Set<string>();
    const am = ActorMap.getInstance();
    for (const key of am.getAllOccupiedCells()) {
      const [x, y] = key.split(',').map(Number);
      const occupants = am.getOccupants(x, y);
      if (occupants.some((id) => id !== excludeId)) {
        blocked.add(key);
      }
    }
    return blocked;
  }
}
