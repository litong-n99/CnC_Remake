/**
 * Unit type definitions translated from `origin/REDALERT/UDATA.CPP`
 * and the classic `RULES.INI` defaults.
 *
 * In the original C&C these values are loaded dynamically from INI;
 * the numbers below match the classic Red Alert v3.03 defaults.
 */

/** Locomotion type — mirrors C++ `SpeedType` (`DEFINES.H:3135`). */
export enum Locomotion {
  Foot = 0,
  Track = 1,
  Wheel = 2,
  Winged = 3,
  Float = 4,
}

/** Armour class — mirrors C++ `ArmorType` (`DEFINES.H:2758`). */
export enum ArmorType {
  None = 0,
  Wood = 1,
  Aluminum = 2,
  Steel = 3,
  Concrete = 4,
}

/** Movement zone — mirrors C++ `MZoneType` (`DEFINES.H:678`). */
export enum MovementZone {
  Normal = 0,
  Crusher = 1,
  Destroyer = 2,
  Water = 3,
}

export interface UnitDefinition {
  readonly id: string;
  readonly name: string;
  /** Max hit points. */
  readonly strength: number;
  /** Vision radius in cells. */
  readonly sight: number;
  /** Top speed (game-internal MPH scalar). */
  readonly speed: number;
  /** Locomotion class. */
  readonly locomotion: Locomotion;
  /** Build cost in credits. */
  readonly cost: number;
  /** Tech level required (-1 = unbuildable). */
  readonly techLevel: number;
  /** Armour type. */
  readonly armor: ArmorType;
  /** Primary weapon range in cells. @deprecated 使用 WeaponInfo.range */
  readonly range: number;
  /** Primary weapon name（引用 WEAPON_DEFINITIONS 的键）。 */
  readonly primaryWeapon?: string;
  /** Movement zone capability. */
  readonly mzone: MovementZone;
  /** Whether the unit has a turret. */
  readonly hasTurret: boolean;
  /** Whether the unit can self-heal to 50 %. */
  readonly isSelfHealing: boolean;
  /** Whether the unit is stealthed. */
  readonly isCloakable: boolean;
  /** Whether the unit can crush infantry. */
  readonly isCrusher: boolean;
  /** Whether the unit detects cloaked objects. */
  readonly isScanner: boolean;
  /** Body rotation speed in DirType per millisecond (0–255 scale). */
  readonly rotationSpeed: number;
  /** Crush class for crushable units (e.g. 'infantry'). Empty = not crushable. */
  readonly crushClass?: string;
  /** 建造上限（undefined / 0 = 无限制）。 */
  readonly buildLimit?: number;
}

