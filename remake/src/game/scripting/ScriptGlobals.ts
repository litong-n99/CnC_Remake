/**
 * 脚本全局 API — Task 56
 * Source: harness/01_TASK_BREAKDOWN.md — Task 56
 * OpenRA 对标: ScriptGlobal 子类（MediaGlobal, MapGlobal, PlayerGlobal）
 *
 * 核心设计：
 *   - 每个 Global 是一个纯 TS 类，封装对游戏状态的只读/可控访问
 *   - 脚本中通过名称直接使用：Map.Reveal(...), Player.GetCredits(...)
 *   - 所有修改操作都经过 GameObjectManager / HouseManager 等官方入口
 */

import { HouseType } from '../house/House';
import { HouseManager } from '../house/HouseManager';
import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectFactory } from '../objects/GameObjectFactory';
import type { Scene } from '@babylonjs/core';
import { AudioManager, AUDIO_EVENTS } from '../../core/AudioManager';
import { UNIT_DEFINITIONS } from '../rules/UnitDefinitions';

// ── MapGlobal ──

export interface CPos {
  readonly x: number;
  readonly y: number;
}

/** 地图信息全局 API。 */
export class MapGlobal {
  private readonly terrainWidth: number;
  private readonly terrainHeight: number;

  constructor(width = 64, height = 64) {
    this.terrainWidth = width;
    this.terrainHeight = height;
  }

  /** 获取地图尺寸。 */
  getSize(): { width: number; height: number } {
    return { width: this.terrainWidth, height: this.terrainHeight };
  }

  /** 判断坐标是否在地图范围内。 */
  isInMap(cpos: CPos): boolean {
    return cpos.x >= 0 && cpos.x < this.terrainWidth && cpos.y >= 0 && cpos.y < this.terrainHeight;
  }

  /**
   * 揭示指定区域的战争迷雾（Task 31 接口预留）。
   * @param player — 受益玩家
   * @param cpos   — 中心格子
   * @param radius — 揭示半径（格子数）
   */
  reveal(player: HouseType, cpos: CPos, radius: number): void {
    // 实际实现需对接 FogOfWar 系统；此处为 API 占位
    console.info(`[ScriptGlobals] Map.Reveal: ${HouseType[player]} at (${cpos.x},${cpos.y}) r=${radius}`);
  }
}

// ── PlayerGlobal ──

/** 玩家/阵营全局 API。 */
export class PlayerGlobal {
  /** 获取指定阵营的当前资金。 */
  getCredits(player: HouseType): number {
    const house = HouseManager.getInstance().getHouse(player);
    return house?.credits ?? 0;
  }

  /** 给指定阵营增加资金（正数=增加，负数=扣除）。 */
  addCredits(player: HouseType, amount: number): void {
    const house = HouseManager.getInstance().getHouse(player);
    if (house) {
      house.addCredits(amount);
    }
  }

  /** 获取指定阵营的已建造建筑数量。 */
  getBuildingCount(player: HouseType): number {
    const house = HouseManager.getInstance().getHouse(player);
    return house?.curBuildings ?? 0;
  }

  /** 获取指定阵营的已生产单位数量。 */
  getUnitCount(player: HouseType): number {
    const house = HouseManager.getInstance().getHouse(player);
    return house?.curUnits ?? 0;
  }

  /** 检查指定阵营是否已战败。 */
  isDefeated(player: HouseType): boolean {
    const house = HouseManager.getInstance().getHouse(player);
    return house?.isDefeated ?? false;
  }
}

// ── ActorGlobal ──

export interface ActorInfo {
  readonly id: string;
  readonly type: string;
  readonly owner: HouseType;
  readonly x: number;
  readonly y: number;
  readonly health: number;
}

/** 单位/建筑全局 API。 */
export class ActorGlobal {
  private scene: Scene | null = null;

  setScene(scene: Scene): void {
    this.scene = scene;
  }

