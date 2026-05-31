/**
 * 触发器系统 — Task 57
 * Source: docs/(ARCHIVED)TASK_BREAKDOWN.md — Task 57
 * OpenRA 对标: Trigger.OnEnteredFootprint, Trigger.AfterDelay, Trigger.OnKilled
 *
 * 核心设计：
 *   - 触发器 = 条件 + 回调，每逻辑帧检查条件是否满足
 *   - 支持一次性触发（默认）和重复触发（需手动重新注册）
   - 所有回调在脚本上下文中执行，因此可以调用 ScriptGlobals API
 *   - 触发器 ID 由系统分配，便于后续注销
 */

import { HouseType } from '../house/House';
import { HouseManager } from '../house/HouseManager';
import { GameObjectManager } from '../objects/GameObjectManager';
import type { CPos } from './ScriptGlobals';

/** 触发器类型枚举。 */
export enum TriggerType {
  EnteredFootprint = 'EnteredFootprint',
  ExitedFootprint = 'ExitedFootprint',
  AfterDelay = 'AfterDelay',
  OnKilled = 'OnKilled',
  OnDestroyed = 'OnDestroyed',
  OnCash = 'OnCash',
}

/** 触发器基础接口。 */
interface Trigger {
  readonly id: string;
  readonly type: TriggerType;
  readonly callback: (...args: unknown[]) => void;
  fired: boolean;
}

/** 区域触发器 — 单位进入/离开指定格子集合。 */
interface FootprintTrigger extends Trigger {
  readonly cells: ReadonlySet<string>; // "x,y" 格式
  readonly type: TriggerType.EnteredFootprint | TriggerType.ExitedFootprint;
  /** 已在此区域内的对象 ID 集合（用于检测进入/离开）。 */
  occupants: Set<string>;
}

/** 延迟触发器 — N 毫秒后触发。 */
interface DelayTrigger extends Trigger {
  readonly type: TriggerType.AfterDelay;
  readonly targetTime: number;
}

/** 对象死亡触发器。 */
interface KillTrigger extends Trigger {
  readonly type: TriggerType.OnKilled | TriggerType.OnDestroyed;
  readonly targetId: string;
}

/** 资金触发器。 */
interface CashTrigger extends Trigger {
  readonly type: TriggerType.OnCash;
  readonly player: HouseType;
  readonly targetAmount: number;
  /** 是否已触发过（一次性）。 */
  fired: boolean;
}

type AnyTrigger = FootprintTrigger | DelayTrigger | KillTrigger | CashTrigger;

/**
 * 触发器系统主类。
 *
 * 需在 GameLoop 的逻辑帧回调中调用 `tick()` 以检查所有触发器条件。
 */
export class TriggerSystem {
  private triggers = new Map<string, AnyTrigger>();
  private nextId = 1;

  // ── 注册 API ──

  /**
   * 当任意单位进入指定格子区域时触发。
   * @param cells    — 格子坐标数组
   * @param callback — 回调函数，参数为进入的对象信息 `{ id, type, owner, x, y }`
   * @returns 触发器 ID（可用于注销）
   */
  onEnteredFootprint(
    cells: CPos[],
    callback: (actor: { id: string; type: string; owner: HouseType; x: number; y: number }) => void
  ): string {
    const id = this.allocId();
    const keySet = new Set(cells.map((c) => `${c.x},${c.y}`));
    const trigger: FootprintTrigger = {
      id,
      type: TriggerType.EnteredFootprint,
      cells: keySet,
      callback: callback as (...args: unknown[]) => void,
      fired: false,
      occupants: new Set(),
    };
    this.triggers.set(id, trigger);
    return id;
  }

  /**
   * 当任意单位离开指定格子区域时触发。
   */
  onExitedFootprint(
    cells: CPos[],
    callback: (actor: { id: string; type: string; owner: HouseType; x: number; y: number }) => void
  ): string {
    const id = this.allocId();
    const keySet = new Set(cells.map((c) => `${c.x},${c.y}`));
    const trigger: FootprintTrigger = {
      id,
      type: TriggerType.ExitedFootprint,
      cells: keySet,
      callback: callback as (...args: unknown[]) => void,
      fired: false,
      occupants: new Set(),
    };
    this.triggers.set(id, trigger);
    return id;
  }

  /**
   * N 毫秒后触发一次性回调。
   * @param ms       — 延迟毫秒数
   * @param callback — 回调函数
   * @returns 触发器 ID
   */
  afterDelay(ms: number, callback: () => void): string {
    const id = this.allocId();
    const trigger: DelayTrigger = {
      id,
      type: TriggerType.AfterDelay,
      targetTime: performance.now() + ms,
      callback: callback as (...args: unknown[]) => void,
      fired: false,
    };
    this.triggers.set(id, trigger);
    return id;
  }

  /**
   * 指定对象被摧毁（死亡）时触发。
   * @param actorId  — 目标对象 ID
   * @param callback — 回调函数
   * @returns 触发器 ID
   */
  onKilled(actorId: string, callback: () => void): string {
    const id = this.allocId();
    const trigger: KillTrigger = {
      id,
      type: TriggerType.OnKilled,
      targetId: actorId,
      callback: callback as (...args: unknown[]) => void,
      fired: false,
    };
    this.triggers.set(id, trigger);
    return id;
  }

  /**
   * 指定建筑被摧毁时触发。
   *（当前与 onKilled 共用实现，区别仅在语义）。
   */
  onDestroyed(actorId: string, callback: () => void): string {
    const id = this.allocId();
    const trigger: KillTrigger = {
      id,
      type: TriggerType.OnDestroyed,
      targetId: actorId,
      callback: callback as (...args: unknown[]) => void,
      fired: false,
    };
    this.triggers.set(id, trigger);
    return id;
  }

