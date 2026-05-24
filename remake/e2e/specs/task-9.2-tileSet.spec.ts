import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 9.2 E2E Test — TileSet / Template system
 *
 * Verifies:
 * 1. TileSet JSON can be loaded from URL
 * 2. Template count and terrain type count are correct
 * 3. setTerrainTile places a template reference in a cell
 * 4. getTerrainTile reads back the template reference + resolves metadata
 * 5. PickAny flag is present on relevant templates
 * 6. Multi-cell templates (2×2 cliff) exist in the tileset
 */

test.describe('Task 9.2 — TileSet / Template', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('loadTileSet loads temperat.json with correct counts', async () => {
    const result = (await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.loadTileSet?.('/CnC_Remake/tilesets/temperat.json') as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(result).toBeDefined();
    expect(result!.name).toBe('TEMPERAT');
    expect(result!.templateCount).toBe(6);
    expect(result!.terrainTypeCount).toBe(9);
  });

  test('tileSet returns metadata after loading', async () => {
    await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      await cnc.loadTileSet?.('/CnC_Remake/tilesets/temperat.json');
    });

    const info = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.tileSet?.() as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(info).toBeDefined();
    expect(info!.name).toBe('TEMPERAT');
    expect(Array.isArray(info!.terrainTypes)).toBe(true);
    expect((info!.terrainTypes as string[]).length).toBe(9);
    expect(info!.terrainTypes as string[]).toContain('Water');
    expect(info!.terrainTypes as string[]).toContain('Rock');
  });

  test('setTerrainTile + getTerrainTile round-trip', async () => {
    await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      await cnc.loadTileSet?.('/CnC_Remake/tilesets/temperat.json');
    });

    // Place Water template (id=2) at (10,10)
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setTerrainTile?.(10, 10, 2, 0);
    });

    const tile = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.getTerrainTile?.(10, 10) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(tile).toBeDefined();
    expect(tile!.type).toBe(2);
    expect(tile!.index).toBe(0);
    expect(tile!.terrainTypeName).toBe('Water');
    expect(tile!.landTypeFallback).toBe(2); // LandType.Water
  });

  test('setTerrainTile updates landType fallback for Rock', async () => {
    await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      await cnc.loadTileSet?.('/CnC_Remake/tilesets/temperat.json');
    });

    // Place Rock template (id=3) at (15,15)
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setTerrainTile?.(15, 15, 3, 0);
    });

    const tile = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.getTerrainTile?.(15, 15) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(tile).toBeDefined();
    expect(tile!.terrainTypeName).toBe('Rock');
    expect(tile!.landTypeFallback).toBe(3); // LandType.Rock
  });

  test('multi-cell template (2×2 cliff) exists in tileset', async () => {
    await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      await cnc.loadTileSet?.('/CnC_Remake/tilesets/temperat.json');
    });

    const templateInfo = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as {
        getTileSet: () => {
          templates: Map<number, { size: { width: number; height: number }; tiles: unknown[]; pickAny: boolean }>;
        } | null;
      };
      const ts = terrain.getTileSet();
      if (!ts) return null;
      const cliff = ts.templates.get(100);
      if (!cliff) return null;
      return {
        w: cliff.size.width,
        h: cliff.size.height,
        tiles: cliff.tiles.length,
        pickAny: cliff.pickAny,
      };
    })) as { w: number; h: number; tiles: number; pickAny: boolean } | null;

    expect(templateInfo).not.toBeNull();
    expect(templateInfo!.w).toBe(2);
    expect(templateInfo!.h).toBe(2);
    expect(templateInfo!.tiles).toBe(4);
    expect(templateInfo!.pickAny).toBe(false);
  });
});
