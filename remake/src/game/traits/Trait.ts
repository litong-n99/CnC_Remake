/**
 * 轻量 Trait/Component 系统 — Task 96
 * OpenRA 对标: `OpenRA.Game/Actor.cs` + `TraitDictionary.cs`
 *
 * 将当前内聚的 Unit/Building 类拆分为数据容器 + 可组合的行为组件。
 * Actor 为空容器，所有行为由挂载的 Trait 提供。
 */

import type { Actor } from '../actors/Actor';

/** Trait 生命周期状态。 */
export enum TraitStatus {
  Idle = 'idle',
  Active = 'active',
  Removed = 'removed',
}

/** Trait 基类接口。
 * 所有可挂载到 Actor 的行为组件必须实现此接口。 */
export interface ITrait {
  /** 每次逻辑 tick 调用（在 Actor.tick() 中触发）。 */
  tick(_actor: Actor, _deltaTime: number): void;

  /** Actor 创建并挂载该 Trait 时调用一次。 */
  onCreated(_actor: Actor): void;

  /** Actor 销毁或 Trait 被移除时调用一次。 */
  onRemoved(_actor: Actor): void;
}

// ── Task-A3: 生命周期接口 ──

/** 所有 Trait 构造完成后调用（Actor 创建完毕）。
 * 对应 OpenRA: `INotifyCreated` */
export interface INotifyCreated {
  onCreated(actor: Actor): void;
}

/** World 加载完成后调用（地图/规则就绪）。
 * 对应 OpenRA: `IWorldLoaded` */
export interface IWorldLoaded {
  onWorldLoaded(world: unknown): void;
}

/** Actor 被添加到 World 时调用。
 * 对应 OpenRA: `INotifyAddedToWorld` */
export interface INotifyAddedToWorld {
  onAddedToWorld(actor: Actor, world: unknown): void;
}

/** Actor 从 World 移除时调用。
 * 对应 OpenRA: `INotifyRemovedFromWorld` */
export interface INotifyRemovedFromWorld {
  onRemovedFromWorld(actor: Actor, world: unknown): void;
}

/** Trait 抽象基类 — 提供默认空实现和状态管理。 */
export abstract class Trait implements ITrait {
  status = TraitStatus.Idle;

  tick(_actor: Actor, _deltaTime: number): void {
    // no-op base
  }

  onCreated(_actor: Actor): void {
    this.status = TraitStatus.Active;
  }

  onRemoved(_actor: Actor): void {
    this.status = TraitStatus.Removed;
  }
}

/** Trait 工厂函数签名。 */
export type TraitFactory = () => Trait;

/** Trait 注册表 — 显式注册避免 Web 端反射性能问题。 */
export class TraitRegistry {
  private static readonly factories = new Map<string, TraitFactory>();

  /** 注册一个 Trait 类型。 */
  static register(type: string, factory: TraitFactory): void {
    this.factories.set(type, factory);
  }

  /** 按类型名创建 Trait 实例。 */
  static create(type: string): Trait | null {
    const factory = this.factories.get(type);
    return factory ? factory() : null;
  }

  /** 检查类型是否已注册。 */
  static has(type: string): boolean {
    return this.factories.has(type);
  }

  /** 获取所有已注册的类型名。 */
  static getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /** 清空注册表（测试/重置用）。 */
  static clear(): void {
    this.factories.clear();
  }
}
