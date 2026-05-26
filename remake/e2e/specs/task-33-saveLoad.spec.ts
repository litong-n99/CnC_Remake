import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 33: Save / Load System', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-33.1: save serializes game state to JSON', async ({ page }) => {
    // Spawn a unit
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    await page.waitForTimeout(200);

    // Peek save data
    const saveData = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.peekSave?.() as { version?: string; units?: unknown[]; buildings?: unknown[] } | undefined;
    });

    expect(saveData).toBeDefined();
    expect(saveData?.version).toBe('1.0');
    expect(saveData?.units?.length).toBe(1);
  });
});
