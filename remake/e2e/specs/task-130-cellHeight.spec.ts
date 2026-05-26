import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 130 E2E Test — Cell Height System
 *
 * Verifies:
 * - setCellHeight / getCellHeight round-trip
 * - Cliff impassability (|height diff| > 1) in pathfinding
 * - Ramp passability (|height diff| == 1) in pathfinding
 */

test.describe('Task 130 — Cell Height System', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('task-130.1: setCellHeight and getCellHeight round-trip', async () => {
    const result = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as {
        setCellHeight: (x: number, y: number, h: number) => void;
        getCellHeight: (x: number, y: number) => number;
      };

      terrain.setCellHeight(10, 10, 3);
      terrain.setCellHeight(20, 20, 5);

      return {
        h1: terrain.getCellHeight(10, 10),
        h2: terrain.getCellHeight(20, 20),
        h3: terrain.getCellHeight(0, 0), // default
      };
    });

    expect(result.h1).toBe(3);
    expect(result.h2).toBe(5);
    expect(result.h3).toBe(0);
  });

  test('task-130.2: cliff (|height diff| > 1) blocks pathfinding', async () => {
    const result = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as {
        setCellHeight: (x: number, y: number, h: number) => void;
        setCellLandType: (x: number, y: number, type: number) => void;
      };

      // Create a clear corridor from (25,20) to (35,20)
      for (let y = 18; y <= 22; y++) {
        for (let x = 24; x <= 36; x++) {
          terrain.setCellLandType(x, y, 0); // Clear
          terrain.setCellHeight(x, y, 0);
        }
      }

      // Build a cliff wall at x=30: height jumps from 0 to 3 (diff=3 > 1)
      for (let y = 18; y <= 22; y++) {
        terrain.setCellHeight(30, y, 3);
      }

      const pathfind = cnc.pathfind as
        | ((sx: number, sy: number, ex: number, ey: number) => Array<{ x: number; y: number }> | null)
        | undefined;

      // Try to path through the cliff — should fail or go around
      const path = pathfind?.(25, 20, 35, 20) ?? null;

      return {
        hasPath: path !== null && path.length > 0,
        pathLength: path?.length ?? 0,
        lastX: path?.[path.length - 1]?.x ?? -1,
        lastY: path?.[path.length - 1]?.y ?? -1,
        goesAround: path?.some((p) => p.y !== 20) ?? false,
      };
    });

    // Path should either fail (null) or go around the cliff (not straight through)
    if (result.hasPath) {
      expect(result.lastX).toBe(35);
      expect(result.lastY).toBe(20);
      // Should go around (y != 20 at some point) rather than through the cliff
      expect(result.goesAround).toBe(true);
    }
  });

  test('task-130.3: ramp (|height diff| == 1) remains passable', async () => {
    const result = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as {
        setCellHeight: (x: number, y: number, h: number) => void;
        setCellLandType: (x: number, y: number, type: number) => void;
      };

      // Create a clear corridor from (25,20) to (35,20)
      for (let y = 18; y <= 22; y++) {
        for (let x = 24; x <= 36; x++) {
          terrain.setCellLandType(x, y, 0); // Clear
          terrain.setCellHeight(x, y, 0);
        }
      }

      // Build a gentle ramp at x=30: height 0 → 1 (diff=1, passable)
      for (let y = 18; y <= 22; y++) {
        terrain.setCellHeight(30, y, 1);
      }
      // Continue at height 1 after the ramp
      for (let y = 18; y <= 22; y++) {
        for (let x = 31; x <= 36; x++) {
          terrain.setCellHeight(x, y, 1);
        }
      }

      const pathfind = cnc.pathfind as
        | ((sx: number, sy: number, ex: number, ey: number) => Array<{ x: number; y: number }> | null)
        | undefined;

      const path = pathfind?.(25, 20, 35, 20) ?? null;

      return {
        hasPath: path !== null && path.length > 0,
        pathLength: path?.length ?? 0,
        lastX: path?.[path.length - 1]?.x ?? -1,
        lastY: path?.[path.length - 1]?.y ?? -1,
        passesThroughRamp: path?.some((p) => p.x === 30 && p.y === 20) ?? false,
      };
    });

    expect(result.hasPath).toBe(true);
    expect(result.lastX).toBe(35);
    expect(result.lastY).toBe(20);
    expect(result.passesThroughRamp).toBe(true);
  });
});