  /**
   * 指定阵营资金达到目标值时触发。
   * @param player — 目标阵营
   * @param amount — 目标资金（>= 此值触发）
   * @param callback — 回调函数
   * @returns 触发器 ID
   */
  onCash(player: HouseType, amount: number, callback: () => void): string {
    const id = this.allocId();
    const trigger: CashTrigger = {
      id,
      type: TriggerType.OnCash,
      player,
      targetAmount: amount,
      callback: callback as (...args: unknown[]) => void,
      fired: false,
    };
    this.triggers.set(id, trigger);
    return id;
  }

  // ── 管理 API ──

  /** 注销指定触发器。 */
  remove(triggerId: string): boolean {
    return this.triggers.delete(triggerId);
  }

  /** 清空所有触发器。 */
  clear(): void {
    this.triggers.clear();
  }

  /** 获取当前活跃触发器数量。 */
  getCount(): number {
    return this.triggers.size;
  }

  /** 列出所有活跃触发器（调试用）。 */
  list(): Array<{ id: string; type: TriggerType }> {
    return Array.from(this.triggers.values()).map((t) => ({ id: t.id, type: t.type }));
  }

  // ── Tick 检查 ──

  /**
   * 每逻辑帧调用，检查所有触发器条件。
   * 应在 GameLoop 的 logic tick 中执行。
   */
  tick(): void {
    const now = performance.now();
    const manager = GameObjectManager.getInstance();

    for (const trigger of this.triggers.values()) {
      if (trigger.fired) continue;

      switch (trigger.type) {
        case TriggerType.AfterDelay: {
          const dt = trigger as DelayTrigger;
          if (now >= dt.targetTime) {
            dt.fired = true;
            dt.callback();
          }
          break;
        }

        case TriggerType.OnKilled:
        case TriggerType.OnDestroyed: {
          const kt = trigger as KillTrigger;
          const obj = manager.get(kt.targetId);
          if (!obj || !obj.isAlive()) {
            kt.fired = true;
            kt.callback();
          }
          break;
        }

        case TriggerType.OnCash: {
          const ct = trigger as CashTrigger;
          const house = HouseManager.getInstance().getHouse(ct.player);
          if (house && house.credits >= ct.targetAmount) {
            ct.fired = true;
            ct.callback();
          }
          break;
        }

        case TriggerType.EnteredFootprint:
        case TriggerType.ExitedFootprint: {
          this.checkFootprintTrigger(trigger as FootprintTrigger, manager);
          break;
        }

        default:
          break;
      }
    }

    // 清理已触发的一次性触发器
    for (const [id, trigger] of this.triggers) {
      if (trigger.fired) {
        this.triggers.delete(id);
      }
    }
  }

  private checkFootprintTrigger(trigger: FootprintTrigger, manager: GameObjectManager): void {
    const currentOccupants = new Set<string>();

    for (const obj of manager.getAll()) {
      if (!obj.isAlive()) continue;
      const key = `${Math.round(obj.x)},${Math.round(obj.y)}`;
      if (trigger.cells.has(key)) {
        currentOccupants.add(obj.id);
      }
    }

    if (trigger.type === TriggerType.EnteredFootprint) {
      for (const id of currentOccupants) {
        if (!trigger.occupants.has(id)) {
          // 新进入
          const obj = manager.get(id);
          if (obj) {
            trigger.callback({
              id: obj.id,
              type: obj.type,
              owner: obj.house.id,
              x: obj.x,
              y: obj.y,
            });
          }
        }
      }
    } else if (trigger.type === TriggerType.ExitedFootprint) {
      for (const id of trigger.occupants) {
        if (!currentOccupants.has(id)) {
          // 已离开
          const obj = manager.get(id);
          if (obj) {
            trigger.callback({
              id: obj.id,
              type: obj.type,
              owner: obj.house.id,
              x: obj.x,
              y: obj.y,
            });
          }
        }
      }
    }

    trigger.occupants = currentOccupants;
  }

  private allocId(): string {
    return `trigger-${this.nextId++}`;
  }
}

// ── 脚本暴露入口 ──

/**
 * TriggerGlobal — 供脚本直接调用的触发器注册接口。
 *
 * 脚本中用法：
 *   Trigger.AfterDelay(5000, function() { UI.ShowMessage("5秒到了"); });
 *   Trigger.OnEnteredFootprint([{x:10,y:10}], function(a) { ... });
 */
export class TriggerGlobal {
  constructor(private readonly system: TriggerSystem) {}

  onEnteredFootprint(
    cells: CPos[],
    callback: (actor: { id: string; type: string; owner: HouseType; x: number; y: number }) => void
  ): string {
    return this.system.onEnteredFootprint(cells, callback);
  }

  onExitedFootprint(
    cells: CPos[],
    callback: (actor: { id: string; type: string; owner: HouseType; x: number; y: number }) => void
  ): string {
    return this.system.onExitedFootprint(cells, callback);
  }

  afterDelay(ms: number, callback: () => void): string {
    return this.system.afterDelay(ms, callback);
  }

  onKilled(actorId: string, callback: () => void): string {
    return this.system.onKilled(actorId, callback);
  }

  onDestroyed(actorId: string, callback: () => void): string {
    return this.system.onDestroyed(actorId, callback);
  }

  onCash(player: HouseType, amount: number, callback: () => void): string {
    return this.system.onCash(player, amount, callback);
  }
}
