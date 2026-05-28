import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-A1: World + Actor 主循环化', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('World singleton exists and is exposed', async ({ page }) => {
    const result = await page.evaluate(() => {
      const WorldClass = (window as unknown as Record<string, unknown>)._World as
        | { getInstance: () => { getWorldTick: () => number; getActorCount: () => number } }
        | undefined;
      const world = (window as unknown as Record<string, unknown>)._world as
        | { getWorldTick: () => number; getActorCount: () => number }
        | undefined;
      return {
        hasClass: typeof WorldClass === 'function',
        hasInstance: typeof world === 'object' && world !== null,
        tickCount: world?.getWorldTick(),
        actorCount: world?.getActorCount(),
      };
    });

    expect(result.hasClass).toBe(true);
    expect(result.hasInstance).toBe(true);
    expect(result.tickCount).toBeGreaterThanOrEqual(0);
    expect(result.actorCount).toBe(0); // no actors yet
  });

  test('World tick advances worldTick counter deterministically', async ({ page }) => {
    const result = await page.evaluate(() => {
      const world = (window as unknown as Record<string, unknown>)._world as {
        getWorldTick: () => number;
        tick: (dt: number) => void;
      };
      const before = world.getWorldTick();
      world.tick(16);
      const after1 = world.getWorldTick();
      world.tick(16);
      const after2 = world.getWorldTick();
      return { before, after1, after2 };
    });

    expect(result.before).toBeGreaterThanOrEqual(0);
    expect(result.after1).toBe(result.before + 1);
    expect(result.after2).toBe(result.after1 + 1);
  });

  test('Actor added to World is ticked by World.tick', async ({ page }) => {
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
      const World = (window as unknown as Record<string, unknown>)._World as {
        getInstance: () => {
          addActor: (a: unknown) => void;
          tick: (dt: number) => void;
          getActor: (id: string) => unknown;
          getAllActors: () => unknown[];
        };
      };

      // 自定义 Trait 记录 tick 调用
      const ticks: number[] = [];
      class TestTrait extends (Trait as unknown as new () => { tick: (a: unknown, dt: number) => void }) {
        override tick(_actor: unknown, dt: number) {
          ticks.push(dt);
        }
      }

      const world = World.getInstance();
      // 创建一个 mock house 和 info
      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'TestActor', type: 0 };
      const actor = new Actor('test-actor-1', mockHouse, mockInfo);
      actor.addTrait(new TestTrait());
      world.addActor(actor);

      world.tick(16.67);
      world.tick(16.67);

      return {
        actorCount: world.getAllActors().length,
        tickCount: ticks.length,
        ticks,
        hasActor: world.getActor('test-actor-1') !== undefined,
      };
    });

    expect(result.hasActor).toBe(true);
    expect(result.actorCount).toBe(1);
    expect(result.tickCount).toBe(2);
    expect(result.ticks).toEqual([16.67, 16.67]);
  });

  test('World ticks actors in deterministic ID-sorted order', async ({ page }) => {
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
        tick: (actor: unknown, dt: number) => void;
      };
      const World = (window as unknown as Record<string, unknown>)._World as {
        getInstance: () => {
          addActor: (a: unknown) => void;
          tick: (dt: number) => void;
          clear: () => void;
        };
      };

      const world = World.getInstance();
      world.clear();

      const order: string[] = [];
      class OrderTrait extends (Trait as unknown as new () => { tick: (a: unknown) => void }) {
        constructor(private readonly name: string) {
          super();
        }
        override tick(actor: { id: string }) {
          order.push(actor.id);
        }
      }

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };

      // 故意按非字母顺序添加
      const actorZ = new Actor('z-actor', mockHouse, mockInfo);
      actorZ.addTrait(new OrderTrait('z'));
      world.addActor(actorZ);

      const actorA = new Actor('a-actor', mockHouse, mockInfo);
      actorA.addTrait(new OrderTrait('a'));
      world.addActor(actorA);

      const actorM = new Actor('m-actor', mockHouse, mockInfo);
      actorM.addTrait(new OrderTrait('m'));
      world.addActor(actorM);

      world.tick(16);

      return { order };
    });

    // 应该按 ID 字母顺序: a-actor, m-actor, z-actor
    expect(result.order).toEqual(['a-actor', 'm-actor', 'z-actor']);
  });

  test('World.addFrameEndTask executes after all actor ticks', async ({ page }) => {
    const result = await page.evaluate(() => {
      const World = (window as unknown as Record<string, unknown>)._World as {
        getInstance: () => {
          clear: () => void;
          addFrameEndTask: (task: (w: unknown) => void) => void;
          tick: (dt: number) => void;
        };
      };

      const world = World.getInstance();
      world.clear();

      const events: string[] = [];

      world.addFrameEndTask(() => {
        events.push('frameEnd');
      });

      // 再添加一个普通 frame-end task（Task-F1 基础验证）
      world.addFrameEndTask(() => {
        events.push('frameEnd2');
      });

      world.tick(16);

      return { events };
    });

    expect(result.events).toEqual(['frameEnd', 'frameEnd2']);
  });

  test('destroyed actors are skipped during tick', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        id: string;
        addTrait: (t: unknown) => void;
        destroy: () => void;
      };
      const Trait = (window as unknown as Record<string, unknown>)._Trait as new () => {
        tick: () => void;
      };
      const World = (window as unknown as Record<string, unknown>)._World as {
        getInstance: () => {
          addActor: (a: unknown) => void;
          tick: (dt: number) => void;
          clear: () => void;
          getAllActors: () => { id: string }[];
        };
      };

      const world = World.getInstance();
      world.clear();

      let tickCount = 0;
      class CountTrait extends (Trait as unknown as new () => { tick: () => void }) {
        override tick() {
          tickCount++;
        }
      }

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };

      const actor = new Actor('destroy-test', mockHouse, mockInfo);
      actor.addTrait(new CountTrait());
      world.addActor(actor);

      world.tick(16); // tickCount = 1
      actor.destroy();
      world.tick(16); // should skip destroyed actor

      return {
        tickCount,
        aliveActors: world.getAllActors().length,
      };
    });

    expect(result.tickCount).toBe(1);
    expect(result.aliveActors).toBe(0);
  });
});
