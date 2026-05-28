/**
 * 科技树 — 前提建筑检查系统。
 *
 * Source: origin/REDALERT/HOUSE.CPP, Line ~762
 * Original: bool HouseClass::Can_Build(ObjectTypeClass const * type, HousesType house) const
 *
 * C++ 中 `Can_Build` 的核心逻辑：
 * 1. 检查 TechLevel
 * 2. 检查阵营归属 (Get_Ownable)
 * 3. 检查 `Prerequisite` 位图与 `ActiveBScan`（已建造建筑扫描）的按位与：
 *    `(pre & flags) == pre`
 * 4. 高级电厂可替代普通电厂：`if (flags & STRUCTF_ADVANCED_POWER) flags |= STRUCTF_POWER`
 *
 * TS 将前提条件从位图改为数组，更易维护。本项目采用数组方式。
 */

import { BuildingDefinition } from '../rules/BuildingDefinitions';
import { UnitDefinition } from '../rules/UnitDefinitions';
import { House } from '../house/House';
import type { TechLevel } from '../rules/LobbyOptions';
import { isTechLevelAllowed } from '../rules/LobbyOptions';

/** 建筑 ID → 所需前提建筑 ID 列表。 */
const BUILDING_PREREQUISITES: Readonly<Record<string, readonly string[]>> = {
  // 所有建筑默认需要建造厂（在 canBuildBuilding 中统一检查）
  // 以下为额外前提：
  STRUCT_ADVANCED_POWER: ['STRUCT_POWER'],
  STRUCT_REPAIR: ['STRUCT_WEAP'],
};

/** 单位 ID → 所需前提建筑 ID 列表。 */
const UNIT_PREREQUISITES: Readonly<Record<string, readonly string[]>> = {
  // ── 步兵（全部需要兵营）──
  INFANTRY_E1: ['STRUCT_BARRACKS'],
  INFANTRY_E2: ['STRUCT_BARRACKS'],
  INFANTRY_E3: ['STRUCT_BARRACKS'],
  INFANTRY_E4: ['STRUCT_BARRACKS'],
  INFANTRY_RENOVATOR: ['STRUCT_BARRACKS'],
  INFANTRY_TANYA: ['STRUCT_BARRACKS', 'STRUCT_ADVANCED_TECH'],
  INFANTRY_SPY: ['STRUCT_BARRACKS'],
  INFANTRY_MEDIC: ['STRUCT_BARRACKS'],
  INFANTRY_DOG: ['STRUCT_BARRACKS'],
  // ── 车辆（全部需要战车工厂）──
  UNIT_LTANK: ['STRUCT_WEAP'],
  UNIT_MTANK2: ['STRUCT_WEAP'],
  UNIT_MTANK: ['STRUCT_WEAP'],
  UNIT_HTANK: ['STRUCT_WEAP'],
  UNIT_HARVESTER: ['STRUCT_WEAP', 'STRUCT_REFINERY'],
  UNIT_MCV: ['STRUCT_WEAP'],
  UNIT_JEEP: ['STRUCT_WEAP'],
  UNIT_APC: ['STRUCT_WEAP'],
  UNIT_ARTY: ['STRUCT_WEAP'],
  UNIT_V2_LAUNCHER: ['STRUCT_WEAP'],
};

/**
 * 科技树静态工具类。
 *
 * 所有方法均为纯函数，不维护内部状态。
 */
export class TechTree {
  /**
   * 检查某建筑是否可被指定阵营建造。
   *
   * @param def   — 建筑定义
   * @param house — 阵营实例
   * @param checkConstYard — 是否强制要求建造厂（默认 true）
   */
  static canBuildBuilding(def: BuildingDefinition, house: House, checkConstYard = true): boolean {
    if (def.techLevel < 0) return false;
    if (checkConstYard && !house.hasBuilding('STRUCT_CONST')) return false;

    const prereqs = BUILDING_PREREQUISITES[def.id];
    if (prereqs) {
      for (const req of prereqs) {
        // 高级电厂可替代普通电厂（C++ 兼容逻辑）
        if (req === 'STRUCT_POWER' && house.hasBuilding('STRUCT_ADVANCED_POWER')) continue;
        if (!house.hasBuilding(req)) return false;
      }
    }
    return true;
  }

  /**
   * 检查某单位是否可被指定阵营生产。
   *
   * @param def   — 单位定义
   * @param house — 阵营实例
   */
  static canBuildUnit(def: UnitDefinition, house: House): boolean {
    if (def.techLevel < 0) return false;

    const prereqs = UNIT_PREREQUISITES[def.id];
    if (prereqs) {
      for (const req of prereqs) {
        if (!house.hasBuilding(req)) return false;
      }
    }
    return true;
  }

  /**
   * 获取某建筑缺少的前提建筑名称列表（用于 UI 提示）。
   */
  static getMissingPrerequisites(def: BuildingDefinition, house: House): string[] {
    const missing: string[] = [];
    if (!house.hasBuilding('STRUCT_CONST')) {
      missing.push('Construction Yard');
    }
    const prereqs = BUILDING_PREREQUISITES[def.id];
    if (prereqs) {
      for (const req of prereqs) {
        if (req === 'STRUCT_POWER' && house.hasBuilding('STRUCT_ADVANCED_POWER')) continue;
        if (!house.hasBuilding(req)) missing.push(req);
      }
    }
    return missing;
  }

  /**
   * 获取某单位缺少的前提建筑名称列表（用于 UI 提示）。
   */
  static getMissingUnitPrerequisites(def: UnitDefinition, house: House): string[] {
    const missing: string[] = [];
    const prereqs = UNIT_PREREQUISITES[def.id];
    if (prereqs) {
      for (const req of prereqs) {
        if (!house.hasBuilding(req)) missing.push(req);
      }
    }
    return missing;
  }

  // ── Task 136: TechLevel 过滤 ──

  /**
   * 检查建筑是否在指定科技等级下可建造。
   * @param lobbyTechLevel — 大厅设置的科技等级
   */
  static canBuildBuildingAtTechLevel(
    def: BuildingDefinition,
    house: House,
    lobbyTechLevel: TechLevel,
    checkConstYard = true
  ): boolean {
    if (!isTechLevelAllowed(def.techLevel, lobbyTechLevel)) return false;
    return TechTree.canBuildBuilding(def, house, checkConstYard);
  }

  /**
   * 检查单位是否在指定科技等级下可生产。
   * @param lobbyTechLevel — 大厅设置的科技等级
   */
  static canBuildUnitAtTechLevel(def: UnitDefinition, house: House, lobbyTechLevel: TechLevel): boolean {
    if (!isTechLevelAllowed(def.techLevel, lobbyTechLevel)) return false;
    return TechTree.canBuildUnit(def, house);
  }
}
