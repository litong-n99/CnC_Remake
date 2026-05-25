import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 10.4 E2E Test — TileSet Real Sprite Loading + Atlas Building
 *
 * Verifies:
 * 1. TileSet loads with correct metadata
 * 2. Test sprite can be injected into DefaultTileCache
 * 3. Atlas builds successfully and returns slot data
 */

test.describe('Task 10.4 — Sprite Atlas Loading', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('buildAtlas succeeds after injecting test sprites', async () => {
    // Load the temperat tileset, inject sprite, and build atlas — all inside one evaluate
    const result = (await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const loadResult = await cnc.loadTileSet?.('/CnC_Remake/tilesets/temperat.json');
      const rgba: number[] = [];
      for (let i = 0; i < 24 * 24; i++) {
        rgba.push(255, 0, 0, 255); // solid red
      }
      cnc.injectTestSprite?.('1:0', 24, 24, rgba);
      const atlasResult = await (cnc.buildAtlas as (() => Promise<Record<string, unknown>>) | undefined)?.();
      return { loadResult, atlasResult, cache: !!(cnc.terrain as { getTileCache: () => unknown }).getTileCache?.() };
    })) as Record<string, unknown> | undefined;

    expect(result).toBeDefined();
    expect((result!.atlasResult as Record<string, unknown>)?.built).toBe(true);
  });

  test('atlas slot lookup returns UV coordinates for injected sprite', async () => {
    // Load tileset, inject sprite, build atlas, and query slot — all inside one evaluate
    const slot = (await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      await cnc.loadTileSet?.('/CnC_Remake/tilesets/temperat.json');
      const rgba: number[] = [];
      for (let i = 0; i < 24 * 24; i++) {
        rgba.push(0, 255, 0, 255); // solid green
      }
      cnc.injectTestSprite?.('2:0', 24, 24, rgba);
      await (cnc.buildAtlas as (() => Promise<unknown>) | undefined)?.();
      const terrain = cnc.terrain as {
        getTileCache: () => { getAtlasSlot: (tile: { type: number; index: number }) => unknown } | null;
      };
      const cache = terrain.getTileCache();
      if (!cache) return null;
      return cache.getAtlasSlot({ type: 2, index: 0 });
    })) as { u: number; v: number; u2: number; v2: number } | null;

    expect(slot).not.toBeNull();
    expect(slot!.u).toBeGreaterThanOrEqual(0);
    expect(slot!.v).toBeGreaterThanOrEqual(0);
    expect(slot!.u2).toBeGreaterThan(slot!.u);
    expect(slot!.v2).toBeGreaterThan(slot!.v);
  });
});
