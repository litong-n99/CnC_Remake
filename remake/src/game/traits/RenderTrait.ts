/**
 * RenderTrait — Task 96 示例 Trait
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Render/RenderSprites.cs`
 *
 * 为 Actor 提供渲染标记（占位实现）。
 * 当前为 Dummy 阶段：仅记录颜色与可见性状态，未来对接真实 Mesh。
 */

import { Trait } from './Trait';
import type { Actor } from '../actors/Actor';

export class RenderTrait extends Trait {
  color: string;
  visible = true;

  constructor(color = '#FFFFFF') {
    super();
    this.color = color;
  }

  override tick(_actor: Actor, _deltaTime: number): void {
    // Dummy 阶段：每 tick 可在此处同步 Mesh 位置/朝向
  }

  /** 切换可见性。 */
  setVisible(visible: boolean): void {
    this.visible = visible;
  }
}
