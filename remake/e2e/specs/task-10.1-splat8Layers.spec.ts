import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 10.1 E2E Test — 8-Layer Splat Shader + Water Animation
 *
 * Verifies:
 * 1. enableTextureMode switches to ShaderMaterial with 8-layer support
 * 2. setCellLandType works for all 8 terrain types in texture mode
 * 3. waterTime uniform increments after enabling texture mode
 */

test.describe('Task 10.1 — 8-Layer Splat Shader', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('enableTextureMode switches to shader rendering', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.enableTextureMode?.();
    });

    const matName = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return (cnc.terrainMaterial as (() => string) | undefined)?.() ?? 'not-available';
    })) as string;

    expect(matName).toContain('ShaderMaterial');
  });

  test('all 8 terrain types can be set in texture mode without error', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.enableTextureMode?.();
    });

    const terrainTypes = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // Clear, Road, Water, Rock, Wall, Tiberium, Beach, Rough, River

    for (const type of terrainTypes) {
      await game.page.evaluate((t) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        const terrain = cnc.terrain as { setCellLandType: (x: number, y: number, type: number) => void };
        terrain.setCellLandType(t, 0, t);
      }, type);

      const landType = (await game.page.evaluate((t) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        const terrain = cnc.terrain as { getCellLandType: (x: number, y: number) => number };
        return terrain.getCellLandType(t, 0);
      }, type)) as number;

      expect(landType).toBe(type);
    }
  });

  test('waterTime increments after enabling texture mode', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.enableTextureMode?.();
    });

    // Wait a bit for animation frame to advance
    await game.page.waitForTimeout(100);

    const t1 = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return (cnc.waterTime as (() => number) | undefined)?.() ?? -1;
    })) as number;

    await game.page.waitForTimeout(200);

    const t2 = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return (cnc.waterTime as (() => number) | undefined)?.() ?? -1;
    })) as number;

    expect(t1).toBeGreaterThanOrEqual(0);
    expect(t2).toBeGreaterThan(t1);
  });
});
