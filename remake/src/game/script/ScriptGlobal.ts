/**
 * ScriptGlobal — Task-SCR1: Lua 脚本全局 API
 *
 * 将游戏世界暴露给 Lua 脚本的标准接口。
 * 对应 OpenRA: `OpenRA.Game/Scripting/ScriptGlobal.cs`
 *
 * 当前实现为简化版，预留 World/Player/Actor 接入点，
 * 实际游戏逻辑在 Task-SCR2 触发器系统中完整对接。
 */

export interface ScriptGlobalApi {
  readonly Media: MediaApi;
  readonly Map: MapApi;
  readonly Player: PlayerApi;
  readonly Actor: ActorApi;
  readonly Trigger: TriggerApi;
}

export interface MediaApi {
  /** 显示屏幕消息（预留）。 */
  DisplayMessage(text: string): void;
  /** 播放音效（预留）。 */
  PlaySound(sound: string): void;
}

export interface MapApi {
  /** 获取地图尺寸。 */
  Size(): { width: number; height: number };
  /** 获取格子类型名称（预留）。 */
  CellType(x: number, y: number): string;
}

export interface PlayerApi {
  /** 获取所有玩家名称（预留）。 */
  GetPlayers(): string[];
  /** 获取指定玩家资金（预留）。 */
  GetResources(player: string): number;
}

export interface ActorApi {
  /** 创建单位（预留，返回 actor id）。 */
  Create(type: string, player: string, x: number, y: number): string;
  /** 杀死单位（预留）。 */
  Kill(actorId: string): void;
}

export interface TriggerApi {
  /** 注册计时器触发器（预留）。 */
  OnTimer(interval: number, callback: () => void): void;
  /** 注册单位死亡触发器（预留）。 */
  OnKilled(actorId: string, callback: () => void): void;
}

/** 创建默认的 ScriptGlobal API 实例（所有方法为 no-op 预留）。 */
export function createScriptGlobal(): ScriptGlobalApi {
  return {
    Media: {
      DisplayMessage: (text: string) => {
        console.warn(`[ScriptGlobal.Media] ${text}`);
      },
      PlaySound: (sound: string) => {
        console.warn(`[ScriptGlobal.Media] PlaySound ${sound}`);
      },
    },
    Map: {
      Size: () => ({ width: 64, height: 64 }),
      CellType: (_x: number, _y: number) => 'Clear',
    },
    Player: {
      GetPlayers: () => ['gdi', 'nod'],
      GetResources: (_player: string) => 0,
    },
    Actor: {
      Create: (_type: string, _player: string, _x: number, _y: number) => 'actor-0',
      Kill: (_actorId: string) => {},
    },
    Trigger: {
      OnTimer: (_interval: number, _callback: () => void) => {},
      OnKilled: (_actorId: string, _callback: () => void) => {},
    },
  };
}
