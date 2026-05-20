import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.4 E2E Test — Dual-Cell Occupancy
 *
 * Verifies that moving units occupy both fromCell and toCell
 * (OpenRA-style), while stationary units occupy only one cell.
 */

test.describe('Task 23.4 — Dual-Cell Occupancy', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('moving unit occupies both fromCell and toCell', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    const cell = await game.actorMap(30, 30);
    const idA = (cell as { occupants: readonly string[] }).occupants[0];

    await game.moveUnit(idA, 33, 30);

    // Poll for up to 1 second: the unit should be registered in both
    // (30,30) and (31,30) at some point while moving between them.
    let foundDual = false;
    for (let i = 0; i < 10; i++) {
      await game.page.waitForTimeout(100);
      const cell30 = await game.actorMap(30, 30);
      const cell31 = await game.actorMap(31, 30);
      const has30 = (cell30 as { occupants: readonly string[] }).occupants.includes(idA);
      const has31 = (cell31 as { occupants: readonly string[] }).occupants.includes(idA);
      if (has30 && has31) {
        foundDual = true;
        break;
      }
    }

    expect(foundDual, 'unit should simultaneously occupy fromCell and toCell while moving').toBe(true);
  });

  test('stationary unit occupies only one cell', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    const cell = await game.actorMap(30, 30);
    const idA = (cell as { occupants: readonly string[] }).occupants[0];

    // Don't move — just wait a bit then check
    await game.page.waitForTimeout(500);

    const allCells = (await game.actorMap()) as {
      cells: Array<{ x: number; y: number; occupants: readonly string[] }>;
    };
    const occupiedByA = allCells.cells.filter((c) => c.occupants.includes(idA));
    expect(occupiedByA.length).toBe(1);
    expect(occupiedByA[0].x).toBe(30);
    expect(occupiedByA[0].y).toBe(30);
  });
});
