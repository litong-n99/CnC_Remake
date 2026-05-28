/**
 * GameSpeeds — Task 136
 * OpenRA 对标: `mod.yaml` 中的 `GameSpeeds`
 *
 * 定义五档游戏速度，每档包含逻辑帧间隔（ms/tick）和指令延迟（帧数）。
 */

export type GameSpeedKey = 'slowest' | 'slower' | 'normal' | 'fast' | 'fastest';

export interface GameSpeed {
  readonly key: GameSpeedKey;
  readonly name: string;
  /** 逻辑帧间隔（毫秒）。 */
  readonly timestep: number;
  /** 网络指令延迟（逻辑帧数）。 */
  readonly orderLatency: number;
  /** 相对 normal 的速度倍率（用于表现层动画缩放）。 */
  readonly speedMultiplier: number;
}

export const GAME_SPEEDS: Readonly<Record<GameSpeedKey, GameSpeed>> = {
  slowest: {
    key: 'slowest',
    name: 'Slowest',
    timestep: 60,
    orderLatency: 3,
    speedMultiplier: 0.5,
  },
  slower: {
    key: 'slower',
    name: 'Slower',
    timestep: 50,
    orderLatency: 2,
    speedMultiplier: 0.67,
  },
  normal: {
    key: 'normal',
    name: 'Normal',
    timestep: 40,
    orderLatency: 1,
    speedMultiplier: 1.0,
  },
  fast: {
    key: 'fast',
    name: 'Fast',
    timestep: 30,
    orderLatency: 1,
    speedMultiplier: 1.33,
  },
  fastest: {
    key: 'fastest',
    name: 'Fastest',
    timestep: 20,
    orderLatency: 1,
    speedMultiplier: 2.0,
  },
};

/** 默认游戏速度。 */
export const DEFAULT_GAME_SPEED: GameSpeedKey = 'normal';

/** 按键获取游戏速度配置。 */
export function getGameSpeed(key: GameSpeedKey): GameSpeed {
  return GAME_SPEEDS[key];
}

/** 获取所有可用速度档位（用于 UI 下拉框）。 */
export function getAllGameSpeeds(): GameSpeed[] {
  return Object.values(GAME_SPEEDS);
}

/** 计算相对速度倍率（目标速度 / 基准速度）。 */
export function getSpeedRatio(target: GameSpeedKey, base: GameSpeedKey = 'normal'): number {
  return GAME_SPEEDS[target].speedMultiplier / GAME_SPEEDS[base].speedMultiplier;
}