  /** 在指定位置创建单位。 */
  create(type: string, house: HouseType, x: number, y: number): string | null {
    if (!this.scene) return null;
    try {
      const definition = (UNIT_DEFINITIONS as Record<string, unknown>)[type];
      const houseObj = HouseManager.getInstance().getHouse(house);
      if (!definition || !houseObj) return null;
      const obj = GameObjectFactory.createUnit({
        definition: definition as import('../rules/UnitDefinitions').UnitDefinition,
        house: houseObj,
        x,
        y,
        scene: this.scene,
      });
      return obj?.id ?? null;
    } catch {
      return null;
    }
  }

  /** 销毁指定 ID 的对象。 */
  destroy(id: string): boolean {
    const manager = GameObjectManager.getInstance();
    const obj = manager.get(id);
    if (!obj) return false;
    manager.unregister(id);
    return true;
  }

  /** 查找指定 ID 的对象信息。 */
  find(id: string): ActorInfo | null {
    const obj = GameObjectManager.getInstance().get(id);
    if (!obj) return null;
    return {
      id: obj.id,
      type: obj.type,
      owner: obj.house.id,
      x: obj.x,
      y: obj.y,
      health: obj.health,
    };
  }

  /** 获取指定阵营的所有存活对象 ID。 */
  getActorsOf(player: HouseType): string[] {
    const manager = GameObjectManager.getInstance();
    return manager
      .getAll()
      .filter((obj) => obj.isAlive() && obj.house.id === player)
      .map((obj) => obj.id);
  }
}

// ── MediaGlobal ──

/** 媒体播放全局 API。 */
export class MediaGlobal {
  /** 播放音效（通过 AudioManager）。 */
  playSound(sound: string): void {
    const am = AudioManager.getInstance();
    if (sound in AUDIO_EVENTS) {
      am.play(sound as keyof typeof AUDIO_EVENTS);
    }
  }

  /** 播放语音通知。 */
  playSpeech(speech: string): void {
    const am = AudioManager.getInstance();
    if (speech in AUDIO_EVENTS) {
      am.play(speech as keyof typeof AUDIO_EVENTS);
    }
  }

  /** 播放背景音乐。 */
  playMusic(track: string): void {
    // 预留接口，实际对接 MusicPlayer
    console.info(`[ScriptGlobals] Media.PlayMusic: ${track}`);
  }
}

// ── UIGlobal ──

/** UI 全局 API。 */
export class UIGlobal {
  private messageQueue: string[] = [];
  private timers = new Map<string, number>();

  /** 在屏幕显示消息（预留 HUD 消息接口）。 */
  showMessage(text: string): void {
    this.messageQueue.push(text);
    console.info(`[ScriptGlobals] UI.Message: ${text}`);
  }

  /** 设置倒计时（秒），到期后触发回调需配合 Trigger.AfterDelay。 */
  setTimer(label: string, seconds: number): void {
    this.timers.set(label, seconds);
  }

  /** 获取当前消息队列（调试用）。 */
  getMessages(): string[] {
    return [...this.messageQueue];
  }

  /** 清除所有消息。 */
  clearMessages(): void {
    this.messageQueue = [];
  }

  /** 获取指定倒计时的剩余秒数。 */
  getTimer(label: string): number | undefined {
    return this.timers.get(label);
  }
}

// ── 便捷注册入口 ──

import { ScriptRuntime } from './ScriptRuntime';

/**
 * 向 ScriptRuntime 注册所有标准全局 API。
 * @param runtime — 脚本运行时实例
 * @param scene   — Babylon.js 场景（ActorGlobal 需要）
 */
export function registerStandardGlobals(runtime: ScriptRuntime, scene?: import('@babylonjs/core').Scene): void {
  runtime.registerGlobal('Map', new MapGlobal());
  runtime.registerGlobal('Player', new PlayerGlobal());

  const actorGlobal = new ActorGlobal();
  if (scene) actorGlobal.setScene(scene);
  runtime.registerGlobal('Actor', actorGlobal);

  runtime.registerGlobal('Media', new MediaGlobal());
  runtime.registerGlobal('UI', new UIGlobal());
}
