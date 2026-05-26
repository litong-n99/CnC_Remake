import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 71: Palette & Remap', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-71.1: TerrainIndexedMaterial shader contains palette uniforms', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Mat = (window as unknown as Record<string, unknown>)._TerrainIndexedMaterial as {
        vertexShader: string;
        fragmentShader: string;
      };
      return {
        hasIndexedTex: Mat.vertexShader.includes('position') && Mat.fragmentShader.includes('indexedTex'),
        hasPaletteTex: Mat.fragmentShader.includes('paletteTex'),
        hasChannel: Mat.fragmentShader.includes('channel'),
        hasDiscard: Mat.fragmentShader.includes('discard'),
        hasPaletteMapping: Mat.fragmentShader.includes('paletteU'),
      };
    });

    expect(result.hasIndexedTex).toBe(true);
    expect(result.hasPaletteTex).toBe(true);
    expect(result.hasChannel).toBe(true);
    expect(result.hasDiscard).toBe(true);
    expect(result.hasPaletteMapping).toBe(true);
  });
});
