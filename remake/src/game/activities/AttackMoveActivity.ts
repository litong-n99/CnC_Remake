/**
 * AttackMoveActivity — Task 125
 * OpenRA 对标: `OpenRA.Mods.Common/Activities/AttackMoveActivity.cs`
 *
 * 攻击移动：向目标点移动，途中遇到敌人时自动攻击。
 * 骨架实现：包含 Move 子活动 + 扫描逻辑占位。
 */

import { Activity, ActivityStatus } from './Activity';
import { MoveActivity } from './MoveActivity';

export interface AttackMoveActivityOptions {
  readonly targetX: number;
  readonly targetY: number;
}

/** 攻击移动活动 — 移动途中自动攻击遇到的敌人。 */
export class AttackMoveActivity extends Activity {
  readonly targetX: number;
  readonly targetY: number;
  private scanCounter = 0;

  constructor(options: AttackMoveActivityOptions) {
    super();
    this.targetX = options.targetX;
    this.targetY = options.targetY;
    this.isInterruptible = true;
    // 初始子活动：移动到目标点
    this.childActivity = new MoveActivity({ targetX: this.targetX, targetY: this.targetY });
  }

  override onFirstRun(): void {
    this.scanCounter = 0;
  }

  tick(): ActivityStatus {
    // 每 5 帧扫描一次敌人（简化版）
    this.scanCounter++;
    if (this.scanCounter >= 5) {
      this.scanCounter = 0;
      // 扫描敌人逻辑（骨架占位）
    }

    // 如果子活动（Move）完成，整个 AttackMove 完成
    if (!this.childActivity) {
      return ActivityStatus.Done;
    }

    return ActivityStatus.Running;
  }

  override getChainDescription(): string {
    return `AttackMove(${this.targetX},${this.targetY})`;
  }
}
