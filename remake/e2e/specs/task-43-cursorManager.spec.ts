import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 43: CursorManager', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-43.1: cursor type changes via CursorManager', async ({ page }) => {
    const type1 = await page.evaluate(() => {
      const cm = (window as unknown as Record<string, unknown>)._cursorManager as {
        set: (t: string) => void;
        get: () => string;
      };
      cm.set('attack');
      return cm.get();
    });
    expect(type1).toBe('attack');

    const type2 = await page.evaluate(() => {
      const cm = (window as unknown as Record<string, unknown>)._cursorManager as {
        set: (t: string) => void;
        get: () => string;
        reset: () => void;
      };
      cm.reset();
      return cm.get();
    });
    expect(type2).toBe('default');
  });
});
