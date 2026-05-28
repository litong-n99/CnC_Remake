/**
 * MapRuleset — Task 99
 * OpenRA 对标: `Ruleset.Load()` 中 `MergeOrDefault` 的 `mapRules` 覆盖逻辑
 *
 * 支持地图内嵌 `map.yaml` 覆盖默认规则，实现单图自定义规则。
 * - 安全白名单：仅允许覆盖数值字段（damage、speed、cost 等）
 * - 禁止添加/删除 Trait（防止地图注入逻辑）
 * - IRulesetLoaded 回调：规则合并完成后通知 Trait 二次解析
 */

import { UNIT_DEFINITIONS, UnitDefinition } from './UnitDefinitions';
import { BUILDING_DEFINITIONS, BuildingDefinition } from './BuildingDefinitions';
import { WEAPON_DEFINITIONS, WeaponInfo } from './WeaponInfo';
import { GameRules } from './GameRules';

// ── 安全白名单：仅允许覆盖的数值字段 ──

const UNIT_OVERRIDE_WHITELIST = new Set<string>([
  'speed',
  'strength',
  'sight',
  'cost',
  'techLevel',
  'rotationSpeed',
  'buildLimit',
  'range',
]);

const BUILDING_OVERRIDE_WHITELIST = new Set<string>(['strength', 'sight', 'cost', 'techLevel', 'power', 'buildLimit']);

const WEAPON_OVERRIDE_WHITELIST = new Set<string>(['range', 'minRange', 'burst', 'reloadDelay', 'burstDelays']);

const GAMERULES_OVERRIDE_WHITELIST = new Set<string>([
  'soloCrateMoney',
  'mpDefaultMoney',
  'mpMaxMoney',
  'buildSpeedBias',
  'buildupTime',
  'oreDumpRate',
  'atomDamage',
  'minDamage',
  'maxDamage',
  'damageDelay',
  'proneDamageBias',
  'quakeDamagePercent',
  'avMineDamage',
  'apMineDamage',
  'engineerDamage',
  'buildingMax',
  'tiberiumShortScan',
  'tiberiumLongScan',
  'vortexSpeed',
  'vortexDamage',
  'gameSpeedBias',
]);

// ── 原始默认值备份（深拷贝）──

let originalUnitDefinitions: Record<string, UnitDefinition> | null = null;
let originalBuildingDefinitions: Record<string, BuildingDefinition> | null = null;
let originalWeaponDefinitions: Record<string, WeaponInfo> | null = null;
let originalGameRules: Record<string, unknown> | null = null;

function ensureBackups(): void {
  if (!originalUnitDefinitions) {
    originalUnitDefinitions = structuredClone(UNIT_DEFINITIONS);
  }
  if (!originalBuildingDefinitions) {
    originalBuildingDefinitions = structuredClone(BUILDING_DEFINITIONS);
  }
  if (!originalWeaponDefinitions) {
    originalWeaponDefinitions = structuredClone(WEAPON_DEFINITIONS);
  }
  if (!originalGameRules) {
    originalGameRules = structuredClone(GameRules as Record<string, unknown>);
  }
}

// ── 地图规则覆盖接口 ──

/** 单类规则的覆盖映射：actorType → { field → newValue } */
export type RuleOverrides = Record<string, Record<string, number>>;

/** 地图级规则结构（与 map.yaml 中 `mapRules` 节点对应）。 */
export interface MapRules {
  readonly units?: RuleOverrides;
  readonly buildings?: RuleOverrides;
  readonly weapons?: RuleOverrides;
  readonly gameRules?: Record<string, number>;
}

/** 当前已应用的地图规则（调试用）。 */
let currentMapRules: MapRules = {};

/** 获取当前已应用的地图规则（只读）。 */
export function getCurrentMapRules(): Readonly<MapRules> {
  return currentMapRules;
}

// ── IRulesetLoaded 回调 ──

/** 规则集加载完成监听器接口。 */
export interface IRulesetLoaded {
  onRulesetLoaded(): void;
}

const rulesetLoadedListeners: IRulesetLoaded[] = [];

/** 注册规则集加载完成监听器。 */
export function registerRulesetLoadedListener(listener: IRulesetLoaded): void {
  rulesetLoadedListeners.push(listener);
}

/** 注销规则集加载完成监听器。 */
export function unregisterRulesetLoadedListener(listener: IRulesetLoaded): void {
  const idx = rulesetLoadedListeners.indexOf(listener);
  if (idx >= 0) rulesetLoadedListeners.splice(idx, 1);
}

/** 通知所有监听器规则集已加载。 */
export function notifyRulesetLoaded(): void {
  for (const listener of rulesetLoadedListeners) {
    try {
      listener.onRulesetLoaded();
    } catch (err) {
      console.warn('[MapRuleset] IRulesetLoaded callback failed:', err);
    }
  }
}

/** 清空所有监听器（测试用）。 */
export function clearRulesetLoadedListeners(): void {
  rulesetLoadedListeners.length = 0;
}

// ── 应用 / 重置 ──

/**
 * 应用地图级规则覆盖。
 * @param rules 从 map.yaml 解析出的 `mapRules` 节点。
 * @returns 实际生效的覆盖字段统计。
 */
