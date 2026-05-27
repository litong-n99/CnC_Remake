import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 134 — Dynamic TechTree with Prerequisite Tokens', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('evaluatePrerequisites handles AND and OR correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const evalFn = (window as unknown as Record<string, unknown>)._evaluatePrerequisites as (
        expr: string,
        tokens: ReadonlySet<string>
      ) => boolean;

      const tokens = new Set(['barracks', 'weap', 'power']);

      return {
        simple: evalFn('~barracks', tokens),
        and: evalFn('~barracks,~weap', tokens),
        or: evalFn('~barracks|~stek', tokens),
        orMissing: evalFn('~stek|~gap', tokens),
        andMissing: evalFn('~barracks,~stek', tokens),
        empty: evalFn('', tokens),
        noPrefix: evalFn('barracks', tokens),
      };
    });

    expect(result.simple).toBe(true);
    expect(result.and).toBe(true);
    expect(result.or).toBe(true);
    expect(result.orMissing).toBe(false);
    expect(result.andMissing).toBe(false);
    expect(result.empty).toBe(true);
    expect(result.noPrefix).toBe(true);
  });

  test('extractTokens returns unique tokens without prefix', async ({ page }) => {
    const result = await page.evaluate(() => {
      const extract = (window as unknown as Record<string, unknown>)._extractTokens as (expr: string) => string[];
      return {
        single: extract('~barracks'),
        and: extract('~barracks,~weap'),
        or: extract('~barracks|~weap'),
        mixed: extract('~barracks,~weap|~stek'),
      };
    });

    expect(result.single).toEqual(['barracks']);
    expect(result.and).toEqual(['barracks', 'weap']);
    expect(result.or).toEqual(['barracks', 'weap']);
    expect(result.mixed).toEqual(['barracks', 'weap', 'stek']);
  });

  test('DynamicTechTree registers building tokens', async ({ page }) => {
    const result = await page.evaluate(() => {
      const DT = (window as unknown as Record<string, unknown>)._DynamicTechTree as new () => {
        registerBuilding: (type: string) => void;
        hasToken: (token: string) => boolean;
        isUnitAvailable: (type: string) => boolean;
        isBuildingAvailable: (type: string) => boolean;
      };

      const tree = new DT();
      tree.registerBuilding('STRUCT_BARRACKS');

      return {
        hasBarracks: tree.hasToken('barracks'),
        hasInfantry: tree.hasToken('infantry'),
        hasWeap: tree.hasToken('weap'),
        rifleAvailable: tree.isUnitAvailable('INFANTRY_E1'),
        tankAvailable: tree.isUnitAvailable('UNIT_LTANK'),
      };
    });

    expect(result.hasBarracks).toBe(true);
    expect(result.hasInfantry).toBe(true);
    expect(result.hasWeap).toBe(false);
    expect(result.rifleAvailable).toBe(true);
    expect(result.tankAvailable).toBe(false);
  });

  test('DynamicTechTree unregisterBuilding removes tokens', async ({ page }) => {
    const result = await page.evaluate(() => {
      const DT = (window as unknown as Record<string, unknown>)._DynamicTechTree as new () => {
        registerBuilding: (type: string) => void;
        unregisterBuilding: (type: string) => void;
        hasToken: (token: string) => boolean;
        isUnitAvailable: (type: string) => boolean;
      };

      const tree = new DT();
      tree.registerBuilding('STRUCT_BARRACKS');
      const before = tree.isUnitAvailable('INFANTRY_E1');
      tree.unregisterBuilding('STRUCT_BARRACKS');
      const after = tree.isUnitAvailable('INFANTRY_E1');

      return { before, after };
    });

    expect(result.before).toBe(true);
    expect(result.after).toBe(false);
  });

  test('DynamicTechTree building prerequisites work', async ({ page }) => {
    const result = await page.evaluate(() => {
      const DT = (window as unknown as Record<string, unknown>)._DynamicTechTree as new () => {
        registerBuilding: (type: string) => void;
        isBuildingAvailable: (type: string, requireConstYard?: boolean) => boolean;
        getMissingBuildingTokens: (type: string) => string[];
      };

      const tree = new DT();
      // Without any prerequisites (no refinery token)
      const noPrereqs = tree.isBuildingAvailable('STRUCT_RADAR', false);
      // With const yard but no refinery
      tree.registerBuilding('STRUCT_CONST');
      const noRefinery = tree.isBuildingAvailable('STRUCT_RADAR', true);
      // With refinery
      tree.registerBuilding('STRUCT_REFINERY');
      const withRefinery = tree.isBuildingAvailable('STRUCT_RADAR', true);
      const missing = tree.getMissingBuildingTokens('STRUCT_ADVANCED_TECH');

      return { noPrereqs, noRefinery, withRefinery, missing };
    });

    expect(result.noPrereqs).toBe(false); // no refinery token
    expect(result.noRefinery).toBe(false); // needs refinery
    expect(result.withRefinery).toBe(true);
    expect(result.missing).toContain('weap');
    expect(result.missing).toContain('radar');
  });

  test('DynamicTechTree clear resets all tokens', async ({ page }) => {
    const result = await page.evaluate(() => {
      const DT = (window as unknown as Record<string, unknown>)._DynamicTechTree as new () => {
        registerBuilding: (type: string) => void;
        clear: () => void;
        hasToken: (token: string) => boolean;
        getOwnedTokens: () => ReadonlySet<string>;
      };

      const tree = new DT();
      tree.registerBuilding('STRUCT_BARRACKS');
      tree.registerBuilding('STRUCT_WEAP');
      const before = tree.getOwnedTokens().size;
      tree.clear();
      const after = tree.getOwnedTokens().size;

      return { before, after };
    });

    expect(result.before).toBeGreaterThan(0);
    expect(result.after).toBe(0);
  });

  test('Building placement auto-registers tokens in game', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (type: number) => { dynamicTechTree: { hasToken: (t: string) => boolean } } | undefined;
        };
      };

      cnc.clear();
      cnc.placeBuildingDirect('Barracks', 'gdi', 30, 30);
      const gdi = HM.getInstance().getHouse(8)!;

      return {
        hasBarracksToken: gdi.dynamicTechTree.hasToken('barracks'),
        hasInfantryToken: gdi.dynamicTechTree.hasToken('infantry'),
      };
    });

    expect(result.hasBarracksToken).toBe(true);
    expect(result.hasInfantryToken).toBe(true);
  });

  test('Building sell auto-unregisters tokens', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (type: number) => { dynamicTechTree: { hasToken: (t: string) => boolean } } | undefined;
        };
      };

      cnc.clear();
      cnc.placeBuildingDirect('Barracks', 'gdi', 30, 30);
      const gdi = HM.getInstance().getHouse(8)!;
      const before = gdi.dynamicTechTree.hasToken('barracks');
      cnc.kill('buildings');
      const after = gdi.dynamicTechTree.hasToken('barracks');

      return { before, after };
    });

    expect(result.before).toBe(true);
    expect(result.after).toBe(false);
  });
});
