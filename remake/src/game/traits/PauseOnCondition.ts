/**
 * PauseOnCondition — Task 137
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/PauseOnCondition`
 *
 * 当 Actor 拥有指定条件标记时暂停工作（如低电量时雷达失效）。
 */

import type { Actor } from '../actors/Actor';
import { ConditionalTrait, ConditionManager, evaluateConditions } from './ConditionalTrait';
import { getOrCreateConditionManager } from './GrantConditionOnPrerequisite';

export interface PauseOnConditionOptions {
  /** 导致暂停的条件标记（如 'lowPower'）。 */
  readonly pauseConditions: readonly string[];
  /** 暂停时显示的状态文本（预留）。 */
  readonly reason?: string;
}

/**
 * 条件暂停 Trait — 当条件满足时暂停，条件解除后恢复。
 * 典型用例：Radar 绑定 `pauseConditions: ['lowPower']` → 低电量时小地图变黑。
 */
export class PauseOnCondition extends ConditionalTrait {
  readonly requiredConditions: readonly string[];
  readonly reason: string;
  private manager: ConditionManager | null = null;

  constructor(options: PauseOnConditionOptions) {
    super();
    this.requiredConditions = options.pauseConditions;
    this.reason = options.reason ?? 'paused';
  }

  override onCreated(actor: Actor): void {
    super.onCreated(actor);
    this.manager = getOrCreateConditionManager(actor);
    // 初始评估
    this.updateEnabledState();
    // 监听条件变化
    this.manager.watch(() => this.updateEnabledState());
  }

  override onRemoved(_actor: Actor): void {
    if (this.manager) {
      this.manager.unwatch(() => this.updateEnabledState());
    }
    super.onRemoved(_actor);
  }

  private updateEnabledState(): void {
    if (!this.manager) return;
    // PauseOnCondition 的逻辑：当 pauseConditions 存在时，Trait 被禁用
    const shouldPause = evaluateConditions(this.requiredConditions, this.manager);
    this.setEnabled(!shouldPause);
  }

  onTick(_actor: Actor, _deltaTime: number): void {
    // 暂停期间不执行任何逻辑（基类 tick 已自动跳过 disabled 状态）
    // 子类可覆盖此方法来添加"恢复后"的行为
  }

  override onEnabled(): void {
    super.onEnabled();
    // 可覆盖：恢复工作时触发的事件
  }

  override onDisabled(): void {
    super.onDisabled();
    // 可覆盖：暂停时触发的事件
  }
}
