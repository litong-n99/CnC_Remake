/**
 * SequenceRenderer — Task 138
 * OpenRA 对标: `OpenRA.Game/Graphics/Animation.cs` + `Renderable.cs`
 *
 * 根据 Actor 当前状态和朝向选择正确的序列帧，管理帧推进与循环。
 * Dummy 阶段：返回帧索引和颜色标识（供上层 Mesh 替换材质）。
 */

import { SequenceProvider, SequenceDefinition } from '../../game/rules/SequenceProvider';

/**
 * 序列渲染器 — 驱动单个 Actor 的动画序列。
 */
export class SequenceRenderer {
  private provider: SequenceProvider;
  private actorType: string;
  private currentSequenceName = 'idle';
  private currentSequence: SequenceDefinition | undefined;
  private currentFrame = 0;
  private elapsedMs = 0;
  private isPlaying = false;
  private finished = false;

  constructor(provider: SequenceProvider, actorType: string) {
    this.provider = provider;
    this.actorType = actorType;
    this.setSequence('idle');
  }

  /** 切换当前播放的序列。 */
  setSequence(name: string): void {
    if (this.currentSequenceName === name && this.isPlaying) return;

    const seq = this.provider.getSequence(this.actorType, name);
    if (!seq) {
      // 回退到 idle
      this.currentSequenceName = 'idle';
      this.currentSequence = this.provider.getSequence(this.actorType, 'idle');
    } else {
      this.currentSequenceName = name;
      this.currentSequence = seq;
    }

    this.currentFrame = 0;
    this.elapsedMs = 0;
    this.isPlaying = true;
    this.finished = false;
  }

  /** 每 Tick 调用一次，推进动画帧。 */
  tick(deltaTime: number): void {
    if (!this.isPlaying || this.finished || !this.currentSequence) return;

    this.elapsedMs += deltaTime;
    const frameDuration = this.currentSequence.tick;

    if (this.elapsedMs >= frameDuration) {
      const advance = Math.floor(this.elapsedMs / frameDuration);
      this.elapsedMs %= frameDuration;

      this.currentFrame += advance;

      if (this.currentFrame >= this.currentSequence.length) {
        if (this.currentSequence.loop !== false) {
          this.currentFrame %= this.currentSequence.length;
        } else {
          this.currentFrame = this.currentSequence.length - 1;
          this.finished = true;
        }
      }
    }
  }

  /** 获取当前帧的全局索引（含 start 偏移）。 */
  getCurrentFrameIndex(): number {
    if (!this.currentSequence) return 0;
    return this.currentSequence.start + this.currentFrame;
  }

  /**
   * 获取当前朝向对应的帧索引。
   * 考虑 facings 和 transpose 偏移。
   * @param facing DirType 朝向（0–255）。
   */
  getCurrentFrameIndexForFacing(facing: number): number {
    if (!this.currentSequence) return 0;

    const { start, facings, transpose, length } = this.currentSequence;
    const f = facings ?? 1;
    const t = transpose ?? length;

    if (f <= 1) {
      return start + this.currentFrame;
    }

    // 将 0-255 映射到 facing 索引
    const facingIndex = Math.round((facing / 256) * f) % f;
    return start + facingIndex * t + this.currentFrame;
  }

  /** 获取当前序列名称。 */
  getCurrentSequenceName(): string {
    return this.currentSequenceName;
  }

  /** 获取当前序列定义（只读）。 */
  getCurrentSequence(): Readonly<SequenceDefinition> | undefined {
    return this.currentSequence;
  }

  /** 动画是否已播放完毕（非循环序列）。 */
  isFinished(): boolean {
    return this.finished;
  }

  /** 重置到第一帧。 */
  reset(): void {
    this.currentFrame = 0;
    this.elapsedMs = 0;
    this.finished = false;
    this.isPlaying = true;
  }

  /** 暂停播放。 */
  pause(): void {
    this.isPlaying = false;
  }

  /** 恢复播放。 */
  play(): void {
    this.isPlaying = true;
  }

  /** 获取 Dummy 阶段的颜色标识（用于调试/测试）。 */
  getDebugColor(): string {
    switch (this.currentSequenceName) {
      case 'idle':
        return '#4caf50';
      case 'move':
        return '#2196f3';
      case 'attack':
        return '#f44336';
      case 'die':
      case 'die-fire':
        return '#ff9800';
      case 'prone':
        return '#9c27b0';
      default:
        return '#757575';
    }
  }
}
