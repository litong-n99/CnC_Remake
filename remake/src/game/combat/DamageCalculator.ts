/**
 * 伤害计算与装甲系统 — Task 29
 * Source: origin/REDALERT/COMBAT.CPP (Modify_Damage)
 *         origin/REDALERT/WARHEAD.CPP (WarheadTypeClass::Modifier)
 *
 * 核心公式（C++ 原版）：
 *   Damage = Weapon.Damage * Warhead.Modifier[Armor] * ArmorBias
 *
 * Warhead.Modifier 是定点数（0x0100 = 1.0），本文件使用浮点数 0–2+ 表示。
 * OpenRA 使用百分比（100 = 100%），本文件统一为百分比制以便阅读。
 */

import { ArmorType } from '../rules/UnitDefinitions';
import { DamageResult, DamageType, resolveDamageEffects, resolveDeathType } from './DamageTypes';

/** 弹头类型 — 映射 C++ `WarheadType` (`DEFINES.H:2667`)。 */
export enum WarheadType {
  SA = 'SA',
  HE = 'HE',
  AP = 'AP',
  Fire = 'Fire',
  HollowPoint = 'HollowPoint',
  Tesla = 'Tesla',
  Nuke = 'Nuke',
}

/** 弹头定义 — 含对各装甲类型的伤害修正百分比（100 = 100%）。
 *
 * 数值来源：综合 OpenRA `mods/ra/weapons/*.yaml` 的 Versus 字段
 * 与 C++ 原版 INI 默认值。 */
export interface WarheadDef {
  readonly name: string;
  /** 对各装甲类型的伤害修正百分比。 */
  readonly verses: Readonly<Record<ArmorType, number>>;
  /** 是否仅对步兵有效（C++ `IsOrganic`）。 */
  readonly isOrganic?: boolean;
}

/** 经典弹头库（硬编码，后续迁移到 YAML）。 */
export const WARHEAD_DEFINITIONS: Record<WarheadType, WarheadDef> = {
  [WarheadType.SA]: {
    name: 'Small Arms',
    verses: {
      [ArmorType.None]: 120,
      [ArmorType.Wood]: 60,
      [ArmorType.Aluminum]: 72,
      [ArmorType.Steel]: 28,
      [ArmorType.Concrete]: 28,
    },
    isOrganic: true,
  },
  [WarheadType.HE]: {
    name: 'High Explosive',
    verses: {
      [ArmorType.None]: 90,
      [ArmorType.Wood]: 75,
      [ArmorType.Aluminum]: 34,
      [ArmorType.Steel]: 100,
      [ArmorType.Concrete]: 50,
    },
  },
  [WarheadType.AP]: {
    name: 'Armor Piercing',
    verses: {
      [ArmorType.None]: 30,
      [ArmorType.Wood]: 75,
      [ArmorType.Aluminum]: 75,
      [ArmorType.Steel]: 115,
      [ArmorType.Concrete]: 50,
    },
  },
  [WarheadType.Fire]: {
    name: 'Incendiary',
    verses: {
      [ArmorType.None]: 100,
      [ArmorType.Wood]: 200,
      [ArmorType.Aluminum]: 50,
      [ArmorType.Steel]: 25,
      [ArmorType.Concrete]: 25,
    },
  },
  [WarheadType.HollowPoint]: {
    name: 'Hollow Point',
    verses: {
      [ArmorType.None]: 200,
      [ArmorType.Wood]: 50,
      [ArmorType.Aluminum]: 50,
      [ArmorType.Steel]: 20,
      [ArmorType.Concrete]: 20,
    },
    isOrganic: true,
  },
  [WarheadType.Tesla]: {
    name: 'Tesla',
    verses: {
      [ArmorType.None]: 100,
      [ArmorType.Wood]: 100,
      [ArmorType.Aluminum]: 100,
      [ArmorType.Steel]: 100,
      [ArmorType.Concrete]: 100,
    },
  },
  [WarheadType.Nuke]: {
    name: 'Nuclear',
    verses: {
      [ArmorType.None]: 100,
      [ArmorType.Wood]: 100,
      [ArmorType.Aluminum]: 100,
      [ArmorType.Steel]: 100,
      [ArmorType.Concrete]: 100,
    },
  },
} as const;

/** 伤害计算上下文 — Task 133（DamageTypes）扩展。 */
export interface DamageContext {
  readonly rawDamage: number;
  readonly warhead: WarheadType;
  /** 攻击者火力偏置（C++ `firepowerBias`）。 */
  readonly firepowerBias?: number;
  /** 目标装甲偏置（C++ `armorBias`）。 */
  readonly armorBias?: number;
  /** 距离爆炸中心的距离（格子数，0 = 直接命中）。 */
  readonly distanceCells?: number;
  /** 伤害类型标签（Task 133）。 */
  readonly damageTypes?: readonly DamageType[];
  /** 目标是否为步兵（影响匍匐触发）。 */
  readonly isInfantry?: boolean;
}

/**
 * 伤害计算器 — 核心战斗公式实现。
 *
 * Source: origin/REDALERT/COMBAT.CPP, Line 69 (Modify_Damage)
 */
export class DamageCalculator {
  /**
   * 计算对指定装甲类型的实际伤害（基础版本，向后兼容）。
   *
   * @param rawDamage    武器基础伤害
   * @param warhead      弹头类型
   * @param armor        目标装甲类型
   * @param firepowerBias 攻击者火力偏置（默认 1.0）
   * @param armorBias    目标装甲偏置（默认 1.0）
   * @param distanceCells 距离（格子数，默认 0 = 直接命中）
   * @returns 实际伤害值（至少为 1，除非 rawDamage ≤ 0）
   */
  static calculateDamage(
    rawDamage: number,
    warhead: WarheadType,
    armor: ArmorType,
    firepowerBias = 1.0,
    armorBias = 1.0,
    distanceCells = 0
  ): number {
    if (rawDamage <= 0) return 0;

    const warheadDef = WARHEAD_DEFINITIONS[warhead];
    const verses = warheadDef?.verses[armor] ?? 100;

    // 核心公式：Damage = RawDamage * (Verses / 100) * FirepowerBias * ArmorBias
    let actual = rawDamage * (verses / 100) * firepowerBias * armorBias;

    // 距离衰减（简化版：C++ 中距离以 lepton 为单位，这里用格子数近似）
    if (distanceCells > 0) {
      const falloff = Math.max(1, distanceCells * 2);
      actual = actual / falloff;
    }

    const result = Math.round(actual);
    return Math.max(1, result);
  }

  /**
   * 使用 DamageContext 计算伤害（Task 133 扩展版本）。
   *
   * 返回完整的 DamageResult，包含触发匍匐和死亡动画类型。
   */
  static calculate(context: DamageContext, armor: ArmorType): DamageResult {
    let raw = context.rawDamage;
    const damageTypes = context.damageTypes ?? [];
    const isInfantry = context.isInfantry ?? false;

    // 先应用伤害类型效果（如匍匐减半）
    const effects = resolveDamageEffects(damageTypes, isInfantry);
    raw = raw * effects.proneDamageMultiplier;

    const actual = this.calculateDamage(
      raw,
      context.warhead,
      armor,
      context.firepowerBias ?? 1.0,
      context.armorBias ?? 1.0,
      context.distanceCells ?? 0
    );

    const deathType = resolveDeathType(damageTypes);

    return {
      actualDamage: actual,
      triggeredProne: effects.triggeredProne,
      deathType,
    };
  }
}
