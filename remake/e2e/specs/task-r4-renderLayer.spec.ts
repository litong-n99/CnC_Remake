import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-R4: 深度排序优化 (RenderLayer)', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('task-r4.1: RenderLayer enum has four layers (0-3)', async ({ page }) => {
    const layers = await page.evaluate(() => {
      const RL = (window as unknown as Record<string, unknown>)._RenderLayer as Record<string, number>;
      return {
        Opaque: RL.Opaque,
        Transparent: RL.Transparent,
        Sprite: RL.Sprite,
        Overlay: RL.Overlay,
      };
    });
    expect(layers.Opaque).toBe(0);
    expect(layers.Transparent).toBe(1);
    expect(layers.Sprite).toBe(2);
    expect(layers.Overlay).toBe(3);
  });

  test('task-r4.2: spawned unit mesh has renderingGroupId = Opaque (0)', async ({ page }) => {
    const layer = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      cnc.unit('MediumTank', 'gdi', 30, 30);
      // 直接访问场景中的 mesh，查找单位相关的 mesh
      const scene = (
        window as unknown as Record<
          string,
          { scenes: Array<{ meshes: Array<{ name: string; renderingGroupId: number }> }> }
        >
      )._engine.scenes[0];
      const unitMesh = scene.meshes.find((m) => m.name.includes('_body') && !m.name.includes('hb_'));
      return unitMesh?.renderingGroupId ?? -1;
    });
    expect(layer).toBe(0);
  });

  test('task-r4.3: all scene meshes have valid renderingGroupId (0-3)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const scene = (
        window as unknown as Record<
          string,
          { scenes: Array<{ meshes: Array<{ name: string; renderingGroupId: number }> }> }
        >
      )._engine.scenes[0];
      const invalidMeshes = scene.meshes.filter((m) => m.renderingGroupId < 0 || m.renderingGroupId > 3);
      return {
        total: scene.meshes.length,
        invalidCount: invalidMeshes.length,
        invalidNames: invalidMeshes.map((m) => m.name),
      };
    });
    // 地形等基础 mesh 也已被分配到 Opaque 层（0）
    expect(result.total).toBeGreaterThan(0);
    expect(result.invalidCount).toBe(0);
  });

  test('task-r4.4: SpriteRenderable mesh has renderingGroupId = Sprite (2)', async ({ page }) => {
    const layer = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const SpriteRenderable = w._SpriteRenderable as new (
        scene: unknown,
        name: string,
        options: unknown
      ) => { mesh: { renderingGroupId: number } };
      const scene = (w._engine as { scenes: unknown[] }).scenes[0];
      const sprite = new SpriteRenderable(scene, 'testSprite', { width: 1, height: 1 });
      return sprite.mesh.renderingGroupId;
    });
    expect(layer).toBe(2);
  });

  test('task-r4.5: getRenderLayerStats returns counts for all four layers', async ({ page }) => {
    const stats = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      cnc.unit('MediumTank', 'gdi', 30, 30);
      cnc.building('PowerPlant', 'gdi');
      const w = window as unknown as Record<string, (...args: unknown[]) => unknown>;
      const getStats = w._getRenderLayerStats as (scene: unknown) => Record<number, number>;
      const scene = (w._engine as { scenes: unknown[] }).scenes[0];
      return getStats(scene);
    });

    // 场景中应该至少有 Opaque 层的 mesh（单位+建筑）
    expect(stats[0]).toBeGreaterThanOrEqual(2);
    // 所有层都应该有数值（可能为 0）
    expect(stats[0]).toBeDefined();
    expect(stats[1]).toBeDefined();
    expect(stats[2]).toBeDefined();
    expect(stats[3]).toBeDefined();
  });

  test('task-r4.6: setRenderLayer changes mesh renderingGroupId', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, (...args: unknown[]) => unknown>;
      const setLayer = w._setRenderLayer as (mesh: { renderingGroupId: number }, layer: number) => void;
      const getLayer = w._getRenderLayer as (mesh: { renderingGroupId: number }) => number;
      const mesh = { renderingGroupId: 0 };
      setLayer(mesh as unknown as { renderingGroupId: number }, 3);
      return getLayer(mesh as unknown as { renderingGroupId: number });
    });
    expect(result).toBe(3);
  });
});
