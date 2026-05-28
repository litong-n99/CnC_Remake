/**
 * GrantConditionOnPrerequisite — Task 137
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/GrantConditionOnPrerequisite`
 *
 * 当所属玩家的 TechTree 满足指定令牌时，向宿主 Actor 注入一个条件标记。
 * 常用于"拥有科技中心后坦克射速提升"等规则。
 */

import type { Actor } from '../actors/Actor';
import { Trait } from './Trait';
import { ConditionManager } from './ConditionalTrait';

export interface GrantConditionOnPrerequisiteOptions {
  /** 所需的 TechTree 令牌（如 'stek'、'tech'）。 */
  readonly prerequisite: string;
  /** 满足时注入 Actor 的条件标记（如 ' veterancy'、'supercharged'）。 */
  readonly condition: string;
}

/** 监听 TechTree 令牌并向 Actor 注入条件标记。 */
export class GrantConditionOnPrerequisite extends Trait {
  readonly prerequisite: string;
  readonly condition: string;
  private manager: ConditionManager | null = null;
  private active = false;

  constructor(options: GrantConditionOnPrerequisiteOptions) {
    super();
    this.prerequisite = options.prerequisite;
    this.condition = options.condition;
  }

  override onCreated(actor: Actor): void {
    super.onCreated(actor);
    // 获取或创建 Actor 的 ConditionManager（简化：直接挂到 Actor 上）
    const mgr = getOrCreateConditionManager(actor);
    this.manager = mgr;
    // 初始检查
    this.checkAndUpdate(actor);
  }

  override tick(actor: Actor): void {
    // 每帧检查 TechTree 状态（简化版；完整实现应使用事件驱动）
    this.checkAndUpdate(actor);
  }

  private checkAndUpdate(actor: Actor): void {
    if (!this.manager) return;
    const house = actor.owner;
    const hasToken = house.dynamicTechTree.hasToken(this.prerequisite);
    if (hasToken && !this.active) {
      this.active = true;
      this.manager.add(this.condition);
    } else if (!hasToken && this.active) {
      this.active = false;
      this.manager.remove(this.condition);
    }
  }

  override onRemoved(_actor: Actor): void {
    if (this.manager && this.active) {
      this.manager.remove(this.condition);
      this.active = false;
    }
    super.onRemoved(_actor);
  }
}

/** 全局弱引用：Actor → ConditionManager（避免修改 Actor 类）。 */
const conditionManagers = new WeakMap<Actor, ConditionManager>();

/** 获取或创建 Actor 的 ConditionManager。 */
export function getOrCreateConditionManager(actor: Actor): ConditionManager {
  let mgr = conditionManagers.get(actor);
  if (!mgr) {
    mgr = new ConditionManager();
    conditionManagers.set(actor, mgr);
  }
  return mgr;
}

/** 获取 Actor 的 ConditionManager（可能 undefined）。 */
export function getConditionManager(actor: Actor): ConditionManager | undefined {
  return conditionManagers.get(actor);
}
