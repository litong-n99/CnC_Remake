import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.6 E2E Test — OpenRA-style head-on collision resolution
 *
 * Verifies that two vehicles moving toward each other on the same line
 * do not deadlock: both eventually reach their destinations.
 */

test.describe('Task 23.6 — Head-on collision resolution', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('head-on: both units reach destination without deadlock', async () => {
    // A at (25,30) → (27,30), B at (27,30) → (25,30).
    // With dual-cell occupancy, A occupies (25,30)+(26,30) and B occupies
    // (27,30)+(26,30). They clash at (26,30). The fallback chain should
    // allow one to repath around while the other continues straight.
    await game.spawnUnit('MediumTank', 'gdi', 25, 30);
    await game.spawnUnit('MediumTank', 'nod', 27, 30);

    const cellA = await game.actorMap(25, 30);
    const idA = (cellA as { occupants: readonly string[] }).occupants[0];
    const cellB = await game.actorMap(27, 30);
    const idB = (cellB as { occupants: readonly string[] }).occupants[0];

    await game.moveUnit(idA, 27, 30);
    await game.moveUnit(idB, 25, 30);

    // Sample distance mid-movement to ensure no overlap
    await game.page.waitForTimeout(500);
    const midDist = await game.unitDistance(idA, idB);
    expect(midDist).toBeGreaterThan(0.3);

    // Both should reach their destinations
    await Promise.all([game.waitForUnitAt(idA, 27, 30, 30000), game.waitForUnitAt(idB, 25, 30, 30000)]);
  });
});
