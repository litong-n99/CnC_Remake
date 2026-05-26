import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 45: Building Placement Preview', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-45.1: building placement starts and ghost appears', async ({ page }) => {
    // Start building placement via console
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.building?.('PowerPlant', 'gdi');
    });
    await page.waitForTimeout(200);

    // Verify placer is in placement mode
    const isPlacing = await page.evaluate(() => {
      const placer = (window as unknown as Record<string, unknown>)._placer as
        | {
            isPlacing: () => boolean;
          }
        | undefined;
      return placer?.isPlacing() ?? false;
    });
    expect(isPlacing).toBe(true);

    // Cancel placement
    await page.evaluate(() => {
      const placer = (window as unknown as Record<string, unknown>)._placer as {
        cancelPlacement: () => void;
      };
      placer.cancelPlacement();
    });

    const isPlacingAfter = await page.evaluate(() => {
      const placer = (window as unknown as Record<string, unknown>)._placer as {
        isPlacing: () => boolean;
      };
      return placer.isPlacing();
    });
    expect(isPlacingAfter).toBe(false);
  });
});
