/**
 * ProjectileInfo — Task 98
 * OpenRA 对标: `OpenRA.Game/GameRules/WeaponInfo.cs` 中的 `Projectile` 字段
 *
 * 抛射体规则定义：区分即时命中（Bullet）与制导抛射体（Missile）。
 */

/** 抛射体类型。 */
export type ProjectileType = 'Bullet' | 'Missile';

/** 抛射体信息 — 定义飞行特性。 */
export interface ProjectileInfo {
  readonly type: ProjectileType;
  /** 飞行速度（世界单位 / tick）。 */
  readonly speed: number;
  /** 初速散布（0 = 精确，1 = 最大散布）。 */
  readonly inaccuracy: number;
  /** 转向率（仅 Missile，弧度 / tick）。 */
  readonly turnRate?: number;
  /** 重力加速度（仅抛物线弹体，世界单位 / tick²）。 */
  readonly gravity?: number;
}