/** Classic Red Alert unit roster. */
export const UNIT_DEFINITIONS: Record<string, UnitDefinition> = {
  LightTank: {
    id: 'UNIT_LTANK',
    name: 'Light Tank',
    strength: 300,
    sight: 5,
    speed: 7,
    locomotion: Locomotion.Track,
    cost: 700,
    techLevel: 2,
    armor: ArmorType.Steel,
    range: 4.75,
    mzone: MovementZone.Crusher,
    hasTurret: true,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: true,
    isScanner: false,
    rotationSpeed: 0.12,
  },
  MediumTank: {
    id: 'UNIT_MTANK2',
    name: 'Medium Tank',
    strength: 400,
    sight: 5,
    speed: 6,
    locomotion: Locomotion.Track,
    cost: 800,
    techLevel: 3,
    armor: ArmorType.Steel,
    range: 4.75,
    mzone: MovementZone.Crusher,
    hasTurret: true,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: true,
    isScanner: false,
    rotationSpeed: 0.1,
  },
  HeavyTank: {
    id: 'UNIT_MTANK',
    name: 'Heavy Tank',
    strength: 600,
    sight: 6,
    speed: 4,
    locomotion: Locomotion.Track,
    cost: 950,
    techLevel: 5,
    armor: ArmorType.Steel,
    range: 4.75,
    mzone: MovementZone.Crusher,
    hasTurret: true,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: true,
    isScanner: false,
    rotationSpeed: 0.08,
  },
  MammothTank: {
    id: 'UNIT_HTANK',
    name: 'Mammoth Tank',
    strength: 800,
    sight: 6,
    speed: 4,
    locomotion: Locomotion.Track,
    cost: 1500,
    techLevel: 7,
    armor: ArmorType.Steel,
    range: 4.75,
    mzone: MovementZone.Crusher,
    hasTurret: true,
    isSelfHealing: true,
    isCloakable: false,
    isCrusher: true,
    isScanner: false,
    rotationSpeed: 0.06,
  },
  Harvester: {
    id: 'UNIT_HARVESTER',
    name: 'Ore Truck',
    strength: 600,
    sight: 4,
    speed: 6,
    locomotion: Locomotion.Wheel,
    cost: 1400,
    techLevel: 2,
    armor: ArmorType.Steel,
    range: 0,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.1,
  },
  MCV: {
    id: 'UNIT_MCV',
    name: 'Mobile Construction Vehicle',
    strength: 600,
    sight: 4,
    speed: 5,
    locomotion: Locomotion.Wheel,
    cost: 2500,
    techLevel: 7,
    armor: ArmorType.Steel,
    range: 0,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.08,
  },
  Jeep: {
    id: 'UNIT_JEEP',
    name: 'Ranger',
    strength: 150,
    sight: 4,
    speed: 8,
    locomotion: Locomotion.Wheel,
    cost: 500,
    techLevel: 1,
    armor: ArmorType.Aluminum,
    range: 4,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: true,
    rotationSpeed: 0.18,
  },
  APC: {
    id: 'UNIT_APC',
    name: 'Armoured Personnel Carrier',
    strength: 200,
    sight: 5,
    speed: 6,
    locomotion: Locomotion.Track,
    cost: 800,
    techLevel: 4,
    armor: ArmorType.Steel,
    range: 3,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: true,
    isScanner: false,
    rotationSpeed: 0.1,
  },
  Artillery: {
    id: 'UNIT_ARTY',
    name: 'Artillery',
    strength: 100,
    sight: 5,
    speed: 4,
    locomotion: Locomotion.Wheel,
    cost: 600,
    techLevel: 4,
    armor: ArmorType.Aluminum,
    range: 6,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.08,
  },
  V2Rocket: {
    id: 'UNIT_V2_LAUNCHER',
    name: 'V2 Rocket Launcher',
    strength: 200,
    sight: 5,
    speed: 5,
    locomotion: Locomotion.Wheel,
    cost: 700,
    techLevel: 3,
    armor: ArmorType.Aluminum,
    range: 10,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.08,
  },

  // ── Infantry (Foot) — Source: origin/REDALERT/IDATA.CPP, origin/REDALERT/DEFINES.H ──
  RifleInfantry: {
    id: 'INFANTRY_E1',
    name: 'Rifle Infantry',
    strength: 50,
    sight: 4,
    speed: 4,
    locomotion: Locomotion.Foot,
    cost: 100,
    techLevel: 1,
    armor: ArmorType.None,
    range: 4,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.25,
    crushClass: 'infantry',
  },
  Grenadier: {
    id: 'INFANTRY_E2',
    name: 'Grenadier',
    strength: 50,
    sight: 4,
    speed: 4,
    locomotion: Locomotion.Foot,
    cost: 160,
    techLevel: 1,
    armor: ArmorType.None,
    range: 4,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.25,
    crushClass: 'infantry',
  },
  RocketSoldier: {
    id: 'INFANTRY_E3',
    name: 'Rocket Soldier',
    strength: 50,
    sight: 5,
    speed: 4,
    locomotion: Locomotion.Foot,
    cost: 300,
    techLevel: 2,
    armor: ArmorType.None,
    range: 5,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.25,
    crushClass: 'infantry',
  },
  Flamethrower: {
    id: 'INFANTRY_E4',
    name: 'Flamethrower',
    strength: 50,
    sight: 4,
    speed: 4,
    locomotion: Locomotion.Foot,
    cost: 300,
    techLevel: 2,
    armor: ArmorType.None,
    range: 3,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.25,
    crushClass: 'infantry',
  },
  Engineer: {
    id: 'INFANTRY_RENOVATOR',
    name: 'Engineer',
    strength: 25,
    sight: 4,
    speed: 4,
    locomotion: Locomotion.Foot,
    cost: 500,
    techLevel: 3,
    armor: ArmorType.None,
    range: 0,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.25,
  },
  Tanya: {
    id: 'INFANTRY_TANYA',
    name: 'Tanya',
    strength: 100,
    sight: 6,
    speed: 5,
    locomotion: Locomotion.Foot,
    cost: 1000,
    techLevel: 7,
    armor: ArmorType.None,
    range: 5,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.3,
    crushClass: 'infantry',
  },
  Spy: {
    id: 'INFANTRY_SPY',
    name: 'Spy',
    strength: 25,
    sight: 9,
    speed: 4,
    locomotion: Locomotion.Foot,
    cost: 500,
    techLevel: 5,
    armor: ArmorType.None,
    range: 0,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.25,
    crushClass: 'infantry',
  },
  Medic: {
    id: 'INFANTRY_MEDIC',
    name: 'Field Medic',
    strength: 50,
    sight: 5,
    speed: 4,
    locomotion: Locomotion.Foot,
    cost: 800,
    techLevel: 4,
    armor: ArmorType.None,
    range: 3,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.25,
    crushClass: 'infantry',
  },
  AttackDog: {
    id: 'INFANTRY_DOG',
    name: 'Attack Dog',
    strength: 12,
    sight: 5,
    speed: 8,
    locomotion: Locomotion.Foot,
    cost: 200,
    techLevel: 2,
    armor: ArmorType.None,
    range: 0,
    mzone: MovementZone.Normal,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.35,
  },
  Gunboat: {
    id: 'UNIT_GUNBOAT',
    name: 'Gunboat',
    strength: 200,
    sight: 6,
    speed: 9,
    locomotion: Locomotion.Float,
    cost: 500,
    techLevel: 2,
    armor: ArmorType.Steel,
    range: 5,
    mzone: MovementZone.Water,
    hasTurret: true,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.04,
  },
  Destroyer: {
    id: 'UNIT_DESTROYER',
    name: 'Destroyer',
    strength: 500,
    sight: 7,
    speed: 5,
    locomotion: Locomotion.Float,
    cost: 1000,
    techLevel: 4,
    armor: ArmorType.Steel,
    range: 6,
    mzone: MovementZone.Destroyer,
    hasTurret: true,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: true,
    rotationSpeed: 0.03,
  },
  Submarine: {
    id: 'UNIT_SUBMARINE',
    name: 'Submarine',
    strength: 300,
    sight: 5,
    speed: 4,
    locomotion: Locomotion.Float,
    cost: 950,
    techLevel: 5,
    armor: ArmorType.Steel,
    range: 5.5,
    mzone: MovementZone.Water,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: true,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.025,
  },
  Transport: {
    id: 'UNIT_TRANSPORT',
    name: 'Transport',
    strength: 350,
    sight: 5,
    speed: 5,
    locomotion: Locomotion.Float,
    cost: 700,
    techLevel: 3,
    armor: ArmorType.Steel,
    range: 0,
    mzone: MovementZone.Water,
    hasTurret: false,
    isSelfHealing: false,
    isCloakable: false,
    isCrusher: false,
    isScanner: false,
    rotationSpeed: 0.035,
  },
} as const;

