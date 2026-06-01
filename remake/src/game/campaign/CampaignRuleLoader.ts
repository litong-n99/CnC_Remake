/**
 * CampaignRuleLoader — CAM-15
 *
 * 负责加载战役关卡的规则覆盖：
 * 1. 类型别名映射（OpenRA 短名称 → 内部定义名）
 * 2. 缺失单位/建筑定义的占位创建
 * 3. 解析关卡 rules.yaml 并应用数值覆盖到 MapRuleset
 */

import { parseMiniYaml, type MiniYamlNode } from '../terrain/MapFormat';
import { UNIT_DEFINITIONS, type UnitDefinition, Locomotion, ArmorType, MovementZone } from '../rules/UnitDefinitions';
import { BUILDING_DEFINITIONS, type BuildingDefinition } from '../rules/BuildingDefinitions';
import { applyMapRules, type MapRules } from '../rules/MapRuleset';

// ═══════════════════════════════════════════════════════════════
//  类型别名映射：OpenRA actor 类型 → 内部定义名
// ═══════════════════════════════════════════════════════════════

/** 单位类型别名（OpenRA → 内部）。 */
const UNIT_TYPE_ALIASES: Record<string, string> = {
  // 步兵
  e1: 'RifleInfantry',
  e2: 'Grenadier',
  e3: 'RocketSoldier',
  e4: 'Engineer',
  e6: 'Flamethrower',
  e7: 'Tanya',
  'e7.noautotarget': 'Tanya',
  dog: 'AttackDog',
  medi: 'Medic',
  spy: 'Spy',
  shok: 'Flamethrower', // Tesla Trooper placeholder
  c1: 'RifleInfantry', // civilian placeholder
  c2: 'RifleInfantry',
  c3: 'RifleInfantry',
  c4: 'RifleInfantry',
  c5: 'RifleInfantry',
  c6: 'RifleInfantry',
  c7: 'RifleInfantry',
  c8: 'RifleInfantry',
  c9: 'RifleInfantry',
  c10: 'RifleInfantry',
  // 载具
  jeep: 'Jeep',
  tran: 'Transport',
  'tran.extraction': 'Transport',
  'tran.insertion': 'Transport',
  heli: 'LongBow',
  hind: 'Hind',
  yak: 'Yak',
  mig: 'MiG',
  ca: 'Cruiser',
  ss: 'Submarine',
  dd: 'Destroyer',
  pt: 'Gunboat',
  mnly: 'MineLayer',
  ttnk: 'TeslaTank',
  dtrk: 'DemoTruck',
  // 特殊
  einstein: 'Tanya',
  camera: 'Tanya',
  flare: 'Tanya',
};

/** 建筑类型别名（OpenRA → 内部）。 */
const BUILDING_TYPE_ALIASES: Record<string, string> = {
  fact: 'ConstructionYard',
  powr: 'PowerPlant',
  apwr: 'AdvancedPower',
  barr: 'Barracks',
  weap: 'WarFactory',
  proc: 'OreRefinery',
  dome: 'Radar',
  hpad: 'Helipad',
  fix: 'RepairFacility',
  syrd: 'Shipyard',
  tsla: 'PowerPlant', // Tesla Coil placeholder
  sam: 'PowerPlant', // SAM Site placeholder
  gap: 'PowerPlant', // Gap Generator placeholder
  silo: 'OreRefinery', // Silo placeholder
  stek: 'Radar', // Tech Center placeholder
  kenn: 'Barracks', // Kennel placeholder
  v19: 'PowerPlant', // Oil Pump placeholder
  fenc: 'PowerPlant', // Fence placeholder
  barl: 'PowerPlant', // Barrel placeholder
  brl3: 'PowerPlant', // Barrel 3 placeholder
};

// ═══════════════════════════════════════════════════════════════
//  占位定义工厂
// ═══════════════════════════════════════════════════════════════

function createPlaceholderUnit(type: string): UnitDefinition {
  return {
    id: `UNIT_${type.toUpperCase()}`,
    name: type,
    strength: 100,
    sight: 5,
    speed: 5,
    locomotion: Locomotion.Foot,
    cost: 100,
    techLevel: -1,
    armor: ArmorType.None,
    range: 0,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.2,
  };
}

function createPlaceholderBuilding(type: string): BuildingDefinition {
  return {
    id: `STRUCT_${type.toUpperCase()}`,
    name: type,
    strength: 200,
    sight: 3,
    cost: 100,
    techLevel: -1,
    power: 0,
    armor: ArmorType.Wood,
    isFactory: false,
    isRefinery: false,
    isRepairFacility: false,
    isHelipad: false,
    isSelfHealing: false,
    isExploding: false,
    isStealthy: false,
    width: 1,
    height: 1,
    buildTime: 0,
    requiresPower: false,
  };
}

// ═══════════════════════════════════════════════════════════════
//  规则加载器
// ═══════════════════════════════════════════════════════════════

export interface CampaignRuleLoaderOptions {
  /** 地图文件夹 URL。 */
  mapFolderUrl: string;
}

