import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 10.2 E2E Test — Splat Map Gradient Transition
 *
 * Verifies:
 * 1. Boundary cells between different terrain types have blended splat weights
 * 2. Non-boundary cells remain pure (single channel = 255)
 * 3. Hard-edge types (Rock, Wall) do not blend with neighbors
 */

test.describe('Task 10.2 — Splat Map Gradient Transition', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('boundary cell between grass and water has blended splat weights', async () => {
    // First set up a clean 7x7 grass field to avoid edge effects from default map
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as { setCellLandType: (x: number, y: number, type: number) => void };
      for (let yy = 0; yy < 10; yy++) {
        for (let xx = 0; xx < 10; xx++) {
          terrain.setCellLandType(xx, yy, 0); // Clear (grass)
        }
      }
    });

    // Now enable texture mode after all cells are grass
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.enableTextureMode?.();
    });

    // Place water patch
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as { setCellLandType: (x: number, y: number, type: number) => void };
      terrain.setCellLandType(5, 5, 2); // Water
      terrain.setCellLandType(6, 5, 2); // Water
    });

    // Debug: log all splat pixels in the region
    const debugData = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const result: Array<{ x: number; y: number; splat1: number[]; landType: number }> = [];
      for (let xx = 2; xx <= 7; xx++) {
        const pixel = cnc.splatPixel?.(xx, 5) as { splat1: number[]; landType: number } | undefined;
        if (pixel) {
          result.push({ x: xx, y: 5, splat1: pixel.splat1, landType: pixel.landType });
        }
      }
      return result;
    })) as Array<{ x: number; y: number; splat1: number[]; landType: number }>;

    console.log('Debug splat data:', JSON.stringify(debugData));

    // Find pure grass cell far from boundary
    const grassCell = debugData.find((d) => d.x === 2);
    expect(grassCell).toBeDefined();
    expect(grassCell!.splat1[0]).toBe(255);

    // Find boundary cell (grass adjacent to water)
    const boundaryCell = debugData.find((d) => d.x === 4);
    expect(boundaryCell).toBeDefined();
    // Boundary should have mixed weights
    const hasMixed = boundaryCell!.splat1.some((v: number) => v > 0 && v < 255);
    expect(
      hasMixed,
      `boundary cell (4,5) should have mixed splat weights, got ${JSON.stringify(boundaryCell!.splat1)}`
    ).toBe(true);

    // Water cells (5,5) and (6,5) are both boundary because the water patch
    // is only 2 cells wide.  Dominant terrain should still be >70%.
    const waterBoundary = debugData.find((d) => d.x === 5);
    expect(waterBoundary).toBeDefined();
    expect(waterBoundary!.splat1[2]).toBeGreaterThan(180); // >70% water
  });

  test('hard-edge types (Rock) do not blend with neighbors', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as { setCellLandType: (x: number, y: number, type: number) => void };
      for (let yy = 8; yy < 13; yy++) {
        for (let xx = 8; xx < 15; xx++) {
          terrain.setCellLandType(xx, yy, 0); // grass
        }
      }
      cnc.enableTextureMode?.();
      terrain.setCellLandType(11, 10, 3); // Rock
    });

    // Rock cell should remain pure even at boundary
    const rockCell = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.splatPixel?.(11, 10) as { splat1: [number, number, number, number] } | undefined;
    })) as { splat1: [number, number, number, number] } | undefined;

    expect(rockCell).toBeDefined();
    expect(rockCell!.splat1[3]).toBe(255);
    expect(rockCell!.splat1[0]).toBe(0);
  });
});
