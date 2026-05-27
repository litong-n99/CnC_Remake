import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 23.32 — HousePower Auto-Summation', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('building placement auto-registers power contribution', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;
      cnc.clear();
      cnc.placeBuildingDirect('PowerPlant', 'gdi', 30, 30);

      const house = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (
          type: number
        ) =>
          | {
              housePower: {
                totalProduction: number;
                totalConsumption: number;
                getBalance: () => number;
                getRegisteredCount: () => number;
              };
            }
          | undefined;
      };
      const gdi = house.getHouse(8); // HouseType.GDI
      return {
        production: gdi?.housePower.totalProduction,
        consumption: gdi?.housePower.totalConsumption,
        balance: gdi?.housePower.getBalance(),
        registeredCount: gdi?.housePower.getRegisteredCount(),
      };
    });

    expect(result.production).toBe(100);
    expect(result.consumption).toBe(0);
    expect(result.balance).toBe(100);
    expect(result.registeredCount).toBe(1);
  });

  test('selling building auto-unregisters power', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;
      cnc.clear();
      const b = cnc.placeBuildingDirect('PowerPlant', 'gdi', 30, 30) as { id?: string };
      const house = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (
          type: number
        ) => { housePower: { totalProduction: number; getRegisteredCount: () => number } } | undefined;
      };
      const gdiBefore = house.getHouse(8);
      const before = {
        production: gdiBefore?.housePower.totalProduction,
        count: gdiBefore?.housePower.getRegisteredCount(),
      };

      cnc.sell(b.id);
      const gdiAfter = house.getHouse(8);
      const after = {
        production: gdiAfter?.housePower.totalProduction,
        count: gdiAfter?.housePower.getRegisteredCount(),
      };

      return { before, after };
    });

    expect(result.before.production).toBe(100);
    expect(result.before.count).toBe(1);
    expect(result.after.production).toBe(0);
    expect(result.after.count).toBe(0);
  });

  test('multiple buildings sum power correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;
      cnc.clear();
      cnc.placeBuildingDirect('PowerPlant', 'gdi', 30, 30); // +100
      cnc.placeBuildingDirect('AdvancedPower', 'gdi', 32, 30); // +200
      cnc.placeBuildingDirect('Barracks', 'gdi', 34, 30); // -20

      const house = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (
          type: number
        ) =>
          | { housePower: { totalProduction: number; totalConsumption: number; getBalance: () => number } }
          | undefined;
      };
      const gdi = house.getHouse(8);
      return {
        production: gdi?.housePower.totalProduction,
        consumption: gdi?.housePower.totalConsumption,
        balance: gdi?.housePower.getBalance(),
      };
    });

    expect(result.production).toBe(300);
    expect(result.consumption).toBe(20);
    expect(result.balance).toBe(280);
  });

  test('low power state is detected correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;
      cnc.clear();
      // Only build a barracks (consumes 20) without any power plant
      cnc.placeBuildingDirect('Barracks', 'gdi', 30, 30); // -20

      const house = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (type: number) => { housePower: { isLowPower: () => boolean; getBalance: () => number } } | undefined;
      };
      const gdi = house.getHouse(8);
      return {
        isLowPower: gdi?.housePower.isLowPower(),
        balance: gdi?.housePower.getBalance(),
      };
    });

    expect(result.isLowPower).toBe(true);
    expect(result.balance).toBe(-20);
  });
});
