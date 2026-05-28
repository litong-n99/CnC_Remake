import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-W1: WorldActor 全局系统容器', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('WorldActor can be set and retrieved', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        id: string;
        addTrait: (t: unknown) => void;
      };
      const World = (window as unknown as Record<string, unknown>)._World as {
        getInstance: () => {
          clear: () => void;
          setWorldActor: (a: unknown) => void;
          getWorldActor: () => { id: string } | null;
          getActorCount: () => number;
        };
      };

      const world = World.getInstance();
      world.clear();

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const worldActor = new Actor('world-actor', mockHouse, mockInfo);
      world.setWorldActor(worldActor);

      return {
        hasWorldActor: world.getWorldActor() !== null,
        worldActorId: world.getWorldActor()?.id,
        actorCount: world.getActorCount(),
      };
    });

    expect(result.hasWorldActor).toBe(true);
    expect(result.worldActorId).toBe('world-actor');
    expect(result.actorCount).toBe(1);
  });

  test('WorldActor traits are ticked before regular actors', async ({ page }) => {
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
        tick: (actor: unknown) => void;
      };
      const World = (window as unknown as Record<string, unknown>)._World as {
        getInstance: () => {
          clear: () => void;
          setWorldActor: (a: unknown) => void;
          addActor: (a: unknown) => void;
          tick: (dt: number) => void;
        };
      };

      const order: string[] = [];

      class OrderTrait extends (Trait as unknown as new () => { tick: (a: unknown) => void }) {
        constructor(private readonly name: string) {
          super();
        }
        override tick() {
          order.push(this.name);
        }
      }

      const world = World.getInstance();
      world.clear();

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };

      // Create WorldActor with a trait
      const worldActor = new Actor('world-actor', mockHouse, mockInfo);
      worldActor.addTrait(new OrderTrait('world-trait'));
      world.setWorldActor(worldActor);

      // Create regular actor with a trait
      const regularActor = new Actor('regular-actor', mockHouse, mockInfo);
      regularActor.addTrait(new OrderTrait('regular-trait'));
      world.addActor(regularActor);

      world.tick(16);

      return { order };
    });

    // WorldActor traits should tick first
    expect(result.order).toEqual(['world-trait', 'regular-trait']);
  });

  test('addWorldTrait attaches trait to WorldActor', async ({ page }) => {
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
          setWorldActor: (a: unknown) => void;
          addWorldTrait: (t: unknown) => void;
          worldTrait: <T>(type: new () => T) => T | undefined;
          getWorldActor: () => { getAllTraits: () => { length: number }[] } | null;
        };
      };

      const world = World.getInstance();
      world.clear();

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const worldActor = new Actor('world-actor', mockHouse, mockInfo);
      world.setWorldActor(worldActor);

      class TestTrait extends (Trait as unknown as new () => { tick: () => void }) {}

      world.addWorldTrait(new TestTrait());

      return {
        traitCount: world.getWorldActor()?.getAllTraits().length ?? 0,
        hasTrait: world.worldTrait(TestTrait) !== undefined,
      };
    });

    expect(result.traitCount).toBe(1);
    expect(result.hasTrait).toBe(true);
  });
});
