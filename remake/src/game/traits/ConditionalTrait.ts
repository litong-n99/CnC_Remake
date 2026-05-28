/**
 * ConditionalTrait — Task 137
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/ConditionalTrait<T>`
 *
 * 带条件控制的 Trait 基类：当条件不满足时，tick() 不执行子类逻辑。
 * 条件通过 Actor 上的 ConditionManager（字符串标记集合）控制。
 */

import type { Actor } from '../actors/Actor';
import { Trait, TraitStatus } from './Trait';

/** 条件 Trait 基类 — 需要条件满足时才生效。 */
export abstract class ConditionalTrait extends Trait {
  private _enabled = true;
  /** 触发此 Trait 所需的条件标记（空数组 = 无条件，始终生效）。 */
  abstract readonly requiredConditions: readonly string[];

  get enabled(): boolean {
    return this._enabled;
  }

  /** 设置启用状态（由 ConditionManager 调用）。 */
  setEnabled(value: boolean): void {
    if (this._enabled === value) return;
    this._enabled = value;
    if (value) {
      this.onEnabled();
    } else {
      this.onDisabled();
    }
  }

  /** 条件满足时调用一次。 */
  onEnabled(): void {
    this.status = TraitStatus.Active;
  }

  /** 条件不满足时调用一次。 */
  onDisabled(): void {
    this.status = TraitStatus.Idle;
  }

  /** Task-C2: 条件变化回调 — Actor 条件系统通知时调用。
   * 子类可覆盖以响应特定条件变化。 */
  onConditionChanged(_actor: Actor, _condition: string, _active: boolean): void {
    // no-op base
  }

  /** 子类覆盖此方法实现 Tick 逻辑；基类在 enabled 为 false 时自动跳过。 */
  abstract onTick(actor: Actor, deltaTime: number): void;

  override tick(actor: Actor, deltaTime: number): void {
    if (!this._enabled) return;
    this.onTick(actor, deltaTime);
  }
}

/** 条件管理器 — 每个 Actor 一个实例，管理条件标记集合。 */
export class ConditionManager {
  private readonly conditions = new Set<string>();
  private readonly watchers = new Set<(condition: string, present: boolean) => void>();

  /** 添加条件标记。 */
  add(condition: string): void {
    if (this.conditions.has(condition)) return;
    this.conditions.add(condition);
    for (const w of this.watchers) w(condition, true);
  }

  /** 移除条件标记。 */
  remove(condition: string): void {
    if (!this.conditions.has(condition)) return;
    this.conditions.delete(condition);
    for (const w of this.watchers) w(condition, false);
  }

  /** 检查是否拥有指定条件。 */
  has(condition: string): boolean {
    return this.conditions.has(condition);
  }

  /** 注册条件变化监听器。 */
  watch(cb: (condition: string, present: boolean) => void): void {
    this.watchers.add(cb);
  }

  /** 注销监听器。 */
  unwatch(cb: (condition: string, present: boolean) => void): void {
    this.watchers.delete(cb);
  }

  /** 清空所有条件。 */
  clear(): void {
    const all = Array.from(this.conditions);
    this.conditions.clear();
    for (const c of all) {
      for (const w of this.watchers) w(c, false);
    }
  }

  /** 获取所有当前条件（只读）。 */
  getAll(): ReadonlySet<string> {
    return this.conditions;
  }
}

/**
 * 评估 ConditionalTrait 的条件是否满足。
 * @param required — 所需条件列表（AND 关系）
 * @param manager — Actor 的条件管理器
 * @returns 是否全部条件都满足
 */
export function evaluateConditions(required: readonly string[], manager: ConditionManager): boolean {
  if (required.length === 0) return true;
  return required.every((c) => manager.has(c));
}

/** UpgradeableTrait — 条件满足时升级到高级值的 Trait 基类。
 * Task-C2: 对应 OpenRA `UpgradeableTrait<T>`
 * 与 ConditionalTrait 配合使用：ConditionalTrait 控制启用/禁用，
 * UpgradeableTrait 控制数值升级。 */
export abstract class UpgradeableTrait<T> extends Trait {
  private baseValue: T;
  private upgradedValue: T;
  private upgradeCondition: string | null = null;

  constructor(baseValue: T, upgradedValue: T) {
    super();
    this.baseValue = baseValue;
    this.upgradedValue = upgradedValue;
  }

  /** 设置升级条件。条件满足时返回升级值，否则返回基础值。 */
  setUpgradeCondition(condition: string | null): void {
    this.upgradeCondition = condition;
  }

  /** 获取当前值（根据条件状态自动选择基础值或升级值）。 */
  getCurrentValue(actor: Actor): T {
    if (this.upgradeCondition && actor.hasCondition(this.upgradeCondition)) {
      return this.upgradedValue;
    }
    return this.baseValue;
  }

  /** 条件变化回调 — 子类可覆盖以响应条件变化。 */
  onConditionChanged(_actor: Actor, _condition: string, _active: boolean): void {
    // no-op base
  }
}