/** Convenience lookup by the C++ enum name (e.g. `"UNIT_LTANK"`). */
export const UNIT_BY_ID: Record<string, UnitDefinition> = Object.fromEntries(
  Object.values(UNIT_DEFINITIONS).map((u) => [u.id, u])
);

// ── Task 95: YAML 规则解析基础设施 ──

import { RuleRegistry } from './RuleRegistry';

/** 字符串 → Locomotion enum 映射 */
const LOCOMOTION_MAP: Record<string, Locomotion> = {
  Foot: Locomotion.Foot,
  Track: Locomotion.Track,
  Wheel: Locomotion.Wheel,
  Winged: Locomotion.Winged,
  Float: Locomotion.Float,
};

/** 字符串 → ArmorType enum 映射 */
const ARMOR_MAP: Record<string, ArmorType> = {
  None: ArmorType.None,
  Wood: ArmorType.Wood,
  Aluminum: ArmorType.Aluminum,
  Steel: ArmorType.Steel,
  Concrete: ArmorType.Concrete,
};

/** 字符串 → MovementZone enum 映射 */
const MZONE_MAP: Record<string, MovementZone> = {
  Normal: MovementZone.Normal,
  Crusher: MovementZone.Crusher,
  Destroyer: MovementZone.Destroyer,
  Water: MovementZone.Water,
};

