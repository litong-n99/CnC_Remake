import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 124 — SubCell Precise Position', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('SubCell enum has expected values', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SC = (window as unknown as Record<string, unknown>).SubCell as Record<string, number>;
      return {
        FullCell: SC.FullCell,
        TopLeft: SC.TopLeft,
        TopRight: SC.TopRight,
        Center: SC.Center,
        BottomLeft: SC.BottomLeft,
        BottomRight: SC.BottomRight,
        Invalid: SC.Invalid,
        Any: SC.Any,
      };
    });

    expect(result.FullCell).toBe(0);
    expect(result.TopLeft).toBe(1);
    expect(result.TopRight).toBe(2);
    expect(result.Center).toBe(3);
    expect(result.BottomLeft).toBe(4);
    expect(result.BottomRight).toBe(5);
    expect(result.Invalid).toBe(255);
    expect(result.Any).toBe(254);
  });

  test('ActorMap.getAvailableSubCell returns first free subcell', async ({ page }) => {
    const result = await page.evaluate(() => {
      const AM = (window as unknown as Record<string, unknown>).ActorMap as {
        getInstance: () => {
          occupy: (id: string, x: number, y: number, subCell?: number) => void;
          getAvailableSubCell: (x: number, y: number) => number;
          clear: () => void;
        };
      };
      const am = AM.getInstance();
      am.clear();
      // No occupants — should get TopLeft (1)
      const first = am.getAvailableSubCell(10, 10);
      // Occupy TopLeft
      am.occupy('inf1', 10, 10, 1);
      // Now should get TopRight (2)
      const second = am.getAvailableSubCell(10, 10);
      return { first, second };
    });

    expect(result.first).toBe(1); // TopLeft
    expect(result.second).toBe(2); // TopRight
  });

  test('getSubCellOffset returns correct offsets', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getOffset = (window as unknown as Record<string, unknown>)._getSubCellOffset as (sc: number) => {
        dx: number;
        dy: number;
      };
      const tl = getOffset(1); // TopLeft
      const br = getOffset(5); // BottomRight
      return { tl, br };
    });

    expect(result.tl.dx).toBeCloseTo(-0.3);
    expect(result.tl.dy).toBeCloseTo(-0.3);
    expect(result.br.dx).toBeCloseTo(0.3);
    expect(result.br.dy).toBeCloseTo(0.3);
  });
});
