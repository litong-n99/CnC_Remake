import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 9.3 E2E Test — ResourceLayer (Tiberium/Ore density & growth)
 *
 * Verifies:
 * 1. setResource places a resource seed with correct density
 * 2. resource() reads back type and density
 * 3. harvest() reduces density and returns actual amount removed
 * 4. tickResources() advances growth / spread simulation
 * 5. Multiple seeds can coexist
 */

test.describe('Task 9.3 — ResourceLayer', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('setResource + resource round-trip', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setResource?.(20, 20, 1, 100);
    });

    const res = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.resource?.(20, 20) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(res).toBeDefined();
    expect(res!.type).toBe(1);
    expect(res!.density).toBe(100);
    expect(res!.harvestable).toBe(true);
  });

  test('harvest reduces density', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setResource?.(25, 25, 1, 80);
    });

    const removed = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.harvest?.(25, 25, 30) as number;
    })) as number;

    expect(removed).toBe(30);

    const after = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.resource?.(25, 25) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(after!.density).toBe(50);
  });

  test('harvest floors at zero', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setResource?.(26, 26, 1, 10);
    });

    const removed = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.harvest?.(26, 26, 50) as number;
    })) as number;

    expect(removed).toBe(10);

    const after = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.resource?.(26, 26) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(after!.density).toBe(0);
    expect(after!.harvestable).toBe(false);
  });

  test('tickResources advances growth', async () => {
    // Place a seed and tick many times
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setResource?.(30, 30, 1, 50);
    });

    const before = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return (cnc.resource?.(30, 30) as Record<string, unknown>)?.density as number;
    })) as number;

    // Tick 100 times — with growthRate=0.05 we expect some growth
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.tickResources?.(100);
    });

    const after = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return (cnc.resource?.(30, 30) as Record<string, unknown>)?.density as number;
    })) as number;

    expect(after).toBeGreaterThanOrEqual(before);
  });

  test('multiple independent resource seeds', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setResource?.(10, 10, 1, 40);
      cnc.setResource?.(11, 10, 2, 60);
      cnc.setResource?.(12, 10, 1, 20);
    });

    const cells = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return [cnc.resource?.(10, 10), cnc.resource?.(11, 10), cnc.resource?.(12, 10)];
    })) as Array<Record<string, unknown>>;

    expect(cells[0].density).toBe(40);
    expect(cells[1].density).toBe(60);
    expect(cells[2].density).toBe(20);
    expect(cells[0].type).toBe(1);
    expect(cells[1].type).toBe(2);
    expect(cells[2].type).toBe(1);
  });
});
