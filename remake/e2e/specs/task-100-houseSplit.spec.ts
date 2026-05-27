import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 100 — House God Class Split', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('House exposes sub-modules (economy, production, statistics, techTree)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => { getHouse: (type: number) => Record<string, unknown> | undefined };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      return {
        hasEconomy: 'economy' in gdi,
        hasProduction: 'production' in gdi,
        hasStatistics: 'statistics' in gdi,
        hasTechTree: 'techTree' in gdi,
        hasPower: 'housePower' in gdi,
        hasDiplomacy: 'diplomacy' in gdi,
      };
    });

    expect(result.hasEconomy).toBe(true);
    expect(result.hasProduction).toBe(true);
    expect(result.hasStatistics).toBe(true);
    expect(result.hasTechTree).toBe(true);
    expect(result.hasPower).toBe(true);
    expect(result.hasDiplomacy).toBe(true);
  });

  test('HouseEconomy manages credits independently', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) =>
            | {
                economy: {
                  credits: number;
                  addCredits: (n: number) => void;
                  spendCredits: (n: number) => boolean;
                  tiberium: number;
                  capacity: number;
                };
              }
            | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      const before = gdi.economy.credits;
      gdi.economy.addCredits(5000);
      const afterAdd = gdi.economy.credits;
      const spent = gdi.economy.spendCredits(3000);
      const afterSpend = gdi.economy.credits;
      return { before, afterAdd, afterSpend, spent, tiberium: gdi.economy.tiberium, capacity: gdi.economy.capacity };
    });

    expect(result.before).toBe(result.before);
    expect(result.afterAdd).toBe(result.before + 5000);
    expect(result.spent).toBe(true);
    expect(result.afterSpend).toBe(result.before + 2000);
    expect(result.tiberium).toBe(0);
  });

  test('HouseProduction tracks counts and available types', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) =>
            | {
                production: {
                  curBuildings: number;
                  curUnits: number;
                  addBuilding: (id: string) => void;
                  addUnit: (id: string) => void;
                  hasBuilding: (id: string) => boolean;
                  availableBuildings: Set<string>;
                };
              }
            | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      const before = { buildings: gdi.production.curBuildings, units: gdi.production.curUnits };
      gdi.production.addBuilding('PowerPlant');
      gdi.production.addUnit('MediumTank');
      const after = {
        buildings: gdi.production.curBuildings,
        units: gdi.production.curUnits,
        hasPowerPlant: gdi.production.hasBuilding('PowerPlant'),
      };
      return { before, after };
    });

    expect(result.after.buildings).toBe(result.before.buildings + 1);
    expect(result.after.units).toBe(result.before.units + 1);
    expect(result.after.hasPowerPlant).toBe(true);
  });

  test('HouseStatistics tracks destroyed counts', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) =>
            | {
                statistics: {
                  destroyedBuildings: number;
                  destroyedUnits: number;
                  onBuildingDestroyed: () => void;
                  onUnitDestroyed: () => void;
                };
              }
            | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      const before = { buildings: gdi.statistics.destroyedBuildings, units: gdi.statistics.destroyedUnits };
      gdi.statistics.onBuildingDestroyed();
      gdi.statistics.onUnitDestroyed();
      gdi.statistics.onUnitDestroyed();
      const after = { buildings: gdi.statistics.destroyedBuildings, units: gdi.statistics.destroyedUnits };
      return { before, after };
    });

    expect(result.after.buildings).toBe(result.before.buildings + 1);
    expect(result.after.units).toBe(result.before.units + 2);
  });

  test('HouseTechTree manages available buildings', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) =>
            | {
                techTree: {
                  hasBuilding: (id: string) => boolean;
                  addBuilding: (id: string) => void;
                  removeBuilding: (id: string) => void;
                };
              }
            | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      const before = gdi.techTree.hasBuilding('Barracks');
      gdi.techTree.addBuilding('Barracks');
      const afterAdd = gdi.techTree.hasBuilding('Barracks');
      gdi.techTree.removeBuilding('Barracks');
      const afterRemove = gdi.techTree.hasBuilding('Barracks');
      return { before, afterAdd, afterRemove };
    });

    expect(result.before).toBe(false);
    expect(result.afterAdd).toBe(true);
    expect(result.afterRemove).toBe(false);
  });

  test('backward compatibility: House.addCredits still works', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (type: number) => { addCredits: (n: number) => void; credits: number } | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      const before = gdi.credits;
      gdi.addCredits(1000);
      return { before, after: gdi.credits };
    });

    expect(result.after).toBe(result.before + 1000);
  });

  test('backward compatibility: House.hasBuilding still works', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) =>
            | {
                hasBuilding: (id: string) => boolean;
                production: { availableBuildings: string[] };
                techTree: { availableBuildings: string[] };
              }
            | undefined;
        };
      };
      cnc.clear();
      cnc.placeBuildingDirect('PowerPlant', 'gdi', 30, 30);
      const gdi = HM.getInstance().getHouse(8)!;
      return {
        hasBuilding: gdi.hasBuilding('STRUCT_POWER'),
        prodBuildings: Array.from(gdi.production.availableBuildings),
        treeBuildings: Array.from(gdi.techTree.availableBuildings),
      };
    });

    expect(result.hasBuilding).toBe(true);
  });
});
