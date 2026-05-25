/**
 * Building / structure type definitions translated from `origin/REDALERT/BDATA.CPP`
 * and the classic `RULES.INI` defaults.
 *
 * In the original C&C these values are loaded dynamically from INI;
 * the numbers below match the classic Red Alert v3.03 defaults.
 */

import { ArmorType } from './UnitDefinitions';

export interface BuildingDefinition {
  readonly id: string;
  readonly name: string;
  /** Max hit points. */
  readonly strength: number;
  /** Vision radius in cells. */
  readonly sight: number;
  /** Build cost in credits. */
  readonly cost: number;
  /** Tech level required (-1 = unbuildable). */
  readonly techLevel: number;
  /** Power drain (positive = produces, negative = consumes). */
  readonly power: number;
  /** Armour type. */
  readonly armor: ArmorType;
  /** Whether the building can be the target of a construction yard. */
  readonly isFactory: boolean;
  /** Whether the building is a refinery (accepts ore trucks). */
  readonly isRefinery: boolean;
  /** Whether the building can repair units. */
  readonly isRepairFacility: boolean;
  /** Whether the building is a helipad (rearms aircraft). */
  readonly isHelipad: boolean;
  /** Whether the building self-heals to 50 %. */
  readonly isSelfHealing: boolean;
  /** Whether the building explodes when destroyed. */
  readonly isExploding: boolean;
  /** Whether the building is invisible to enemy radar. */
  readonly isStealthy: boolean;
  /** Base width in cells (bounding box). */
  readonly width: number;
  /** Base height in cells (bounding box). */
  readonly height: number;
  /**
   * Occupied cell offsets within the bounding box.
   * If omitted, the entire width×height rectangle is occupied.
   * Source: origin/REDALERT/BDATA.CPP OccupyList.
   */
  readonly footprint?: readonly { readonly dx: number; readonly dy: number }[];
  /** Construction time in seconds. */
  readonly buildTime: number;
  /**
   * Whether the building stops functioning when the house is low on power.
   * Source: origin/REDALERT/BDATA.CPP IsPowered.
   */
  readonly requiresPower: boolean;
}

/**
 * Return the list of occupied cell offsets for a building definition.
 * If the definition has an explicit `footprint`, use it;
 * otherwise fall back to a full width×height rectangle.
 */
export function getBuildingFootprint(def: BuildingDefinition): readonly { readonly dx: number; readonly dy: number }[] {
  if (def.footprint) return def.footprint;
  const cells: { dx: number; dy: number }[] = [];
  for (let dx = 0; dx < def.width; dx++) {
    for (let dy = 0; dy < def.height; dy++) {
      cells.push({ dx, dy });
    }
  }
  return cells;
}

