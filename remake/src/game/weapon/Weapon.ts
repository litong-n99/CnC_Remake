/**
 * 武器定义与发射逻辑 — Task 28
 * Source: origin/REDALERT/WEAPON.CPP, BULLET.CPP
 *
 * 最小可行实现：
 *   - WeaponDef：射程、伤害、射速、弹道速度、弹道类型
 *   - fire()：创建 Bullet 并加入全局活跃列表
 */

import { WarheadType } from '../combat/DamageCalculator';
import { DamageType } from '../combat/DamageTypes';

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
  /** 弹头类型 — Task 29。 */
  readonly warhead: WarheadType;
  /** 伤害类型标签 — Task 133。 */
  readonly damageTypes?: readonly DamageType[];
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
    warhead: WarheadType.AP,
    damageTypes: [DamageType.ExplosionDeath],
  },
  Rifle: {
    name: 'M16 Rifle',
    range: 6,
    damage: 15,
    reloadTime: 15,
    projectileSpeed: 0,
    projectileType: 'instant',
    warhead: WarheadType.SA,
    damageTypes: [DamageType.Prone50Percent],
  },
  Rocket: {
    name: 'Dragon Rocket',
    range: 10,
    damage: 60,
    reloadTime: 45,
    projectileSpeed: 0.8,
    projectileType: 'projectile',
    warhead: WarheadType.HE,
    damageTypes: [DamageType.ExplosionDeath],
  },
  Flamethrower: {
    name: 'Flamethrower',
    range: 5,
    damage: 25,
    reloadTime: 20,
    projectileSpeed: 0,
    projectileType: 'instant',
    warhead: WarheadType.Fire,
    damageTypes: [DamageType.FireDeath],
  },
  TeslaZap: {
    name: 'Tesla Coil Zap',
    range: 8,
    damage: 100,
    reloadTime: 60,
    projectileSpeed: 0,
    projectileType: 'instant',
    warhead: WarheadType.Tesla,
    damageTypes: [DamageType.ElectroDeath],
  },
} as const;
