/**
 * IRenderable — Task-R3: 渲染器值对象化
 *
 * 将渲染数据从逻辑帧提取为不可变值对象，渲染帧只消费不修改。
 * 此模式对 3D mesh 意义不大（OpenRA 是 2D sprite 才需要），
 * 但 SpriteRenderable 适用：每逻辑帧生成 IRenderable[]，
 * 渲染循环按 zOffset 排序后批量提交。
 *
 * OpenRA 对标: `OpenRA.Game/Graphics/IRenderable.cs`
 */

import type { Vector3 } from '@babylonjs/core';

/** 渲染值对象 — 逻辑帧生成，渲染帧只读。 */
export interface IRenderable {
  /** 世界空间位置。 */
  readonly pos: Vector3;
  /** Z 轴偏移，用于同层内深度排序（越大越靠前）。 */
  readonly zOffset: number;
  /** 渲染层分组。 */
  readonly renderLayer: number;
  /** 执行实际渲染提交（在渲染线程调用）。 */
  prepareRender(): void;
}

/**
 * RenderCollector — 每逻辑帧收集所有 IRenderable，
 * 在渲染帧前按 renderLayer → zOffset 排序后批量输出。
 */
export class RenderCollector {
  private readonly renderables: IRenderable[] = [];

  /** 注册一个渲染值对象（逻辑帧调用）。 */
  add(renderable: IRenderable): void {
    this.renderables.push(renderable);
  }

  /** 获取当前帧的所有渲染对象，按层和深度排序（渲染帧调用）。 */
  collect(): ReadonlyArray<IRenderable> {
    return this.renderables.slice().sort((a, b) => {
      if (a.renderLayer !== b.renderLayer) return a.renderLayer - b.renderLayer;
      return a.zOffset - b.zOffset;
    });
  }

  /** 清空收集器，准备下一帧（渲染帧结束后调用）。 */
  clear(): void {
    this.renderables.length = 0;
  }
}