export class CampaignRuleLoader {
  /**
   * 将 OpenRA actor 类型名解析为内部定义名。
   * @returns [definition, definitionTableKey] 或 [null, null]（未知类型）
   */
  static resolveActorType(type: string): {
    def: UnitDefinition | BuildingDefinition | null;
    tableKey: string | null;
    isUnit: boolean;
  } {
    // 1. 尝试单位别名
    const unitAlias = UNIT_TYPE_ALIASES[type];
    if (unitAlias) {
      const def = (UNIT_DEFINITIONS as Record<string, UnitDefinition>)[unitAlias];
      if (def) return { def, tableKey: unitAlias, isUnit: true };
    }

    // 2. 尝试建筑别名
    const buildingAlias = BUILDING_TYPE_ALIASES[type];
    if (buildingAlias) {
      const def = (BUILDING_DEFINITIONS as Record<string, BuildingDefinition>)[buildingAlias];
      if (def) return { def, tableKey: buildingAlias, isUnit: false };
    }

    // 3. 尝试直接查找（无需别名）
    const directUnit = (UNIT_DEFINITIONS as Record<string, UnitDefinition>)[type];
    if (directUnit) return { def: directUnit, tableKey: type, isUnit: true };

    const directBuilding = (BUILDING_DEFINITIONS as Record<string, BuildingDefinition>)[type];
    if (directBuilding) return { def: directBuilding, tableKey: type, isUnit: false };

    // 4. 未知类型 — 根据启发式判断是单位还是建筑，创建占位并注册
    console.warn(`[CampaignRuleLoader] Unknown actor type "${type}", creating placeholder.`);
    // 如果是已知的建筑别名但目标定义不存在，创建建筑占位
    if (type in BUILDING_TYPE_ALIASES) {
      const placeholder = createPlaceholderBuilding(type);
      (BUILDING_DEFINITIONS as Record<string, BuildingDefinition>)[type] = placeholder;
      return { def: placeholder, tableKey: type, isUnit: false };
    }
    const placeholder = createPlaceholderUnit(type);
    (UNIT_DEFINITIONS as Record<string, UnitDefinition>)[type] = placeholder;
    return { def: placeholder, tableKey: type, isUnit: true };
  }

  /**
   * 加载并应用战役规则覆盖。
   */
  static async load(options: CampaignRuleLoaderOptions): Promise<void> {
    const rulesUrl = `${options.mapFolderUrl}/rules.yaml`.replace(/\/+/g, '/');

    try {
      const response = await fetch(rulesUrl);
      if (!response.ok) {
        console.warn(`[CampaignRuleLoader] No rules.yaml found at ${rulesUrl}`);
        return;
      }

      const text = await response.text();
      if (!text.trim()) return;

      const nodes = parseMiniYaml(text);
      const mapRules = parseCampaignRules(nodes);

      if (mapRules) {
        const stats = applyMapRules(mapRules);
        console.warn('[CampaignRuleLoader] Applied overrides:', stats);
      }
    } catch (err) {
      console.warn('[CampaignRuleLoader] Failed to load rules:', err);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  MiniYaml → MapRules 解析（简化版）
// ═══════════════════════════════════════════════════════════════

function parseCampaignRules(nodes: MiniYamlNode[]): MapRules | null {
  const units: Record<string, Record<string, number>> = {};
  const buildings: Record<string, Record<string, number>> = {};

  for (const node of nodes) {
    const key = node.key;
    if (key.startsWith('^')) continue; // 跳过模板
    if (key === 'World') continue; // 跳过世界规则
    if (!node.children || node.children.length === 0) continue;

    // 启发式判断：有 power/width/height 的是建筑；有 speed/locomotion 的是单位
    const isUnit = node.children.some((c) => c.key === 'speed' || c.key === 'locomotion');
    const isBuilding = node.children.some((c) => c.key === 'width' || c.key === 'height' || c.key === 'power');

    // 提取数值覆盖
    const overrides: Record<string, number> = {};
    for (const child of node.children) {
      const val = parseNumericValue(child.value);
      if (val !== null) {
        overrides[child.key] = val;
      }
      // 嵌套数值（如 Power: Amount: -150）
      if (child.children) {
        for (const sub of child.children) {
          const subVal = parseNumericValue(sub.value);
          if (subVal !== null) {
            overrides[`${child.key}.${sub.key}`] = subVal;
          }
        }
      }
    }

    if (Object.keys(overrides).length === 0) continue;

    // 映射到内部名称
    const internalKey = isUnit ? (UNIT_TYPE_ALIASES[key] ?? key) : (BUILDING_TYPE_ALIASES[key] ?? key);

    if (isUnit || (!isBuilding && !isUnit)) {
      units[internalKey] = overrides;
    } else {
      buildings[internalKey] = overrides;
    }
  }

  if (Object.keys(units).length === 0 && Object.keys(buildings).length === 0) {
    return null;
  }

  return { units, buildings };
}

function parseNumericValue(value: string): number | null {
  if (!value) return null;
  // 处理 OpenRA 的 cell 后缀（如 "0c0", "4c0"）
  const cellMatch = value.match(/^(-?\d+)c(\d+)$/);
  if (cellMatch) {
    // 简化：c 之前的数字是整数格数，之后是小数
    return parseInt(cellMatch[1], 10);
  }
  const num = parseFloat(value);
  if (!Number.isNaN(num)) return num;
  return null;
}
