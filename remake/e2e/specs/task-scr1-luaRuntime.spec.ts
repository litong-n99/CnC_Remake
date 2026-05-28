import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-SCR1: Lua 运行时 (fengari)', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('scr1.1: LuaRuntime executes simple arithmetic', async ({ page }) => {
    const result = await page.evaluate(() => {
      const LuaRuntime = (window as unknown as Record<string, unknown>)._LuaRuntime as new () => {
        execute(code: string): { success: boolean; values: unknown[]; error?: string };
      };
      if (!LuaRuntime) return { ok: false, reason: 'missing LuaRuntime' };
      const rt = new LuaRuntime();
      const r = rt.execute('return 1 + 2 * 3');
      rt.dispose?.();
      return { ok: true, success: r.success, values: r.values };
    });
    expect(result.ok).toBe(true);
    expect(result.success).toBe(true);
    expect(result.values).toEqual([7]);
  });

  test('scr1.2: LuaRuntime sandbox disables io and os', async ({ page }) => {
    const result = await page.evaluate(() => {
      const LuaRuntime = (window as unknown as Record<string, unknown>)._LuaRuntime as new () => {
        execute(code: string): { success: boolean; values: unknown[]; error?: string };
      };
      const rt = new LuaRuntime();
      const r = rt.execute('return io == nil and os == nil and debug == nil');
      rt.dispose?.();
      return { ok: true, success: r.success, values: r.values };
    });
    expect(result.ok).toBe(true);
    expect(result.success).toBe(true);
    expect(result.values).toEqual([true]);
  });

  test('scr1.3: LuaRuntime returns Lua table as JS object', async ({ page }) => {
    const result = await page.evaluate(() => {
      const LuaRuntime = (window as unknown as Record<string, unknown>)._LuaRuntime as new () => {
        execute(code: string): { success: boolean; values: unknown[]; error?: string };
      };
      const rt = new LuaRuntime();
      const r = rt.execute('return {x = 10, y = 20}');
      rt.dispose?.();
      return { ok: true, success: r.success, table: r.values[0] as Record<string, number> };
    });
    expect(result.ok).toBe(true);
    expect(result.success).toBe(true);
    expect(result.table).toMatchObject({ x: 10, y: 20 });
  });

  test('scr1.4: LuaRuntime setGlobal/getGlobal round-trip', async ({ page }) => {
    const result = await page.evaluate(() => {
      const LuaRuntime = (window as unknown as Record<string, unknown>)._LuaRuntime as new () => {
        setGlobal(name: string, value: unknown): void;
        getGlobal(name: string): unknown;
        execute(code: string): { success: boolean; values: unknown[]; error?: string };
      };
      const rt = new LuaRuntime();
      rt.setGlobal('myValue', 42);
      const g = rt.getGlobal('myValue');
      const r = rt.execute('return myValue + 8');
      rt.dispose?.();
      return { ok: true, global: g, sum: r.values[0] };
    });
    expect(result.ok).toBe(true);
    expect(result.global).toBe(42);
    expect(result.sum).toBe(50);
  });

  test('scr1.5: LuaRuntime catches syntax errors gracefully', async ({ page }) => {
    const result = await page.evaluate(() => {
      const LuaRuntime = (window as unknown as Record<string, unknown>)._LuaRuntime as new () => {
        execute(code: string): { success: boolean; values: unknown[]; error?: string };
      };
      const rt = new LuaRuntime();
      const r = rt.execute('return 1 +');
      rt.dispose?.();
      return { ok: true, success: r.success, hasError: typeof r.error === 'string' && r.error.length > 0 };
    });
    expect(result.ok).toBe(true);
    expect(result.success).toBe(false);
    expect(result.hasError).toBe(true);
  });

  test('scr1.6: ScriptGlobal API is exposed', async ({ page }) => {
    const result = await page.evaluate(() => {
      const api = (window as unknown as Record<string, unknown>)._ScriptGlobal as {
        Media: { DisplayMessage: unknown; PlaySound: unknown };
        Map: { Size: unknown; CellType: unknown };
        Player: { GetPlayers: unknown; GetResources: unknown };
        Actor: { Create: unknown; Kill: unknown };
        Trigger: { OnTimer: unknown; OnKilled: unknown };
      };
      if (!api) return { ok: false, reason: 'missing ScriptGlobal' };
      return {
        ok: true,
        hasMedia: typeof api.Media.DisplayMessage === 'function',
        hasMap: typeof api.Map.Size === 'function',
        hasPlayer: typeof api.Player.GetPlayers === 'function',
        hasActor: typeof api.Actor.Create === 'function',
        hasTrigger: typeof api.Trigger.OnTimer === 'function',
      };
    });
    expect(result.ok).toBe(true);
    expect(result.hasMedia).toBe(true);
    expect(result.hasMap).toBe(true);
    expect(result.hasPlayer).toBe(true);
    expect(result.hasActor).toBe(true);
    expect(result.hasTrigger).toBe(true);
  });
});
