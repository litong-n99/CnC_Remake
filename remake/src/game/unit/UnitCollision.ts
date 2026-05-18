import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';
import { Building } from '../objects/Building';
import { getBuildingFootprint } from '../rules/BuildingDefinitions';

/**
 * 单位碰撞与避障系统 — Task 19（简单版）。
 *
 * 对应 C++ 中 `DriveClass::AI()` 的简易碰撞处理逻辑。
 * 当前为简化实现：
 * - 建筑阻塞已由 Pathfinder 动态回调处理（A* 初始路径自动绕开建筑）
 * - 本类只处理单位与单位、单位与建筑的**运行时碰撞检测**
 * - 若被阻挡则暂停等待，不自动重新寻路（由玩家或上层逻辑重新下令）
 */
export class UnitCollision {
  /** 单位之间的最小安全间距（格）。 */
  static readonly MIN_SEPARATION = 0.75;

  /**
   * 检查指定位置是否被其他存活对象（单位或建筑）占据。
   * @param x          要检查的格子 X 坐标
   * @param y          要检查的格子 Y 坐标
   * @param excludeId  需要排除的对象 ID（自身）
   * @returns true 表示该位置被阻挡
   */
  static isPositionBlocked(x: number, y: number, excludeId: string): boolean {
    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getAll()) {
      if (!obj.isAlive()) continue;
      if (obj.id === excludeId) continue;

      if (obj.type === GameObjectType.Unit) {
        const dx = obj.x - x;
        const dy = obj.y - y;
        const distSq = dx * dx + dy * dy;
        if (distSq < this.MIN_SEPARATION * this.MIN_SEPARATION) {
          return true;
        }
      } else if (obj.type === GameObjectType.Building) {
        const building = obj as Building;
        const def = building.definition;
        // 快速 AABB 排除（bounding box）
        if (x < building.x || x >= building.x + def.width || y < building.y || y >= building.y + def.height) {
          continue;
        }
        // 精确 footprint 检测
        const bx = Math.floor(x);
        const by = Math.floor(y);
        for (const cell of getBuildingFootprint(def)) {
          if (bx === building.x + cell.dx && by === building.y + cell.dy) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * 获取所有其他存活单位当前占据的格子集合（用于 A* 单位间动态避障）。
   * 注意：建筑阻塞已由 Pathfinder 动态回调处理，此处不再包含建筑。
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
      blocked.add(`${Math.round(obj.x)},${Math.round(obj.y)}`);
    }
    return blocked;
  }
}
