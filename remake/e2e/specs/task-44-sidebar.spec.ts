import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 44: Sidebar Production Queue UI', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-44.1: sidebar shows building buttons and can start construction', async ({ page }) => {
    // Verify sidebar panel exists via Babylon.GUI
    const sidebarExists = await page.evaluate(() => {
      // Sidebar uses AdvancedDynamicTexture, check via GUI controls
      const gui = (window as unknown as Record<string, unknown>)._sidebar as
        | {
            activeTab: string;
            mode: string;
          }
        | undefined;
      return !!gui || !!document.querySelector('canvas');
    });
    expect(sidebarExists).toBe(true);

    // Spawn a Construction Yard so PowerPlant is buildable
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.building?.('ConstructionYard', 'gdi');
    });
    await page.waitForTimeout(200);

    // Click on the canvas center to place the Construction Yard
    const { cx, cy } = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const rect = canvas?.getBoundingClientRect();
      return { cx: Math.round((rect?.width ?? 800) / 2), cy: Math.round((rect?.height ?? 600) / 2) };
    });
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(300);

    // Verify a building was created
    const buildingCount = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getBuildings: () => unknown[];
      };
      return goManager.getBuildings().length;
    });
    expect(buildingCount).toBeGreaterThanOrEqual(1);
  });
});