/** Classic Red Alert building roster (military structures only). */
export const BUILDING_DEFINITIONS: Record<string, BuildingDefinition> = {
  ConstructionYard: {
    id: 'STRUCT_CONST',
    name: 'Construction Yard',
    strength: 1000,
    sight: 10,
    cost: 0,
    techLevel: -1,
    power: 0,
    armor: ArmorType.Concrete,
    isFactory: false,
    isRefinery: false,
    isRepairFacility: false,
    isHelipad: false,
    isSelfHealing: false,
    isExploding: false,
    isStealthy: false,
    width: 3,
    height: 3,
    buildTime: 0,
    requiresPower: false,
  },
  PowerPlant: {
    id: 'STRUCT_POWER',
    name: 'Power Plant',
    strength: 400,
    sight: 4,
    cost: 300,
    techLevel: 1,
    power: 100,
    armor: ArmorType.Wood,
    isFactory: false,
    isRefinery: false,
    isRepairFacility: false,
    isHelipad: false,
    isSelfHealing: false,
    isExploding: false,
    isStealthy: false,
    width: 2,
    height: 2,
    buildTime: 8,
    requiresPower: false,
  },
  AdvancedPower: {
    id: 'STRUCT_ADVANCED_POWER',
    name: 'Advanced Power Plant',
    strength: 600,
    sight: 4,
    cost: 500,
    techLevel: 5,
    power: 200,
    armor: ArmorType.Wood,
    isFactory: false,
    isRefinery: false,
    isRepairFacility: false,
    isHelipad: false,
    isSelfHealing: false,
    isExploding: false,
    isStealthy: false,
    width: 3,
    height: 3,
    buildTime: 12,
    requiresPower: false,
  },
  Barracks: {
    id: 'STRUCT_BARRACKS',
    name: 'Barracks',
    strength: 500,
    sight: 5,
    cost: 300,
    techLevel: 1,
    power: -20,
    armor: ArmorType.Wood,
    isFactory: true,
    isRefinery: false,
    isRepairFacility: false,
    isHelipad: false,
    isSelfHealing: false,
    isExploding: false,
    isStealthy: false,
    width: 2,
    height: 2,
    buildTime: 10,
    requiresPower: true,
  },
  OreRefinery: {
    id: 'STRUCT_REFINERY',
    name: 'Ore Refinery',
    strength: 900,
    sight: 6,
    cost: 2000,
    techLevel: 2,
    power: -40,
    armor: ArmorType.Concrete,
    isFactory: false,
    isRefinery: true,
    isRepairFacility: false,
    isHelipad: false,
    isSelfHealing: false,
    isExploding: false,
    isStealthy: false,
    width: 3,
    height: 3,
    /**
     * OccupyList from origin/REDALERT/BDATA.CPP:
     * List010111100 = {1, MCW, MCW+1, MCW+2, MCW*2}
     *   _ X _
     *   X X X
     *   X _ _
     */
    footprint: [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 1 },
      { dx: 2, dy: 1 },
      { dx: 0, dy: 2 },
    ] as const,
    buildTime: 20,
    requiresPower: false,
  },
  WarFactory: {
    id: 'STRUCT_WEAP',
    name: 'War Factory',
    strength: 800,
    sight: 4,
    cost: 2000,
    techLevel: 2,
    power: -30,
    armor: ArmorType.Concrete,
    isFactory: true,
    isRefinery: false,
    isRepairFacility: false,
    isHelipad: false,
    isSelfHealing: false,
    isExploding: false,
    isStealthy: false,
    width: 3,
    height: 2,
    buildTime: 20,
    requiresPower: true,
  },
  Radar: {
    id: 'STRUCT_RADAR',
    name: 'Radar Dome',
    strength: 600,
    sight: 10,
    cost: 1000,
    techLevel: 3,
    power: -40,
    armor: ArmorType.Wood,
    isFactory: false,
    isRefinery: false,
    isRepairFacility: false,
    isHelipad: false,
    isSelfHealing: false,
    isExploding: false,
    isStealthy: false,
    width: 2,
    height: 2,
    buildTime: 15,
    requiresPower: true,
  },
  Helipad: {
    id: 'STRUCT_HELIPAD',
    name: 'Helipad',
    strength: 400,
    sight: 5,
    cost: 500,
    techLevel: 4,
    power: -10,
    armor: ArmorType.Concrete,
    isFactory: false,
    isRefinery: false,
    isRepairFacility: false,
    isHelipad: true,
    isSelfHealing: false,
    isExploding: false,
    isStealthy: false,
    width: 2,
    height: 2,
    buildTime: 12,
    requiresPower: true,
  },
  RepairFacility: {
    id: 'STRUCT_REPAIR',
    name: 'Service Depot',
    strength: 700,
    sight: 4,
    cost: 800,
    techLevel: 4,
    power: -20,
    armor: ArmorType.Concrete,
    isFactory: false,
    isRefinery: false,
    isRepairFacility: true,
    isHelipad: false,
    isSelfHealing: false,
    isExploding: false,
    isStealthy: false,
    width: 3,
    height: 3,
    buildTime: 15,
    requiresPower: false,
  },
  Shipyard: {
    id: 'STRUCT_SHIP_YARD',
    name: 'Naval Yard',
    strength: 800,
    sight: 5,
    cost: 1000,
    techLevel: 4,
    power: -30,
    armor: ArmorType.Concrete,
    isFactory: true,
    isRefinery: false,
    isRepairFacility: false,
    isHelipad: false,
    isSelfHealing: false,
    isExploding: false,
    isStealthy: false,
    width: 3,
    height: 3,
    buildTime: 20,
    requiresPower: true,
  },
} as const;

