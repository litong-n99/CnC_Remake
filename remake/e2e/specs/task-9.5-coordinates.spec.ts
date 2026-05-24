import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 9.5 E2E Test — Multi-layer Coordinate System (CPos / MPos / PPos / WPos)
 *
 * Verifies:
 * 1. CPos → WPos conversion on rectangular grid
 * 2. WPos → CPos round-trip (bidirectional)
 * 3. CPos → MPos conversion on rectangular grid (identity)
 * 4. Sub-cell offsets return distinct world positions
 * 5. MapGrid exposes correct grid type and WDist constants
 */

test.describe('Task 9.5 — Coordinates', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('cposToWPos converts cell (0,0) correctly on rectangular grid', async () => {
    const result = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.cposToWPos?.(0, 0) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(result).toBeDefined();
    const wpos = result!.wpos as { x: number; y: number; z: number };
    expect(wpos.x).toBe(512); // 1024 / 2
    expect(wpos.y).toBe(0);
    expect(wpos.z).toBe(512);
  });

  test('cposToWPos converts cell (10,20) correctly on rectangular grid', async () => {
    const result = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.cposToWPos?.(10, 20) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(result).toBeDefined();
    const wpos = result!.wpos as { x: number; y: number; z: number };
    // cell (10,20) centre = (10*1024 + 512, 0, 20*1024 + 512)
    expect(wpos.x).toBe(10752);
    expect(wpos.y).toBe(0);
    expect(wpos.z).toBe(20992);

    const babylon = result!.babylon as { x: number; y: number; z: number };
    // Babylon units: WDist / 1024 * cellSize(1)
    expect(babylon.x).toBeCloseTo(10.5, 5);
    expect(babylon.z).toBeCloseTo(20.5, 5);
  });

  test('wposToCPos round-trips from cposToWPos', async () => {
    const result = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      // Forward: cell (5, 7) → WPos
      const forward = cnc.cposToWPos?.(5, 7) as { wpos: { x: number; y: number; z: number } } | undefined;
      if (!forward) return null;
      // Backward: WPos → cell
      const backward = cnc.wposToCPos?.(forward.wpos.x, forward.wpos.y, forward.wpos.z) as
        | { cpos: { x: number; y: number } }
        | undefined;
      return backward;
    })) as { cpos: { x: number; y: number } } | null;

    expect(result).not.toBeNull();
    expect(result!.cpos.x).toBe(5);
    expect(result!.cpos.y).toBe(7);
  });

  test('mpos is identity on rectangular grid', async () => {
    const result = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.mpos?.(12, 34) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(result).toBeDefined();
    expect(result!.type).toBe('Rectangular');
    const mpos = result!.mpos as { u: number; v: number };
    expect(mpos.u).toBe(12);
    expect(mpos.v).toBe(34);
  });

  test('subCell offsets return distinct world positions', async () => {
    const result = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const positions: Array<{ x: number; z: number }> = [];
      for (let i = 0; i < 5; i++) {
        const sc = cnc.subCell?.(10, 10, i) as { babylon: { x: number; z: number } } | undefined;
        if (sc) positions.push({ x: sc.babylon.x, z: sc.babylon.z });
      }
      return positions;
    })) as Array<{ x: number; z: number }>;

    expect(result.length).toBeGreaterThanOrEqual(3);
    // Sub-cell 0 (FullCell) and 3 (Center) should be identical
    expect(result[0].x).toBeCloseTo(result[3].x, 5);
    expect(result[0].z).toBeCloseTo(result[3].z, 5);

    // Sub-cell 1 (TopLeft) should be different from FullCell
    expect(result[1].x).not.toBeCloseTo(result[0].x, 1);
  });
});
