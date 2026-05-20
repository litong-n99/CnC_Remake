import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.6 E2E Test — OpenRA-style head-on collision resolution
 */

test.describe('Task 23.6 — Head-on collision resolution', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('head-on: both units reach destination without deadlock (adjacent cells)', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 25, 30);
    await game.spawnUnit('MediumTank', 'nod', 27, 30);

    const cellA = await game.actorMap(25, 30);
    const idA = (cellA as { occupants: readonly string[] }).occupants[0];
    const cellB = await game.actorMap(27, 30);
    const idB = (cellB as { occupants: readonly string[] }).occupants[0];

    await game.moveUnit(idA, 27, 30);
    await game.moveUnit(idB, 25, 30);

    await game.page.waitForTimeout(500);
    const midDist = await game.unitDistance(idA, idB);
    expect(midDist).toBeGreaterThan(0.3);

    await Promise.all([game.waitForUnitAt(idA, 27, 30, 30000), game.waitForUnitAt(idB, 25, 30, 30000)]);
  });

  test('crossing: two units swapping adjacent cells without deadlock', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 25, 30);
    await game.spawnUnit('MediumTank', 'nod', 24, 30);

    const cellA = await game.actorMap(25, 30);
    const idA = (cellA as { occupants: readonly string[] }).occupants[0];
    const cellB = await game.actorMap(24, 30);
    const idB = (cellB as { occupants: readonly string[] }).occupants[0];

    await game.moveUnit(idA, 26, 30);
    await game.moveUnit(idB, 25, 30);

    await Promise.all([game.waitForUnitAt(idA, 26, 30, 15000), game.waitForUnitAt(idB, 25, 30, 15000)]);
  });

  test('head-on medium path: both units reach destination without deadlock', async () => {
    test.setTimeout(60000);

    // Use 4-cell distance on a known passable row.
    // First verify the straight line is passable.
    const pathCheck = await game.page.evaluate(
      ({ sx, sy, ex, ey }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.pathfind?.(sx, sy, ex, ey);
      },
      { sx: 25, sy: 30, ex: 29, ey: 30 }
    );
    if (!pathCheck || (pathCheck as Array<unknown>).length < 5) {
      // Skip if terrain blocks this row
      test.skip();
      return;
    }

    await game.spawnUnit('MediumTank', 'gdi', 25, 30);
    await game.spawnUnit('MediumTank', 'nod', 29, 30);

    const cellA = await game.actorMap(25, 30);
    const idA = (cellA as { occupants: readonly string[] }).occupants[0];
    const cellB = await game.actorMap(29, 30);
    const idB = (cellB as { occupants: readonly string[] }).occupants[0];

    // Move both simultaneously
    const moveA = await game.moveUnit(idA, 29, 30);
    const moveB = await game.moveUnit(idB, 25, 30);

    // If one move failed due to terrain, retry after a short delay
    if (!moveA || !moveB) {
      await game.page.waitForTimeout(500);
      if (!moveA) await game.moveUnit(idA, 29, 30);
      if (!moveB) await game.moveUnit(idB, 25, 30);
    }

    // Poll with debug state to catch deadlock
    for (let i = 0; i < 30; i++) {
      await game.page.waitForTimeout(1000);
      const state = (await game.page.evaluate(() => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.debugState?.() as Array<Record<string, unknown>>) ?? [];
      })) as Array<Record<string, unknown>>;

      const aState = state.find((s) => s.id === idA);
      const bState = state.find((s) => s.id === idB);

      const cell25 = await game.actorMap(25, 30);
      const cell29 = await game.actorMap(29, 30);
      if (
        (cell25 as { occupants: readonly string[] }).occupants.includes(idB) &&
        (cell29 as { occupants: readonly string[] }).occupants.includes(idA)
      ) {
        return;
      }

      if (
        aState?.state === 'IDLE' &&
        bState?.state === 'IDLE' &&
        i > 5 &&
        !(aState.x === 29 && aState.y === 30) &&
        !(bState.x === 25 && bState.y === 30)
      ) {
        throw new Error(
          `Both idle far from destination at tick ${i}. A: ${JSON.stringify(aState)}, B: ${JSON.stringify(bState)}`
        );
      }
    }

    throw new Error('Timeout waiting for both units to reach destinations');
  });
});
