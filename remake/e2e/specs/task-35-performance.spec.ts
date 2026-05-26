import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 35: Performance Monitor', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-35.1: PerformanceMonitor reports FPS and logic ticks', async ({ page }) => {
    // Let it collect data for a moment
    await page.waitForTimeout(1200);

    const snapshot = await page.evaluate(() => {
      const pm = (window as unknown as Record<string, unknown>)._performanceMonitor as
        | { getSnapshot: () => { fps: number; frameTimeMs: number; logicTickCount: number } }
        | undefined;
      return pm?.getSnapshot() ?? null;
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot!.fps).toBeGreaterThanOrEqual(0);
    expect(snapshot!.frameTimeMs).toBeGreaterThan(0);
    expect(snapshot!.logicTickCount).toBeGreaterThanOrEqual(0);
  });

  test('task-35.2: getFps returns a non-negative number', async ({ page }) => {
    await page.waitForTimeout(1200);

    const fps = await page.evaluate(() => {
      const pm = (window as unknown as Record<string, unknown>)._performanceMonitor as
        | { getFps: () => number }
        | undefined;
      return pm?.getFps() ?? -1;
    });

    expect(fps).toBeGreaterThanOrEqual(0);
  });
});
