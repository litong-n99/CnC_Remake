import { test, expect } from '@playwright/test';

test.describe('Task 56 — Script Global API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('task-56.1: MapGlobal exposes map size and bounds checking', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MG = (window as unknown as Record<string, unknown>)._MapGlobal as new (
        w: number,
        h: number
      ) => {
        getSize(): { width: number; height: number };
        isInMap(cpos: { x: number; y: number }): boolean;
      };
      if (!MG) return { ok: false, reason: 'MapGlobal not exposed' };
      const map = new MG(64, 64);
      return {
        ok: true,
        size: map.getSize(),
        inMap: map.isInMap({ x: 10, y: 20 }),
        outOfMap: map.isInMap({ x: 100, y: 100 }),
      };
    });
    expect(result.ok).toBe(true);
    expect(result.size).toEqual({ width: 64, height: 64 });
    expect(result.inMap).toBe(true);
    expect(result.outOfMap).toBe(false);
  });

  test('task-56.2: PlayerGlobal reads credits and building count', async ({ page }) => {
    const result = await page.evaluate(() => {
      const PG = (window as unknown as Record<string, unknown>)._PlayerGlobal as new () => {
        getCredits(player: number): number;
        getBuildingCount(player: number): number;
      };
      if (!PG) return { ok: false, reason: 'PlayerGlobal not exposed' };
      const player = new PG();
      // HouseType.GDI = 8, HouseType.Nod = 9
      return {
        ok: true,
        gdiCredits: player.getCredits(8),
        nodCredits: player.getCredits(9),
      };
    });
    expect(result.ok).toBe(true);
    expect(typeof result.gdiCredits).toBe('number');
    expect(typeof result.nodCredits).toBe('number');
  });

  test('task-56.3: ActorGlobal find and getActorsOf work', async ({ page }) => {
    const result = await page.evaluate(() => {
      const AG = (window as unknown as Record<string, unknown>)._ActorGlobal as new () => {
        find(id: string): { id: string; type: string } | null;
        getActorsOf(player: number): string[];
      };
      if (!AG) return { ok: false, reason: 'ActorGlobal not exposed' };
      const actor = new AG();
      return {
        ok: true,
        gdiActors: actor.getActorsOf(8).length,
        nodActors: actor.getActorsOf(9).length,
      };
    });
    expect(result.ok).toBe(true);
    expect(typeof result.gdiActors).toBe('number');
    expect(typeof result.nodActors).toBe('number');
  });

  test('task-56.4: UIGlobal showMessage and getMessages', async ({ page }) => {
    const result = await page.evaluate(() => {
      const UG = (window as unknown as Record<string, unknown>)._UIGlobal as new () => {
        showMessage(text: string): void;
        getMessages(): string[];
        clearMessages(): void;
      };
      if (!UG) return { ok: false, reason: 'UIGlobal not exposed' };
      const ui = new UG();
      ui.showMessage('Test message 1');
      ui.showMessage('Test message 2');
      const messages = ui.getMessages();
      ui.clearMessages();
      return {
        ok: true,
        messages,
        afterClear: ui.getMessages().length,
      };
    });
    expect(result.ok).toBe(true);
    expect(result.messages).toEqual(['Test message 1', 'Test message 2']);
    expect(result.afterClear).toBe(0);
  });

  test('task-56.5: MediaGlobal and PlayerGlobal addCredits work', async ({ page }) => {
    const result = await page.evaluate(() => {
      const PG = (window as unknown as Record<string, unknown>)._PlayerGlobal as new () => {
        getCredits(player: number): number;
        addCredits(player: number, amount: number): void;
      };
      const player = new PG();
      const before = player.getCredits(8);
      player.addCredits(8, 500);
      const after = player.getCredits(8);
      return { before, after, diff: after - before };
    });
    expect(result.diff).toBe(500);
  });
});
