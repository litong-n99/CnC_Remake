import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 51: Sell / Repair / Power Tools', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  async function placeBuilding(page: import('@playwright/test').Page, type: string, house = 'gdi'): Promise<string> {
    await page.evaluate(
      ({ t, h }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        cnc.building?.(t, h);
      },
      { t: type, h: house }
    );
    await page.waitForTimeout(200);

    const { cx, cy } = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const rect = canvas?.getBoundingClientRect();
      return { cx: Math.round((rect?.width ?? 800) / 2), cy: Math.round((rect?.height ?? 600) / 2) };
    });
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(300);

    const buildingId = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getBuildings: () => Array<{ id: string }>;
      };
      return goManager.getBuildings()[0]?.id;
    });
    if (!buildingId) throw new Error('Building was not placed');
    return buildingId;
  }

  test('task-51.1: sell building returns refund and removes it', async ({ page }) => {
    const buildingId = await placeBuilding(page, 'PowerPlant', 'gdi');

    const initialCredits = await page.evaluate(() => {
      const houseManager = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (t: number) => { credits: number } | undefined;
      };
      return houseManager.getHouse(8)?.credits ?? 0;
    });

    const sellResult = await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.sell?.(id) as { success: boolean; refund?: number; message: string } | undefined;
      },
      { id: buildingId }
    );

    expect(sellResult?.success).toBe(true);
    expect(sellResult?.refund).toBeGreaterThan(0);

    const finalCredits = await page.evaluate(() => {
      const houseManager = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (t: number) => { credits: number } | undefined;
      };
      return houseManager.getHouse(8)?.credits ?? 0;
    });
    expect(finalCredits).toBe(initialCredits + (sellResult?.refund ?? 0));

    const remaining = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getBuildings: () => unknown[];
      };
      return goManager.getBuildings().length;
    });
    expect(remaining).toBe(0);
  });

  test('task-51.2: repair building restores health at cost', async ({ page }) => {
    const buildingId = await placeBuilding(page, 'PowerPlant', 'gdi');

    // Damage the building directly
    await page.evaluate(
      ({ id }) => {
        const manager = (window as unknown as Record<string, unknown>)._goManager as {
          get: (i: string) => { logic: { currentHealth: number; maxHealth: number } } | undefined;
        };
        const b = manager.get(id);
        if (b) b.logic.currentHealth = 1;
      },
      { id: buildingId }
    );

    // Give house enough credits for repair
    await page.evaluate(() => {
      const houseManager = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (t: number) => { credits: number; addCredits: (n: number) => void } | undefined;
      };
      const house = houseManager.getHouse(8);
      if (house) house.addCredits(10000);
    });

    const repairResult = await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.repair?.(id) as { success: boolean; cost?: number; message: string } | undefined;
      },
      { id: buildingId }
    );

    expect(repairResult?.success).toBe(true);
    expect(repairResult?.cost).toBeGreaterThan(0);

    const healthAfter = await page.evaluate(
      ({ id }) => {
        const manager = (window as unknown as Record<string, unknown>)._goManager as {
          get: (i: string) => { logic: { currentHealth: number; maxHealth: number } } | undefined;
        };
        return manager.get(id)?.logic.currentHealth ?? -1;
      },
      { id: buildingId }
    );

    const maxHealth = await page.evaluate(
      ({ id }) => {
        const manager = (window as unknown as Record<string, unknown>)._goManager as {
          get: (i: string) => { logic: { currentHealth: number; maxHealth: number } } | undefined;
        };
        return manager.get(id)?.logic.maxHealth ?? -1;
      },
      { id: buildingId }
    );

    expect(healthAfter).toBe(maxHealth);
  });
});
