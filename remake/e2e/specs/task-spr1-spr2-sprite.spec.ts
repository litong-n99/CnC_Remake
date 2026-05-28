import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-SPR1/SPR2: Sprite 渲染管线 + 单位序列绑定', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('SpriteRenderable creates billboard mesh', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SpriteRenderable = (window as unknown as Record<string, unknown>)._SpriteRenderable as new (
        scene: unknown,
        name: string,
        opts: { width: number; height: number }
      ) => {
        mesh: { name: string; isVisible: boolean };
        material: { diffuseColor: { r: number; g: number; b: number } };
      };

      const scene = (window as unknown as Record<string, unknown>)._scene as unknown;
      const sprite = new SpriteRenderable(scene, 'test-sprite', { width: 2, height: 3 });

      return {
        meshName: sprite.mesh.name,
        isVisible: sprite.mesh.isVisible,
        hasMaterial: sprite.material !== undefined,
      };
    });

    expect(result.meshName).toBe('test-sprite');
    expect(result.isVisible).toBe(true);
    expect(result.hasMaterial).toBe(true);
  });

  test('ActorSpriteRenderer drives sequence frames', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ActorSpriteRenderer = (window as unknown as Record<string, unknown>)._ActorSpriteRenderer as new (opts: {
        scene: unknown;
        name: string;
        width: number;
        height: number;
      }) => {
        setSequence: (def: unknown) => void;
        tickRender: (dt: number) => void;
        getCurrentFrame: () => number;
        isFinished: () => boolean;
      };

      const scene = (window as unknown as Record<string, unknown>)._scene as unknown;
      const renderer = new ActorSpriteRenderer({
        scene,
        name: 'test-actor',
        width: 1,
        height: 1,
      });

      // Mock sequence: 5 frames, 20ms per frame, looping
      renderer.setSequence({ start: 0, length: 5, tick: 20, loop: true });

      const frames: number[] = [];
      for (let i = 0; i < 10; i++) {
        renderer.tickRender(25); // 25ms > 20ms tick → advances frame
        frames.push(renderer.getCurrentFrame());
      }

      return { frames, finished: renderer.isFinished() };
    });

    // tickRender(25) usually advances 1 frame, but when elapsedMs accumulates
    // it can advance 2 frames. Actual sequence observed in test environment.
    expect(result.frames).toEqual([1, 2, 3, 0, 1, 2, 3, 0, 1, 2]);
    expect(result.finished).toBe(false); // looping never finishes
  });

  test('ActorSpriteRenderer non-looping sequence finishes', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ActorSpriteRenderer = (window as unknown as Record<string, unknown>)._ActorSpriteRenderer as new (opts: {
        scene: unknown;
        name: string;
        width: number;
        height: number;
      }) => {
        setSequence: (def: unknown) => void;
        tickRender: (dt: number) => void;
        isFinished: () => boolean;
        getCurrentFrame: () => number;
      };

      const scene = (window as unknown as Record<string, unknown>)._scene as unknown;
      const renderer = new ActorSpriteRenderer({
        scene,
        name: 'test-die',
        width: 1,
        height: 1,
      });

      // Non-looping death sequence
      renderer.setSequence({ start: 0, length: 3, tick: 10, loop: false });

      renderer.tickRender(15);
      renderer.tickRender(15);
      renderer.tickRender(15);
      renderer.tickRender(15);

      return {
        finished: renderer.isFinished(),
        lastFrame: renderer.getCurrentFrame(),
      };
    });

    expect(result.finished).toBe(true);
    expect(result.lastFrame).toBe(2); // last frame of 3-frame sequence
  });
});
