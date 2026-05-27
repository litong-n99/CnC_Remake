/**
 * Actor 空容器 — Task 96
 * OpenRA 对标: `OpenRA.Game/Actor.cs`
 *
 * 仅持有 id, owner, info，所有行为由挂载的 Trait 提供。
 * 与现有 GameObject/Unit/Building 并行存在，为未来迁移预留接口。
 */

import type { House } from '../house/House';
import type { Trait, ITrait } from '../traits/Trait';
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
  private destroyed = false;

  constructor(id: string, owner: House, info: ActorInfo) {
    this.id = id;
    this.owner = owner;
    this.info = info;
  }

  /** 挂载一个 Trait 并触发 onCreated。 */
  addTrait(trait: Trait): void {
    if (this.destroyed) return;
    this.traits.push(trait);
    trait.onCreated(this);
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

  /** 转发 tick 到所有 Trait。 */
  tick(deltaTime: number): void {
    if (this.destroyed) return;
    for (const trait of this.traits) {
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
  }

  /** 是否已销毁。 */
  isDestroyed(): boolean {
    return this.destroyed;
  }
}
