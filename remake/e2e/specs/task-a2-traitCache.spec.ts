import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-A2: TraitDictionary 缓存优化', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('Actor tick uses cached tickTraits for performance', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        id: string;
        addTrait: (t: unknown) => void;
        tick: (dt: number) => void;
      };
      const Trait = (window as unknown as Record<string, unknown>)._Trait as new () => {
        tick: (actor: unknown, dt: number) => void;
      };

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const actor = new Actor('cache-test', mockHouse, mockInfo);

      let tickCount = 0;
      class FastTrait extends (Trait as unknown as new () => { tick: () => void }) {
        override tick() {
          tickCount++;
        }
      }

      // 添加 10 个 traits
      for (let i = 0; i < 10; i++) {
        actor.addTrait(new FastTrait());
      }

      // tick 100 次
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        actor.tick(16);
      }
      const elapsed = performance.now() - start;

      return {
        tickCount,
        elapsed,
        expectedTickCount: 10 * 100,
      };
    });

    expect(result.tickCount).toBe(result.expectedTickCount);
    expect(result.elapsed).toBeLessThan(50); // 100 ticks with 10 traits should be < 50ms
  });

  test('destroyed actor clears cached tickTraits', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        id: string;
        addTrait: (t: unknown) => void;
        tick: (dt: number) => void;
        destroy: () => void;
        isDestroyed: () => boolean;
      };
      const Trait = (window as unknown as Record<string, unknown>)._Trait as new () => {
        tick: () => void;
      };

      let tickCount = 0;
      class CountTrait extends (Trait as unknown as new () => { tick: () => void }) {
        override tick() {
          tickCount++;
        }
      }

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const actor = new Actor('clear-test', mockHouse, mockInfo);
      actor.addTrait(new CountTrait());

      actor.tick(16); // tickCount = 1
      actor.destroy();
      const wasDestroyed = actor.isDestroyed();
      actor.tick(16); // should be skipped

      return { tickCount, wasDestroyed };
    });

    expect(result.wasDestroyed).toBe(true);
    expect(result.tickCount).toBe(1);
  });
});
