import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 89: 内置地图编辑器（Tile Brush）— 64×64 混合地形导出验证
 *
 * 验收：编辑器中绘制 64×64 混合地形地图，导出后数据结构完整。
 */
test.describe('task-89 editor mixed terrain 64x64', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('editor exports complete 64x64 mixed terrain map', async () => {
    await game.editorLoadTileSet('/tilesets/temperat.json');

    // Paint a mixed terrain pattern: Clear, Water, Rock, Road patches
    await game.editorSelectBrush('tile', 1); // Clear
    await game.editorPaint(10, 10);
    await game.editorPaint(11, 10);

    await game.editorSelectBrush('tile', 2); // Water
    await game.editorPaint(20, 20);
    await game.editorPaint(21, 20);

    await game.editorSelectBrush('tile', 3); // Rock
    await game.editorPaint(30, 30);

    await game.editorSelectBrush('tile', 4); // Road
    await game.editorPaint(40, 40);

    const exportResult = await game.editorExport();
    expect(exportResult.error).toBeUndefined();
    expect(exportResult.width).toBe(64);
    expect(exportResult.height).toBe(64);
    expect(exportResult.tileCount).toBe(64 * 64);
    expect(exportResult.tileset).toBe('TEMPERAT');
    expect(exportResult.binHeader).toBeDefined();
    expect(exportResult.binHeader.format).toBe(11);

    // Verify resource count is present
    expect(typeof exportResult.resourceCount).toBe('number');
  });

  test('editor export tile data is serializable to JSON', async ({ page }) => {
    await game.editorLoadTileSet('/tilesets/temperat.json');
    await game.editorSelectBrush('tile', 1);
    await game.editorPaint(25, 25);

    const isJsonValid = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      const result = cnc.editorExport?.();
      if (!result) return false;
      try {
        const json = JSON.stringify(result);
        const parsed = JSON.parse(json);
        return parsed.width === 64 && parsed.height === 64 && parsed.tileCount === 64 * 64;
      } catch {
        return false;
      }
    });

    expect(isJsonValid).toBe(true);
  });
});
