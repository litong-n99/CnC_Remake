/**
 * LobbyOptions — Task 136
 * OpenRA 对标: `MapOptions` Trait + `ScriptLobbyDropdown`
 *
 * 遭遇战/多人游戏大厅配置结构。
 */

import type { GameSpeedKey } from './GameSpeeds';
import { DEFAULT_GAME_SPEED } from './GameSpeeds';

/** 科技等级 — 限制可建造的单位/建筑等级。 */
export type TechLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'unrestricted';

/** 起始资金选项。 */
export type StartingCash = 5000 | 10000 | 15000 | 20000 | 25000;

export interface LobbyOptions {
  /** 游戏速度档位。 */
  readonly gameSpeed: GameSpeedKey;
  /** 科技等级（1 = 仅 T1，10 = 全部）。 */
  readonly techLevel: TechLevel;
  /** 起始资金。 */
  readonly startingCash: StartingCash;
  /** 短兵相接模式（摧毁 MCV 即胜利）。 */
  readonly shortGame: boolean;
  /** 随机宝箱。 */
  readonly crates: boolean;
  /** 允许在盟友基地旁建造。 */
  readonly buildOffAlly: boolean;
  /** 是否允许超级武器。 */
  readonly superWeapons: boolean;
  /** 是否允许间谍/渗透。 */
  readonly infiltration: boolean;
  /** 是否允许海军单位。 */
  readonly naval: boolean;
}

/** 默认大厅配置。 */
export const DEFAULT_LOBBY_OPTIONS: LobbyOptions = {
  gameSpeed: DEFAULT_GAME_SPEED,
  techLevel: 'unrestricted',
  startingCash: 10000,
  shortGame: false,
  crates: true,
  buildOffAlly: false,
  superWeapons: true,
  infiltration: true,
  naval: true,
};

/** 创建自定义大厅配置（未指定字段使用默认值）。 */
export function createLobbyOptions(partial: Partial<LobbyOptions> = {}): LobbyOptions {
  return { ...DEFAULT_LOBBY_OPTIONS, ...partial };
}

/** 科技等级门控：检查某科技等级是否 <= 当前限制。 */
export function isTechLevelAllowed(unitTechLevel: number, lobbyTechLevel: TechLevel): boolean {
  if (lobbyTechLevel === 'unrestricted') return true;
  return unitTechLevel <= lobbyTechLevel;
}

/** 科技等级门控：检查单位定义是否可建造。 */
export function isUnitBuildableAtTechLevel(unitTechLevel: number, lobbyTechLevel: TechLevel): boolean {
  return isTechLevelAllowed(unitTechLevel, lobbyTechLevel);
}
