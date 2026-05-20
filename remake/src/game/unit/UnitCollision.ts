import { ActorMap } from '../world/ActorMap';

/**
 * 单位碰撞与避障系统 — Task 23.2 + Overlap 修复（round + floor 双格检测）。
 *
 * 核心问题：单格 `round(x,y)` 检测在 round 边界（x≈n+0.5）存在盲区。
 * 例如 A 在 26.4（round=26），B 在 26.6（round=27），两者物理距离仅 0.2，
 * 但分别落在两个 round 格子，互不感知，导致 overlap。
 *
 * 解决方案：同时检查 `round(x,y)` 和 `floor(x,y)` 两个格子。
 * - 当 x 远离边界时（如 26.1），round=floor=26，只查一格，零额外开销。
 * - 当 x 跨越边界时（如 26.6），round=27, floor=26，查两格，覆盖盲区。
 *
 * 建筑阻塞仍由 Pathfinder 动态回调处理，此处不再包含建筑。
 */
export class UnitCollision {
  /**
   * 检查指定位置是否被其他存活单位占据。
   * 同时查询 round(x,y) 与 floor(x,y) 两个格子，消除 round 边界盲区。
   * @param x          要检查的世界坐标 X
   * @param y          要检查的世界坐标 Y
   * @param excludeId  需要排除的单位 ID（自身）
   * @returns true 表示该位置被阻挡
   */
  static isPositionBlocked(x: number, y: number, excludeId: string): boolean {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const am = ActorMap.getInstance();

    // 检查 round 格子
    const rOcc = am.getOccupants(rx, ry);
    if (rOcc.some((id) => id !== excludeId)) return true;

    // 若 floor 与 round 不同，也检查 floor 格子
    if (fx !== rx || fy !== ry) {
      const fOcc = am.getOccupants(fx, fy);
      if (fOcc.some((id) => id !== excludeId)) return true;
    }

    return false;
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
