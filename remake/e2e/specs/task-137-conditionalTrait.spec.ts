import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 137 — Conditional Trait System', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('ConditionManager tracks conditions', async ({ page }) => {
    const result = await page.evaluate(() => {
      const CM = (window as unknown as Record<string, unknown>)._ConditionManager as new () => {
        add: (c: string) => void;
        remove: (c: string) => void;
        has: (c: string) => boolean;
        getAll: () => ReadonlySet<string>;
      };

      const mgr = new CM();
      mgr.add('hasPower');
      mgr.add('veteran');
      const hasPower = mgr.has('hasPower');
      const hasVeteran = mgr.has('veteran');
      mgr.remove('hasPower');
      const afterRemove = mgr.has('hasPower');
      const stillHasVeteran = mgr.has('veteran');

      return { hasPower, hasVeteran, afterRemove, stillHasVeteran, count: mgr.getAll().size };
    });

    expect(result.hasPower).toBe(true);
    expect(result.hasVeteran).toBe(true);
    expect(result.afterRemove).toBe(false);
    expect(result.stillHasVeteran).toBe(true);
    expect(result.count).toBe(1);
  });

  test('evaluateConditions checks AND logic', async ({ page }) => {
    const result = await page.evaluate(() => {
      const CM = (window as unknown as Record<string, unknown>)._ConditionManager as new () => {
        add: (c: string) => void;
      };
      const evaluate = (window as unknown as Record<string, unknown>)._evaluateConditions as (
        required: string[],
        manager: { has: (c: string) => boolean }
      ) => boolean;

      const mgr = new CM();
      mgr.add('power');

      return {
        empty: evaluate([], mgr as unknown as { has: (c: string) => boolean }),
        singleMet: evaluate(['power'], mgr as unknown as { has: (c: string) => boolean }),
        singleMissing: evaluate(['radar'], mgr as unknown as { has: (c: string) => boolean }),
        mixed: evaluate(['power', 'radar'], mgr as unknown as { has: (c: string) => boolean }),
      };
    });

    expect(result.empty).toBe(true);
    expect(result.singleMet).toBe(true);
    expect(result.singleMissing).toBe(false);
    expect(result.mixed).toBe(false);
  });

  test('GrantConditionOnPrerequisite injects condition when token owned', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (type: number) => { dynamicTechTree: { registerBuilding: (type: string) => void } } | undefined;
        };
      };
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: { name: string; type: number }
      ) => { addTrait: (t: unknown) => void; tick: (dt: number) => void };
      const GrantCondition = (window as unknown as Record<string, unknown>)
        ._GrantConditionOnPrerequisite as new (opts: { prerequisite: string; condition: string }) => unknown;
      const getCM = (window as unknown as Record<string, unknown>)._getConditionManager as (
        actor: unknown
      ) => { has: (c: string) => boolean } | undefined;

      const gdi = HM.getInstance().getHouse(8)!;
      gdi.dynamicTechTree.registerBuilding('STRUCT_ADVANCED_TECH'); // provides 'stek'

      const actor = new Actor('test-actor', gdi, { name: 'Test', type: 1 });
      const trait = new GrantCondition({ prerequisite: 'stek', condition: 'supercharged' });
      actor.addTrait(trait);
      actor.tick(1);

      const mgr = getCM(actor);
      return {
        hasCondition: mgr?.has('supercharged') ?? false,
      };
    });

    expect(result.hasCondition).toBe(true);
  });

  test('GrantConditionOnPrerequisite removes condition when token lost', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) =>
            | {
                dynamicTechTree: {
                  registerBuilding: (type: string) => void;
                  unregisterBuilding: (type: string) => void;
                };
              }
            | undefined;
        };
      };
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: { name: string; type: number }
      ) => { addTrait: (t: unknown) => void; tick: (dt: number) => void };
      const GrantCondition = (window as unknown as Record<string, unknown>)
        ._GrantConditionOnPrerequisite as new (opts: { prerequisite: string; condition: string }) => unknown;
      const getCM = (window as unknown as Record<string, unknown>)._getConditionManager as (
        actor: unknown
      ) => { has: (c: string) => boolean } | undefined;

      const gdi = HM.getInstance().getHouse(8)!;
      gdi.dynamicTechTree.registerBuilding('STRUCT_ADVANCED_TECH');

      const actor = new Actor('test-actor-2', gdi, { name: 'Test', type: 1 });
      const trait = new GrantCondition({ prerequisite: 'stek', condition: 'supercharged' });
      actor.addTrait(trait);
      actor.tick(1);
      const before = getCM(actor)?.has('supercharged');

      gdi.dynamicTechTree.unregisterBuilding('STRUCT_ADVANCED_TECH');
      actor.tick(1);
      const after = getCM(actor)?.has('supercharged');

      return { before, after };
    });

    expect(result.before).toBe(true);
    expect(result.after).toBe(false);
  });

  test('PauseOnCondition disables trait when condition present', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: { name: string; type: number }
      ) => { addTrait: (t: unknown) => void; tick: (dt: number) => void };
      const PauseOnCondition = (window as unknown as Record<string, unknown>)._PauseOnCondition as new (opts: {
        pauseConditions: string[];
      }) => { enabled: boolean };
      const getCM = (window as unknown as Record<string, unknown>)._getOrCreateConditionManager as (actor: unknown) => {
        add: (c: string) => void;
        remove: (c: string) => void;
      };

      const actor = new Actor('test-actor-3', {}, { name: 'Test', type: 1 });
      const pauseTrait = new PauseOnCondition({ pauseConditions: ['lowPower'] });
      actor.addTrait(pauseTrait);

      const beforePause = pauseTrait.enabled;
      const mgr = getCM(actor);
      mgr.add('lowPower');
      // PauseOnCondition 的 watch 回调会被触发
      // 但由于 watch 是在 onCreated 中注册的， WeakMap 方案下需要 tick 来更新
      // 手动更新：PauseOnCondition 的 updateEnabledState 是私有的，但 tick 会调用
      actor.tick(1);
      const afterPause = pauseTrait.enabled;

      mgr.remove('lowPower');
      actor.tick(1);
      const afterResume = pauseTrait.enabled;

      return { beforePause, afterPause, afterResume };
    });

    expect(result.beforePause).toBe(true);
    expect(result.afterPause).toBe(false);
    expect(result.afterResume).toBe(true);
  });
});
