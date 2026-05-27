import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 135 — Faction Rules & Build Limits', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('BuildLimitTracker tracks add and remove', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Tracker = (window as unknown as Record<string, unknown>)._BuildLimitTracker as new () => {
        add: (id: string) => void;
        remove: (id: string) => void;
        getCount: (id: string) => number;
        isAtLimit: (id: string, limit: number) => boolean;
      };

      const tracker = new Tracker();
      tracker.add('Tanya');
      tracker.add('Tanya');
      const count2 = tracker.getCount('Tanya');
      const atLimit2 = tracker.isAtLimit('Tanya', 2);
      tracker.remove('Tanya');
      const count1 = tracker.getCount('Tanya');
      const atLimit1 = tracker.isAtLimit('Tanya', 2);
      tracker.remove('Tanya');
      const count0 = tracker.getCount('Tanya');
      tracker.remove('Tanya'); // 重复 remove 不应出错
      const countAfterExtra = tracker.getCount('Tanya');

      return { count2, atLimit2, count1, atLimit1, count0, countAfterExtra };
    });

    expect(result.count2).toBe(2);
    expect(result.atLimit2).toBe(true);
    expect(result.count1).toBe(1);
    expect(result.atLimit1).toBe(false);
    expect(result.count0).toBe(0);
    expect(result.countAfterExtra).toBe(0);
  });

  test('checkBuildLimit respects limit', async ({ page }) => {
    const result = await page.evaluate(() => {
      const check = (window as unknown as Record<string, unknown>)._checkBuildLimit as (
        tracker: { getCount: (id: string) => number; isAtLimit: (id: string, limit: number) => boolean },
        typeId: string,
        limit?: number
      ) => boolean;
      const Tracker = (window as unknown as Record<string, unknown>)._BuildLimitTracker as new () => {
        add: (id: string) => void;
        getCount: (id: string) => number;
        isAtLimit: (id: string, limit: number) => boolean;
      };

      const tracker = new Tracker();
      tracker.add('Tanya');

      return {
        noLimit: check(tracker, 'Tanya', undefined),
        atLimit: check(tracker, 'Tanya', 1),
        belowLimit: check(tracker, 'Tanya', 2),
        zeroLimit: check(tracker, 'Tanya', 0),
      };
    });

    expect(result.noLimit).toBe(true);
    expect(result.atLimit).toBe(false);
    expect(result.belowLimit).toBe(true);
    expect(result.zeroLimit).toBe(true);
  });

  test('houseTypeToFaction maps correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const houseTypeToFaction = (window as unknown as Record<string, unknown>)._houseTypeToFaction as (
        houseType: number
      ) => string;

      return {
        ussr: houseTypeToFaction(2), // USSR
        greece: houseTypeToFaction(1), // Greece
        gdi: houseTypeToFaction(8), // GDI
        nod: houseTypeToFaction(9), // Nod
      };
    });

    expect(result.ussr).toBe('soviet');
    expect(result.greece).toBe('allies');
    expect(result.gdi).toBe('gdi');
    expect(result.nod).toBe('nod');
  });

  test('getFactionToken returns correct token', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getToken = (window as unknown as Record<string, unknown>)._getFactionToken as (faction: string) => string;
      const Faction = (window as unknown as Record<string, unknown>)._Faction as Record<string, string>;

      return {
        allies: getToken(Faction.Allies),
        soviet: getToken(Faction.Soviet),
        soviet: getToken(Faction.Soviet),
        gdi: getToken(Faction.GDI),
        nod: getToken(Faction.Nod),
      };
    });

    expect(result.allies).toBe('structures.allies');
    expect(result.soviet).toBe('structures.soviet');
    expect(result.gdi).toBe('structures.gdi');
    expect(result.nod).toBe('structures.nod');
  });

  test('canFactionBuild respects faction exclusivity', async ({ page }) => {
    const result = await page.evaluate(() => {
      const canBuild = (window as unknown as Record<string, unknown>)._canFactionBuild as (
        typeId: string,
        faction: string
      ) => boolean;
      const Faction = (window as unknown as Record<string, unknown>)._Faction as Record<string, string>;

      return {
        tanyaForAllies: canBuild('INFANTRY_TANYA', Faction.Allies),
        tanyaForSoviet: canBuild('INFANTRY_TANYA', Faction.Soviet),
        dogForSoviet: canBuild('INFANTRY_DOG', Faction.Soviet),
        dogForAllies: canBuild('INFANTRY_DOG', Faction.Allies),
        tankForAll: canBuild('UNIT_LTANK', Faction.Allies),
      };
    });

    expect(result.tanyaForAllies).toBe(true);
    expect(result.tanyaForSoviet).toBe(false);
    expect(result.dogForSoviet).toBe(true);
    expect(result.dogForAllies).toBe(false);
    expect(result.tankForAll).toBe(true);
  });

  test('House has buildLimitTracker instance', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          getHouse: (
            type: number
          ) => { buildLimitTracker: { add: (id: string) => void; getCount: (id: string) => number } } | undefined;
        };
      };
      const gdi = HM.getInstance().getHouse(8)!;
      gdi.buildLimitTracker.add('TestUnit');
      const count = gdi.buildLimitTracker.getCount('TestUnit');
      return { hasTracker: true, count };
    });

    expect(result.hasTracker).toBe(true);
    expect(result.count).toBe(1);
  });
});
