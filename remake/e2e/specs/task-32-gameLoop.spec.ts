import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 32: GameLoop performance', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-32.1: GameLoop logic tick increments under 100-unit load', async ({ page }) => {
    // Spawn 100 units to stress the game loop
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      for (let i = 0; i < 100; i++) {
        const x = 10 + (i % 10) * 2;
        const y = 10 + Math.floor(i / 10) * 2;
        cnc.unit?.('MediumTank', 'gdi', x, y);
      }
    });

    // Wait for logic ticks to accumulate
    await page.waitForTimeout(500);

    // Verify logic tick count is advancing
    const tickCount1 = await page.evaluate(() => {
      const gl = (window as unknown as Record<string, unknown>)._gameLoop as { getLogicTickCount: () => number };
      return gl.getLogicTickCount();
    });

    await page.waitForTimeout(300);

    const tickCount2 = await page.evaluate(() => {
      const gl = (window as unknown as Record<string, unknown>)._gameLoop as { getLogicTickCount: () => number };
      return gl.getLogicTickCount();
    });

    // Logic ticks should have advanced (at least 1 tick per 16ms at 60 FPS)
    expect(tickCount2).toBeGreaterThan(tickCount1);

    // Verify all 100 units exist and are tracked
    const unitCount = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as { getUnits: () => unknown[] };
      return goManager.getUnits().length;
    });
    expect(unitCount).toBe(100);
  });
});
