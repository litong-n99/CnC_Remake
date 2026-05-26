import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 78: Frustum Culling', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-78.1: scene meshes have frustum culling enabled by default', async ({ page }) => {
    const result = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scene = (window as any)._scene;
      const meshes = scene?.meshes ?? [];
      const culledCount = meshes.filter((m: { isFrustumCulled: boolean }) => m.isFrustumCulled !== false).length;
      return { total: meshes.length, culled: culledCount };
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.culled).toBeGreaterThan(0);
  });
});
