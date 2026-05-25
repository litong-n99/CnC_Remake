import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 9.8 E2E Test — Editor Tile Brush + FloodFill + Undo
 *
 * Verifies the map editor brush system via debug console commands.
 */

test.describe('Task 9.8 — Editor Brush System', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('page loads and GameConsole is installed', async ({ page }) => {
    const cncReady = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc;
      return typeof cnc === 'object' && cnc !== null;
    });
    expect(cncReady).toBe(true);
  });

  test('editor loads tileset and selects brush', async () => {
    const loadResult = await game.editorLoadTileSet('/tilesets/temperat.json');
    expect(loadResult.error).toBeUndefined();
    expect(loadResult.templateCount).toBeGreaterThan(0);

    const selectResult = await game.editorSelectBrush('tile', 1);
    expect(selectResult.selected).toBe(true);
    expect(selectResult.templateId).toBe(1);
  });

  test('editor tile brush paints single-cell template', async ({ page }) => {
    await game.editorLoadTileSet('/tilesets/temperat.json');
    await game.editorSelectBrush('tile', 1); // Clear01

    const paintResult = await game.editorPaint(30, 30);
    expect(paintResult.painted).toBe(true);

    const tile = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.getTerrainTile?.(30, 30) as { type: number; index: number } | null;
    });
    expect(tile).not.toBeNull();
    expect(tile!.type).toBe(1);
  });

  test('editor tile brush paints multi-cell template', async ({ page }) => {
    await game.editorLoadTileSet('/tilesets/temperat.json');
    await game.editorSelectBrush('tile', 100); // CliffNE (2×2)

    const paintResult = await game.editorPaint(30, 30);
    expect(paintResult.painted).toBe(true);

    const tiles = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const results: Array<{ x: number; y: number; type: number; index: number } | null> = [];
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          results.push(cnc.getTerrainTile?.(30 + dx, 30 + dy) as { type: number; index: number } | null);
        }
      }
      return results;
    });

    expect(tiles.length).toBe(4);
    expect(tiles[0]).not.toBeNull(); // (30,30) index 0
    expect(tiles[0]!.type).toBe(100);
    expect(tiles[0]!.index).toBe(0);

    expect(tiles[1]).not.toBeNull(); // (31,30) index 1
    expect(tiles[1]!.type).toBe(100);
    expect(tiles[1]!.index).toBe(1);

    expect(tiles[2]).not.toBeNull(); // (30,31) index 2
    expect(tiles[2]!.type).toBe(100);
    expect(tiles[2]!.index).toBe(2);

    expect(tiles[3]).not.toBeNull(); // (31,31) index 3
    expect(tiles[3]!.type).toBe(100);
    expect(tiles[3]!.index).toBe(3);
  });

  test('editor pickAny selects valid index', async ({ page }) => {
    await game.editorLoadTileSet('/tilesets/temperat.json');
    await game.editorSelectBrush('tile', 1); // Clear01 (pickAny=true, 1 tile)

    // Paint multiple times — index should always be valid (0 in this case since only 1 tile)
    const indices: number[] = [];
    for (let i = 0; i < 5; i++) {
      await game.editorPaint(25 + i, 30);
      const tile = await page.evaluate(
        ({ x, y }) => {
          const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
          return cnc.getTerrainTile?.(x, y) as { type: number; index: number } | null;
        },
        { x: 25 + i, y: 30 }
      );
      expect(tile).not.toBeNull();
      expect(tile!.type).toBe(1);
      indices.push(tile!.index);
    }

    // All indices should be within [0, template.tiles.length-1]
    for (const idx of indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(0); // Clear01 only has 1 tile
    }
  });

  test('editor flood fill expands same terrain type', async ({ page }) => {
    await game.editorLoadTileSet('/tilesets/temperat.json');

    // 1. Create a 3×3 patch of Clear terrain using landType only
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      for (let y = 20; y < 23; y++) {
        for (let x = 20; x < 23; x++) {
          cnc.setTerrainTile?.(x, y, 1, 0); // type=1 (Clear01)
        }
      }
    });

    // 2. Select Water brush and flood fill from center
    await game.editorSelectBrush('tile', 2); // Water01
    const fillResult = await game.editorFloodFill(21, 21);
    expect(fillResult.filled).toBe(true);

    // 3. Verify all 9 cells are now Water
    const waterTiles = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const results: Array<{ x: number; y: number; type: number | null }> = [];
      for (let y = 20; y < 23; y++) {
        for (let x = 20; x < 23; x++) {
          const tile = cnc.getTerrainTile?.(x, y) as { type: number; index: number } | null;
          results.push({ x, y, type: tile?.type ?? null });
        }
      }
      return results;
    });

    for (const t of waterTiles) {
      expect(t.type, `cell (${t.x},${t.y}) should be Water`).toBe(2);
    }
  });

  test('editor undo restores previous state', async ({ page }) => {
    await game.editorLoadTileSet('/tilesets/temperat.json');
    await game.editorSelectBrush('tile', 1); // Clear01

    // Paint at (35, 35)
    await game.editorPaint(35, 35);
    const beforeUndo = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.getTerrainTile?.(35, 35) as { type: number; index: number } | null;
    });
    expect(beforeUndo).not.toBeNull();
    expect(beforeUndo!.type).toBe(1);

    // Undo
    const undoResult = await game.editorUndo();
    expect(undoResult.undone).toBe(true);

    const afterUndo = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.getTerrainTile?.(35, 35) as { type: number; index: number } | null;
    });
    expect(afterUndo).toBeNull();
  });

  test('editor redo re-applies undone action', async ({ page }) => {
    await game.editorLoadTileSet('/tilesets/temperat.json');
    await game.editorSelectBrush('tile', 3); // Rock01

    // Paint
    await game.editorPaint(36, 36);

    // Undo
    await game.editorUndo();
    const afterUndo = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.getTerrainTile?.(36, 36) as { type: number; index: number } | null;
    });
    expect(afterUndo).toBeNull();

    // Redo
    const redoResult = await game.editorRedo();
    expect(redoResult.redone).toBe(true);

    const afterRedo = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.getTerrainTile?.(36, 36) as { type: number; index: number } | null;
    });
    expect(afterRedo).not.toBeNull();
    expect(afterRedo!.type).toBe(3);
  });

  test('editor export produces valid map data', async () => {
    await game.editorLoadTileSet('/tilesets/temperat.json');
    await game.editorSelectBrush('tile', 1);
    await game.editorPaint(40, 40);
    await game.editorPaint(41, 40);

    const exportResult = await game.editorExport();
    expect(exportResult.error).toBeUndefined();
    expect(exportResult.width).toBe(64);
    expect(exportResult.height).toBe(64);
    expect(exportResult.tileset).toBe('TEMPERAT');
    expect(exportResult.tileCount).toBe(64 * 64);
    expect(exportResult.binHeader).toBeDefined();
    expect(exportResult.binHeader.format).toBe(11);
  });
});
