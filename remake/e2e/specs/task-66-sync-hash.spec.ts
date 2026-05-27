import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 66 — SyncHash Desync Detection', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('SyncHash computes identical hash for identical state', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SH = (window as unknown as Record<string, unknown>).SyncHash as new (opts?: {
        intervalFrames?: number;
      }) => { compute: (frame: number, seed?: number) => string };

      const sh1 = new SH();
      const h1 = sh1.compute(30, 42);
      const h2 = sh1.compute(30, 42);
      return { h1, h2, match: h1 === h2 };
    });

    expect(result.match).toBe(true);
    expect(result.h1).toMatch(/^[0-9a-f]{8}$/);
  });

  test('SyncHash computes different hash for different seed', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SH = (window as unknown as Record<string, unknown>).SyncHash as new (opts?: {
        intervalFrames?: number;
      }) => { compute: (frame: number, seed?: number) => string };

      const sh = new SH();
      const h1 = sh.compute(30, 42);
      const h2 = sh.compute(30, 99);
      return { diff: h1 !== h2 };
    });

    expect(result.diff).toBe(true);
  });

  test('SyncHash.shouldCompute returns true on interval frames', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SH = (window as unknown as Record<string, unknown>).SyncHash as new (opts?: {
        intervalFrames?: number;
      }) => {
        shouldCompute: (frame: number) => boolean;
        compute: (frame: number) => string;
      };

      const sh = new SH({ intervalFrames: 30 });
      return {
        frame29: sh.shouldCompute(29),
        frame30: sh.shouldCompute(30),
        frame31: sh.shouldCompute(31),
        frame60: sh.shouldCompute(60),
      };
    });

    expect(result.frame29).toBe(false);
    expect(result.frame30).toBe(true);
    expect(result.frame31).toBe(false);
    expect(result.frame60).toBe(true);
  });
});