/** Convenience lookup by the C++ enum name (e.g. `"STRUCT_REFINERY"`). */
export const BUILDING_BY_ID: Record<string, BuildingDefinition> = Object.fromEntries(
  Object.values(BUILDING_DEFINITIONS).map((b) => [b.id, b])
);

// ── Task 95: YAML 规则解析基础设施 ──

import { RuleRegistry } from './RuleRegistry';

function parseBool(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === 'false' || raw === 0 || raw === '0') return false;
  throw new Error(`Expected boolean, got ${typeof raw}`);
}

function parseNum(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw);
    if (!Number.isNaN(n)) return n;
  }
  throw new Error(`Expected number, got ${typeof raw}`);
}

function parseStr(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  throw new Error(`Expected string, got ${typeof raw}`);
}

const ARMOR_MAP: Record<string, ArmorType> = {
  None: ArmorType.None,
  Wood: ArmorType.Wood,
  Aluminum: ArmorType.Aluminum,
  Steel: ArmorType.Steel,
  Concrete: ArmorType.Concrete,
};

function parseArmor(raw: unknown): ArmorType {
  if (typeof raw === 'string') {
    const val = ARMOR_MAP[raw];
    if (val !== undefined) return val;
  }
  if (typeof raw === 'number') return raw as ArmorType;
  throw new Error(`Unknown armor value: ${String(raw)}`);
}

function parseFootprint(raw: unknown): Array<{ dx: number; dy: number }> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) throw new Error('Expected array for footprint');
  return raw.map((item) => {
    if (typeof item !== 'object' || item === null) throw new Error('Expected object in footprint array');
    return { dx: parseNum((item as Record<string, unknown>).dx), dy: parseNum((item as Record<string, unknown>).dy) };
  });
}

/** 将 YAML 原始记录转换为 BuildingDefinition。 */
export function convertBuildingDefinition(raw: Record<string, unknown>, key: string): BuildingDefinition {
  const def: BuildingDefinition = {
    id: parseStr(raw.id ?? key),
    name: parseStr(raw.name ?? key),
    strength: parseNum(raw.strength),
    sight: parseNum(raw.sight),
    cost: parseNum(raw.cost),
    techLevel: parseNum(raw.techLevel),
    power: parseNum(raw.power),
    armor: parseArmor(raw.armor),
    isFactory: parseBool(raw.isFactory),
    isRefinery: parseBool(raw.isRefinery),
    isRepairFacility: parseBool(raw.isRepairFacility),
    isHelipad: parseBool(raw.isHelipad),
    isSelfHealing: parseBool(raw.isSelfHealing),
    isExploding: parseBool(raw.isExploding),
    isStealthy: parseBool(raw.isStealthy),
    width: parseNum(raw.width),
    height: parseNum(raw.height),
    buildTime: parseNum(raw.buildTime),
    requiresPower: parseBool(raw.requiresPower),
  };
  const footprint = parseFootprint(raw.footprint);
  if (footprint) {
    (def as unknown as Record<string, unknown>).footprint = footprint;
  }
  return def;
}

/** 注册建筑规则转换器到 RuleRegistry。 */
export function registerBuildingRuleConverter(): void {
  RuleRegistry.getInstance().register<BuildingDefinition>('Building', convertBuildingDefinition);
}

/**
 * 从 RuleRegistry 加载 YAML 建筑定义并覆盖运行时表。
 */
export function loadYamlBuildingDefinitions(): void {
  const registry = RuleRegistry.getInstance();
  const yamlDefs = registry.getAll<BuildingDefinition>('Building');
  const keys = Object.keys(yamlDefs);
  if (keys.length === 0) return;

  for (const k of keys) {
    (BUILDING_DEFINITIONS as Record<string, BuildingDefinition>)[k] = yamlDefs[k];
  }

  const all = Object.values(BUILDING_DEFINITIONS);
  for (const key of Object.keys(BUILDING_BY_ID)) {
    delete (BUILDING_BY_ID as Record<string, BuildingDefinition | undefined>)[key];
  }
  for (const b of all) {
    (BUILDING_BY_ID as Record<string, BuildingDefinition>)[b.id] = b;
  }

  console.info(`[BuildingDefinitions] Loaded ${keys.length} buildings from YAML: ${keys.join(', ')}`);
}
