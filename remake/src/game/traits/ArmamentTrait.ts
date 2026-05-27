/**
 * ArmamentTrait — Task 96 示例 Trait
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Armament.cs`
 *
 * 管理 Actor 的武器引用、冷却、开火角度。
 * 当前为骨架实现：记录武器名与冷却状态。
 */

import { Trait } from './Trait';
import type { Actor } from '../actors/Actor';

export class ArmamentTrait extends Trait {
  readonly weaponName: string;
  cooldown = 0;

  constructor(weaponName = '') {
    super();
    this.weaponName = weaponName;
  }

  /** 触发开火，进入冷却。 */
  fire(cooldownTicks: number): void {
    this.cooldown = Math.max(0, cooldownTicks);
  }

  /** 每 tick 减少冷却。 */
  override tick(_actor: Actor, _deltaTime: number): void {
    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - 1);
    }
  }

  /** 是否可开火（冷却完毕）。 */
  canFire(): boolean {
    return this.cooldown <= 0;
  }
}
