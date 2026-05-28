/**
 * MoveActivity — Task 125
 * OpenRA 对标: `OpenRA.Mods.Common/Activities/Move/Move.cs`
 *
 * 移动活动：驱动单位从当前位置移动到目标格子。
 * 简化版：直接完成（用于验证 Activity 系统骨架）。
 */

import { Activity, ActivityStatus } from './Activity';

export interface MoveActivityOptions {
  readonly targetX: number;
  readonly targetY: number;
}

/** 移动活动 — 驱动单位沿路径移动。 */
export class MoveActivity extends Activity {
  readonly targetX: number;
  readonly targetY: number;
  private stepsRemaining = 2; // 模拟 MoveFirstHalf + MoveSecondHalf

  constructor(options: MoveActivityOptions) {
    super();
    this.targetX = options.targetX;
    this.targetY = options.targetY;
    this.isInterruptible = true;
  }

  override onFirstRun(): void {
    this.stepsRemaining = 2;
  }

  tick(): ActivityStatus {
    this.stepsRemaining--;
    if (this.stepsRemaining <= 0) {
      return ActivityStatus.Done;
    }
    return ActivityStatus.Running;
  }

  override getChainDescription(): string {
    return `Move(${this.targetX},${this.targetY})`;
  }
}

/** 移动前半段 — 当前格子中心 → 两格中点。 */
export class MoveFirstHalf extends Activity {
  tick(): ActivityStatus {
    return ActivityStatus.Done;
  }
}

/** 移动后半段 — 两格中点 → 目标格子中心。 */
export class MoveSecondHalf extends Activity {
  tick(): ActivityStatus {
    return ActivityStatus.Done;
  }
}
