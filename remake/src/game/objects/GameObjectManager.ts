import { GameObject, GameObjectType } from './GameObject';
import { ActorMap } from '../world/ActorMap';

/**
 * 全局游戏对象管理器 — 单例持有对局中所有 {@link GameObject} 实例。
 *
 * 对应 C++ 中 `ObjectClass` 的全局数组/链表管理逻辑。
 * 提供按类型、按阵营的查询，以及统一的更新与销毁入口。
 */
export class GameObjectManager {
  private static instance: GameObjectManager | null = null;
  private objects = new Map<string, GameObject>();

  private constructor() {}

  static getInstance(): GameObjectManager {
    if (!GameObjectManager.instance) {
      GameObjectManager.instance = new GameObjectManager();
    }
    return GameObjectManager.instance;
  }

  /** 注册一个已创建的对象。 */
  register(obj: GameObject): void {
    this.objects.set(obj.id, obj);
  }

  /** 注销并销毁指定 ID 的对象。 */
  unregister(id: string): boolean {
    const obj = this.objects.get(id);
    if (obj) {
      // Task 135: 建造限制追踪 — 销毁时递减
      if (obj.type === GameObjectType.Unit) {
        const unit = obj as import('./Unit').Unit;
        if (unit.definition.buildLimit !== undefined && unit.definition.buildLimit > 0) {
          obj.house.buildLimitTracker.remove(unit.definition.id);
        }
      } else if (obj.type === GameObjectType.Building) {
        const building = obj as import('./Building').Building;
        if (building.definition.buildLimit !== undefined && building.definition.buildLimit > 0) {
          obj.house.buildLimitTracker.remove(building.definition.id);
        }
      }
      obj.dispose();
      return this.objects.delete(id);
    }
    return false;
  }

  /** 按 ID 查找。 */
  get(id: string): GameObject | undefined {
    return this.objects.get(id);
  }

  /** 获取所有存活对象。 */
  getAll(): GameObject[] {
    return Array.from(this.objects.values());
  }

  /** 获取所有单位。 */
  getUnits(): import('./Unit').Unit[] {
    return this.getAll().filter((o) => o.type === GameObjectType.Unit) as import('./Unit').Unit[];
  }

  /** 获取所有建筑。 */
  getBuildings(): import('./Building').Building[] {
    return this.getAll().filter((o) => o.type === GameObjectType.Building) as import('./Building').Building[];
  }

  /** 获取所有步兵（通过 Unit 的 definition.locomotion 过滤）。 */
  getInfantry(): import('./Unit').Unit[] {
    return this.getUnits().filter((o) => {
      const unit = o as import('./Unit').Unit;
      return unit.definition?.locomotion === 0; // Locomotion.Foot = 0
    });
  }

  /** 获取指定阵营的所有对象。 */
  getByHouse(houseId: number): GameObject[] {
    return this.getAll().filter((o) => o.house.id === houseId);
  }

  /** 遍历所有对象执行更新（供 GameLoop 每帧调用）。 */
  update(deltaTime: number): void {
    for (const obj of this.objects.values()) {
      if (obj.isAlive()) {
        obj.update(deltaTime);
      }
    }
  }

  /** 清除并销毁所有对象（用于新游戏或重置）。 */
  clear(): void {
    for (const obj of this.objects.values()) {
      obj.dispose();
    }
    this.objects.clear();
    ActorMap.getInstance().clear();
  }

  /** 释放单例引用。 */
  dispose(): void {
    this.clear();
    GameObjectManager.instance = null;
  }
}
