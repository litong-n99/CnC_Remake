import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 10.5 E2E Test — Macro Tile Decal Layer
 *
 * Verifies:
 * 1. Decal can be added on top of a cell after atlas is built
 * 2. Decal mesh appears in the scene
 * 3. Decal count tracks correctly
 */

test.describe('Task 10.5 — Macro Tile Decal Layer', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('addDecal creates a decal mesh in the scene', async () => {
    // Prepare atlas
    await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      await cnc.loadTileSet?.('/CnC_Remake/tilesets/temperat.json');
      const rgba: number[] = [];
      for (let i = 0; i < 24 * 24; i++) {
        rgba.push(255, 0, 0, 255);
      }
      cnc.injectTestSprite?.('1:0', 24, 24, rgba);
      await (cnc.buildAtlas as (() => Promise<unknown>) | undefined)?.();
    });

    // Add decal at (10, 10) using template id 1, index 0
    const beforeCount = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as {
        addDecal: (x: number, y: number, tile: { type: number; index: number }) => void;
        getDecalCount: () => number;
      };
      terrain.addDecal(10, 10, { type: 1, index: 0 });
      return terrain.getDecalCount();
    })) as number;

    expect(beforeCount).toBe(1);

    // Verify a mesh named 'decal_10,10' exists in the scene
    const meshExists = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as {
        terrain: { getSceneFromMesh?: () => { getMeshByName: (name: string) => unknown } };
      };
      const scene = cnc.terrain.getSceneFromMesh?.();
      if (!scene) return false;
      return !!scene.getMeshByName('decal_10,10');
    })) as boolean;

    expect(meshExists).toBe(true);
  });

  test('clearDecals removes all decals', async () => {
    await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      await cnc.loadTileSet?.('/CnC_Remake/tilesets/temperat.json');
      const rgba: number[] = [];
      for (let i = 0; i < 24 * 24; i++) {
        rgba.push(0, 255, 0, 255);
      }
      cnc.injectTestSprite?.('2:0', 24, 24, rgba);
      await (cnc.buildAtlas as (() => Promise<unknown>) | undefined)?.();
    });

    const afterClear = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as {
        addDecal: (x: number, y: number, tile: { type: number; index: number }) => void;
        clearDecals: () => void;
        getDecalCount: () => number;
      };
      terrain.addDecal(5, 5, { type: 2, index: 0 });
      terrain.addDecal(6, 6, { type: 2, index: 0 });
      terrain.clearDecals();
      return terrain.getDecalCount();
    })) as number;

    expect(afterClear).toBe(0);
  });
});
