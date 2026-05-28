/**
 * ReloadState — Task-CB1: 武器装填状态机
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Armament.cs` (ReloadDelay)
 *
 * 管理武器的装填/冷却状态：
 *   - reloadDelay: 总装填时间（tick 数）
 *   - reloadProgress: 当前装填进度（0 → reloadDelay）
 *   - isReloading: 是否正在装填
 *   - ready: 是否可开火
 */

export class ReloadState {
  reloadDelay = 0;
  reloadProgress = 0;

  /** 设置装填时间并立即开始装填（开火后调用）。 */
  startReload(delay: number): void {
    this.reloadDelay = Math.max(0, delay);
    this.reloadProgress = 0;
  }

  /** 每 tick 推进装填进度。返回 true 表示刚完成装填。 */
  tick(): boolean {
    if (this.reloadProgress >= this.reloadDelay) {
      return false;
    }
    this.reloadProgress++;
    return this.reloadProgress >= this.reloadDelay;
  }

  /** 是否已完成装填、可以开火。 */
  isReady(): boolean {
    return this.reloadProgress >= this.reloadDelay && this.reloadDelay > 0;
  }

  /** 是否正在装填中。 */
  isReloading(): boolean {
    return this.reloadProgress < this.reloadDelay;
  }

  /** 装填进度百分比（0.0–1.0）。 */
  getProgressRatio(): number {
    if (this.reloadDelay <= 0) return 1;
    return this.reloadProgress / this.reloadDelay;
  }

  /** 立即完成装填（作弊/初始化用）。 */
  instantReady(): void {
    this.reloadProgress = this.reloadDelay;
  }
}
