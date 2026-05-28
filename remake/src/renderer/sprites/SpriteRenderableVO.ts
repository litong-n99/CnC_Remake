/**
 * SpriteRenderableVO — Task-R3: SpriteRenderable 的值对象适配器
 *
 * 将 SpriteRenderable 的渲染状态提取为 IRenderable 值对象，
 * 支持每帧由 RenderCollector 收集、排序、批量渲染。
 */

import type { Vector3 } from '@babylonjs/core';
import type { IRenderable } from '../IRenderable';
import { SpriteRenderable } from './SpriteRenderable';

/**
 * SpriteRenderable 的值对象包装。
 *
 * 持有对底层 SpriteRenderable mesh 的弱引用，
 * prepareRender 时同步 mesh 的位置和可见性。
 */
export class SpriteRenderableVO implements IRenderable {
  readonly pos: Vector3;
  readonly zOffset: number;
  readonly renderLayer: number;
  private readonly source: SpriteRenderable;
  private readonly visible: boolean;

  constructor(source: SpriteRenderable, pos: Vector3, zOffset: number, renderLayer: number, visible = true) {
    this.source = source;
    this.pos = pos;
    this.zOffset = zOffset;
    this.renderLayer = renderLayer;
    this.visible = visible;
  }

  prepareRender(): void {
    this.source.setPosition(this.pos.x, this.pos.y, this.pos.z);
    this.source.setVisible(this.visible);
  }
}
