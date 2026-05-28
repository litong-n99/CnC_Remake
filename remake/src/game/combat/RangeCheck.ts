/**
 * RangeCheck — Task-CB4: 射程内检测
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Attack/AttackBase.cs` (IsInRange)
 *
 * 检查目标是否在武器的射程内，支持最小/最大射程。
 */

export interface RangeCheckOptions {
  minRange?: number;
  maxRange: number;
}

export class RangeCheck {
  minRange: number;
  maxRange: number;

  constructor(options: RangeCheckOptions) {
    this.minRange = options.minRange ?? 0;
    this.maxRange = options.maxRange;
  }

  /** 检查目标是否在射程内。 */
  isInRange(myX: number, myY: number, targetX: number, targetY: number): boolean {
    const dx = targetX - myX;
    const dy = targetY - myY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist >= this.minRange && dist <= this.maxRange;
  }

  /** 获取到目标的距离。 */
  getDistance(myX: number, myY: number, targetX: number, targetY: number): number {
    const dx = targetX - myX;
    const dy = targetY - myY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 目标是否太近（小于最小射程）。 */
  isTooClose(myX: number, myY: number, targetX: number, targetY: number): boolean {
    return this.getDistance(myX, myY, targetX, targetY) < this.minRange;
  }

  /** 目标是否太远（大于最大射程）。 */
  isTooFar(myX: number, myY: number, targetX: number, targetY: number): boolean {
    return this.getDistance(myX, myY, targetX, targetY) > this.maxRange;
  }
}
