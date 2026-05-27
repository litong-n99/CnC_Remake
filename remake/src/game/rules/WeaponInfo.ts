/**
 * WeaponInfo — Task 98
 * OpenRA 对标: `OpenRA.Game/GameRules/WeaponInfo.cs`
 *
 * 武器规则定义：将单位定义中的 `range` 字段提升为完整的武器系统。
 * 每种武器包含发射逻辑（WeaponInfo）、抛射体（ProjectileInfo）和弹头（WarheadInfo）。
 */

import type { ProjectileInfo } from './ProjectileInfo';
import type { WarheadInfo } from './WarheadInfo';

/** 目标类型 — 决定武器能否攻击某类对象。 */
export enum TargetType {
  Ground = 'Ground',
  Water = 'Water',
  Air = 'Air',
  Infantry = 'Infantry',
  Vehicle = 'Vehicle',
  Building = 'Building',
  Bridge = 'Bridge',
}

/** 武器信息 — 定义开火节奏、射程与目标过滤。 */
export interface WeaponInfo {
  readonly name: string;
  /** 最大射程（世界单位或格子数，取决于调用方）。 */
  readonly range: number;
  /** 最小射程（小于此距离无法开火）。 */
  readonly minRange?: number;
  /** 每次开火连射弹数。 */
  readonly burst: number;
  /** 两次开火之间的冷却帧数（tick 数）。 */
  readonly reloadDelay: number;
  /** 连射间隔帧数（burst > 1 时有效）。 */
  readonly burstDelays?: number;
  /** 可攻击的目标类型（空数组 = 全部）。 */
  readonly validTargets: readonly TargetType[];
  /** 不可攻击的目标类型。 */
  readonly invalidTargets: readonly TargetType[];
  /** 抛射体定义。 */
  readonly projectile: ProjectileInfo;
  /** 弹头定义。 */
  readonly warhead: WarheadInfo;
  /** 报告音效 ID（预留）。 */
  readonly report?: string;
}

