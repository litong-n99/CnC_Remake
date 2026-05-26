import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 128 E2E Test — CellInfoLayerPool
 *
 * Verifies:
 * - CellInfoLayerPool exists and exposes correct capacity
 * - Pool layers can be tracked (inUse / available)
 * - Pathfinder integrates the pool without errors
 */

test.describe('Task 128 — CellInfoLayerPool', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('cellInfoPoolStats returns correct pool structure', async () => {
    const stats = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.cellInfoPoolStats?.();
    });

    expect(stats).not.toBeNull();
    expect(stats?.size).toBe(4);
    expect(stats?.available).toBe(4);
    expect(stats?.inUse).toBe(0);
  });

  test('pathfinder still works after pool integration', async () => {
    const path = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.pathfind?.(25, 20, 35, 24) ?? null;
    });

    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toEqual({ x: 25, y: 20 });
    expect(path[path.length - 1]).toEqual({ x: 35, y: 24 });
  });

  test('bidirectional pathfinder works after pool integration', async () => {
    const path = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.pathfindBi?.(30, 20, 35, 20) ?? null;
    });

    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toEqual({ x: 30, y: 20 });
    expect(path[path.length - 1]).toEqual({ x: 35, y: 20 });
  });
});
