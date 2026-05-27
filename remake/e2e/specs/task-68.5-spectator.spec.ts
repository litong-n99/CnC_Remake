import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 68.5 — Spectator Support', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('House has isSpectating field defaulting to false', async ({ page }) => {
    const result = await page.evaluate(() => {
      const hm = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (type: number) => { isSpectating: boolean } | undefined;
      };
      const gdi = hm.getHouse(8); // HouseType.GDI
      return { isSpectating: gdi?.isSpectating };
    });

    expect(result.isSpectating).toBe(false);
  });

  test('creating a spectator house sets isSpectating to true', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          createHouse: (type: number, opts: Record<string, unknown>) => { isSpectating: boolean; controller: string };
          getSpectators: () => Array<{ id: number }>;
        };
      };
      const hm = HM.getInstance();
      const spec = hm.createHouse(12, {
        // HouseType.Neutral
        isSpectating: true,
        controller: 'human',
        credits: 0,
      });
      const spectators = hm.getSpectators();
      return {
        isSpectating: spec.isSpectating,
        spectatorCount: spectators.length,
        hasSpecId: spectators.some((s) => s.id === 12),
      };
    });

    expect(result.isSpectating).toBe(true);
    expect(result.spectatorCount).toBeGreaterThanOrEqual(1);
    expect(result.hasSpecId).toBe(true);
  });

  test('spectator diplomacy returns Ally for all', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HD = (window as unknown as Record<string, unknown>)._HouseDiplomacy as new (owner: number) => {
        getRelationshipForSpectator: (other: number) => string;
      };
      const dip = new HD(8); // GDI
      return {
        vsNod: dip.getRelationshipForSpectator(9), // Nod
        vsSelf: dip.getRelationshipForSpectator(8), // GDI
      };
    });

    expect(result.vsNod).toBe('Ally');
    expect(result.vsSelf).toBe('Ally');
  });
});