/** 武器定义库 — 从 C++ `WEAPON.CPP` / `BULLET.CPP` 提取默认值。 */
export const WEAPON_DEFINITIONS: Record<string, WeaponInfo> = {
  /** 中型坦克 105mm 炮 — 经典红警默认值。 */
  '105mm': {
    name: '105mm',
    range: 4.75,
    minRange: 0,
    burst: 1,
    reloadDelay: 50,
    validTargets: [TargetType.Ground, TargetType.Water],
    invalidTargets: [],
    projectile: { type: 'Bullet', speed: 8, inaccuracy: 0 },
    warhead: {
      damage: 25,
      spread: 0.5,
      verses: { None: 25, Wood: 50, Aluminum: 75, Steel: 100, Concrete: 50 },
      delay: 0,
    },
  },
  /** 轻型坦克 90mm 炮 — 射速快、伤害低。 */
  '90mm': {
    name: '90mm',
    range: 4.75,
    minRange: 0,
    burst: 1,
    reloadDelay: 40,
    validTargets: [TargetType.Ground, TargetType.Water],
    invalidTargets: [],
    projectile: { type: 'Bullet', speed: 8, inaccuracy: 0 },
    warhead: {
      damage: 18,
      spread: 0.5,
      verses: { None: 25, Wood: 50, Aluminum: 75, Steel: 100, Concrete: 50 },
      delay: 0,
    },
  },
  /** 重型坦克 120mm 炮 — 双连射、高伤害。 */
  '120mm': {
    name: '120mm',
    range: 4.75,
    minRange: 0,
    burst: 2,
    reloadDelay: 70,
    burstDelays: 8,
    validTargets: [TargetType.Ground, TargetType.Water],
    invalidTargets: [],
    projectile: { type: 'Bullet', speed: 8, inaccuracy: 0 },
    warhead: {
      damage: 40,
      spread: 0.5,
      verses: { None: 25, Wood: 50, Aluminum: 75, Steel: 100, Concrete: 50 },
      delay: 0,
    },
  },
  /** 猛犸坦克导弹 — 对空对地双用。 */
  MammothTusk: {
    name: 'MammothTusk',
    range: 5,
    minRange: 0,
    burst: 2,
    reloadDelay: 60,
    burstDelays: 10,
    validTargets: [TargetType.Ground, TargetType.Air, TargetType.Water],
    invalidTargets: [],
    projectile: { type: 'Missile', speed: 10, inaccuracy: 0, turnRate: 0.2 },
    warhead: {
      damage: 30,
      spread: 0.5,
      verses: { None: 50, Wood: 100, Aluminum: 100, Steel: 75, Concrete: 50 },
      delay: 0,
    },
  },
  /** 火箭兵火箭 — 对空对地、对装甲高伤。 */
  Dragon: {
    name: 'Dragon',
    range: 5,
    minRange: 0,
    burst: 1,
    reloadDelay: 50,
    validTargets: [TargetType.Ground, TargetType.Air, TargetType.Water],
    invalidTargets: [],
    projectile: { type: 'Missile', speed: 12, inaccuracy: 0, turnRate: 0.15 },
    warhead: {
      damage: 30,
      spread: 0.5,
      verses: { None: 50, Wood: 100, Aluminum: 100, Steel: 100, Concrete: 50 },
      delay: 0,
    },
  },
  /** 榴弹兵手雷 — 短射程、高面积伤害。 */
  Grenade: {
    name: 'Grenade',
    range: 3.5,
    minRange: 0,
    burst: 1,
    reloadDelay: 40,
    validTargets: [TargetType.Ground],
    invalidTargets: [TargetType.Air],
    projectile: { type: 'Bullet', speed: 6, inaccuracy: 0.3, gravity: 0.05 },
    warhead: {
      damage: 35,
      spread: 0.8,
      verses: { None: 100, Wood: 75, Aluminum: 50, Steel: 25, Concrete: 25 },
      delay: 0,
    },
  },
  /** 火焰兵火焰喷射器 — 极短射程、对步兵高伤。 */
  Flamethrower: {
    name: 'Flamethrower',
    range: 2,
    minRange: 0,
    burst: 1,
    reloadDelay: 30,
    validTargets: [TargetType.Ground],
    invalidTargets: [TargetType.Air],
    projectile: { type: 'Bullet', speed: 20, inaccuracy: 0.5 },
    warhead: {
      damage: 20,
      spread: 0.5,
      verses: { None: 100, Wood: 100, Aluminum: 25, Steel: 10, Concrete: 10 },
      delay: 0,
    },
  },
  /** 步枪 — 基础步兵武器。 */
  M1Carbine: {
    name: 'M1Carbine',
    range: 3,
    minRange: 0,
    burst: 1,
    reloadDelay: 20,
    validTargets: [TargetType.Ground],
    invalidTargets: [TargetType.Air],
    projectile: { type: 'Bullet', speed: 30, inaccuracy: 0.2 },
    warhead: {
      damage: 15,
      spread: 0.3,
      verses: { None: 100, Wood: 30, Aluminum: 30, Steel: 20, Concrete: 10 },
      delay: 0,
    },
  },
  /** 谭雅双枪 — 极高射速、对步兵秒杀。 */
  Colt45: {
    name: 'Colt45',
    range: 3,
    minRange: 0,
    burst: 2,
    reloadDelay: 15,
    burstDelays: 5,
    validTargets: [TargetType.Ground],
    invalidTargets: [TargetType.Air],
    projectile: { type: 'Bullet', speed: 30, inaccuracy: 0.1 },
    warhead: {
      damage: 50,
      spread: 0.3,
      verses: { None: 100, Wood: 30, Aluminum: 30, Steel: 20, Concrete: 10 },
      delay: 0,
    },
  },
  /** V2 火箭 — 远程抛射、高伤害。 */
  V2Rocket: {
    name: 'V2Rocket',
    range: 10,
    minRange: 2,
    burst: 1,
    reloadDelay: 150,
    validTargets: [TargetType.Ground],
    invalidTargets: [TargetType.Air],
    projectile: { type: 'Missile', speed: 5, inaccuracy: 0.5, turnRate: 0.05 },
    warhead: {
      damage: 200,
      spread: 1.5,
      verses: { None: 50, Wood: 100, Aluminum: 100, Steel: 75, Concrete: 50 },
      delay: 0,
    },
  },
  /** 自行火炮炮弹 — 远程曲射。 */
  '155mm': {
    name: '155mm',
    range: 8,
    minRange: 2,
    burst: 1,
    reloadDelay: 90,
    validTargets: [TargetType.Ground],
    invalidTargets: [TargetType.Air],
    projectile: { type: 'Bullet', speed: 6, inaccuracy: 0.8, gravity: 0.03 },
    warhead: {
      damage: 80,
      spread: 1.2,
      verses: { None: 50, Wood: 100, Aluminum: 100, Steel: 75, Concrete: 50 },
      delay: 0,
    },
  },
};

