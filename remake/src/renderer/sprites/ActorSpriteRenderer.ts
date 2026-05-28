/**
 * ActorSpriteRenderer — Task-SPR2: 单位序列绑定
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Render/WithSpriteBody.cs`
 *
 * 将 Actor 的序列定义绑定到 SpriteRenderable，
 * 驱动动画帧切换和朝向感知。
 */

import type { Scene } from '@babylonjs/core';
import type { SequenceDefinition } from '../../game/rules/SequenceProvider';
import { SpriteRenderable } from './SpriteRenderable';

export interface ActorSpriteRendererOptions {
  readonly scene: Scene;
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

export class ActorSpriteRenderer {
  private sprite: SpriteRenderable;
  private currentDef: SequenceDefinition | null = null;
  private elapsedMs = 0;
  private currentFrame = 0;
  private finished = false;

  constructor(options: ActorSpriteRendererOptions) {
    this.sprite = new SpriteRenderable(options.scene, options.name, {
      width: options.width,
      height: options.height,
    });
  }

  /** 设置当前播放的序列。 */
  setSequence(def: SequenceDefinition): void {
    this.currentDef = def;
    this.elapsedMs = 0;
    this.currentFrame = 0;
    this.finished = false;
  }

  /** 推进动画帧（由 ITickRender 调用）。 */
  tickRender(deltaMs: number): void {
    if (!this.currentDef || this.finished) return;

    this.elapsedMs += deltaMs;
    const frameDuration = this.currentDef.tick;

    if (this.elapsedMs >= frameDuration) {
      const advance = Math.floor(this.elapsedMs / frameDuration);
      this.elapsedMs %= frameDuration;
      this.currentFrame += advance;

      if (this.currentFrame >= this.currentDef.length) {
        if (this.currentDef.loop) {
          this.currentFrame %= this.currentDef.length;
        } else {
          this.currentFrame = this.currentDef.length - 1;
          this.finished = true;
        }
      }
    }
  }

  /** 获取当前帧索引（相对于序列 start）。 */
  getCurrentFrame(): number {
    return this.currentFrame;
  }

  /** 更新精灵位置。 */
  setPosition(x: number, y: number, z: number): void {
    this.sprite.setPosition(x, y, z);
  }

  /** 设置精灵可见性。 */
  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
  }

  /** 是否动画已结束（非循环序列）。 */
  isFinished(): boolean {
    return this.finished;
  }

  dispose(): void {
    this.sprite.dispose();
  }
}
