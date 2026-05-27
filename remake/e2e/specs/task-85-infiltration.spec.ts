import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 85 — Infiltration System', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('infiltration system reports zero infiltrated buildings on init', async () => {
    const stats = await game.infiltrationStats();
    expect(stats.infiltratedCount).toBe(0);
  });

  test('spy infiltrating enemy refinery steals credits', async ({ page }) => {
    // Atomically place building, spawn spy, and trigger infiltration check
    // to avoid the game loop auto-triggering infiltration between calls.
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      cnc.placeBuildingDirect('OreRefinery', 'nod', 20, 20);
      cnc.money('nod', 2000);
      cnc.unit('Spy', 'gdi', 21, 21);
      return cnc.infiltrationCheck() as { checked: number; results: Array<{ type: string; amount?: number }> };
    });

    expect(result.results.length).toBeGreaterThanOrEqual(1);
    expect(result.results[0].type).toBe('credits');
    expect(typeof result.results[0].amount).toBe('number');
    expect((result.results[0].amount ?? 0) > 0).toBe(true);

    const stats = await game.infiltrationStats();
    expect(stats.infiltratedCount).toBe(1);
  });

  test('spy infiltrating enemy war factory unlocks stolen tech', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      cnc.placeBuildingDirect('WarFactory', 'nod', 25, 25);
      cnc.unit('Spy', 'gdi', 26, 26);
      return cnc.infiltrationCheck() as { checked: number; results: Array<{ type: string; amount?: number }> };
    });

    expect(result.results.some((r) => r.type === 'tech')).toBe(true);

    // Grant stolen tech to GDI
    const granted = await game.grantStolenTech('gdi');
    expect(granted.granted).toBe(true);
  });

  test('same building cannot be infiltrated twice', async ({ page }) => {
    // First infiltration (atomic)
    const r1 = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      cnc.placeBuildingDirect('OreRefinery', 'nod', 20, 20);
      cnc.money('nod', 2000);
      cnc.unit('Spy', 'gdi', 21, 21);
      return cnc.infiltrationCheck() as { checked: number; results: Array<{ type: string; amount?: number }> };
    });
    expect(r1.results.length).toBe(1);

    // Spawn second spy at same location and try again (atomic)
    const r2 = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      cnc.unit('Spy', 'gdi', 21, 21);
      return cnc.infiltrationCheck() as { checked: number; results: Array<{ type: string; amount?: number }> };
    });

    // Should not infiltrate the same building again (no new results)
    expect(r2.results.length).toBe(0);
  });
});
