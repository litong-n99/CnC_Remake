import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-R1/R2: 视口裁剪 + ITickRender', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('ViewportCuller computes world bounds from camera', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ViewportCuller = (window as unknown as Record<string, unknown>)._ViewportCuller as new () => {
        getWorldBounds: (camera: unknown) => { minX: number; maxX: number; minZ: number; maxZ: number };
      };

      const culler = new ViewportCuller();
      // Mock camera with target=(0,0,0) and radius=50
      const mockCamera = {
        target: { x: 0, y: 0, z: 0 },
        radius: 50,
      };

      const bounds = culler.getWorldBounds(mockCamera as unknown as import('@babylonjs/core').ArcRotateCamera);

      return {
        hasBounds: bounds.minX < bounds.maxX,
        hasZBounds: bounds.minZ < bounds.maxZ,
        centered: Math.abs(bounds.minX + bounds.maxX) < 0.1 && Math.abs(bounds.minZ + bounds.maxZ) < 0.1,
      };
    });

    expect(result.hasBounds).toBe(true);
    expect(result.hasZBounds).toBe(true);
    expect(result.centered).toBe(true);
  });

  test('ViewportCuller culls objects outside view', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ViewportCuller = (window as unknown as Record<string, unknown>)._ViewportCuller as new () => {
        getWorldBounds: (camera: unknown) => { minX: number; maxX: number; minZ: number; maxZ: number };
        cull: (objects: unknown[], camera: unknown) => { visible: unknown[]; culled: unknown[] };
      };

      const culler = new ViewportCuller();
      const mockCamera = {
        target: { x: 0, y: 0, z: 0 },
        radius: 50,
      };

      // Mock objects at various positions
      const objects = [
        { id: 'center', x: 0, y: 0, isAlive: () => true, mesh: { isVisible: true } },
        { id: 'far', x: 200, y: 200, isAlive: () => true, mesh: { isVisible: true } },
        { id: 'near', x: 10, y: 10, isAlive: () => true, mesh: { isVisible: true } },
      ];

      const result = culler.cull(objects, mockCamera as unknown as import('@babylonjs/core').ArcRotateCamera);

      return {
        visibleCount: result.visible.length,
        culledCount: result.culled.length,
        centerVisible: result.visible.some((o: { id: string }) => o.id === 'center'),
        farCulled: result.culled.some((o: { id: string }) => o.id === 'far'),
      };
    });

    expect(result.centerVisible).toBe(true);
    expect(result.farCulled).toBe(true);
    expect(result.visibleCount + result.culledCount).toBe(3);
  });

  test('GameLoop supports ITickRender callbacks', async ({ page }) => {
    const result = await page.evaluate(() => {
      const GameLoop = (window as unknown as Record<string, unknown>)._GameLoopClass as new () => {
        onTickRender: (cb: { tickRender: (p: number) => void }) => void;
        offTickRender: (cb: { tickRender: (p: number) => void }) => void;
        stepLogic: (dt?: number) => void;
      };

      const loop = new GameLoop();
      const calls: number[] = [];

      const renderer = {
        tickRender: (progress: number) => {
          calls.push(progress);
        },
      };

      loop.onTickRender(renderer);
      loop.stepLogic(16);
      loop.stepLogic(16);
      loop.offTickRender(renderer);
      loop.stepLogic(16); // should not call renderer

      return { callCount: calls.length };
    });

    expect(result.callCount).toBe(2);
  });

  test('ITickRender receives progress between 0 and 1', async ({ page }) => {
    const result = await page.evaluate(() => {
      const GameLoop = (window as unknown as Record<string, unknown>)._GameLoopClass as new () => {
        onTickRender: (cb: { tickRender: (p: number) => void }) => void;
        stepLogic: (dt?: number) => void;
        getLogicTickProgress: () => number;
      };

      const loop = new GameLoop();
      const progresses: number[] = [];

      loop.onTickRender({
        tickRender: (progress: number) => {
          progresses.push(progress);
        },
      });

      loop.stepLogic(16);

      return {
        progress: progresses[0],
        inRange: progresses[0] >= 0 && progresses[0] <= 1,
      };
    });

    expect(result.inRange).toBe(true);
  });
});
