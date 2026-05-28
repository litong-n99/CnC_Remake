/**
 * TurnConstraint — Task-CB3: 转向约束
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Mobile.cs` (TurnSpeed)
 *
 * 限制单位每 tick 的最大转向角度，
 * 未对准时先转向，对准后才允许开火/移动。
 */

export class TurnConstraint {
  /** 每 tick 最大转向角度（0–255 DirType 单位）。 */
  turnSpeed = 8;

  /** 当前朝向（0–255）。 */
  currentFacing = 0;

  constructor(turnSpeed = 8, initialFacing = 0) {
    this.turnSpeed = turnSpeed;
    this.currentFacing = initialFacing;
  }

  /** 计算从当前朝向到目标朝向的最短路径差值。
   * 返回有符号差值（负 = 左转，正 = 右转）。 */
  static facingDiff(current: number, target: number): number {
    let d = target - current;
    if (d > 128) d -= 256;
    if (d < -128) d += 256;
    return d;
  }

  /** 转向目标朝向，受 turnSpeed 限制。
   * 返回新的朝向。 */
  turnToward(targetFacing: number): number {
    const diff = TurnConstraint.facingDiff(this.currentFacing, targetFacing);
    if (Math.abs(diff) <= this.turnSpeed) {
      this.currentFacing = targetFacing;
    } else {
      this.currentFacing += diff > 0 ? this.turnSpeed : -this.turnSpeed;
      this.currentFacing = ((this.currentFacing % 256) + 256) % 256;
    }
    return this.currentFacing;
  }

  /** 是否已对准目标（差值在容差内）。 */
  isAligned(targetFacing: number, tolerance = 2): boolean {
    return Math.abs(TurnConstraint.facingDiff(this.currentFacing, targetFacing)) <= tolerance;
  }

  /** 是否可以对目标开火（已对准）。 */
  canAimAt(targetFacing: number): boolean {
    return this.isAligned(targetFacing);
  }
}
