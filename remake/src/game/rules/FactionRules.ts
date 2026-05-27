/**
 * FactionRules — Task 135
 * OpenRA 对标: `Buildable` Trait 中的 `Prerequisites: ~structures.soviet`
 *
 * 定义阵营科技树差异：
 * - 各阵营建造厂提供对应的阵营令牌
 * - 某些单位/建筑仅限特定阵营建造
 */

import { HouseType } from '../house/House';

/** 阵营类型 — 简化版，映射到 Red Alert 的两大阵营。 */
export enum Faction {
  Allies = 'allies',
  Soviet = 'soviet',
  GDI = 'gdi',
  Nod = 'nod',
  Neutral = 'neutral',
}

/** 将 HouseType 映射到 Faction。 */
export function houseTypeToFaction(houseType: HouseType): Faction {
  switch (houseType) {
    case HouseType.Spain:
    case HouseType.Greece:
    case HouseType.England:
    case HouseType.Ukraine:
    case HouseType.Germany:
    case HouseType.France:
    case HouseType.Turkey:
      return Faction.Allies;
    case HouseType.USSR:
      return Faction.Soviet;
    case HouseType.GDI:
      return Faction.GDI;
    case HouseType.Nod:
      return Faction.Nod;
    default:
      return Faction.Neutral;
  }
}

/** 获取阵营对应的 ConstructionYard 令牌。 */
export function getFactionToken(faction: Faction): string {
  switch (faction) {
    case Faction.Allies:
      return 'structures.allies';
    case Faction.Soviet:
      return 'structures.soviet';
    case Faction.GDI:
      return 'structures.gdi';
    case Faction.Nod:
      return 'structures.nod';
    default:
      return 'structures.neutral';
  }
}

/** 获取阵营对应的建筑前缀（用于 BuildingDefinition.id）。 */
export function getFactionBuildingPrefix(faction: Faction): string {
  switch (faction) {
    case Faction.Allies:
      return 'ALLY';
    case Faction.Soviet:
      return 'SOV';
    case Faction.GDI:
      return 'GDI';
    case Faction.Nod:
      return 'NOD';
    default:
      return 'NEU';
  }
}

/** 仅限特定阵营的单位/建筑列表。 */
export const FACTION_EXCLUSIVE: Readonly<Record<string, readonly Faction[]>> = {
  // 盟军专属
  STRUCT_PILLBOX: [Faction.Allies],
  STRUCT_CAMOPILL: [Faction.Allies],
  STRUCT_GAP: [Faction.Allies],
  UNIT_MGG: [Faction.Allies],
  UNIT_JEEP: [Faction.Allies],
  INFANTRY_TANYA: [Faction.Allies],
  INFANTRY_MEDIC: [Faction.Allies],
  INFANTRY_SPY: [Faction.Allies],

  // 苏联专属
  STRUCT_TESLA: [Faction.Soviet],
  STRUCT_KENNEL: [Faction.Soviet],
  STRUCT_FLAME_TURRET: [Faction.Soviet],
  UNIT_APC_SOVIET: [Faction.Soviet],
  UNIT_MAMMOTH: [Faction.Soviet],
  INFANTRY_DOG: [Faction.Soviet],
  INFANTRY_SHOCK: [Faction.Soviet],
};

/** 检查某单位/建筑是否仅限特定阵营。 */
export function isFactionExclusive(typeId: string): boolean {
  return typeId in FACTION_EXCLUSIVE;
}

/** 检查某阵营是否可以建造指定类型。 */
export function canFactionBuild(typeId: string, faction: Faction): boolean {
  const allowed = FACTION_EXCLUSIVE[typeId];
  if (!allowed) return true; // 非限定 = 所有阵营可造
  return allowed.includes(faction);
}
