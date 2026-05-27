import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 87 — Bridge System', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('bridge starts intact and can be destroyed', async ({ page }) => {
    const result = await page.evaluate(() => {
      const terrain = (window as unknown as Record<string, unknown>)._terrainGrid as {
        getCellLandType: (x: number, y: number) => number;
        setCellLandType: (x: number, y: number, type: number) => void;
      };
      const BS = (window as unknown as Record<string, unknown>).BridgeSystem as new (terrain: unknown) => {
        addBridge: (
          id: string,
          segments: Array<{ x: number; y: number }>,
          maxHealth?: number
        ) => {
          health: number;
          isDestroyed: boolean;
        };
        damageBridge: (id: string, amount: number) => void;
        getBridge: (id: string) => { isDestroyed: boolean; health: number } | undefined;
      };

      // Set initial land type for bridge cells to Clear
      terrain.setCellLandType(10, 10, 0); // Clear
      terrain.setCellLandType(11, 10, 0);
      terrain.setCellLandType(12, 10, 0);

      const bs = new BS(terrain);
      const bridge = bs.addBridge(
        'b1',
        [
          { x: 10, y: 10 },
          { x: 11, y: 10 },
          { x: 12, y: 10 },
        ],
        100
      );
      const beforeDestroyed = bridge.isDestroyed;
      bs.damageBridge('b1', 100);
      const after = bs.getBridge('b1');

      return {
        beforeDestroyed,
        afterDestroyed: after?.isDestroyed,
        afterHealth: after?.health,
        cellType: terrain.getCellLandType(11, 10),
      };
    });

    expect(result.beforeDestroyed).toBe(false);
    expect(result.afterDestroyed).toBe(true);
    expect(result.afterHealth).toBe(0);
    expect(result.cellType).toBe(2); // Water
  });

  test('destroyed bridge can be repaired and restored', async ({ page }) => {
    const result = await page.evaluate(() => {
      const terrain = (window as unknown as Record<string, unknown>)._terrainGrid as {
        getCellLandType: (x: number, y: number) => number;
        setCellLandType: (x: number, y: number, type: number) => void;
      };
      const BS = (window as unknown as Record<string, unknown>).BridgeSystem as new (terrain: unknown) => {
        addBridge: (id: string, segments: Array<{ x: number; y: number }>, maxHealth?: number) => unknown;
        damageBridge: (id: string, amount: number) => void;
        startRepair: (id: string) => void;
        tickRepair: (id: string, amount?: number) => void;
        getBridge: (id: string) => { isDestroyed: boolean; isRepairing: boolean; health: number } | undefined;
      };

      terrain.setCellLandType(20, 20, 0);
      terrain.setCellLandType(21, 20, 0);

      const bs = new BS(terrain);
      bs.addBridge(
        'b2',
        [
          { x: 20, y: 20 },
          { x: 21, y: 20 },
        ],
        50
      );
      bs.damageBridge('b2', 50);
      bs.startRepair('b2');

      // Tick repair to completion
      for (let i = 0; i < 60; i++) {
        bs.tickRepair('b2', 0.02);
      }

      const after = bs.getBridge('b2');
      return {
        restored: !after?.isDestroyed && !after?.isRepairing,
        health: after?.health,
        cellType: terrain.getCellLandType(20, 20),
      };
    });

    expect(result.restored).toBe(true);
    expect(result.health).toBe(50);
    expect(result.cellType).toBe(0); // Clear (original land type)
  });
});
