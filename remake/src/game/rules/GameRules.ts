/**
 * Global game constants translated from `origin/REDALERT/RULES.CPP`.
 *
 * In the original C&C these values are read from `RULES.INI` at runtime.
 * The numbers below match the classic Red Alert defaults (v3.03).
 */

/** Difficulty-level modifiers. */
export interface DifficultySetting {
  readonly name: string;
  /** Multiplier applied to all enemy firepower (e.g. 1 = normal, 0.5 = easy). */
  readonly firepowerBias: number;
  /** Multiplier applied to enemy armour (e.g. 1 = normal, 2 = hard). */
  readonly armourBias: number;
  /** Additional build delay in minutes added to every construction. */
  readonly buildDelay: number;
  /** Whether build times are artificially slowed on this difficulty. */
  readonly isBuildSlowdown: boolean;
  /** Multiplier applied to production speed (higher = faster). */
  readonly buildSpeedBias: number;
  /** Cost multiplier for the player (e.g. 1.2 = everything is 20 % more expensive). */
  readonly costBias: number;
}

export const DIFFICULTY_SETTINGS: Record<string, DifficultySetting> = {
  easy: {
    name: 'Easy',
    firepowerBias: 1,
    armourBias: 1,
    buildDelay: 0,
    isBuildSlowdown: false,
    buildSpeedBias: 1,
    costBias: 1,
  },
  normal: {
    name: 'Normal',
    firepowerBias: 1,
    armourBias: 1,
    buildDelay: 0.03,
    isBuildSlowdown: false,
    buildSpeedBias: 1,
    costBias: 1,
  },
  hard: {
    name: 'Hard',
    firepowerBias: 1,
    armourBias: 1.5,
    buildDelay: 0.05,
    isBuildSlowdown: true,
    buildSpeedBias: 1,
    costBias: 1,
  },
} as const;

/** Top-level global rule constants. */
export const GameRules = {
  /** Money awarded from a solo-play crate pickup. */
  soloCrateMoney: 2000,

  /** Multiplayer starting money (credits). */
  mpDefaultMoney: 3000,

  /** Maximum money allowed in multiplayer. */
  mpMaxMoney: 10000,

  /** Global multiplier for build speeds (1 = normal). */
  buildSpeedBias: 1,

  /** Base construction animation duration (fraction of total build time). */
  buildupTime: 0.05,

  /** Tiberium/Ore unload rate per tick when a harvester docks. */
  oreDumpRate: 2,

  /** Damage dealt by an atom bomb / nuke (used for demo-truck & support powers). */
  atomDamage: 1000,

  /** Minimum possible damage per hit (prevents zero-damage attacks). */
  minDamage: 1,

  /** Maximum possible damage per hit (damage cap). */
  maxDamage: 1000,

  /** Frames to wait between applying damage ticks (e.g. fire, radiation). */
  damageDelay: 1,

  /** Damage reduction when infantry are in prone position. */
  proneDamageBias: 0.5,

  /** Percentage of max HP dealt as quake damage to buildings. */
  quakeDamagePercent: 0.33,

  /** Anti-vehicle mine base damage. */
  avMineDamage: 1200,

  /** Anti-personnel mine base damage. */
  apMineDamage: 1000,

  /** Engineer capture damage (fraction of building max HP applied per engineer). */
  engineerDamage: 1 / 3,

  /** Maximum number of buildings a player can own. */
  buildingMax: 500,

  /** Lepton distance for short-range Tiberium scan (AI harvester logic). */
  tiberiumShortScan: 0x0600,

  /** Lepton distance for long-range Tiberium scan (AI harvester logic). */
  tiberiumLongScan: 0x2000,

  /** Chronal vortex movement speed (MPH). */
  vortexSpeed: 10,

  /** Chronal vortex damage per tick. */
  vortexDamage: 200,

  /** Global game-speed bias (higher = faster simulation). */
  gameSpeedBias: 1,

  /** Difficulty presets. */
  difficulty: DIFFICULTY_SETTINGS,
} as const;

/** @deprecated Use `GameRules` directly. Kept for backward compatibility. */
export type GameRulesType = typeof GameRules;
