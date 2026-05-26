/**
 * AI 难度等级 — Task 83
 *
 * 根据难度预设（Easy / Normal / Hard）调整敌方单位的
 * 火力、装甲、建造速度和造价倍率。
 */

import { DIFFICULTY_SETTINGS, DifficultySetting } from '../rules/GameRules';
import { House } from '../house/House';

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export class DifficultyScaler {
  private readonly setting: DifficultySetting;

  constructor(level: DifficultyLevel = 'normal') {
    this.setting = DIFFICULTY_SETTINGS[level] ?? DIFFICULTY_SETTINGS.normal;
  }

  /** 应用难度倍率到 House */
  applyToHouse(house: House): void {
    house.firepowerBias = this.setting.firepowerBias;
    house.armorBias = this.setting.armourBias;
    house.buildSpeedBias = this.setting.buildSpeedBias;
    house.costBias = this.setting.costBias;
  }

  /** 计算实际伤害（敌方火力倍率） */
  getModifiedDamage(baseDamage: number, isEnemy: boolean): number {
    if (!isEnemy) return baseDamage;
    return Math.round(baseDamage * this.setting.firepowerBias);
  }

  /** 计算实际装甲值（敌方装甲倍率） */
  getModifiedArmor(baseArmor: number, isEnemy: boolean): number {
    if (!isEnemy) return baseArmor;
    return Math.round(baseArmor * this.setting.armourBias);
  }

  /** 计算实际建造时间 */
  getModifiedBuildTime(baseTimeMs: number): number {
    return Math.round(baseTimeMs / this.setting.buildSpeedBias);
  }

  /** 计算实际造价 */
  getModifiedCost(baseCost: number, isPlayer: boolean): number {
    if (!isPlayer) return baseCost;
    return Math.round(baseCost * this.setting.costBias);
  }

  /** 获取当前难度设置 */
  getSetting(): DifficultySetting {
    return this.setting;
  }

  /** 获取难度名称 */
  getDisplayName(): string {
    return this.setting.name;
  }
}
