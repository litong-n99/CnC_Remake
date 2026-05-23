import { ActorMap } from '../world/ActorMap';
import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';
import { BlockedByActor } from './BlockedByActor';
import { getLocomotor } from '../rules/Locomotor';
import { LocomotorCache } from '../world/LocomotorCache';

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

    // 快速路径：LocomotorCache 空格子检查（O(1)，避免查询 ActorMap + 遍历 occupants）
    const cache = LocomotorCache.getInstance().getCache(cx, cy);
    if (cache.totalCount === 0) return false;

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
    const cache = LocomotorCache.getInstance();

    for (const key of am.getAllOccupiedCells()) {
      const [x, y] = key.split(',').map(Number);
      const cellCache = cache.getCache(x, y);

      // 快速排除：空格子（理论上不会出现在 getAllOccupiedCells 中，但安全起见）
      if (cellCache.totalCount === 0) continue;

      // 只有一个 occupant → 需要确认是否是 excludeId，无法完全用缓存判断
      if (cellCache.totalCount === 1) {
        const occupants = am.getOccupants(x, y);
        if (this.isCellBlockedByActor(occupants, excludeId, check)) {
          blocked.add(key);
        }
        continue;
      }

      // 多个 occupant，排除 excludeId 后至少还有一个
      // 使用缓存统计做快速判断，避免遍历 occupants 查询 GameObjectManager
      if (this.isCellBlockedByCache(cellCache, excludeId, check)) {
        blocked.add(key);
      }
    }

    return blocked;
  }

  /**
   * 使用 LocomotorCache 做快速阻塞判断。
   * 前提：该格子有 >= 2 个 occupant（排除 excludeId 后至少还有一个）。
   * @returns true = 阻塞；false = 不阻塞
   */
  private static isCellBlockedByCache(
    cache: import('../world/LocomotorCache').CellCache,
    excludeId: string,
    check: BlockedByActor
  ): boolean {
    // Immovable 级别：当前 ActorMap 中只有可移动单位
    if (check === BlockedByActor.Immovable) {
      // 未来如果有临时阻挡物（HasTemporaryBlocker），需要检查
      return (cache.cellFlag & (1 << 4)) !== 0; // HasTemporaryBlocker
    }

    if (check === BlockedByActor.Stationary) {
      // 没有静止单位 → 不阻塞
      if (cache.stationaryCount === 0) return false;
      // 有 >= 1 个静止单位，排除 excludeId 后仍可能有静止的
      // 如果静止数量 >= 2，排除一个后肯定还有
      if (cache.stationaryCount >= 2) return true;
      // stationaryCount === 1：需要回退检查这个静止单位是否是 excludeId
      // 但这里的前提是 totalCount >= 2，所以即使 excludeId 是静止的，
      // 还有其他 occupant。如果其他 occupant 也是静止的（stationaryCount >= 2 已覆盖），
      // 或者它是移动的，那么排除 excludeId 后没有静止单位了。
      // 为了安全，我们保守地返回 true（因为至少有一个静止单位，且不一定是 excludeId）
      return true;
    }

    // check === BlockedByActor.All
    // 如果格子里有车辆（nonSharesCell），阻塞
    if (cache.nonSharesCellCount > 0) return true;

    // 全是步兵（sharesCell）
    if (cache.sharesCellCount > 0) {
      // 需要知道 caller 是否是车辆
      const callerSharesCell = this.getCallerSharesCell(excludeId);
      // undefined = Pathfinder 模式：不阻塞（步兵格子可通行）
      // true  = 步兵进入：不阻塞（共享）
      // false = 车辆进入：阻塞
      return callerSharesCell === false;
    }

    return false;
  }

  /** 查询指定单位是否是步兵（sharesCell=true）。 */
  private static getCallerSharesCell(excludeId: string): boolean | undefined {
    const callerObj = GameObjectManager.getInstance().get(excludeId);
    if (callerObj && callerObj.type === GameObjectType.Unit) {
      const callerUnit = callerObj as import('../objects/Unit').Unit;
      return getLocomotor(callerUnit.definition.locomotion).sharesCell;
    }
    return undefined;
  }
}
