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
  /** Base width in cells. */
  readonly width: number;
  /** Base height in cells. */
  readonly height: number;
  /** Construction time in seconds. */
  readonly buildTime: number;
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
    height: 2,
    buildTime: 12,
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
    buildTime: 20,
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
    height: 3,
    buildTime: 20,
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
    height: 2,
    buildTime: 15,
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
  },
} as const;

/** Convenience lookup by the C++ enum name (e.g. `"STRUCT_REFINERY"`). */
export const BUILDING_BY_ID: Record<string, BuildingDefinition> = Object.fromEntries(
  Object.values(BUILDING_DEFINITIONS).map((b) => [b.id, b])
);
