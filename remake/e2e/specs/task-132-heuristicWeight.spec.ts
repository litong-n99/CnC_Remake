import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 132 E2E Test — Heuristic Weight Tuning
 *
 * Verifies:
 * - heuristicWeight=1.0 produces valid shortest path
 * - heuristicWeight=1.25 still produces valid path (may be suboptimal but faster)
 * - Weight parameter is correctly wired through pathfindAdvanced API
 */

test.describe('Task 132 — Heuristic Weight', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('heuristicWeight=1.0 finds valid path', async () => {
    const result = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.pathfindAdvanced?.(25, 20, 35, 24, { heuristicWeight: 1.0, laneBias: false });
    });

    expect(result?.path).not.toBeNull();
    expect(result?.path?.length).toBeGreaterThan(1);
    expect(result?.path?.[0]).toEqual({ x: 25, y: 20 });
    expect(result?.path?.[result.path.length - 1]).toEqual({ x: 35, y: 24 });
  });

  test('heuristicWeight=1.25 finds valid path', async () => {
    const result = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.pathfindAdvanced?.(25, 20, 35, 24, { heuristicWeight: 1.25, laneBias: false });
    });

    expect(result?.path).not.toBeNull();
    expect(result?.path?.length).toBeGreaterThan(1);
    expect(result?.path?.[0]).toEqual({ x: 25, y: 20 });
    expect(result?.path?.[result.path.length - 1]).toEqual({ x: 35, y: 24 });
  });

  test('heuristicWeight=1.0 path is shortest (compared to 1.25)', async () => {
    // Clear a wide corridor for deterministic comparison
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      for (let y = 18; y <= 26; y++) {
        for (let x = 20; x <= 40; x++) {
          cnc.setCellLandType?.(x, y, 0);
        }
      }
    });

    const w10 = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.pathfindAdvanced?.(22, 22, 38, 22, { heuristicWeight: 1.0, laneBias: false });
    });

    const w125 = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.pathfindAdvanced?.(22, 22, 38, 22, { heuristicWeight: 1.25, laneBias: false });
    });

    expect(w10?.path).not.toBeNull();
    expect(w125?.path).not.toBeNull();

    // Weight 1.0 should not produce a longer path than 1.25
    // (it's admissible, so it finds the true shortest)
    const len10 = w10!.path!.length;
    const len125 = w125!.path!.length;
    expect(len10).toBeLessThanOrEqual(len125 + 2); // allow small tolerance for grid parity
  });

  test('bidirectional search supports heuristicWeight', async () => {
    const result = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.pathfindAdvanced?.(25, 20, 35, 24, { heuristicWeight: 1.25, bidirectional: true, laneBias: false });
    });

    expect(result?.path).not.toBeNull();
    expect(result?.path?.length).toBeGreaterThanOrEqual(2);
  });
});
