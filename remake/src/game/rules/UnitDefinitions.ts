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
  /** Primary weapon range in cells. */
  readonly range: number;
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
} as const;

/** Convenience lookup by the C++ enum name (e.g. `"UNIT_LTANK"`). */
export const UNIT_BY_ID: Record<string, UnitDefinition> = Object.fromEntries(
  Object.values(UNIT_DEFINITIONS).map((u) => [u.id, u])
);
