/**
 * WarheadInfo — Task 98
 * OpenRA 对标: `OpenRA.Game/GameRules/WeaponInfo.cs` 中的 `Warhead` 字段
 *
 * 弹头规则定义：伤害计算、装甲修正表、范围衰减。
 */

import { ArmorType } from './UnitDefinitions';

/** 对各类装甲的伤害修正（百分比，100 = 全额伤害）。 */
export type VersusTable = Readonly<Record<string, number>>;

/** 弹头信息 — 定义命中后的效果。 */
export interface WarheadInfo {
  /** 基础伤害值。 */
  readonly damage: number;
  /** 伤害半径（世界单位，0 = 单体）。 */
  readonly spread: number;
  /** 对各类装甲的伤害修正（百分比）。 */
  readonly verses: VersusTable;
  /** 延迟触发帧数（0 = 即时）。 */
  readonly delay: number;
  /** 是否留下弹坑（预留）。 */
  readonly leavesScorch?: boolean;
}

/**
 * 计算对目标装甲的实际伤害。
 * @param baseDamage 武器基础伤害
 * @param versus 对目标装甲的修正百分比
 * @param distanceRatio 距离中心的比例（0 = 中心，1 = 边缘）
 * @returns 最终伤害值（整数，至少为 1）
 */
export function computeDamage(baseDamage: number, versus: number, distanceRatio = 0): number {
  // 距离衰减：中心 100%，边缘 50%
  const falloff = 1 - distanceRatio * 0.5;
  const raw = baseDamage * (versus / 100) * falloff;
  return Math.max(1, Math.floor(raw));
}

/** 获取对指定装甲类型的修正值。 */
export function getVersus(warhead: WarheadInfo, armor: ArmorType): number {
  return warhead.verses[armor] ?? 100;
}
