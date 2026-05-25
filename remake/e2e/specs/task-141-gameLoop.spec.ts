import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 141: GameLoop logic/render frame separation', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('page loads and GameConsole is installed', async ({ page }) => {
    const cnc = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      return typeof w.cnc === 'object' && w.cnc !== null;
    });
    expect(cnc).toBe(true);
  });

  test('gameLoopState returns running loop with correct interval', async ({ page }) => {
    const state = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.gameLoopState?.() as {
        running?: boolean;
        logicIntervalMs?: number;
        error?: string;
      };
    });
    expect(state.error).toBeUndefined();
    expect(state.running).toBe(true);
    expect(state.logicIntervalMs).toBeGreaterThan(15); // ~16.67ms @ 60 FPS
    expect(state.logicIntervalMs).toBeLessThan(20);
  });

  test('gameLoopState logicTickCount increments over time', async ({ page }) => {
    const state1 = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.gameLoopState?.() as { logicTickCount?: number };
    });
    const count1 = state1.logicTickCount ?? 0;

    // Wait for at least one logic frame (40ms) plus margin
    await page.waitForTimeout(100);

    const state2 = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.gameLoopState?.() as { logicTickCount?: number };
    });
    const count2 = state2.logicTickCount ?? 0;

    expect(count2).toBeGreaterThan(count1);
  });

  test('gameLoopStep manually advances one logic frame', async ({ page }) => {
    const stepResult = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.gameLoopStep?.() as { beforeTick?: number; afterTick?: number };
    });

    expect(stepResult.afterTick).toBe(stepResult.beforeTick! + 1);
  });

  test('gameLoopState logicTickProgress is between 0 and 1', async ({ page }) => {
    const state = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.gameLoopState?.() as { logicTickProgress?: number };
    });
    expect(state.logicTickProgress).toBeGreaterThanOrEqual(0);
    expect(state.logicTickProgress).toBeLessThanOrEqual(1);
  });
});
