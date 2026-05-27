import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 96 — Light Trait/Component System', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('TraitRegistry can register and create traits', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TR = (window as unknown as Record<string, unknown>)._TraitRegistry as {
        register: (type: string, factory: () => unknown) => void;
        create: (type: string) => unknown;
        has: (type: string) => boolean;
        getRegisteredTypes: () => string[];
        clear: () => void;
      };
      const Trait = (window as unknown as Record<string, unknown>)._Trait as new () => { status: string };

      TR.clear();
      TR.register('TestTrait', () => new Trait());

      const trait = TR.create('TestTrait');
      return {
        hasTest: TR.has('TestTrait'),
        hasUnknown: TR.has('Unknown'),
        types: TR.getRegisteredTypes(),
        traitCreated: trait !== null,
        traitStatus: (trait as { status: string } | null)?.status ?? null,
      };
    });

    expect(result.hasTest).toBe(true);
    expect(result.hasUnknown).toBe(false);
    expect(result.types).toContain('TestTrait');
    expect(result.traitCreated).toBe(true);
    expect(result.traitStatus).toBe('idle');
  });

  test('Actor can mount Health and Render traits', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: { id: number; name: string },
        info: { name: string; type: string; strength?: number }
      ) => unknown;
      const HealthTrait = (window as unknown as Record<string, unknown>)._HealthTrait as new (maxHealth: number) => {
        health: number;
        maxHealth: number;
        isAlive: () => boolean;
        getHealthPercent: () => number;
      };
      const RenderTrait = (window as unknown as Record<string, unknown>)._RenderTrait as new (color?: string) => {
        color: string;
        visible: boolean;
      };
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => { getHouse: (type: number) => { id: number; name: string } | undefined };
      };

      const gdi = HM.getInstance().getHouse(8)!;
      const actor = new Actor('test-actor-1', gdi, { name: 'TestUnit', type: 'UNIT', strength: 100 });
      const health = new HealthTrait(100);
      const render = new RenderTrait('#FF0000');

      (actor as { addTrait: (t: unknown) => void }).addTrait(health);
      (actor as { addTrait: (t: unknown) => void }).addTrait(render);

      const allTraits = (actor as { getAllTraits: () => unknown[] }).getAllTraits();

      return {
        traitCount: allTraits.length,
        health: health.health,
        maxHealth: health.maxHealth,
        isAlive: health.isAlive(),
        healthPercent: health.getHealthPercent(),
        renderColor: render.color,
        renderVisible: render.visible,
      };
    });

    expect(result.traitCount).toBe(2);
    expect(result.health).toBe(100);
    expect(result.maxHealth).toBe(100);
    expect(result.isAlive).toBe(true);
    expect(result.healthPercent).toBe(1);
    expect(result.renderColor).toBe('#FF0000');
    expect(result.renderVisible).toBe(true);
  });

  test('HealthTrait takeDamage and heal work correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HealthTrait = (window as unknown as Record<string, unknown>)._HealthTrait as new (maxHealth: number) => {
        health: number;
        takeDamage: (amount: number) => void;
        heal: (amount: number) => void;
        isAlive: () => boolean;
        getHealthPercent: () => number;
      };

      const health = new HealthTrait(100);
      health.takeDamage(30);
      const afterDamage = health.health;
      health.heal(10);
      const afterHeal = health.health;
      health.takeDamage(200);
      const afterOverkill = health.health;

      return {
        afterDamage,
        afterHeal,
        afterOverkill,
        isAlive: health.isAlive(),
        healthPercent: health.getHealthPercent(),
      };
    });

    expect(result.afterDamage).toBe(70);
    expect(result.afterHeal).toBe(80);
    expect(result.afterOverkill).toBe(0);
    expect(result.isAlive).toBe(false);
    expect(result.healthPercent).toBe(0);
  });

  test('Actor trait lifecycle hooks are called', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TR = (window as unknown as Record<string, unknown>)._TraitRegistry as {
        register: (type: string, factory: () => unknown) => void;
        create: (type: string) => unknown;
        clear: () => void;
      };
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: { id: number },
        info: { name: string; type: string }
      ) => { addTrait: (t: unknown) => void; getAllTraits: () => { status: string }[]; destroy: () => void };
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => { getHouse: (type: number) => { id: number } | undefined };
      };
      const Trait = (window as unknown as Record<string, unknown>)._Trait as new () => {
        status: string;
        onCreated: () => void;
        onRemoved: () => void;
      };

      TR.clear();
      TR.register('LifecycleTrait', () => new Trait());

      const gdi = HM.getInstance().getHouse(8)!;
      const actor = new Actor('lifecycle-test', gdi, { name: 'Test', type: 'UNIT' });
      const trait = TR.create('LifecycleTrait') as {
        status: string;
        onCreated: (a: unknown) => void;
        onRemoved: (a: unknown) => void;
      };

      const beforeCreate = trait.status;
      actor.addTrait(trait);
      const afterCreate = trait.status;
      actor.destroy();
      const afterDestroy = trait.status;

      return { beforeCreate, afterCreate, afterDestroy };
    });

    expect(result.beforeCreate).toBe('idle');
    expect(result.afterCreate).toBe('active');
    expect(result.afterDestroy).toBe('removed');
  });

  test('Actor tick propagates to all traits', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ArmamentTrait = (window as unknown as Record<string, unknown>)._ArmamentTrait as new (name: string) => {
        canFire: () => boolean;
        fire: (cd: number) => void;
      };
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: { id: number },
        info: { name: string; type: string }
      ) => { addTrait: (t: unknown) => void; tick: (dt: number) => void };
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => { getHouse: (type: number) => { id: number } | undefined };
      };

      const gdi = HM.getInstance().getHouse(8)!;
      const actor = new Actor('tick-test', gdi, { name: 'Test', type: 'UNIT' });
      const armament = new ArmamentTrait('Cannon');

      actor.addTrait(armament);
      armament.fire(5);
      const beforeTick = armament.canFire();

      // tick 5 times
      for (let i = 0; i < 5; i++) {
        actor.tick(1);
      }
      const afterTick = armament.canFire();

      return { beforeTick: !beforeTick, afterTick };
    });

    expect(result.beforeTick).toBe(true); // cooldown was active
    expect(result.afterTick).toBe(true); // cooldown finished
  });

  test('TraitRegistry create returns null for unknown type', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TR = (window as unknown as Record<string, unknown>)._TraitRegistry as {
        create: (type: string) => unknown;
        clear: () => void;
      };
      TR.clear();
      return TR.create('NonExistent');
    });

    expect(result).toBeNull();
  });
});
