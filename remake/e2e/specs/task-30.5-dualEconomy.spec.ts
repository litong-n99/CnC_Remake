import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 30.5 — Dual Economy (Cash + Resources)', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('HouseEconomy has resources and capacity fields', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (type: number) => { economy: { credits: number; tiberium: number; capacity: number } } | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      return {
        hasCredits: typeof gdi.economy.credits === 'number',
        hasTiberium: typeof gdi.economy.tiberium === 'number',
        hasCapacity: typeof gdi.economy.capacity === 'number',
      };
    });

    expect(result.hasCredits).toBe(true);
    expect(result.hasTiberium).toBe(true);
    expect(result.hasCapacity).toBe(true);
  });

  test('giveResources stores ore up to capacity', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) => { economy: { tiberium: number; capacity: number; giveResources: (n: number) => number } } | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      gdi.economy.capacity = 100;
      gdi.economy.tiberium = 0;

      const stored1 = gdi.economy.giveResources(60);
      const tiberium1 = gdi.economy.tiberium;

      const stored2 = gdi.economy.giveResources(60);
      const tiberium2 = gdi.economy.tiberium;

      return { stored1, tiberium1, stored2, tiberium2 };
    });

    expect(result.stored1).toBe(60);
    expect(result.tiberium1).toBe(60);
    expect(result.stored2).toBe(40); // capped at capacity 100
    expect(result.tiberium2).toBe(100);
  });

  test('takeCash spends resources first then cash', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) => { economy: { credits: number; tiberium: number; takeCash: (n: number) => boolean } } | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      gdi.economy.credits = 100;
      gdi.economy.tiberium = 50;

      const ok = gdi.economy.takeCash(120);
      return {
        success: ok,
        credits: gdi.economy.credits,
        tiberium: gdi.economy.tiberium,
      };
    });

    expect(result.success).toBe(true);
    expect(result.tiberium).toBe(0); // all 50 resources spent
    expect(result.credits).toBe(30); // 100 - (120 - 50) = 30
  });

  test('takeCash fails when total spendable is insufficient', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) => { economy: { credits: number; tiberium: number; takeCash: (n: number) => boolean } } | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      gdi.economy.credits = 50;
      gdi.economy.tiberium = 30;

      const ok = gdi.economy.takeCash(100);
      return {
        success: ok,
        credits: gdi.economy.credits,
        tiberium: gdi.economy.tiberium,
      };
    });

    expect(result.success).toBe(false);
    expect(result.credits).toBe(50); // unchanged
    expect(result.tiberium).toBe(30); // unchanged
  });

  test('refineResources converts ore to cash', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) => { economy: { credits: number; tiberium: number; refineResources: (n: number) => number } } | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      gdi.economy.credits = 100;
      gdi.economy.tiberium = 80;

      const refined = gdi.economy.refineResources(50);
      return {
        refined,
        credits: gdi.economy.credits,
        tiberium: gdi.economy.tiberium,
      };
    });

    expect(result.refined).toBe(50);
    expect(result.credits).toBe(150);
    expect(result.tiberium).toBe(30);
  });

  test('getTotalSpendable returns cash + resources', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) => { economy: { credits: number; tiberium: number; getTotalSpendable: () => number } } | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      gdi.economy.credits = 200;
      gdi.economy.tiberium = 100;
      return gdi.economy.getTotalSpendable();
    });

    expect(result).toBe(300);
  });
});
