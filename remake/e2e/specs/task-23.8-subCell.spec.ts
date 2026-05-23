import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.8 E2E Test — SubCell infantry sharing + NotifyBlocker Nudge
 *
 * Verifies:
 *   1. Multiple infantry can share the same cell (sharesCell=true)
 *   2. Tank entering a cell with infantry triggers Nudge (infantry scatter)
 *   3. Pathfinder does not treat infantry-only cells as blocked
 */

test.describe('Task 23.8 — SubCell + NotifyBlocker', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('multiple infantry share the same cell without blocking each other', async () => {
    // Spawn 5 infantry in the same cell
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      await game.spawnUnit('RifleInfantry', 'gdi', 30, 20);
      const cell = await game.actorMap(30, 20);
      const occupants = (cell as { occupants: readonly string[] }).occupants;
      ids.push(occupants[occupants.length - 1]);
    }

    // All 5 should occupy the same cell
    const finalCell = await game.actorMap(30, 20);
    expect((finalCell as { occupants: readonly string[] }).occupants.length).toBe(5);

    // Each should be able to move away independently
    await game.moveUnit(ids[0], 32, 20);
    await game.waitForUnitAt(ids[0], 32, 20, 15000);

    // Remaining 4 still in original cell
    const remainingCell = await game.actorMap(30, 20);
    expect((remainingCell as { occupants: readonly string[] }).occupants.length).toBe(4);
  });

  test('tank entering infantry cell triggers Nudge scatter', async () => {
    test.setTimeout(60000);

    // Spawn 3 infantry in one cell
    for (let i = 0; i < 3; i++) {
      await game.spawnUnit('RifleInfantry', 'gdi', 30, 20);
    }

    // Spawn a tank nearby and order it into the infantry cell
    await game.spawnUnit('MediumTank', 'gdi', 30, 18);
    const tankCell = await game.actorMap(30, 18);
    const tankId = (tankCell as { occupants: readonly string[] }).occupants[0];

    // Move tank into (30,20) — infantry should Nudge away
    await game.moveUnit(tankId, 30, 20);

    // Poll: tank should eventually reach (30,20)
    for (let i = 0; i < 40; i++) {
      await game.page.waitForTimeout(500);

      const cell = await game.actorMap(30, 20);
      const occupants = (cell as { occupants: readonly string[] }).occupants;

      if (occupants.includes(tankId)) {
        // Tank made it — infantry were nudged away
        return;
      }
    }

    throw new Error('Tank did not reach (30,20) — infantry did not nudge away');
  });

  test('pathfind treats infantry-only cells as passable', async () => {
    // Spawn 2 infantry in a cell
    await game.spawnUnit('RifleInfantry', 'gdi', 30, 20);
    await game.spawnUnit('RifleInfantry', 'gdi', 30, 20);

    // Pathfind from nearby to the other side of the infantry cell
    const path = await game.pathfind(30, 18, 30, 21);

    // Path should exist and go through (30,20) — infantry-only cell is not blocked
    expect(path).toBeTruthy();
    expect((path as Array<unknown>).length).toBeGreaterThan(2);

    const hasThrough = (path as Array<{ x: number; y: number }>).some((p) => p.x === 30 && p.y === 20);
    expect(hasThrough).toBe(true);
  });
});
