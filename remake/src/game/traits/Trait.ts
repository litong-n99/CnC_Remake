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

/** Trait 依赖声明。
 * Task-A4: Trait 依赖自动排序
 * 对应 OpenRA: `Requires<T>` / `NotBefore<T>` */
export interface TraitDependency {
  readonly type: string;
  readonly requires?: string[];
  readonly notBefore?: string[];
}

/** Trait 注册表 — 显式注册避免 Web 端反射性能问题。
 * Task-A4: 支持依赖拓扑排序。 */
export class TraitRegistry {
  private static readonly factories = new Map<string, TraitFactory>();
  private static readonly dependencies = new Map<string, TraitDependency>();

  /** 注册一个 Trait 类型。 */
  static register(type: string, factory: TraitFactory, deps?: TraitDependency): void {
    this.factories.set(type, factory);
    if (deps) {
      this.dependencies.set(type, deps);
    }
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

  /** 获取注册时的依赖声明。 */
  static getDependency(type: string): TraitDependency | undefined {
    return this.dependencies.get(type);
  }

  /**
   * Task-A4: 拓扑排序 Trait 类型。
   * 根据 requires / notBefore 关系计算构造顺序。
   * 如果存在循环依赖或缺失依赖，抛出错误。
   */
  static sortTypes(types: string[]): string[] {
    // 构建邻接表: 节点 -> 必须先于它构造的节点列表
    const adj = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    for (const t of types) {
      adj.set(t, new Set());
      inDegree.set(t, 0);
    }

    for (const t of types) {
      const dep = this.dependencies.get(t);
      if (!dep) continue;

      // requires: t 依赖的这些类型必须先构造
      if (dep.requires) {
        for (const req of dep.requires) {
          if (!types.includes(req)) {
            throw new Error(`Trait "${t}" requires missing dependency "${req}"`);
          }
          // req 必须先于 t，所以 t 依赖 req
          const reqSet = adj.get(req);
          if (reqSet && !reqSet.has(t)) {
            reqSet.add(t);
            inDegree.set(t, (inDegree.get(t) ?? 0) + 1);
          }
        }
      }

      // notBefore: t 不能在 notBefore 中的类型之前构造
      if (dep.notBefore) {
        for (const nb of dep.notBefore) {
          if (!types.includes(nb)) {
            throw new Error(`Trait "${t}" notBefore missing dependency "${nb}"`);
          }
          // t 必须在 nb 之后，所以 nb 依赖 t
          const tSet = adj.get(t);
          if (tSet && !tSet.has(nb)) {
            tSet.add(nb);
            inDegree.set(nb, (inDegree.get(nb) ?? 0) + 1);
          }
        }
      }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    for (const [t, degree] of inDegree) {
      if (degree === 0) queue.push(t);
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const t = queue.shift()!;
      result.push(t);
      const tAdj = adj.get(t);
      if (!tAdj) continue;
      for (const next of tAdj) {
        inDegree.set(next, (inDegree.get(next) ?? 0) - 1);
        if (inDegree.get(next) === 0) {
          queue.push(next);
        }
      }
    }

    if (result.length !== types.length) {
      const cyclic = types.filter((t) => !result.includes(t));
      throw new Error(`Cyclic dependency detected among traits: ${cyclic.join(', ')}`);
    }

    return result;
  }

  /** 清空注册表（测试/重置用）。 */
  static clear(): void {
    this.factories.clear();
    this.dependencies.clear();
  }
}
