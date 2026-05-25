/**
 * 武器定义与发射逻辑 — Task 28
 * Source: origin/REDALERT/WEAPON.CPP, BULLET.CPP
 *
 * 最小可行实现：
 *   - WeaponDef：射程、伤害、射速、弹道速度、弹道类型
 *   - fire()：创建 Bullet 并加入全局活跃列表
 */

export type ProjectileType = 'instant' | 'projectile';

export interface WeaponDef {
  readonly name: string;
  /** 射程（世界单位）。 */
  readonly range: number;
  /** 单发伤害。 */
  readonly damage: number;
  /** 装填时间（逻辑帧数，@60fps 1帧=16.7ms）。 */
  readonly reloadTime: number;
  /** 弹道飞行速度（世界单位/帧）。 */
  readonly projectileSpeed: number;
  /** 弹道类型：即时命中 或 抛射体。 */
  readonly projectileType: ProjectileType;
}

/** 默认武器库（硬编码，后续迁移到 YAML）。 */
export const WEAPON_DEFINITIONS: Record<string, WeaponDef> = {
  Cannon105mm: {
    name: '105mm Cannon',
    range: 12,
    damage: 40,
    reloadTime: 30,
    projectileSpeed: 1.2,
    projectileType: 'projectile',
  },
  Rifle: {
    name: 'M16 Rifle',
    range: 6,
    damage: 15,
    reloadTime: 15,
    projectileSpeed: 0,
    projectileType: 'instant',
  },
  Rocket: {
    name: 'Dragon Rocket',
    range: 10,
    damage: 60,
    reloadTime: 45,
    projectileSpeed: 0.8,
    projectileType: 'projectile',
  },
} as const;
