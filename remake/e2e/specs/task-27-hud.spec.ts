import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 27: HUD overlay (resources, unit info, minimap)', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-27.1: HUD elements are present', async ({ page }) => {
    const resourceBar = await page.locator('#cnc-resource-bar').count();
    const unitInfo = await page.locator('#cnc-unit-info').count();
    const minimap = await page.locator('#cnc-minimap').count();

    expect(resourceBar).toBe(1);
    expect(unitInfo).toBe(1);
    expect(minimap).toBe(1);
  });

  test('task-27.2: selecting a unit shows info in bottom panel', async ({ page }) => {
    // Spawn a MediumTank
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    await page.waitForTimeout(300);

    // Select the unit directly via SelectionManager
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const sm = w._selectionManager as { select: (unit: unknown, scene: unknown) => void };
      const goManager = w._goManager as { getUnits: () => unknown[] };
      const scene = w._scene as unknown;
      const units = goManager.getUnits();
      if (units.length > 0) {
        sm.select(units[0], scene);
      }
    });
    await page.waitForTimeout(200);

    // Verify unit info panel is visible and contains expected info
    const unitInfo = page.locator('#cnc-unit-info');
    await expect(unitInfo).toBeVisible();

    const text = await unitInfo.textContent();
    expect(text).toContain('Medium Tank');
    expect(text).toContain('HP:');
    expect(text).toContain('Speed:');
    expect(text).toContain('Armor:');
  });

  test('task-27.3: resource bar shows credits and power', async ({ page }) => {
    const resourceBar = page.locator('#cnc-resource-bar');
    const text = await resourceBar.textContent();

    expect(text).toContain('Credits:');
    expect(text).toContain('Power:');
  });

  test('task-27.4: clearing selection hides unit info panel', async ({ page }) => {
    // Spawn and select a unit
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const sm = w._selectionManager as { select: (unit: unknown, scene: unknown) => void };
      const goManager = w._goManager as { getUnits: () => unknown[] };
      const scene = w._scene as unknown;
      const units = goManager.getUnits();
      if (units.length > 0) {
        sm.select(units[0], scene);
      }
    });
    await page.waitForTimeout(200);

    await expect(page.locator('#cnc-unit-info')).toBeVisible();

    // Clear selection
    await page.evaluate(() => {
      const sm = (window as unknown as Record<string, unknown>)._selectionManager as { clear: () => void };
      sm.clear();
    });
    await page.waitForTimeout(200);

    await expect(page.locator('#cnc-unit-info')).toBeHidden();
  });
});
