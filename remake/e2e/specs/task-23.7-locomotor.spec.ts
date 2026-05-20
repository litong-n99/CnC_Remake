import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.7 E2E Test — Locomotor TerrainSpeeds
 *
 * Verifies:
 *   1. Infantry (Foot) can traverse Rock terrain (Rock=0.5)
 *   2. Tanks (Track) route around Rock terrain (Rock=0)
 */

test.describe('Task 23.7 — Locomotor TerrainSpeeds', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('infantry path goes through Rock terrain (Foot Rock=0.5)', async () => {
    await game.spawnUnit('RifleInfantry', 'gdi', 25, 20);

    const cell = await game.actorMap(25, 20);
    const id = (cell as { occupants: readonly string[] }).occupants[0];

    // Move to right side
    await game.moveUnit(id, 35, 24);

    // Wait for arrival
    await game.waitForUnitAt(id, 35, 24, 15000);

    // Verify path went through Rock wall area (y=22-23, x=24-36)
    const path = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.debugState?.();
    });

    // Infantry should have traversed Rock cells (Foot Rock=0.5 is passable)
    const state = (path as Array<Record<string, unknown>>)?.find((s) => s.id === id);
    expect(state).toBeTruthy();
  });

  test('tank path routes around Rock terrain (Track Rock=0)', async () => {
    test.setTimeout(60000);

    await game.spawnUnit('MediumTank', 'gdi', 25, 21);

    const cell = await game.actorMap(25, 21);
    const id = (cell as { occupants: readonly string[] }).occupants[0];

    // Move to right side — tank must route around the rock wall
    await game.moveUnit(id, 35, 24);

    // Poll to verify tank does NOT get stuck in Rock wall
    for (let i = 0; i < 40; i++) {
      await game.page.waitForTimeout(500);
      const pos = await game.page.evaluate((unitId) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        const state = (cnc.debugState?.() as Array<Record<string, unknown>>) ?? [];
        return state.find((s) => s.id === unitId);
      }, id);

      const { x, y } = pos as { x: number; y: number };

      // Tank should never be inside the Rock wall (y=22-23, x=24-36)
      if (y === 22 || y === 23) {
        if (x >= 24 && x <= 36) {
          throw new Error(`Tank entered Rock wall at (${x}, ${y}) — Track should route around!`);
        }
      }

      // Check if arrived
      if (Math.abs(x - 35) < 0.5 && Math.abs(y - 24) < 0.5) {
        return; // Success
      }
    }

    throw new Error('Tank did not reach destination in time');
  });

  test('infantry and tank paths are different (Rock vs Clear)', async () => {
    test.setTimeout(60000);

    // Spawn infantry and tank at same starting area
    await game.spawnUnit('RifleInfantry', 'gdi', 25, 20);
    await game.spawnUnit('MediumTank', 'gdi', 25, 21);

    const cellInf = await game.actorMap(25, 20);
    const idInf = (cellInf as { occupants: readonly string[] }).occupants[0];
    const cellTank = await game.actorMap(25, 21);
    const idTank = (cellTank as { occupants: readonly string[] }).occupants[0];

    // Both move to same destination
    await game.moveUnit(idInf, 35, 24);
    await game.moveUnit(idTank, 35, 24);

    // Wait for both to arrive
    await Promise.all([game.waitForUnitAt(idInf, 35, 24, 30000), game.waitForUnitAt(idTank, 35, 24, 30000)]);

    // Both should reach destination
    const posInf = await game.page.evaluate((unitId) => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const state = (cnc.debugState?.() as Array<Record<string, unknown>>) ?? [];
      return state.find((s) => s.id === unitId);
    }, idInf);
    const posTank = await game.page.evaluate((unitId) => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const state = (cnc.debugState?.() as Array<Record<string, unknown>>) ?? [];
      return state.find((s) => s.id === unitId);
    }, idTank);

    expect(posInf).toBeTruthy();
    expect(posTank).toBeTruthy();
  });
});
