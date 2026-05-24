import { LandType } from '../terrain/TerrainGrid';
import { Locomotion } from './UnitDefinitions';

/**
 * OpenRA-style Locomotor configuration.
 *
 * Mirrors `OpenRA.Mods.Common/Traits/Mobile.cs` → `LocomotorInfo`.
 * Each locomotion class (Foot / Track / Wheel / Winged / Float) defines
 * how units of that type interact with terrain and other actors.
 *
 * Source: OpenRA/OpenRA.Mods.Common/Traits/Mobile.cs, LocomotorInfo class
 */
export interface LocomotorInfo {
  /** Human-readable name (e.g. "Foot", "Track"). */
  readonly name: string;

  /** Average wait time when blocked (milliseconds). */
  readonly waitAverage: number;

  /** Spread added to wait time to desync multiple units (milliseconds). */
  readonly waitSpread: number;

  /** Whether multiple units of this locomotor can share the same cell. */
  readonly sharesCell: boolean;

  /**
   * Terrain speed modifiers.
   * Key = LandType, value = speed multiplier (0 = impassable).
   * The A* edge cost is computed as `distance / terrainSpeed`.
   */
  readonly terrainSpeeds: Readonly<Record<LandType, number>>;

  /**
   * Maximum turn speed in degrees per second.
   * Heavy tanks (Track) turn slowly and may need to stop to turn.
   * Light vehicles (Wheel) turn quickly while moving.
   */
  readonly turnSpeed: number;

  /**
   * Whether the unit can turn while moving.
   * false = must stop at cell boundary, rotate in place, then resume.
   * true = rotates smoothly while interpolating between cells.
   */
  readonly turnsWhileMoving: boolean;

  /**
   * Actor categories this locomotor can crush (e.g. `["infantry"]`).
   * Empty array = cannot crush anything.
   */
  readonly crushes: readonly string[];
}

/**
 * Pre-defined locomotor definitions matching classic C&C behavior.
 *
 * Foot:   infantry — can share cells, slow on rough terrain, can squeeze through rocks.
 * Track:  tracked vehicles — cannot share cells, blocked by rocks.
 * Wheel:  wheeled vehicles — cannot share cells, blocked by rocks, faster on roads.
 * Winged: aircraft — flies over everything.
 * Float:  naval — only water/beach/river.
 */
export const LOCOMOTOR_DEFINITIONS: Record<Locomotion, LocomotorInfo> = {
  [Locomotion.Foot]: {
    name: 'Foot',
    waitAverage: 200,
    waitSpread: 150,
    sharesCell: true,
    turnSpeed: 360,
    turnsWhileMoving: true,
    crushes: [],
    terrainSpeeds: {
      [LandType.Clear]: 1,
      [LandType.Road]: 1,
      [LandType.Water]: 0,
      [LandType.Rock]: 0.5,
      [LandType.Wall]: 0,
      [LandType.Tiberium]: 1,
      [LandType.Beach]: 0.5,
      [LandType.Rough]: 0.7,
      [LandType.River]: 0,
    },
  },

  [Locomotion.Track]: {
    name: 'Track',
    waitAverage: 400,
    waitSpread: 300,
    sharesCell: false,
    turnSpeed: 120,
    turnsWhileMoving: false,
    crushes: ['infantry'],
    terrainSpeeds: {
      [LandType.Clear]: 1,
      [LandType.Road]: 1,
      [LandType.Water]: 0,
      [LandType.Rock]: 0,
      [LandType.Wall]: 0,
      [LandType.Tiberium]: 1,
      [LandType.Beach]: 0.3,
      [LandType.Rough]: 0.5,
      [LandType.River]: 0,
    },
  },

  [Locomotion.Wheel]: {
    name: 'Wheel',
    waitAverage: 300,
    waitSpread: 200,
    sharesCell: false,
    turnSpeed: 180,
    turnsWhileMoving: true,
    crushes: ['infantry'],
    terrainSpeeds: {
      [LandType.Clear]: 1,
      [LandType.Road]: 1,
      [LandType.Water]: 0,
      [LandType.Rock]: 0,
      [LandType.Wall]: 0,
      [LandType.Tiberium]: 1,
      [LandType.Beach]: 0.5,
      [LandType.Rough]: 0.7,
      [LandType.River]: 0,
    },
  },

  [Locomotion.Winged]: {
    name: 'Winged',
    waitAverage: 200,
    waitSpread: 100,
    sharesCell: false,
    turnSpeed: 360,
    turnsWhileMoving: true,
    crushes: [],
    terrainSpeeds: {
      [LandType.Clear]: 1,
      [LandType.Road]: 1,
      [LandType.Water]: 1,
      [LandType.Rock]: 1,
      [LandType.Wall]: 1,
      [LandType.Tiberium]: 1,
      [LandType.Beach]: 1,
      [LandType.Rough]: 1,
      [LandType.River]: 1,
    },
  },

  [Locomotion.Float]: {
    name: 'Float',
    waitAverage: 300,
    waitSpread: 150,
    sharesCell: false,
    turnSpeed: 90,
    turnsWhileMoving: false,
    crushes: [],
    terrainSpeeds: {
      [LandType.Clear]: 0,
      [LandType.Road]: 0,
      [LandType.Water]: 1,
      [LandType.Rock]: 0,
      [LandType.Wall]: 0,
      [LandType.Tiberium]: 0,
      [LandType.Beach]: 1,
      [LandType.Rough]: 0,
      [LandType.River]: 1,
    },
  },
};

/** Look up the locomotor definition for a given locomotion enum value. */
export function getLocomotor(locomotion: Locomotion): LocomotorInfo {
  return LOCOMOTOR_DEFINITIONS[locomotion];
}

/**
 * Create a terrain-cost callback for a specific locomotor.
 *
 * The callback queries the terrain type at (x, y) and returns the
 * locomotor's speed modifier for that terrain (0 = impassable).
 *
 * This callback is passed to `Pathfinder.findPath()` so that A*
 * edge costs reflect terrain difficulty per unit type.
 */
export function makeTerrainCostCallback(
  locomotor: LocomotorInfo,
  getTerrainType: (x: number, y: number) => LandType
): (x: number, y: number) => number {
  return (x: number, y: number): number => {
    const landType = getTerrainType(x, y);
    return locomotor.terrainSpeeds[landType] ?? 0;
  };
}
