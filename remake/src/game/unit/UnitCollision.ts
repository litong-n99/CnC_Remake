import { ActorMap } from '../world/ActorMap';
import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';
import { BlockedByActor } from './BlockedByActor';
import { getLocomotor } from '../rules/Locomotor';

/**
 * 单位碰撞与避障系统 — Task 24.2 BlockedByActor 分级 + 双格占用。
 *
 * 核心机制：
 * - `isPositionBlocked` 支持四级阻塞检测（All / Stationary / Immovable / None）
 * - 双格占用下，单位同时注册 fromCell 和 toCell
 * - 建筑阻塞仍由 Pathfinder 动态回调处理，此处不再包含建筑
 */
export class UnitCollision {
  /**
   * 检查指定位置是否被其他存活单位占据。
   * @param x          要检查的世界坐标 X
   * @param y          要检查的世界坐标 Y
   * @param excludeId  需要排除的单位 ID（自身）
   * @param check      阻塞检测级别（默认 All）
   * @returns true 表示该位置被阻挡
   */
  static isPositionBlocked(x: number, y: number, excludeId: string, check = BlockedByActor.All): boolean {
    if (check === BlockedByActor.None) return false;

    const cx = Math.round(x);
    const cy = Math.round(y);
    const am = ActorMap.getInstance();

    // Task 23.8: 查询调用者的 sharesCell（步兵 vs 车辆行为不同）
    const callerObj = GameObjectManager.getInstance().get(excludeId);
    let callerSharesCell: boolean | undefined;
    if (callerObj && callerObj.type === GameObjectType.Unit) {
      const callerUnit = callerObj as import('../objects/Unit').Unit;
      callerSharesCell = getLocomotor(callerUnit.definition.locomotion).sharesCell;
    }

    // 检查 round 格子
    if (this.isCellBlockedByActor(am.getOccupants(cx, cy), excludeId, check, callerSharesCell)) return true;

    return false;
  }

  /**
   * 判断指定格子的 occupants 中是否有阻塞者。
   *
   * Task 23.8: SubCell 共享
   *   - 若格子内**所有**存活 occupant 都是步兵（sharesCell=true）：
   *     - Pathfinder 模式（callerSharesCell=undefined）：不阻塞（步兵格子可通行）
   *     - 步兵进入（callerSharesCell=true）：不阻塞（共享）
   *     - 车辆进入（callerSharesCell=false）：阻塞（触发 NotifyBlocker → Nudge）
   */
  private static isCellBlockedByActor(
    occupants: readonly string[],
    excludeId: string,
    check: BlockedByActor,
    callerSharesCell?: boolean
  ): boolean {
    const manager = GameObjectManager.getInstance();

    if (check === BlockedByActor.All) {
      let hasOccupant = false;
      let allSharesCell = true;
      for (const id of occupants) {
        if (id === excludeId) continue;
        hasOccupant = true;
        const obj = manager.get(id);
        if (!obj || obj.type !== GameObjectType.Unit || !obj.isAlive()) {
          allSharesCell = false;
          break;
        }
        const unit = obj as import('../objects/Unit').Unit;
        if (!getLocomotor(unit.definition.locomotion).sharesCell) {
          allSharesCell = false;
          break;
        }
      }
      if (hasOccupant && allSharesCell) {
        // 所有 occupant 都是步兵
        // undefined = Pathfinder 模式：不阻塞
        // true   = 步兵进入：不阻塞（共享）
        // false  = 车辆进入：阻塞（触发 Nudge）
        return callerSharesCell === false;
      }
      // 否则回到原来的逻辑：有任何其他 occupant 就阻塞
      return occupants.some((id) => id !== excludeId);
    }

    for (const id of occupants) {
      if (id === excludeId) continue;

      // 查询单位状态
      const obj = manager.get(id);
      if (!obj || obj.type !== GameObjectType.Unit) {
        // 非单位对象（建筑等）视为不可移动阻塞
        if (check >= BlockedByActor.Immovable) return true;
        continue;
      }

      const unit = obj as import('../objects/Unit').Unit;
      const isMoving = unit.logic.isMovingBetweenCells;

      if (check === BlockedByActor.Stationary) {
        // 只被静止单位阻塞，忽略移动中的单位
        if (!isMoving) return true;
      } else if (check === BlockedByActor.Immovable) {
        // 忽略所有可移动单位（静止 + 移动中）
        // 当前所有单位都是可移动的，所以直接 continue
        continue;
      }
    }

    return false;
  }

  /**
   * 获取所有被其他单位占据的格子集合（用于 A* 单位间动态避障）。
   * @param excludeId 需要排除的单位 ID（自身）
   * @param check     阻塞检测级别（默认 All）
   * @returns Set<"x,y"> 格式的格子坐标集合
   */
  static getBlockedCells(excludeId: string, check = BlockedByActor.All): Set<string> {
    if (check === BlockedByActor.None) return new Set<string>();

    const blocked = new Set<string>();
    const am = ActorMap.getInstance();

    for (const key of am.getAllOccupiedCells()) {
      const [x, y] = key.split(',').map(Number);
      const occupants = am.getOccupants(x, y);
      if (this.isCellBlockedByActor(occupants, excludeId, check)) {
        blocked.add(key);
      }
    }

    return blocked;
  }
}
