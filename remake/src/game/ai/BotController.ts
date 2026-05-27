/**
 * Bot 控制器框架 — Task 27.6
 * OpenRA 对标: `OpenRA.Game/Player.cs` 中 `IsBot` + `BotType`
 *
 * 将 `isHuman: boolean` 扩展为 `controller: string`，支持多种 Bot 类型。
 */

import type { House } from '../house/House';

/** Bot 控制器接口。 */
export interface BotController {
  readonly type: string;
  activate(house: House): void;
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

/**  Rush 型 Bot — 快速扩张 + 早期攻击。 */
export class RushBot implements BotController {
  readonly type = 'bot-rush';

  activate(_house: House): void {}

  tick(_deltaTime: number): void {
    // 由外部 BaseBuilderAI / AttackAI 驱动
  }

  deactivate(): void {}
}

/** Normal 型 Bot — 标准节奏。 */
export class NormalBot implements BotController {
  readonly type = 'bot-normal';

  activate(_house: House): void {}

  tick(_deltaTime: number): void {
    // 由外部 BaseBuilderAI / AttackAI 驱动
  }

  deactivate(): void {}
}

/** Defensive 型 Bot — 重视防御 + 后期反击。 */
export class DefensiveBot implements BotController {
  readonly type = 'bot-defensive';

  activate(_house: House): void {}

  tick(_deltaTime: number): void {
    // 由外部 BaseBuilderAI / AttackAI 驱动
  }

  deactivate(): void {}
}
