/**
 * 伤害类型标签系统 — Task 133
 * Source: docs/(ARCHIVED)TASK_BREAKDOWN.md — Task 133
 * OpenRA 对标: Warhead 中的 DamageTypes 字段 + TakeCover Trait 响应逻辑
 *
 * 核心设计：
 *   - DamageType 枚举：行为级伤害标签，影响单位状态与死亡表现
 *   - DamageResult 扩展：包含 actualDamage、triggeredProne、deathType
 *   - Unit.takeDamage() 根据 DamageResult 切换状态机
 *
 * 与 Trait 系统的联动（Task 96）：
 *   - 当前直接在 UnitController 中处理 prone 状态
 *   - 未来迁移到 TakeCover Trait 后，DamageResult 通过事件分发
 */

/** 伤害类型标签 — 决定伤害对单位的额外行为影响。 */
export enum DamageType {
  /** 触发匍匐且伤害减半（步枪对步兵）。 */
  Prone50Percent = 'Prone50Percent',
  /** 仅触发匍匐，不减免伤害。 */
  TriggerProne = 'TriggerProne',
  /** 火焰死亡动画（火焰喷射器）。 */
  FireDeath = 'FireDeath',
  /** 爆炸死亡动画（火箭/炮弹）。 */
  ExplosionDeath = 'ExplosionDeath',
  /** 电击死亡动画（特斯拉线圈）。 */
  ElectroDeath = 'ElectroDeath',
}

/** 扩展的伤害计算结果 — Task 133。 */
export interface DamageResult {
  /** 实际伤害值（已计算装甲修正、距离衰减）。 */
  readonly actualDamage: number;
  /** 是否触发了匍匐姿态。 */
  readonly triggeredProne: boolean;
  /** 死亡动画类型（null = 未死亡或默认死亡）。 */
  readonly deathType: DamageType | null;
}

/** 武器定义中可配置的伤害类型集合。 */
export type DamageTypeSet = readonly DamageType[];

/**
 * 根据伤害类型集合计算额外效果。
 * @param damageTypes — 武器配置的伤害类型标签
 * @param isInfantry — 目标是否为步兵（只有步兵会匍匐）
 * @returns { triggeredProne: boolean, proneDamageMultiplier: number }
 */
export function resolveDamageEffects(
  damageTypes: DamageTypeSet,
  isInfantry: boolean
): { triggeredProne: boolean; proneDamageMultiplier: number } {
  let triggeredProne = false;
  let proneDamageMultiplier = 1.0;

  if (!isInfantry) {
    return { triggeredProne, proneDamageMultiplier };
  }

  for (const dt of damageTypes) {
    switch (dt) {
      case DamageType.Prone50Percent:
        triggeredProne = true;
        proneDamageMultiplier = 0.5;
        break;
      case DamageType.TriggerProne:
        triggeredProne = true;
        break;
      default:
        break;
    }
  }

  return { triggeredProne, proneDamageMultiplier };
}

/**
 * 根据伤害类型推断死亡动画类型。
 * @param damageTypes — 武器配置的伤害类型标签
 * @returns 死亡动画类型（null = 默认）
 */
export function resolveDeathType(damageTypes: DamageTypeSet): DamageType | null {
  for (const dt of damageTypes) {
    switch (dt) {
      case DamageType.FireDeath:
      case DamageType.ExplosionDeath:
      case DamageType.ElectroDeath:
        return dt;
      default:
        break;
    }
  }
  return null;
}
