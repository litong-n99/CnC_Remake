import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 136 — Game Speeds & Lobby Options', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('GameSpeeds define 5 speed tiers', async ({ page }) => {
    const result = await page.evaluate(() => {
      const speeds = (window as unknown as Record<string, unknown>)._GameSpeeds as Record<
        string,
        { name: string; timestep: number; speedMultiplier: number }
      >;
      return {
        count: Object.keys(speeds).length,
        slowestTimestep: speeds.slowest.timestep,
        normalTimestep: speeds.normal.timestep,
        fastestTimestep: speeds.fastest.timestep,
        normalMultiplier: speeds.normal.speedMultiplier,
        fastestMultiplier: speeds.fastest.speedMultiplier,
      };
    });

    expect(result.count).toBe(5);
    expect(result.slowestTimestep).toBe(60);
    expect(result.normalTimestep).toBe(40);
    expect(result.fastestTimestep).toBe(20);
    expect(result.normalMultiplier).toBe(1.0);
    expect(result.fastestMultiplier).toBe(2.0);
  });

  test('getGameSpeed returns correct config', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getSpeed = (window as unknown as Record<string, unknown>)._getGameSpeed as (key: string) => {
        name: string;
        timestep: number;
      };
      const fast = getSpeed('fast');
      return { name: fast.name, timestep: fast.timestep };
    });

    expect(result.name).toBe('Fast');
    expect(result.timestep).toBe(30);
  });

  test('getSpeedRatio calculates relative speed', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getRatio = (window as unknown as Record<string, unknown>)._getSpeedRatio as (
        target: string,
        base?: string
      ) => number;
      return {
        fastestVsNormal: getRatio('fastest', 'normal'),
        slowestVsNormal: getRatio('slowest', 'normal'),
        fastVsNormal: getRatio('fast', 'normal'),
      };
    });

    expect(result.fastestVsNormal).toBe(2.0);
    expect(result.slowestVsNormal).toBe(0.5);
    expect(result.fastVsNormal).toBeCloseTo(1.33, 2);
  });

  test('LobbyOptions has default values', async ({ page }) => {
    const result = await page.evaluate(() => {
      const defaults = (window as unknown as Record<string, unknown>)._DefaultLobbyOptions as {
        gameSpeed: string;
        techLevel: string | number;
        startingCash: number;
        shortGame: boolean;
        crates: boolean;
      };
      return {
        gameSpeed: defaults.gameSpeed,
        techLevel: defaults.techLevel,
        startingCash: defaults.startingCash,
        shortGame: defaults.shortGame,
        crates: defaults.crates,
      };
    });

    expect(result.gameSpeed).toBe('normal');
    expect(result.techLevel).toBe('unrestricted');
    expect(result.startingCash).toBe(10000);
    expect(result.shortGame).toBe(false);
    expect(result.crates).toBe(true);
  });

  test('createLobbyOptions merges partial options', async ({ page }) => {
    const result = await page.evaluate(() => {
      const create = (window as unknown as Record<string, unknown>)._createLobbyOptions as (
        partial: Record<string, unknown>
      ) => Record<string, unknown>;
      const opts = create({ gameSpeed: 'fast', techLevel: 5 });
      return {
        gameSpeed: opts.gameSpeed,
        techLevel: opts.techLevel,
        startingCash: opts.startingCash, // should remain default
        shortGame: opts.shortGame,
      };
    });

    expect(result.gameSpeed).toBe('fast');
    expect(result.techLevel).toBe(5);
    expect(result.startingCash).toBe(10000);
    expect(result.shortGame).toBe(false);
  });

  test('isTechLevelAllowed filters correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const allowed = (window as unknown as Record<string, unknown>)._isTechLevelAllowed as (
        unitTech: number,
        lobbyTech: string | number
      ) => boolean;
      return {
        unrestricted: allowed(10, 'unrestricted'),
        t1AtLow: allowed(1, 3),
        t3AtLow: allowed(3, 3),
        t5AtLow: allowed(5, 3),
        negative: allowed(-1, 'unrestricted'),
      };
    });

    expect(result.unrestricted).toBe(true);
    expect(result.t1AtLow).toBe(true);
    expect(result.t3AtLow).toBe(true);
    expect(result.t5AtLow).toBe(false);
    expect(result.negative).toBe(true); // negative techLevel is unit's own unbuildable flag, handled elsewhere
  });

  test('GameLoop supports setLogicIntervalMs', async ({ page }) => {
    const result = await page.evaluate(() => {
      const GameLoop = (window as unknown as Record<string, unknown>)._GameLoopClass as new () => {
        getLogicIntervalMs: () => number;
        setLogicIntervalMs: (ms: number) => void;
      };
      const loop = new GameLoop();
      const before = loop.getLogicIntervalMs();
      loop.setLogicIntervalMs(30);
      const after = loop.getLogicIntervalMs();
      return { before, after };
    });

    expect(result.before).toBe(40); // default 25 FPS = 40ms
    expect(result.after).toBe(30);
  });
});
