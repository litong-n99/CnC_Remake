import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-SCR2: 触发器系统 (TriggerManager)', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('scr2.1: OnTimer triggers after interval', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TM = (window as unknown as Record<string, unknown>)._TriggerManager as new () => {
        onTimer(ms: number, cb: () => void, once?: boolean): void;
        tick(dt: number): void;
      };
      if (!TM) return { ok: false, reason: 'missing TriggerManager' };
      const tm = new TM();
      let triggered = 0;
      tm.onTimer(100, () => triggered++, true);
      tm.tick(50);
      const t1 = triggered;
      tm.tick(60);
      const t2 = triggered;
      tm.tick(200);
      const t3 = triggered;
      return { ok: true, t1, t2, t3 };
    });
    expect(result.ok).toBe(true);
    expect(result.t1).toBe(0);
    expect(result.t2).toBe(1);
    expect(result.t3).toBe(1); // once=true，不再触发
  });

  test('scr2.2: OnTimer recurring triggers multiple times', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TM = (window as unknown as Record<string, unknown>)._TriggerManager as new () => {
        onTimer(ms: number, cb: () => void, once?: boolean): void;
        tick(dt: number): void;
      };
      const tm = new TM();
      let triggered = 0;
      tm.onTimer(100, () => triggered++, false);
      tm.tick(250);
      return { ok: true, triggered };
    });
    expect(result.ok).toBe(true);
    expect(result.triggered).toBe(2);
  });

  test('scr2.3: OnKilled triggers and cleans up', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TM = (window as unknown as Record<string, unknown>)._TriggerManager as new () => {
        onKilled(id: string, cb: () => void): void;
        notifyKilled(id: string): void;
        getStats(): { killed: number };
      };
      const tm = new TM();
      let killed = false;
      tm.onKilled('unit-1', () => {
        killed = true;
      });
      tm.notifyKilled('unit-1');
      const afterKill = killed;
      const stats = tm.getStats();
      return { ok: true, afterKill, killedCount: stats.killed };
    });
    expect(result.ok).toBe(true);
    expect(result.afterKill).toBe(true);
    expect(result.killedCount).toBe(0); // cleaned up
  });

  test('scr2.4: OnDestroyed triggers', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TM = (window as unknown as Record<string, unknown>)._TriggerManager as new () => {
        onDestroyed(id: string, cb: () => void): void;
        notifyDestroyed(id: string): void;
      };
      const tm = new TM();
      let destroyed = false;
      tm.onDestroyed('bldg-1', () => {
        destroyed = true;
      });
      tm.notifyDestroyed('bldg-1');
      return { ok: true, destroyed };
    });
    expect(result.ok).toBe(true);
    expect(result.destroyed).toBe(true);
  });

  test('scr2.5: OnEnteredFootprint triggers when actor enters radius', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TM = (window as unknown as Record<string, unknown>)._TriggerManager as new () => {
        onEnteredFootprint(x: number, y: number, r: number, cb: () => void): void;
        checkFootprints(id: string, x: number, y: number): void;
      };
      const tm = new TM();
      let entered = 0;
      tm.onEnteredFootprint(10, 10, 3, () => entered++);
      tm.checkFootprints('actor-a', 8, 8); // dist ≈ 2.8 <= 3
      const t1 = entered;
      tm.checkFootprints('actor-a', 8, 8); // 同一 actor 不应再触发
      const t2 = entered;
      tm.checkFootprints('actor-b', 20, 20); // dist ≈ 14 > 3
      const t3 = entered;
      tm.checkFootprints('actor-c', 10, 10); // dist = 0 <= 3
      const t4 = entered;
      return { ok: true, t1, t2, t3, t4 };
    });
    expect(result.ok).toBe(true);
    expect(result.t1).toBe(1);
    expect(result.t2).toBe(1); // 同一 actor 只触发一次
    expect(result.t3).toBe(1); // 在范围外
    expect(result.t4).toBe(2); // 新 actor 进入
  });

  test('scr2.6: clear removes all triggers', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TM = (window as unknown as Record<string, unknown>)._TriggerManager as new () => {
        onTimer(ms: number, cb: () => void): void;
        onKilled(id: string, cb: () => void): void;
        clear(): void;
        getStats(): { timers: number; killed: number };
      };
      const tm = new TM();
      tm.onTimer(100, () => {}, false);
      tm.onKilled('u1', () => {});
      tm.clear();
      const stats = tm.getStats();
      return { ok: true, timers: stats.timers, killed: stats.killed };
    });
    expect(result.ok).toBe(true);
    expect(result.timers).toBe(0);
    expect(result.killed).toBe(0);
  });
});
