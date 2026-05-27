import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 76 — Terrain LOD', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('terrain LOD is enabled by default with 2 levels', async () => {
    const result = await game.terrainLOD();
    expect(result.enabled).toBe(true);
    expect(result.lodCount).toBe(2);
  });

  test('LOD1 mesh has ~25% of original vertices (step=2)', async () => {
    const result = await game.terrainLOD();
    // Original: 64x64 cells * 4 verts = 16384 vertices
    // LOD1 (step=2): 32x32 quads * 4 verts = 4096 vertices
    expect(result.originalVertices).toBe(16384);
    expect(result.lodVertices[0]).toBe(4096);
    expect(result.lodVertices[0] / result.originalVertices).toBeLessThanOrEqual(0.3);
  });

  test('LOD2 mesh has ~6.25% of original vertices (step=4)', async () => {
    const result = await game.terrainLOD();
    // LOD2 (step=4): 16x16 quads * 4 verts = 1024 vertices
    expect(result.lodVertices[1]).toBe(1024);
    expect(result.lodVertices[1] / result.originalVertices).toBeLessThanOrEqual(0.1);
  });

  test('at zoom=100 active mesh has >50% fewer vertices than original', async ({ page }) => {
    await game.setCameraZoom(100);
    // Wait a few frames for LOD to switch
    await page.waitForTimeout(200);

    // At zoom=100, Babylon.js should switch to LOD2 (step=4)
    const activeVerts = await game.getActiveTerrainVertices();

    // Original has 16384 verts; at zoom=100 we expect LOD2 with 1024 verts
    // That's a 93.75% reduction, well above the 50% threshold
    expect(activeVerts).toBeLessThanOrEqual(8192); // 50% of 16384
  });
});
