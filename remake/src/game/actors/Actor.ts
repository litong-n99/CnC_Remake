/**
 * Actor 空容器 — Task 96
 * OpenRA 对标: `OpenRA.Game/Actor.cs`
 *
 * 仅持有 id, owner, info，所有行为由挂载的 Trait 提供。
 * 与现有 GameObject/Unit/Building 并行存在，为未来迁移预留接口。
 */

import type { House } from '../house/House';
import type {
  Trait,
  ITrait,
  INotifyCreated,
  INotifyAddedToWorld,
  INotifyRemovedFromWorld,
  IWorldLoaded,
} from '../traits/Trait';
import { GameObjectType } from '../objects/GameObject';

/** Actor 信息引用（简化版，未来扩展为 ActorInfo）。 */
export interface ActorInfo {
  readonly name: string;
  readonly type: GameObjectType;
  readonly strength?: number;
}

/** Actor — 数据容器 + Trait 宿主。
 *
 * 设计原则：
 * 1. Actor 本身不包含业务逻辑，仅做 Trait 生命周期管理和事件转发。
 * 2. Trait 通过 `actor.traits()` / `actor.trait<T>()` 查询同类 Trait。
 * 3. 当前阶段为框架验证，不与现有 Unit/Building 强耦合。 */
export class Actor {
  readonly id: string;
  readonly owner: House;
  readonly info: ActorInfo;

  x = 0;
  y = 0;

  private readonly traits: Trait[] = [];
  /** Task-A2: 缓存需要 tick 的 Trait，避免每次遍历全部 traits。 */
  private tickTraits: Trait[] = [];
  private destroyed = false;

  constructor(id: string, owner: House, info: ActorInfo) {
    this.id = id;
    this.owner = owner;
    this.info = info;
  }

  /** 挂载一个 Trait 并触发 onCreated。
   * 注意：Trait 的 onCreated 在挂载时立即调用；
   * 所有 Trait 挂载完成后应调用 `actor.created()` 触发 INotifyCreated。 */
  addTrait(trait: Trait): void {
    if (this.destroyed) return;
    this.traits.push(trait);
    this.tickTraits.push(trait);
    trait.onCreated(this);
  }

  /** 所有 Trait 挂载完成后调用 —— 触发 INotifyCreated。
   * 对应 OpenRA: Actor 构造完毕后通知所有实现了 INotifyCreated 的 Trait。 */
  created(): void {
    if (this.destroyed) return;
    for (const trait of this.traits) {
      if (isNotifyCreated(trait)) {
        trait.onCreated(this);
      }
    }
  }

  /** Actor 被添加到 World 时调用 —— 触发 INotifyAddedToWorld。
   * 对应 OpenRA: `World.Add(actor)` 时触发。 */
  addedToWorld(world: unknown): void {
    if (this.destroyed) return;
    for (const trait of this.traits) {
      if (isNotifyAddedToWorld(trait)) {
        trait.onAddedToWorld(this, world);
      }
    }
  }

  /** Actor 从 World 移除时调用 —— 触发 INotifyRemovedFromWorld。
   * 对应 OpenRA: `World.Remove(actor)` 时触发。 */
  removedFromWorld(world: unknown): void {
    if (this.destroyed) return;
    for (const trait of this.traits) {
      if (isNotifyRemovedFromWorld(trait)) {
        trait.onRemovedFromWorld(this, world);
      }
    }
  }

  /** World 加载完成后调用 —— 触发 IWorldLoaded。
   * 对应 OpenRA: 地图/规则全部加载完毕后触发。 */
  worldLoaded(world: unknown): void {
    if (this.destroyed) return;
    for (const trait of this.traits) {
      if (isWorldLoaded(trait)) {
        trait.onWorldLoaded(world);
      }
    }
  }

  /** 按类型查询 Trait（返回第一个匹配）。 */
  trait<T extends ITrait>(_type: new (...args: unknown[]) => T): T | undefined {
    return this.traits.find((t) => t instanceof _type) as T | undefined;
  }

  /** 按类型查询所有匹配 Trait。 */
  traitsOf<T extends ITrait>(_type: new (...args: unknown[]) => T): T[] {
    return this.traits.filter((t) => t instanceof _type) as unknown as T[];
  }

  /** 获取所有已挂载的 Trait（只读）。 */
  getAllTraits(): readonly Trait[] {
    return this.traits;
  }

  /** 转发 tick 到所有需要 tick 的 Trait（使用缓存数组，O(n) 无需类型检查）。 */
  tick(deltaTime: number): void {
    if (this.destroyed) return;
    for (const trait of this.tickTraits) {
      trait.tick(this, deltaTime);
    }
  }

  /** 销毁 Actor，触发所有 Trait 的 onRemoved。 */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    // 倒序移除，避免索引问题
    for (let i = this.traits.length - 1; i >= 0; i--) {
      this.traits[i].onRemoved(this);
    }
    this.traits.length = 0;
    this.tickTraits.length = 0;
  }

  /** 是否已销毁。 */
  isDestroyed(): boolean {
    return this.destroyed;
  }
}

// ── 类型守卫 ──

function isNotifyCreated(trait: Trait): trait is Trait & INotifyCreated {
  return typeof (trait as unknown as INotifyCreated).onCreated === 'function';
}

function isNotifyAddedToWorld(trait: Trait): trait is Trait & INotifyAddedToWorld {
  return typeof (trait as unknown as INotifyAddedToWorld).onAddedToWorld === 'function';
}

function isNotifyRemovedFromWorld(trait: Trait): trait is Trait & INotifyRemovedFromWorld {
  return typeof (trait as unknown as INotifyRemovedFromWorld).onRemovedFromWorld === 'function';
}

function isWorldLoaded(trait: Trait): trait is Trait & IWorldLoaded {
  return typeof (trait as unknown as IWorldLoaded).onWorldLoaded === 'function';
}
