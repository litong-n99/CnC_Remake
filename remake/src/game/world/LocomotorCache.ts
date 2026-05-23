import { ActorMap } from './ActorMap';
import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';
import { getLocomotor } from '../rules/Locomotor';

/**
 * CellFlag 位域 — 映射 OpenRA Locomotor.CellFlag。
 *
 * 每个格子用一个 byte 位域记录 occupants 的聚合属性，
 * 避免每次阻塞检查时都遍历 occupants 查询 GameObjectManager。
 */
export const CellFlag = {
  HasFreeSpace: 0,
  HasMovingActor: 1 << 0,
  HasStationaryActor: 1 << 1,
  HasMovableActor: 1 << 2,
  HasCrushableActor: 1 << 3,
  HasTemporaryBlocker: 1 << 4,
} as const;

/** 单个格子的缓存数据。 */
export interface CellCache {
  /** 位域标志组合（CellFlag 的按位或）。 */
  readonly cellFlag: number;
  /** 步兵（sharesCell=true）数量。 */
  readonly sharesCellCount: number;
  /** 车辆（sharesCell=false）数量。 */
  readonly nonSharesCellCount: number;
  /** 移动中（isMovingBetweenCells=true）数量。 */
  readonly movingCount: number;
  /** 静止（isMovingBetweenCells=false）数量。 */
  readonly stationaryCount: number;
  /** 总 occupant 数量。 */
  readonly totalCount: number;
}

/** 空格子的默认缓存值。 */
const EMPTY_CACHE: CellCache = {
  cellFlag: CellFlag.HasFreeSpace,
  sharesCellCount: 0,
  nonSharesCellCount: 0,
  movingCount: 0,
  stationaryCount: 0,
  totalCount: 0,
};

/**
 * Locomotor 阻塞状态缓存 — OpenRA Locomotor.blockingCache 的 TS 实现。
 *
 * 核心机制：
 * 1. 每个格子维护一个 `CellCache`，包含 occupants 的聚合统计（CellFlag + 计数）。
 * 2. `ActorMap.occupy/vacate` 时标记对应格子为 dirty，延迟到首次查询时重建。
 * 3. `UnitCollision` 和 `Pathfinder` 优先使用缓存做快速路径判断，无法裁决时回退 ActorMap 查询。
 *
 * 性能收益：
 * - `getBlockedCells` 遍历所有被占格子时，对有多个 occupant 的格子可直接用缓存统计判断，
 *   避免逐个查询 GameObjectManager（从 O(n·m) 降至 O(n)）。
 * - `isPositionBlocked` 在空格子场景下可 O(1) 返回。
 */
export class LocomotorCache {
  private static instance: LocomotorCache | null = null;

  /** key = "x,y", value = CellCache */
  private cache = new Map<string, CellCache>();
  /** 需要重建的格子坐标集合。 */
  private dirtyCells = new Set<string>();

  static getInstance(): LocomotorCache {
    if (!LocomotorCache.instance) {
      LocomotorCache.instance = new LocomotorCache();
    }
    return LocomotorCache.instance;
  }

  /** 标记指定格子为 dirty，下次查询时自动重建。 */
  markDirty(x: number, y: number): void {
    this.dirtyCells.add(`${x},${y}`);
  }

  /**
   * 获取指定格子的缓存数据。
   * 如果该格子被标记为 dirty，先调用 `updateCell` 重建缓存。
   */
  getCache(x: number, y: number): CellCache {
    const key = `${x},${y}`;
    if (this.dirtyCells.has(key)) {
      this.updateCell(x, y);
    }
    return this.cache.get(key) ?? EMPTY_CACHE;
  }

  /** 检查指定格子是否被标记为 dirty（调试用）。 */
  isDirty(x: number, y: number): boolean {
    return this.dirtyCells.has(`${x},${y}`);
  }

  /** 强制重建指定格子的缓存（不检查 dirty 状态）。 */
  forceUpdate(x: number, y: number): void {
    this.updateCell(x, y);
  }

  /** 清除所有缓存和 dirty 标记（用于新游戏或重置）。 */
  clear(): void {
    this.cache.clear();
    this.dirtyCells.clear();
  }

  /** 释放单例。 */
  dispose(): void {
    this.clear();
    LocomotorCache.instance = null;
  }

  /** 从 ActorMap 重新计算指定格子的缓存数据。 */
  private updateCell(x: number, y: number): void {
    const occupants = ActorMap.getInstance().getOccupants(x, y);
    const key = `${x},${y}`;

    if (occupants.length === 0) {
      this.cache.set(key, EMPTY_CACHE);
      this.dirtyCells.delete(key);
      return;
    }

    let cellFlag = 0;
    let sharesCellCount = 0;
    let nonSharesCellCount = 0;
    let movingCount = 0;
    let stationaryCount = 0;

    const manager = GameObjectManager.getInstance();

    for (const id of occupants) {
      const obj = manager.get(id);
      if (!obj || !obj.isAlive()) {
        // 死亡对象不影响阻塞，跳过
        continue;
      }

      if (obj.type === GameObjectType.Unit) {
        const unit = obj as import('../objects/Unit').Unit;
        const locomotor = getLocomotor(unit.definition.locomotion);

        cellFlag |= CellFlag.HasMovableActor;

        if (locomotor.sharesCell) {
          sharesCellCount++;
          cellFlag |= CellFlag.HasCrushableActor;
        } else {
          nonSharesCellCount++;
        }

        if (unit.logic.isMovingBetweenCells) {
          movingCount++;
          cellFlag |= CellFlag.HasMovingActor;
        } else {
          stationaryCount++;
          cellFlag |= CellFlag.HasStationaryActor;
        }
      } else {
        // 非单位对象（建筑、临时阻挡物等）
        cellFlag |= CellFlag.HasTemporaryBlocker;
      }
    }

    this.cache.set(key, {
      cellFlag,
      sharesCellCount,
      nonSharesCellCount,
      movingCount,
      stationaryCount,
      totalCount: occupants.length,
    });

    this.dirtyCells.delete(key);
  }
}
