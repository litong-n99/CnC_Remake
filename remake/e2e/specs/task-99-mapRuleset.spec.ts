import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 99 — Map Ruleset Overrides', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('applyMapRules overrides MediumTank.speed from 6 to 9', async ({ page }) => {
    const result = await page.evaluate(() => {
      const applyMapRules = (window as unknown as Record<string, unknown>)._applyMapRules as (rules: {
        units?: Record<string, Record<string, number>>;
      }) => { units: number; buildings: number; weapons: number; gameRules: number };
      const resetMapRules = (window as unknown as Record<string, unknown>)._resetMapRules as () => void;
      const getOriginalUnitDefinition = (window as unknown as Record<string, unknown>)._getOriginalUnitDefinition as (
        type: string
      ) => { speed: number } | undefined;

      // Reset first to ensure clean state
      resetMapRules();
      const originalSpeed = getOriginalUnitDefinition('MediumTank')?.speed;

      // Apply map override
      const stats = applyMapRules({
        units: {
          MediumTank: { speed: 9 },
        },
      });

      // Query current speed via UNIT_DEFINITIONS
      const UNIT_DEFINITIONS = (window as unknown as Record<string, unknown>).UNIT_DEFINITIONS as Record<
        string,
        { speed: number }
      >;
      const newSpeed = UNIT_DEFINITIONS.MediumTank.speed;

      return { originalSpeed, newSpeed, unitOverrides: stats.units };
    });

    expect(result.originalSpeed).toBe(6);
    expect(result.newSpeed).toBe(9);
    expect(result.unitOverrides).toBe(1);
  });

  test('whitelist blocks non-numeric and non-whitelisted field overrides', async ({ page }) => {
    const result = await page.evaluate(() => {
      const applyMapRules = (window as unknown as Record<string, unknown>)._applyMapRules as (rules: {
        units?: Record<string, Record<string, unknown>>;
      }) => { units: number; buildings: number; weapons: number; gameRules: number };
      const resetMapRules = (window as unknown as Record<string, unknown>)._resetMapRules as () => void;

      resetMapRules();

      // Try to override speed (whitelisted, should work) + name (not whitelisted, blocked) + locomotion (blocked)
      const stats = applyMapRules({
        units: {
          MediumTank: {
            speed: 12,
            name: 'HackedTank',
            locomotion: 99,
          } as Record<string, unknown>,
        },
      });

      const UNIT_DEFINITIONS = (window as unknown as Record<string, unknown>).UNIT_DEFINITIONS as Record<
        string,
        { speed: number; name: string; locomotion: number }
      >;

      return {
        speed: UNIT_DEFINITIONS.MediumTank.speed,
        name: UNIT_DEFINITIONS.MediumTank.name,
        locomotion: UNIT_DEFINITIONS.MediumTank.locomotion,
        unitOverrides: stats.units,
      };
    });

    expect(result.speed).toBe(12); // whitelisted numeric → applied
    expect(result.name).not.toBe('HackedTank'); // not whitelisted → blocked
    expect(result.unitOverrides).toBe(1); // only speed applied
  });

  test('resetMapRules restores original values', async ({ page }) => {
    const result = await page.evaluate(() => {
      const applyMapRules = (window as unknown as Record<string, unknown>)._applyMapRules as (rules: {
        units?: Record<string, Record<string, number>>;
      }) => void;
      const resetMapRules = (window as unknown as Record<string, unknown>)._resetMapRules as () => void;
      const getOriginalUnitDefinition = (window as unknown as Record<string, unknown>)._getOriginalUnitDefinition as (
        type: string
      ) => { speed: number } | undefined;

      resetMapRules();
      const originalSpeed = getOriginalUnitDefinition('MediumTank')?.speed;

      applyMapRules({
        units: {
          MediumTank: { speed: 99 },
        },
      });
      const overriddenSpeed = (
        (window as unknown as Record<string, unknown>).UNIT_DEFINITIONS as Record<string, { speed: number }>
      ).MediumTank.speed;

      resetMapRules();
      const restoredSpeed = (
        (window as unknown as Record<string, unknown>).UNIT_DEFINITIONS as Record<string, { speed: number }>
      ).MediumTank.speed;

      return { originalSpeed, overriddenSpeed, restoredSpeed };
    });

    expect(result.originalSpeed).toBe(6);
    expect(result.overriddenSpeed).toBe(99);
    expect(result.restoredSpeed).toBe(6);
  });

  test('IRulesetLoaded callback is triggered after applyMapRules', async ({ page }) => {
    const result = await page.evaluate(() => {
      const applyMapRules = (window as unknown as Record<string, unknown>)._applyMapRules as (rules: {
        units?: Record<string, Record<string, number>>;
      }) => void;
      const resetMapRules = (window as unknown as Record<string, unknown>)._resetMapRules as () => void;
      const registerListener = (window as unknown as Record<string, unknown>)
        ._registerRulesetLoadedListener as (listener: { onRulesetLoaded: () => void }) => void;
      const clearListeners = (window as unknown as Record<string, unknown>)._clearRulesetLoadedListeners as () => void;

      resetMapRules();
      clearListeners();

      let callCount = 0;
      registerListener({
        onRulesetLoaded: () => {
          callCount++;
        },
      });

      applyMapRules({
        units: {
          MediumTank: { speed: 8 },
        },
      });

      return { callCount };
    });

    expect(result.callCount).toBe(1);
  });

  test('applyMapRules supports gameRules override', async ({ page }) => {
    const result = await page.evaluate(() => {
      const applyMapRules = (window as unknown as Record<string, unknown>)._applyMapRules as (rules: {
        gameRules?: Record<string, number>;
      }) => void;
      const resetMapRules = (window as unknown as Record<string, unknown>)._resetMapRules as () => void;

      resetMapRules();

      const GameRules = (window as unknown as Record<string, unknown>).GameRules as {
        soloCrateMoney: number;
      };
      const original = GameRules.soloCrateMoney;

      applyMapRules({
        gameRules: {
          soloCrateMoney: 5000,
        },
      });

      const overridden = GameRules.soloCrateMoney;

      resetMapRules();
      const restored = GameRules.soloCrateMoney;

      return { original, overridden, restored };
    });

    expect(result.original).toBe(2000);
    expect(result.overridden).toBe(5000);
    expect(result.restored).toBe(2000);
  });
});
