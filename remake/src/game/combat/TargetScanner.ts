/**
 * TargetScanner — Task-CB2: 自动目标选择
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/AutoTarget.cs`
 *
 * 定期扫描射程内敌人，按优先级选择目标：
 *   1. 攻击我的（报复）
 *   2. 高威胁（如坦克 > 步兵）
 *   3. 最近的
 *   4. 随机的（打破平局）
 */

export interface ScannableTarget {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly isEnemy: boolean;
  readonly threatValue: number; // 0–100
  readonly isAttackingMe: boolean;
}

export interface TargetScannerOptions {
  range: number; // 扫描半径（格子数）
  scanInterval?: number; // 扫描间隔 tick 数（默认 10）
}

export class TargetScanner {
  range: number;
  scanInterval: number;
  private scanCooldown = 0;
  private lastTarget: ScannableTarget | null = null;

  constructor(options: TargetScannerOptions) {
    this.range = options.range;
    this.scanInterval = options.scanInterval ?? 10;
  }

  /** 扫描并选择最佳目标。返回 null 表示射程内无敌人。 */
  scan(myX: number, myY: number, candidates: ScannableTarget[]): ScannableTarget | null {
    if (this.scanCooldown > 0) {
      this.scanCooldown--;
      return this.lastTarget;
    }
    this.scanCooldown = this.scanInterval;

    let best: ScannableTarget | null = null;
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      if (!candidate.isEnemy) continue;

      const dx = candidate.x - myX;
      const dy = candidate.y - myY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > this.range) continue;

      // 评分：高优先级项加分，远距离减分
      let score = 0;
      if (candidate.isAttackingMe) score += 1000;
      score += candidate.threatValue * 10;
      score -= dist * 5;
      score += Math.random() * 2; // 打破平局

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    this.lastTarget = best;
    return best;
  }

  /** 立即重置扫描冷却（如被攻击时立即反击）。 */
  resetCooldown(): void {
    this.scanCooldown = 0;
  }

  /** 清除最后记住的目标。 */
  clearTarget(): void {
    this.lastTarget = null;
  }
}
