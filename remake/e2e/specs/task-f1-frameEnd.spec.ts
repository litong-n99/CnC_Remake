import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-F1: Frame-End 任务队列', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('frame-end tasks execute after actor ticks in FIFO order', async ({ page }) => {
    const result = await page.evaluate(() => {
      const World = (window as unknown as Record<string, unknown>)._World as {
        getInstance: () => {
          clear: () => void;
          addFrameEndTask: (task: () => void) => void;
          tick: (dt: number) => void;
        };
      };

      const world = World.getInstance();
      world.clear();

      const order: number[] = [];
      world.addFrameEndTask(() => order.push(1));
      world.addFrameEndTask(() => order.push(2));
      world.addFrameEndTask(() => order.push(3));

      world.tick(16);

      return { order };
    });

    expect(result.order).toEqual([1, 2, 3]);
  });

  test('frame-end tasks added during tick execute on same frame', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        id: string;
        addTrait: (t: unknown) => void;
      };
      const Trait = (window as unknown as Record<string, unknown>)._Trait as new () => {
        tick: () => void;
      };
      const World = (window as unknown as Record<string, unknown>)._World as {
        getInstance: () => {
          clear: () => void;
          addActor: (a: unknown) => void;
          addFrameEndTask: (task: () => void) => void;
          tick: (dt: number) => void;
        };
      };

      const world = World.getInstance();
      world.clear();

      const events: string[] = [];

      class SpawnerTrait extends (Trait as unknown as new () => { tick: () => void }) {
        override tick() {
          events.push('tick');
          world.addFrameEndTask(() => events.push('late-task'));
        }
      }

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const actor = new Actor('spawner', mockHouse, mockInfo);
      actor.addTrait(new SpawnerTrait());
      world.addActor(actor);

      world.tick(16);

      return { events };
    });

    expect(result.events).toEqual(['tick', 'late-task']);
  });
});
