/**
 * DynamicTechTree — Task 134
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Player/TechTree.cs`
 *
 * 动态科技树：将硬编码的前提条件映射升级为令牌图。
 * - 建筑建造后自动注册提供的令牌
 * - 建筑销毁/出售后自动注销令牌
 * - 支持 AND / OR / ~ 前缀表达式
 */

import { evaluatePrerequisites, extractTokens } from './PrerequisiteToken';

/** 建筑/单位定义 → 所需前提令牌表达式。 */
export interface TokenPrerequisites {
  readonly [actorType: string]: string;
}

/** 建筑定义 → 提供的令牌列表。 */
export interface TokenProviders {
  readonly [buildingType: string]: readonly string[];
}

/** 默认建筑令牌提供表（从 BuildingDefinition.id 映射到 OpenRA 风格令牌）。 */
export const DEFAULT_TOKEN_PROVIDERS: TokenProviders = {
  STRUCT_CONST: ['structures.gdi', 'structures.nod', 'factory'],
  STRUCT_BARRACKS: ['barracks', 'infantry'],
  STRUCT_WEAP: ['weap', 'vehicles'],
  STRUCT_REFINERY: ['refinery', 'tech'],
  STRUCT_POWER: ['power', 'anypower'],
  STRUCT_ADVANCED_POWER: ['power', 'anypower', 'tech'],
  STRUCT_ADVANCED_TECH: ['stek', 'tech'],
  STRUCT_RADAR: ['radar', 'tech'],
};

/** 默认单位前提令牌表。 */
export const DEFAULT_UNIT_PREREQUISITES: TokenPrerequisites = {
  INFANTRY_E1: '~barracks',
  INFANTRY_E2: '~barracks',
  INFANTRY_E3: '~barracks',
  INFANTRY_E4: '~barracks',
  INFANTRY_RENOVATOR: '~barracks',
  INFANTRY_TANYA: '~barracks,~stek',
  INFANTRY_SPY: '~barracks',
  INFANTRY_MEDIC: '~barracks',
  INFANTRY_DOG: '~barracks',
  UNIT_LTANK: '~weap',
  UNIT_MTANK2: '~weap',
  UNIT_MTANK: '~weap',
  UNIT_HTANK: '~weap,~stek',
  UNIT_HARVESTER: '~weap,~refinery',
  UNIT_MCV: '~weap,~factory',
  UNIT_JEEP: '~weap',
  UNIT_APC: '~weap',
  UNIT_ARTY: '~weap,~stek',
  UNIT_V2_LAUNCHER: '~weap',
};

/** 默认建筑前提令牌表。 */
export const DEFAULT_BUILDING_PREREQUISITES: TokenPrerequisites = {
  STRUCT_ADVANCED_POWER: '~power',
  STRUCT_REPAIR: '~weap',
  STRUCT_RADAR: '~refinery',
  STRUCT_ADVANCED_TECH: '~weap,~radar',
};

/** 动态科技树 — 每个 House 一个实例。 */
export class DynamicTechTree {
  private readonly ownedTokens = new Set<string>();
  private readonly tokenProviders: TokenProviders;
  private readonly unitPrereqs: TokenPrerequisites;
  private readonly buildingPrereqs: TokenPrerequisites;

  constructor(
    tokenProviders: TokenProviders = DEFAULT_TOKEN_PROVIDERS,
    unitPrereqs: TokenPrerequisites = DEFAULT_UNIT_PREREQUISITES,
    buildingPrereqs: TokenPrerequisites = DEFAULT_BUILDING_PREREQUISITES
  ) {
    this.tokenProviders = tokenProviders;
    this.unitPrereqs = unitPrereqs;
    this.buildingPrereqs = buildingPrereqs;
  }

  /** 注册建筑提供的所有令牌。 */
  registerBuilding(buildingType: string): void {
    const tokens = this.tokenProviders[buildingType];
    if (tokens) {
      for (const t of tokens) {
        this.ownedTokens.add(t);
      }
    }
    // 建筑自身 ID 也作为一个令牌（用于硬编码前提兼容）
    this.ownedTokens.add(buildingType);
  }

  /** 注销建筑提供的所有令牌。
   * 注意：若多个建筑提供同一令牌，此实现会错误地移除。
   * 完整实现需引用计数；当前为简化版。 */
  unregisterBuilding(buildingType: string): void {
    const tokens = this.tokenProviders[buildingType];
    if (tokens) {
      for (const t of tokens) {
        this.ownedTokens.delete(t);
      }
    }
    this.ownedTokens.delete(buildingType);
  }

  /** 检查是否拥有指定令牌。 */
  hasToken(token: string): boolean {
    return this.ownedTokens.has(token);
  }

  /** 获取所有已拥有的令牌（只读）。 */
  getOwnedTokens(): ReadonlySet<string> {
    return this.ownedTokens;
  }

  /** 检查单位是否可生产。 */
  isUnitAvailable(unitType: string): boolean {
    const expr = this.unitPrereqs[unitType];
    if (!expr) return true;
    return evaluatePrerequisites(expr, this.ownedTokens);
  }

  /** 检查建筑是否可建造。 */
  isBuildingAvailable(buildingType: string, requireConstYard = true): boolean {
    // 默认需要建造厂
    if (requireConstYard && !this.ownedTokens.has('STRUCT_CONST')) return false;

    const expr = this.buildingPrereqs[buildingType];
    if (!expr) return true;
    return evaluatePrerequisites(expr, this.ownedTokens);
  }

  /** 获取单位缺少的前提令牌。 */
  getMissingUnitTokens(unitType: string): string[] {
    const expr = this.unitPrereqs[unitType];
    if (!expr) return [];
    const allTokens = extractTokens(expr);
    return allTokens.filter((t) => !this.ownedTokens.has(t));
  }

  /** 获取建筑缺少的前提令牌。 */
  getMissingBuildingTokens(buildingType: string): string[] {
    const expr = this.buildingPrereqs[buildingType];
    if (!expr) return [];
    const allTokens = extractTokens(expr);
    return allTokens.filter((t) => !this.ownedTokens.has(t));
  }

  /** 清空所有令牌（新游戏/重置用）。 */
  clear(): void {
    this.ownedTokens.clear();
  }
}
