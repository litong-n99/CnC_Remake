import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 10.3 E2E Test — Splat Update Batching
 *
 * Verifies:
 * 1. Multiple setCellLandType calls in the same frame are coalesced into one GPU upload
 * 2. After a frame tick, pending updates are flushed and splat data is correct
 */

test.describe('Task 10.3 — Splat Update Batching', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('100 rapid setCellLandType calls are batched into one pending queue', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as { setCellLandType: (x: number, y: number, type: number) => void };
      // Pre-fill grass
      for (let yy = 0; yy < 20; yy++) {
        for (let xx = 0; xx < 20; xx++) {
          terrain.setCellLandType(xx, yy, 0);
        }
      }
      cnc.enableTextureMode?.();
    });

    // Perform 100 rapid changes synchronously in the browser
    const pendingBefore = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as { setCellLandType: (x: number, y: number, type: number) => void };
      for (let i = 0; i < 100; i++) {
        terrain.setCellLandType(i % 10, 5 + Math.floor(i / 10), i % 3 === 0 ? 2 : 0);
      }
      return (cnc.pendingSplatUpdates as (() => number) | undefined)?.() ?? -1;
    })) as number;

    // Should have batched updates (not zero, because we haven't flushed yet)
    expect(pendingBefore).toBeGreaterThan(0);

    // Wait for a render frame to flush
    await game.page.waitForTimeout(100);

    const pendingAfter = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return (cnc.pendingSplatUpdates as (() => number) | undefined)?.() ?? -1;
    })) as number;

    // After frame tick, queue should be flushed
    expect(pendingAfter).toBe(0);

    // Verify a known cell has correct splat data after flush
    const pixel = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.splatPixel?.(0, 5) as { splat1: [number, number, number, number] } | undefined;
    })) as { splat1: [number, number, number, number] } | undefined;

    expect(pixel).toBeDefined();
    // (0,5) was set to Water (type 2) → B channel of splat1
    expect(pixel!.splat1[2]).toBeGreaterThan(0);
  });
});