export function applyMapRules(rules: MapRules): {
  units: number;
  buildings: number;
  weapons: number;
  gameRules: number;
} {
  ensureBackups();
  currentMapRules = rules;

  let unitCount = 0;
  let buildingCount = 0;
  let weaponCount = 0;
  let gameRuleCount = 0;

  // 覆盖单位数值字段
  if (rules.units) {
    for (const [actorType, overrides] of Object.entries(rules.units)) {
      const def = (UNIT_DEFINITIONS as Record<string, UnitDefinition>)[actorType];
      if (!def) continue;
      for (const [field, value] of Object.entries(overrides)) {
        if (UNIT_OVERRIDE_WHITELIST.has(field) && typeof value === 'number') {
          (def as unknown as Record<string, unknown>)[field] = value;
          unitCount++;
        }
      }
    }
  }

  // 覆盖建筑数值字段
  if (rules.buildings) {
    for (const [actorType, overrides] of Object.entries(rules.buildings)) {
      const def = (BUILDING_DEFINITIONS as Record<string, BuildingDefinition>)[actorType];
      if (!def) continue;
      for (const [field, value] of Object.entries(overrides)) {
        if (BUILDING_OVERRIDE_WHITELIST.has(field) && typeof value === 'number') {
          (def as unknown as Record<string, unknown>)[field] = value;
          buildingCount++;
        }
      }
    }
  }

  // 覆盖武器数值字段
  if (rules.weapons) {
    for (const [weaponName, overrides] of Object.entries(rules.weapons)) {
      const def = (WEAPON_DEFINITIONS as Record<string, WeaponInfo>)[weaponName];
      if (!def) continue;
      for (const [field, value] of Object.entries(overrides)) {
        if (WEAPON_OVERRIDE_WHITELIST.has(field) && typeof value === 'number') {
          (def as unknown as Record<string, unknown>)[field] = value;
          weaponCount++;
        }
      }
    }
  }

  // 覆盖 GameRules 数值字段
  if (rules.gameRules) {
    const gr = GameRules as unknown as Record<string, unknown>;
    for (const [field, value] of Object.entries(rules.gameRules)) {
      if (GAMERULES_OVERRIDE_WHITELIST.has(field) && typeof value === 'number') {
        gr[field] = value;
        gameRuleCount++;
      }
    }
  }

  // 通知监听器
  notifyRulesetLoaded();

  if (unitCount + buildingCount + weaponCount + gameRuleCount > 0) {
    console.info(
      `[MapRuleset] Applied map overrides: ${unitCount} unit fields, ${buildingCount} building fields, ${weaponCount} weapon fields, ${gameRuleCount} gameRules fields`
    );
  }

  return { units: unitCount, buildings: buildingCount, weapons: weaponCount, gameRules: gameRuleCount };
}

/**
 * 重置所有规则为原始默认值（切换地图时调用）。
 */
export function resetMapRules(): void {
  if (!originalUnitDefinitions || !originalBuildingDefinitions || !originalWeaponDefinitions || !originalGameRules) {
    return;
  }

  // 恢复单位定义
  for (const [key, value] of Object.entries(originalUnitDefinitions)) {
    (UNIT_DEFINITIONS as Record<string, UnitDefinition>)[key] = structuredClone(value);
  }
  // 删除新增的单位
  for (const key of Object.keys(UNIT_DEFINITIONS)) {
    if (!(key in originalUnitDefinitions)) {
      delete (UNIT_DEFINITIONS as Record<string, UnitDefinition>)[key];
    }
  }

  // 恢复建筑定义
  for (const [key, value] of Object.entries(originalBuildingDefinitions)) {
    (BUILDING_DEFINITIONS as Record<string, BuildingDefinition>)[key] = structuredClone(value);
  }
  for (const key of Object.keys(BUILDING_DEFINITIONS)) {
    if (!(key in originalBuildingDefinitions)) {
      delete (BUILDING_DEFINITIONS as Record<string, BuildingDefinition>)[key];
    }
  }

  // 恢复武器定义
  for (const [key, value] of Object.entries(originalWeaponDefinitions)) {
    (WEAPON_DEFINITIONS as Record<string, WeaponInfo>)[key] = structuredClone(value);
  }
  for (const key of Object.keys(WEAPON_DEFINITIONS)) {
    if (!(key in originalWeaponDefinitions)) {
      delete (WEAPON_DEFINITIONS as Record<string, WeaponInfo>)[key];
    }
  }

  // 恢复 GameRules
  const gr = GameRules as Record<string, unknown>;
  for (const key of Object.keys(originalGameRules)) {
    gr[key] = structuredClone(originalGameRules[key]);
  }

  currentMapRules = {};

  console.info('[MapRuleset] All rules reset to defaults');
}

/** 获取指定单位的原始默认值（调试用）。 */
export function getOriginalUnitDefinition(type: string): UnitDefinition | undefined {
  ensureBackups();
  return originalUnitDefinitions?.[type];
}

/** 获取指定建筑的原始默认值（调试用）。 */
export function getOriginalBuildingDefinition(type: string): BuildingDefinition | undefined {
  ensureBackups();
  return originalBuildingDefinitions?.[type];
}

/** 获取指定武器的原始默认值（调试用）。 */
export function getOriginalWeaponDefinition(name: string): WeaponInfo | undefined {
  ensureBackups();
  return originalWeaponDefinitions?.[name];
}
