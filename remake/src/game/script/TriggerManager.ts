/**
 * TriggerManager — Task-SCR2: 触发器系统
 *
 * 管理战役脚本中的事件触发器，支持：
 *   - OnTimer:      计时器触发
 *   - OnKilled:     单位死亡触发
 *   - OnDestroyed:  建筑摧毁触发
 *   - OnEnteredFootprint: 区域进入触发
 *
 * 与 LuaRuntime 集成：ScriptGlobal.Trigger 注册的事件
 * 由 TriggerManager 统一管理和分发。
 *
 * OpenRA 对标: `OpenRA.Game/Scripting/Trigger.cs`
 */

export type TriggerCallback = () => void;

interface TimerTrigger {
  readonly intervalMs: number;
  remainingMs: number;
  readonly callback: TriggerCallback;
  /** 是否只触发一次（false = 循环）。 */
  readonly once: boolean;
  disposed: boolean;
}

interface FootprintTrigger {
  readonly centerX: number;
  readonly centerY: number;
  readonly radius: number;
  readonly callback: TriggerCallback;
  /** 每个 actor 只触发一次。 */
  triggeredBy: Set<string>;
}

export class TriggerManager {
  private timers: TimerTrigger[] = [];
  private killedMap = new Map<string, TriggerCallback[]>();
  private destroyedMap = new Map<string, TriggerCallback[]>();
  private footprints: FootprintTrigger[] = [];

  /** 注册计时器触发器（毫秒）。 */
  onTimer(intervalMs: number, callback: TriggerCallback, once = false): void {
    this.timers.push({ intervalMs, remainingMs: intervalMs, callback, once, disposed: false });
  }

  /** 注册单位死亡触发器。 */
  onKilled(actorId: string, callback: TriggerCallback): void {
    const list = this.killedMap.get(actorId) ?? [];
    list.push(callback);
    this.killedMap.set(actorId, list);
  }

  /** 注册建筑摧毁触发器。 */
  onDestroyed(actorId: string, callback: TriggerCallback): void {
    const list = this.destroyedMap.get(actorId) ?? [];
    list.push(callback);
    this.destroyedMap.set(actorId, list);
  }

  /** 注册区域进入触发器（圆形区域，格子坐标）。 */
  onEnteredFootprint(centerX: number, centerY: number, radius: number, callback: TriggerCallback): void {
    this.footprints.push({ centerX, centerY, radius, callback, triggeredBy: new Set() });
  }

  /** 每帧更新计时器（由 World.tick 调用）。 */
  tick(deltaTime: number): void {
    for (const t of this.timers) {
      if (t.disposed) continue;
      t.remainingMs -= deltaTime;
      if (t.remainingMs <= 0) {
        if (t.once) {
          t.callback();
          t.disposed = true;
        } else {
          while (t.remainingMs <= 0) {
            t.callback();
            t.remainingMs += t.intervalMs;
          }
        }
      }
    }
    // 清理已废弃的计时器
    this.timers = this.timers.filter((t) => !t.disposed);
  }

  /** 通知单位死亡。 */
  notifyKilled(actorId: string): void {
    const callbacks = this.killedMap.get(actorId);
    if (callbacks) {
      for (const cb of callbacks) cb();
      this.killedMap.delete(actorId);
    }
  }

  /** 通知建筑摧毁。 */
  notifyDestroyed(actorId: string): void {
    const callbacks = this.destroyedMap.get(actorId);
    if (callbacks) {
      for (const cb of callbacks) cb();
      this.destroyedMap.delete(actorId);
    }
  }

  /** 检查 actor 是否进入某个 footprint 区域。 */
  checkFootprints(actorId: string, x: number, y: number): void {
    for (const fp of this.footprints) {
      if (fp.triggeredBy.has(actorId)) continue;
      const dx = x - fp.centerX;
      const dy = y - fp.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= fp.radius) {
        fp.triggeredBy.add(actorId);
        fp.callback();
      }
    }
  }

  /** 获取当前活跃触发器数量（调试用）。 */
  getStats(): { timers: number; killed: number; destroyed: number; footprints: number } {
    return {
      timers: this.timers.length,
      killed: this.killedMap.size,
      destroyed: this.destroyedMap.size,
      footprints: this.footprints.length,
    };
  }

  /** 清空所有触发器。 */
  clear(): void {
    this.timers = [];
    this.killedMap.clear();
    this.destroyedMap.clear();
    this.footprints = [];
  }
}
