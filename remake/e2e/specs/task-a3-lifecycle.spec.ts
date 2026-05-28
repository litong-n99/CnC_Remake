import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-A3: Actor/Trait 生命周期接口', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('INotifyCreated is called when actor.created() is invoked', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        id: string;
        addTrait: (t: unknown) => void;
        created: () => void;
      };
      const Trait = (window as unknown as Record<string, unknown>)._Trait as new () => {
        onCreated: (actor: unknown) => void;
        tick: () => void;
      };

      const events: string[] = [];

      // 自定义 Trait 实现 INotifyCreated
      class LifecycleTrait extends (Trait as unknown as new () => { onCreated: (a: unknown) => void }) {
        override onCreated(actor: { id: string }) {
          events.push(`created-${actor.id}`);
        }
      }

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const actor = new Actor('lifecycle-test', mockHouse, mockInfo);
      actor.addTrait(new LifecycleTrait());

      // addTrait 已经触发了一次 onCreated（Trait 基类行为）
      // created() 会再次触发 INotifyCreated
      actor.created();

      return { events };
    });

    expect(result.events).toContain('created-lifecycle-test');
  });

  test('INotifyAddedToWorld is triggered when World.addActor is called', async ({ page }) => {
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
        onCreated: () => void;
        tick: () => void;
      };
      const World = (window as unknown as Record<string, unknown>)._World as {
        getInstance: () => {
          clear: () => void;
          addActor: (a: unknown) => void;
        };
      };

      const events: string[] = [];

      class AddedTrait extends (Trait as unknown as new () => Record<string, unknown>) {
        onAddedToWorld(actor: { id: string }) {
          events.push(`added-${actor.id}`);
        }
      }

      const world = World.getInstance();
      world.clear();

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const actor = new Actor('added-test', mockHouse, mockInfo);
      actor.addTrait(new AddedTrait());
      world.addActor(actor);

      return { events };
    });

    expect(result.events).toEqual(['added-added-test']);
  });

  test('INotifyRemovedFromWorld is triggered when World.removeActor is called', async ({ page }) => {
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
        onCreated: () => void;
        tick: () => void;
      };
      const World = (window as unknown as Record<string, unknown>)._World as {
        getInstance: () => {
          clear: () => void;
          addActor: (a: unknown) => void;
          removeActor: (id: string) => boolean;
        };
      };

      const events: string[] = [];

      class RemovedTrait extends (Trait as unknown as new () => Record<string, unknown>) {
        onRemovedFromWorld(actor: { id: string }) {
          events.push(`removed-${actor.id}`);
        }
      }

      const world = World.getInstance();
      world.clear();

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const actor = new Actor('removed-test', mockHouse, mockInfo);
      actor.addTrait(new RemovedTrait());
      world.addActor(actor);
      world.removeActor('removed-test');

      return { events };
    });

    // onAddedToWorld fired during addActor (verified in other tests)
    expect(result.events).toContain('removed-removed-test');
  });

  test('IWorldLoaded is triggered when actor.worldLoaded() is called', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        id: string;
        addTrait: (t: unknown) => void;
        worldLoaded: (world: unknown) => void;
      };
      const Trait = (window as unknown as Record<string, unknown>)._Trait as new () => {
        onCreated: () => void;
        tick: () => void;
      };

      const events: string[] = [];

      class WorldLoadedTrait extends (Trait as unknown as new () => Record<string, unknown>) {
        onWorldLoaded() {
          events.push('world-loaded');
        }
      }

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const actor = new Actor('worldloaded-test', mockHouse, mockInfo);
      actor.addTrait(new WorldLoadedTrait());
      actor.worldLoaded({ name: 'TestWorld' });

      return { events };
    });

    expect(result.events).toEqual(['world-loaded']);
  });

  test('Lifecycle hooks fire in correct order: addTrait -> created -> addedToWorld -> tick -> removedFromWorld', async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        id: string;
        addTrait: (t: unknown) => void;
        created: () => void;
        tick: (dt: number) => void;
      };
      const Trait = (window as unknown as Record<string, unknown>)._Trait as new () => {
        onCreated: () => void;
        tick: () => void;
      };
      const World = (window as unknown as Record<string, unknown>)._World as {
        getInstance: () => {
          clear: () => void;
          addActor: (a: unknown) => void;
          removeActor: (id: string) => boolean;
          tick: (dt: number) => void;
        };
      };

      const events: string[] = [];

      class FullLifecycleTrait extends (Trait as unknown as new () => Record<string, unknown>) {
        override onCreated() {
          events.push('trait-onCreated');
        }
        onAddedToWorld() {
          events.push('addedToWorld');
        }
        override tick() {
          events.push('tick');
        }
        onRemovedFromWorld() {
          events.push('removedFromWorld');
        }
      }

      const world = World.getInstance();
      world.clear();

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const actor = new Actor('lifecycle-order', mockHouse, mockInfo);
      actor.addTrait(new FullLifecycleTrait());
      events.push('after-addTrait');

      actor.created();
      events.push('after-created');

      world.addActor(actor);
      events.push('after-addActor');

      world.tick(16);
      events.push('after-tick');

      world.removeActor('lifecycle-order');
      events.push('after-remove');

      return { events };
    });

    expect(result.events).toEqual([
      'trait-onCreated', // addTrait 触发
      'after-addTrait',
      'trait-onCreated', // created() 再次触发 INotifyCreated
      'after-created',
      'addedToWorld', // addActor 触发
      'after-addActor',
      'tick', // world.tick 触发
      'after-tick',
      'removedFromWorld', // removeActor 触发
      'after-remove',
    ]);
  });
});