function parseEnum<T>(raw: unknown, map: Record<string, T>, field: string): T {
  if (typeof raw !== 'string') {
    throw new Error(`Expected string for ${field}, got ${typeof raw}`);
  }
  const val = map[raw];
  if (val === undefined) {
    throw new Error(`Unknown ${field} value: "${raw}"`);
  }
  return val;
}

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

/** 将 YAML 原始记录转换为 UnitDefinition。 */
export function convertUnitDefinition(raw: Record<string, unknown>, key: string): UnitDefinition {
  const def: UnitDefinition = {
    id: parseStr(raw.id ?? key),
    name: parseStr(raw.name ?? key),
    strength: parseNum(raw.strength),
    sight: parseNum(raw.sight),
    speed: parseNum(raw.speed),
    locomotion: parseEnum(raw.locomotion, LOCOMOTION_MAP, 'locomotion'),
    cost: parseNum(raw.cost),
    techLevel: parseNum(raw.techLevel),
    armor: parseEnum(raw.armor, ARMOR_MAP, 'armor'),
    range: raw.range !== undefined ? parseNum(raw.range) : 0,
    mzone: parseEnum(raw.mzone, MZONE_MAP, 'mzone'),
    hasTurret: parseBool(raw.hasTurret),
    isSelfHealing: parseBool(raw.isSelfHealing),
    isCloakable: parseBool(raw.isCloakable),
    isCrusher: parseBool(raw.isCrusher),
    isScanner: parseBool(raw.isScanner),
    rotationSpeed: parseNum(raw.rotationSpeed),
    primaryWeapon: raw.primaryWeapon !== undefined ? parseStr(raw.primaryWeapon) : undefined,
  };
  if (raw.crushClass !== undefined) {
    (def as unknown as Record<string, unknown>).crushClass = parseStr(raw.crushClass);
  }
  return def;
}

/** 注册单位规则转换器到 RuleRegistry。 */
export function registerUnitRuleConverter(): void {
  RuleRegistry.getInstance().register<UnitDefinition>('Unit', convertUnitDefinition);
}

/**
 * 从 RuleRegistry 加载 YAML 单位定义并覆盖运行时表。
 * 调用前需先执行 `registerUnitRuleConverter()` 和 `YamlLoader.loadYamlRules()`。
 */
export function loadYamlUnitDefinitions(): void {
  const registry = RuleRegistry.getInstance();
  const yamlDefs = registry.getAll<UnitDefinition>('Unit');
  const keys = Object.keys(yamlDefs);
  if (keys.length === 0) return;

  // 覆盖 UNIT_DEFINITIONS（const 对象，修改属性）
  for (const k of keys) {
    (UNIT_DEFINITIONS as Record<string, UnitDefinition>)[k] = yamlDefs[k];
  }

  // 重建 UNIT_BY_ID
  const all = Object.values(UNIT_DEFINITIONS);
  for (const key of Object.keys(UNIT_BY_ID)) {
    delete (UNIT_BY_ID as Record<string, UnitDefinition | undefined>)[key];
  }
  for (const u of all) {
    (UNIT_BY_ID as Record<string, UnitDefinition>)[u.id] = u;
  }

  console.warn(`[UnitDefinitions] Loaded ${keys.length} units from YAML: ${keys.join(', ')}`);
}
