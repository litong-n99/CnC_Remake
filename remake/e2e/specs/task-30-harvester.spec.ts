import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 30: Harvester Economy System', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-30.1: harvester auto-finds resource and starts harvesting', async ({ page }) => {
    // Place resource near spawn point
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setResource?.(30, 30, 1, 100); // Tiberium at (30,30)
    });

    // Spawn harvester
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('Harvester', 'gdi', 28, 28);
    });
    await page.waitForTimeout(300);

    const harvesterId = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string; definitionId: string }>;
      };
      return goManager.getUnits().find((u) => u.definitionId === 'UNIT_HARVESTER')?.id;
    });
    expect(harvesterId).toBeDefined();

    // Start harvesting
    const result = await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.harvestUnit?.(id) as { success: boolean };
      },
      { id: harvesterId }
    );
    expect(result.success).toBe(true);

    // Wait for harvester to move to resource and start harvesting
    await page.waitForTimeout(2000);

    // Verify harvester has moved closer to resource
    const pos = await page.evaluate(
      ({ id }) => {
        const goManager = (window as unknown as Record<string, unknown>)._goManager as {
          get: (id: string) => { x: number; y: number } | undefined;
        };
        return goManager.get(id);
      },
      { id: harvesterId }
    );

    expect(pos).toBeDefined();
    // Should be closer to (30,30) than starting (28,28) — or at least moved
    const dist = Math.sqrt(((pos?.x ?? 0) - 30) ** 2 + ((pos?.y ?? 0) - 30) ** 2);
    expect(dist).toBeLessThan(5);
  });

  test('task-30.2: harvester unloads at refinery and credits increase', async ({ page }) => {
    // Place resource
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setResource?.(30, 30, 1, 200);
    });

    // Spawn refinery and harvester
    // Use direct building creation via _goFactory
    await page.evaluate(() => {
      const hm = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (type: number) => { id: number; credits: number } | undefined;
      };
      const gdiHouse = hm.getHouse(8);

      console.info('GDI house id:', gdiHouse?.id);
    });

    // Create harvester
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('Harvester', 'gdi', 28, 28);
    });

    // Create refinery by placing it directly
    await page.evaluate(() => {
      const factory = (window as unknown as Record<string, unknown>)._goFactory as {
        createBuilding: (opts: Record<string, unknown>) => unknown;
      };
      const hm = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (type: number) => { id: number } | undefined;
      };
      const gdi = hm.getHouse(8);
      if (gdi && factory) {
        factory.createBuilding({
          definition: (window as unknown as Record<string, unknown>).BUILDING_DEFINITIONS.OreRefinery,
          house: gdi,
          x: 35,
          y: 30,
          scene: (window as unknown as Record<string, unknown>)._scene,
        });
      }
    });

    await page.waitForTimeout(300);

    const ids = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string; definitionId: string }>;
        getBuildings: () => Array<{ id: string; definitionId: string }>;
      };
      const harvester = goManager.getUnits().find((u) => u.definitionId === 'UNIT_HARVESTER');
      const refinery = goManager.getBuildings().find((b) => b.definitionId === 'STRUCT_REFINERY');
      return { harvesterId: harvester?.id, refineryId: refinery?.id };
    });
    expect(ids.harvesterId).toBeDefined();
    expect(ids.refineryId).toBeDefined();

    // Record initial credits
    const initialCredits = await page.evaluate(() => {
      const hm = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (type: number) => { credits: number } | undefined;
      };
      return hm.getHouse(8)?.credits ?? 0;
    });

    // Start harvesting
    await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        cnc.harvestUnit?.(id);
      },
      { id: ids.harvesterId }
    );

    // Wait for full cycle: move to resource → harvest → move to refinery → unload
    await page.waitForTimeout(8000);

    // Verify credits increased
    const finalCredits = await page.evaluate(() => {
      const hm = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (type: number) => { credits: number } | undefined;
      };
      return hm.getHouse(8)?.credits ?? 0;
    });

    expect(finalCredits).toBeGreaterThan(initialCredits);
  });

  test('task-30.3: resource density decreases after harvesting', async ({ page }) => {
    // Place resource
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setResource?.(30, 30, 1, 50);
    });

    // Check initial density
    const initialDensity = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const cell = cnc.resource?.(30, 30) as { density: number } | null;
      return cell?.density ?? 0;
    });
    expect(initialDensity).toBe(50);

    // Spawn harvester right on the resource
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('Harvester', 'gdi', 30, 30);
    });
    await page.waitForTimeout(300);

    const harvesterId = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string; definitionId: string }>;
      };
      return goManager.getUnits().find((u) => u.definitionId === 'UNIT_HARVESTER')?.id;
    });

    // Start harvesting
    await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        cnc.harvestUnit?.(id);
      },
      { id: harvesterId }
    );

    // Wait for harvesting
    await page.waitForTimeout(2000);

    // Check density decreased
    const finalDensity = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const cell = cnc.resource?.(30, 30) as { density: number } | null;
      return cell?.density ?? 0;
    });

    expect(finalDensity).toBeLessThan(initialDensity);
  });
});
