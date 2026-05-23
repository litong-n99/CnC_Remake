/**
 * MoveCooldownHelper — 重寻路频率限制器。
 *
 * OpenRA 对标: `OpenRA.Mods.Common/Activities/Move/MoveCooldownHelper.cs`
 *
 * 为 `UnitMovement.handleBlocked()` 中的 repath 引入冷却机制，
 * 防止追逐移动目标时每秒触发数十次 repath。
 *
 * 冷却公式：`cooldownMs = baseMs + distance * factor`
 * - 目标越近 → 冷却越短（快速响应近距离变化）
 * - 目标越远 → 冷却越长（避免 spam）
 *
 * 收到新移动命令时（moveTo）自动重置冷却。
 */
export class MoveCooldownHelper {
  private cooldownRemainingMs = 0;

  /** 设置冷却时间（毫秒）。 */
  setCooldown(distance: number, baseMs = 200, factor = 50): void {
    this.cooldownRemainingMs = baseMs + distance * factor;
  }

  /** 当前是否可以 repath。 */
  canRepath(): boolean {
    return this.cooldownRemainingMs <= 0;
  }

  /** 每帧 tick，减少剩余冷却时间。 */
  tick(deltaTime: number): void {
    if (this.cooldownRemainingMs > 0) {
      this.cooldownRemainingMs = Math.max(0, this.cooldownRemainingMs - deltaTime);
    }
  }

  /** 强制重置冷却（收到新移动命令时调用）。 */
  reset(): void {
    this.cooldownRemainingMs = 0;
  }
}
