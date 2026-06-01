/**
 * Bot 控制器框架 — Task 27.6
 * OpenRA 对标: `OpenRA.Game/Player.cs` 中 `IsBot` + `BotType`
 *
 * 将 `isHuman: boolean` 扩展为 `controller: string`，支持多种 Bot 类型。
 */

import type { House } from '../house/House';
import type { TerrainGrid } from '../terrain/TerrainGrid';
import type { Pathfinder } from '../terrain/Pathfinder';
import type { Scene } from '@babylonjs/core';
import type { ResourceLayer } from '../economy/ResourceLayer';
import { BaseBuilderAI } from './BaseBuilderAI';
import { AttackAI } from './AttackAI';
import { DefenseAI } from './DefenseAI';
import { ResourceAI } from './ResourceAI';

/** Bot 运行所需的上下文依赖。 */
export interface BotContext {
  terrain: TerrainGrid;
  scene: Scene;
  pathfinder: Pathfinder;
  resourceLayer: ResourceLayer;
}

/** Bot 控制器接口。 */
export interface BotController {
  readonly type: string;
  activate(house: House): void;
  setContext?(ctx: BotContext): void;
  tick(deltaTime: number): void;
  deactivate(): void;
}

/** Bot 注册表 — 显式注册 Bot 类型。 */
export class BotRegistry {
  private static controllers = new Map<string, new () => BotController>();

  /** 注册一个 Bot 类型。 */
  static register(type: string, ctor: new () => BotController): void {
    this.controllers.set(type, ctor);
  }

  /** 创建指定类型的 Bot 实例。 */
  static create(type: string): BotController | null {
    const Ctor = this.controllers.get(type);
    if (!Ctor) return null;
    return new Ctor();
  }

  /** 获取所有已注册的 Bot 类型。 */
  static getTypes(): string[] {
    return Array.from(this.controllers.keys());
  }

  /** 清空注册表（用于测试）。 */
  static clear(): void {
    this.controllers.clear();
  }
}

/** 占位 Bot — 不做任何事。 */
export class NoOpBot implements BotController {
  readonly type = 'noop';
  activate(): void {}
  tick(): void {}
  deactivate(): void {}
}

/** 通用 Bot 实现 — 聚合 BaseBuilderAI / AttackAI / DefenseAI / ResourceAI。 */
abstract class TacticalBot implements BotController {
  abstract readonly type: string;

  protected house: House | null = null;
  protected ctx: BotContext | null = null;
  protected baseBuilder: BaseBuilderAI | null = null;
  protected attack: AttackAI | null = null;
  protected defense: DefenseAI | null = null;
  protected resource: ResourceAI | null = null;

  activate(house: House): void {
    this.house = house;
  }

  setContext(ctx: BotContext): void {
    this.ctx = ctx;
    if (!this.house) return;
    this.baseBuilder = new BaseBuilderAI(this.house, ctx.terrain, ctx.scene, this.buildOrder());
    this.attack = new AttackAI(this.house, ctx.pathfinder, this.attackOptions());
    this.defense = new DefenseAI(this.house, ctx.terrain, ctx.scene, this.defenseOptions());
    this.resource = new ResourceAI(this.house, ctx.terrain, ctx.pathfinder, ctx.resourceLayer, this.resourceOptions());
  }

  tick(deltaTime: number): void {
    this.baseBuilder?.tick(deltaTime);
    this.attack?.tick(deltaTime);
    this.defense?.tick(deltaTime);
    this.resource?.tick(deltaTime);
  }

  deactivate(): void {
    this.baseBuilder = null;
    this.attack = null;
    this.defense = null;
    this.resource = null;
    this.house = null;
    this.ctx = null;
  }

  /** 子类可覆盖：建造顺序。 */
  protected buildOrder(): string[] | undefined {
    return undefined;
  }

  /** 子类可覆盖：攻击选项。 */
  protected attackOptions(): { attackThreshold?: number } | undefined {
    return undefined;
  }

  /** 子类可覆盖：防御选项。 */
  protected defenseOptions(): import('./DefenseAI').DefenseAIOptions | undefined {
    return undefined;
  }

  /** 子类可覆盖：资源选项。 */
  protected resourceOptions(): import('./ResourceAI').ResourceAIOptions | undefined {
    return undefined;
  }
}

/** Rush 型 Bot — 快速扩张 + 早期攻击。 */
export class RushBot extends TacticalBot {
  readonly type = 'bot-rush';

  protected override buildOrder(): string[] {
    return ['PowerPlant', 'OreRefinery', 'Barracks', 'WarFactory', 'WarFactory', 'Turret', 'Turret'];
  }

  protected override attackOptions(): { attackThreshold?: number } {
    return { attackThreshold: 3 };
  }
}

/** Normal 型 Bot — 标准节奏。 */
export class NormalBot extends TacticalBot {
  readonly type = 'bot-normal';

  protected override buildOrder(): string[] {
    return [
      'PowerPlant',
      'OreRefinery',
      'Barracks',
      'WarFactory',
      'Radar',
      'PowerPlant',
      'WarFactory',
      'Turret',
      'Turret',
    ];
  }
}

/** Defensive 型 Bot — 重视防御 + 后期反击。 */
export class DefensiveBot extends TacticalBot {
  readonly type = 'bot-defensive';

  protected override buildOrder(): string[] {
    return ['PowerPlant', 'OreRefinery', 'PowerPlant', 'Turret', 'Barracks', 'WarFactory', 'Turret', 'Radar', 'Turret'];
  }

  protected override defenseOptions(): import('./DefenseAI').DefenseAIOptions {
    return {
      repairThreshold: 0.7,
      defenseBuildings: ['Turret', 'SAMSite'],
    };
  }

  protected override attackOptions(): { attackThreshold?: number } {
    return { attackThreshold: 8 };
  }
}