/** 按名称查找武器定义。 */
export function getWeaponInfo(name: string): WeaponInfo | undefined {
  return WEAPON_DEFINITIONS[name];
}

/** 判断武器能否攻击指定目标类型。 */
export function canTarget(weapon: WeaponInfo, targetType: TargetType): boolean {
  if (weapon.invalidTargets.includes(targetType)) return false;
  if (weapon.validTargets.length === 0) return true;
  return weapon.validTargets.includes(targetType);
}

// ── Task 95: YAML 规则解析基础设施 ──

import { RuleRegistry } from './RuleRegistry';

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

function parseEnum<E extends string>(raw: unknown, allowed: readonly E[], ctx: string): E {
  if (typeof raw === 'string' && (allowed as readonly string[]).includes(raw)) {
    return raw as E;
  }
  throw new Error(`Invalid ${ctx}: ${raw}`);
}

/** 将 YAML 原始记录转换为 WeaponInfo。 */
export function convertWeaponInfo(raw: Record<string, unknown>, key: string): WeaponInfo {
  const projectileRaw = raw.projectile as Record<string, unknown>;
  const warheadRaw = raw.warhead as Record<string, unknown>;
  const versesRaw = warheadRaw.verses as Record<string, unknown>;

  return {
    name: parseStr(raw.name ?? key),
    range: parseNum(raw.range),
    minRange: raw.minRange !== undefined ? parseNum(raw.minRange) : undefined,
    burst: parseNum(raw.burst),
    reloadDelay: parseNum(raw.reloadDelay),
    burstDelays: raw.burstDelays !== undefined ? parseNum(raw.burstDelays) : undefined,
    validTargets: Array.isArray(raw.validTargets)
      ? (raw.validTargets as unknown[]).map((v) => parseEnum(v, Object.values(TargetType), 'TargetType'))
      : [],
    invalidTargets: Array.isArray(raw.invalidTargets)
      ? (raw.invalidTargets as unknown[]).map((v) => parseEnum(v, Object.values(TargetType), 'TargetType'))
      : [],
    projectile: {
      type: parseEnum(projectileRaw.type, ['Bullet', 'Missile'] as const, 'ProjectileType'),
      speed: parseNum(projectileRaw.speed),
      inaccuracy: parseNum(projectileRaw.inaccuracy),
      turnRate: projectileRaw.turnRate !== undefined ? parseNum(projectileRaw.turnRate) : undefined,
      gravity: projectileRaw.gravity !== undefined ? parseNum(projectileRaw.gravity) : undefined,
    },
    warhead: {
      damage: parseNum(warheadRaw.damage),
      spread: parseNum(warheadRaw.spread),
      verses: {
        None: parseNum(versesRaw.None),
        Wood: parseNum(versesRaw.Wood),
        Aluminum: parseNum(versesRaw.Aluminum),
        Steel: parseNum(versesRaw.Steel),
        Concrete: parseNum(versesRaw.Concrete),
      },
      delay: parseNum(warheadRaw.delay),
      leavesScorch: warheadRaw.leavesScorch !== undefined ? Boolean(warheadRaw.leavesScorch) : undefined,
    },
    report: raw.report !== undefined ? parseStr(raw.report) : undefined,
  };
}

/** 注册武器规则转换器到 RuleRegistry。 */
export function registerWeaponRuleConverter(): void {
  RuleRegistry.getInstance().register<WeaponInfo>('Weapon', convertWeaponInfo);
}

/**
 * 从 RuleRegistry 加载 YAML 武器定义并覆盖运行时表。
 * 调用前需先执行 `registerWeaponRuleConverter()` 和 `YamlLoader.loadYamlRules()`。
 */
export function loadYamlWeaponDefinitions(): void {
  const registry = RuleRegistry.getInstance();
  const yamlDefs = registry.getAll<WeaponInfo>('Weapon');
  const keys = Object.keys(yamlDefs);
  if (keys.length === 0) return;

  for (const k of keys) {
    (WEAPON_DEFINITIONS as Record<string, WeaponInfo>)[k] = yamlDefs[k];
  }

  console.info(`[WeaponInfo] Loaded ${keys.length} weapons from YAML: ${keys.join(', ')}`);
}
