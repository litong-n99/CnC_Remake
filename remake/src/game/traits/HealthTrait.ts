/**
 * HealthTrait — Task 96 示例 Trait
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Health.cs`
 *
 * 管理 Actor 的生命值，提供 takeDamage / heal / isDead 接口。
 * 从现有 GameObject.takeDamage() 逻辑迁移而来的 Trait 版本。
 */

import { Trait } from './Trait';
import type { Actor } from '../actors/Actor';

export class HealthTrait extends Trait {
  health: number;
  readonly maxHealth: number;

  /** 死亡时触发的回调。 */
  onKilled: ((actor: Actor) => void) | null = null;

  constructor(maxHealth: number) {
    super();
    this.maxHealth = Math.max(1, maxHealth);
    this.health = this.maxHealth;
  }

  /** 受到伤害，生命不低于 0。 */
  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - Math.max(0, amount));
  }

  /** 恢复生命，不超过上限。 */
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + Math.max(0, amount));
  }

  /** 是否存活。 */
  isAlive(): boolean {
    return this.health > 0;
  }

  /** 生命百分比（0–1）。 */
  getHealthPercent(): number {
    return this.health / this.maxHealth;
  }

  override tick(actor: Actor, _deltaTime: number): void {
    if (this.health <= 0 && this.onKilled) {
      this.onKilled(actor);
    }
  }
}
