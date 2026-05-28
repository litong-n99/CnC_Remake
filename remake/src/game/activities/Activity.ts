/**
 * Activity — Task 125
 * OpenRA 对标: `OpenRA.Game/Activities/Activity.cs`
 *
 * 嵌套活动系统基类：支持子活动、链表队列、取消机制、生命周期钩子。
 * 用于替换扁平的 UnitStateMachine，实现复杂行为组合（攻击移动、巡逻等）。
 */

export enum ActivityStatus {
  Running = 'Running',
  Done = 'Done',
  Canceling = 'Canceling',
}

/**
 * Activity 基类 — 所有可执行活动的抽象。
 *
 * 核心概念：
 * - `Tick()`：每逻辑帧调用一次，返回当前状态（Running / Done / Canceling）
 * - `ChildActivity`：嵌套子活动，父活动可委托执行给子活动
 * - `NextActivity`：当前活动完成后自动执行的下个活动（链表队列）
 * - `OnFirstRun()` / `OnLastRun()`：生命周期钩子
 * - `IsInterruptible`：是否可被新命令打断
 */
export abstract class Activity {
  /** 当前活动状态。 */
  status = ActivityStatus.Running;
  /** 是否已执行过 OnFirstRun。 */
  protected firstRunDone = false;
  /** 嵌套子活动（如 AttackMove → Move）。 */
  childActivity: Activity | null = null;
  /** 链表后续活动（当前完成后执行）。 */
  nextActivity: Activity | null = null;
  /** 是否可被新命令打断。 */
  isInterruptible = true;
  /** 取消原因（调试用）。 */
  cancelReason?: string;

  /** 每逻辑帧调用一次。子类必须实现。 */
  abstract tick(): ActivityStatus;

  /** 外部调用入口：处理 FirstRun、ChildActivity、状态返回。 */
  runTick(): ActivityStatus {
    if (this.status === ActivityStatus.Done) return ActivityStatus.Done;
    if (this.status === ActivityStatus.Canceling) {
      this.onLastRun();
      this.status = ActivityStatus.Done;
      return ActivityStatus.Done;
    }

    if (!this.firstRunDone) {
      this.firstRunDone = true;
      this.onFirstRun();
    }

    // 如果存在子活动，优先执行子活动
    if (this.childActivity) {
      const childStatus = this.childActivity.runTick();
      if (childStatus === ActivityStatus.Done) {
        this.childActivity = null;
      } else {
        return this.status;
      }
    }

    this.status = this.tick();

    if (this.status === ActivityStatus.Done) {
      this.onLastRun();
    }

    return this.status;
  }

  /** 生命周期钩子：首次执行前调用一次。 */
  onFirstRun(): void {
    // 子类可覆盖
  }

  /** 生命周期钩子：完成或取消时调用一次。 */
  onLastRun(): void {
    // 子类可覆盖
  }

  /** 取消当前活动（下一帧进入 Canceling 状态）。 */
  cancel(reason = 'canceled'): void {
    if (this.status === ActivityStatus.Done || this.status === ActivityStatus.Canceling) return;
    this.status = ActivityStatus.Canceling;
    this.cancelReason = reason;
    // 递归取消子活动和后续活动
    if (this.childActivity) this.childActivity.cancel(reason);
    if (this.nextActivity) this.nextActivity.cancel(reason);
  }

  /** 排队一个子活动（在当前活动完成后执行）。 */
  queue(activity: Activity): Activity {
    let current: Activity | null = this.nextActivity;
    if (!current) {
      this.nextActivity = activity;
      return this;
    }
    while (current.nextActivity) {
      current = current.nextActivity;
    }
    current.nextActivity = activity;
    return this;
  }

  /** 设置子活动（当前活动委托执行给子活动）。 */
  queueChild(child: Activity): Activity {
    this.childActivity = child;
    return this;
  }

  /** 获取当前活动链的调试描述（如 "AttackMove → Move → MoveFirstHalf"）。 */
  getChainDescription(): string {
    const parts: string[] = [this.constructor.name];
    if (this.childActivity) {
      parts.push('→', this.childActivity.getChainDescription());
    } else if (this.nextActivity) {
      parts.push('→', this.nextActivity.getChainDescription());
    }
    return parts.join(' ');
  }

  /** 获取当前活动链的深度（包含子活动和后续活动）。 */
  getChainDepth(): number {
    let depth = 1;
    if (this.childActivity) {
      depth += this.childActivity.getChainDepth();
    } else if (this.nextActivity) {
      depth += this.nextActivity.getChainDepth();
    }
    return depth;
  }
}

/** 空活动 — 立即完成，用于占位或测试。 */
export class IdleActivity extends Activity {
  tick(): ActivityStatus {
    return ActivityStatus.Done;
  }
}

/** 顺序执行活动链（依次执行 nextActivity 链表中的所有活动）。 */
export class SequenceActivity extends Activity {
  tick(): ActivityStatus {
    return ActivityStatus.Done;
  }

  override runTick(): ActivityStatus {
    if (this.status === ActivityStatus.Done) return ActivityStatus.Done;

    if (!this.firstRunDone) {
      this.firstRunDone = true;
      this.onFirstRun();
    }

    // 顺序执行 childActivity 链表
    if (this.childActivity) {
      const status = this.childActivity.runTick();
      if (status === ActivityStatus.Done) {
        this.childActivity = this.childActivity.nextActivity ?? null;
      }
      return this.childActivity ? ActivityStatus.Running : ActivityStatus.Done;
    }

    this.status = ActivityStatus.Done;
    this.onLastRun();
    return ActivityStatus.Done;
  }
}
