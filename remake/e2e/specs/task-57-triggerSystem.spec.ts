import { test, expect } from '@playwright/test';

test.describe('Task 57 — Trigger System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('task-57.1: TriggerSystem class exists and exposes registration API', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TS = (window as unknown as Record<string, unknown>)._TriggerSystem as new () => {
        afterDelay(ms: number, callback: () => void): string;
        onKilled(actorId: string, callback: () => void): string;
        onEnteredFootprint(cells: Array<{ x: number; y: number }>, callback: () => void): string;
        onCash(player: number, amount: number, callback: () => void): string;
        getCount(): number;
        clear(): void;
      };
      if (!TS) return { ok: false, reason: '_TriggerSystem not exposed' };
      const ts = new TS();
      const id = ts.afterDelay(1000, () => {});
      return {
        ok: true,
        hasId: typeof id === 'string' && id.startsWith('trigger-'),
        count: ts.getCount(),
      };
    });
    expect(result.ok).toBe(true);
    expect(result.hasId).toBe(true);
    expect(result.count).toBe(1);
  });

  test('task-57.2: AfterDelay trigger fires after specified time', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const TS = (window as unknown as Record<string, unknown>)._TriggerSystem as new () => {
        afterDelay(ms: number, callback: () => void): string;
        tick(): void;
        getCount(): number;
      };
      const ts = new TS();
      let fired = false;
      ts.afterDelay(100, () => {
        fired = true;
      });
      // Wait for the delay to pass
      await new Promise((r) => setTimeout(r, 200));
      ts.tick();
      return { fired, count: ts.getCount() };
    });
    expect(result.fired).toBe(true);
    expect(result.count).toBe(0); // fired triggers are cleaned up
  });

  test('task-57.3: OnEnteredFootprint detects unit entry', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const TS = (window as unknown as Record<string, unknown>)._TriggerSystem as new () => {
        onEnteredFootprint(cells: Array<{ x: number; y: number }>, callback: (actor: unknown) => void): string;
        tick(): void;
        getCount(): number;
      };
      const ts = new TS();
      let entered: unknown = null;
      ts.onEnteredFootprint([{ x: 30, y: 30 }], (actor) => {
        entered = actor;
      });
      // Create a unit inside the footprint using console command
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc?.unit?.('MediumTank', 'gdi', 30, 30);
      // Allow unit to register in GameObjectManager
      await new Promise((r) => setTimeout(r, 300));
      ts.tick();
      return { entered: entered !== null, count: ts.getCount() };
    });
    expect(result.entered).toBe(true);
  });

  test('task-57.4: OnKilled trigger fires when unit is destroyed', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const TS = (window as unknown as Record<string, unknown>)._TriggerSystem as new () => {
        onKilled(actorId: string, callback: () => void): string;
        tick(): void;
        getCount(): number;
      };
      const ts = new TS();
      // Create a unit
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const unitId = cnc?.unit?.('MediumTank', 'gdi', 35, 35) as string | undefined;
      if (!unitId) return { ok: false, reason: 'unit creation failed' };
      await new Promise((r) => setTimeout(r, 200));
      let killed = false;
      ts.onKilled(unitId, () => {
        killed = true;
      });
      // Kill the unit via console
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        get: (id: string) => { health: number } | undefined;
      };
      const unit = goManager.get(unitId);
      if (unit) unit.health = 0;
      ts.tick();
      return { killed, count: ts.getCount() };
    });
    expect(result.killed).toBe(true);
    expect(result.count).toBe(0);
  });

  test('task-57.5: OnCash trigger fires when player reaches target credits', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TS = (window as unknown as Record<string, unknown>)._TriggerSystem as new () => {
        onCash(player: number, amount: number, callback: () => void): string;
        tick(): void;
        getCount(): number;
      };
      const ts = new TS();
      const PG = (window as unknown as Record<string, unknown>)._PlayerGlobal as new () => {
        getCredits(player: number): number;
        addCredits(player: number, amount: number): void;
      };
      const player = new PG();
      // Ensure GDI has low credits first
      const gdiCredits = player.getCredits(8);
      let fired = false;
      ts.onCash(8, gdiCredits + 100, () => {
        fired = true;
      });
      // Not enough yet
      ts.tick();
      const before = fired;
      // Add enough credits
      player.addCredits(8, 200);
      ts.tick();
      return { before, after: fired };
    });
    expect(result.before).toBe(false);
    expect(result.after).toBe(true);
  });

  test('task-57.6: TriggerGlobal wraps TriggerSystem for script usage', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TS = (window as unknown as Record<string, unknown>)._TriggerSystem as new () => {
        afterDelay(ms: number, callback: () => void): string;
        getCount(): number;
      };
      const TG = (window as unknown as Record<string, unknown>)._TriggerGlobal as new (system: unknown) => {
        afterDelay(ms: number, callback: () => void): string;
      };
      if (!TG) return { ok: false, reason: 'TriggerGlobal not exposed' };
      const ts = new TS();
      const tg = new TG(ts);
      const id = tg.afterDelay(50, () => {});
      return { ok: true, hasId: typeof id === 'string', count: ts.getCount() };
    });
    expect(result.ok).toBe(true);
    expect(result.hasId).toBe(true);
    expect(result.count).toBe(1);
  });
});
