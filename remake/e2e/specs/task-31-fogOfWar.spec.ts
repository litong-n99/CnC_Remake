import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 31: Fog of War', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-31.1: unit reveals surrounding cells as Visible', async ({ page }) => {
    // Spawn a single GDI tank at (30, 30)
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    // Wait for logic tick to update fog
    await page.waitForTimeout(200);

    // Query fog state at unit location and far away
    const visAtUnit = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getVisibility: (x: number, y: number) => number;
      };
      return fog.getVisibility(30, 30);
    });

    const visFar = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getVisibility: (x: number, y: number) => number;
      };
      return fog.getVisibility(5, 5);
    });

    // 2 = CellVisibility.Visible
    expect(visAtUnit).toBe(2);
    // 0 = CellVisibility.Shroud
    expect(visFar).toBe(0);

    // Verify a cell just inside sight radius (radius=10) is visible
    const visEdge = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getVisibility: (x: number, y: number) => number;
      };
      return fog.getVisibility(39, 30);
    });
    expect(visEdge).toBe(2);

    // Verify a cell just outside sight radius is still shrouded
    const visBeyond = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getVisibility: (x: number, y: number) => number;
      };
      return fog.getVisibility(41, 30);
    });
    expect(visBeyond).toBe(0);
  });

  test('task-31.2: old location becomes Fog after unit moves away', async ({ page }) => {
    // Spawn a single GDI tank at (30, 30)
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    await page.waitForTimeout(200);

    // Verify initial location is visible
    const visInitial = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getVisibility: (x: number, y: number) => number;
      };
      return fog.getVisibility(30, 30);
    });
    expect(visInitial).toBe(2);

    // Move the tank to a nearby location (outside original sight radius)
    const unitId = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string }>;
      };
      const units = goManager.getUnits();
      return units[0]?.id;
    });
    expect(unitId).toBeDefined();

    const gp = new GamePage(page);
    // Move far enough that (30,30) is outside sight radius (10)
    const targetX = 42;
    const targetY = 30;
    const moved = await gp.moveUnit(unitId!, targetX, targetY);
    expect(moved).toBe(true);

    // Wait for the unit to reach the target (ensuring it's far enough from origin)
    await gp.waitForUnitAt(unitId!, targetX, targetY, 15000);
    // Give a few logic ticks for fog to update after arrival
    await page.waitForTimeout(300);

    // Old location should now be Fog (1), not Visible (2) or Shroud (0)
    const visOld = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getVisibility: (x: number, y: number) => number;
      };
      return fog.getVisibility(30, 30);
    });
    // 1 = CellVisibility.Fog
    expect(visOld).toBe(1);

    // New location should be Visible
    const visNew = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getVisibility: (x: number, y: number) => number;
      };
      return fog.getVisibility(42, 30);
    });
    expect(visNew).toBe(2);
  });

  test('task-31.3: enemy outside sight radius stays in Shroud', async ({ page }) => {
    // Spawn a GDI tank at (30, 30) with sight radius 10
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    await page.waitForTimeout(200);

    // Spawn a Nod tank far outside GDI sight radius (distance > 20)
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('LightTank', 'nod', 5, 5);
    });
    await page.waitForTimeout(200);

    // Nod location should still be Shroud (0) because no GDI unit can see it
    const visNod = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getVisibility: (x: number, y: number) => number;
      };
      return fog.getVisibility(5, 5);
    });
    expect(visNod).toBe(0);

    // GDI location should be Visible
    const visGdi = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getVisibility: (x: number, y: number) => number;
      };
      return fog.getVisibility(30, 30);
    });
    expect(visGdi).toBe(2);
  });

  test('task-31.4: texture pixel aligns with unit cell coordinate (Y-flip fix)', async ({ page }) => {
    // Vite dev server may reuse an old instance with stale module cache.
    // Retry page load until the new getPixelColor method is available.
    let hasMethod = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.goto('/', { force: true, waitUntil: 'networkidle' });
      await page.waitForFunction(() => {
        const cnc = (window as unknown as Record<string, unknown>).cnc;
        return typeof cnc === 'object' && cnc !== null;
      });
      await page.waitForTimeout(500);

      hasMethod = await page.evaluate(() => {
        const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
          getPixelColor?: (x: number, y: number) => { r: number; g: number; b: number; a: number } | null;
        };
        return typeof fog.getPixelColor === 'function';
      });

      if (hasMethod) break;
      await page.waitForTimeout(1000);
    }
    expect(hasMethod).toBe(true);

    // Spawn a GDI tank at (30, 30) — 非对称位置，容易检测 Y 轴翻转
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    await page.waitForTimeout(300);

    // Unit cell should be transparent (Visible)
    const pixelAtUnit = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getPixelColor: (x: number, y: number) => { r: number; g: number; b: number; a: number } | null;
      };
      return fog.getPixelColor(30, 30);
    });
    expect(pixelAtUnit).not.toBeNull();
    expect(pixelAtUnit!.a).toBe(0); // Visible = fully transparent

    // Far away cell should be opaque black (Shroud)
    const pixelFar = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getPixelColor: (x: number, y: number) => { r: number; g: number; b: number; a: number } | null;
      };
      return fog.getPixelColor(5, 5);
    });
    expect(pixelFar).not.toBeNull();
    expect(pixelFar!.a).toBe(255); // Shroud = fully opaque

    // Verify another non-symmetric location (10, 50) to ensure general correctness
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 10, 50);
    });
    await page.waitForTimeout(300);

    const pixelAtSecondUnit = await page.evaluate(() => {
      const fog = (window as unknown as Record<string, unknown>)._fogOfWar as {
        getPixelColor: (x: number, y: number) => { r: number; g: number; b: number; a: number } | null;
      };
      return fog.getPixelColor(10, 50);
    });
    expect(pixelAtSecondUnit).not.toBeNull();
    expect(pixelAtSecondUnit!.a).toBe(0);
  });
});
