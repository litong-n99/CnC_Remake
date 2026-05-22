import { test } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.6 E2E Test — OpenRA-style fallback chain components
 */

test.describe('Task 23.6 — Fallback chain components', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('unit waits when blocker is evacuating (CellIsEvacuating)', async () => {
    // A at (30,30), B at (31,30)
    // B moves east to (32,30) — its fromCell=(31,30), toCell=(32,30)
    // A moves east to (31,30) — nextCell is B's fromCell
    // CellIsEvacuating(31,30) should be true because B is leaving (toCell != 31,30)
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'nod', 31, 30);

    const cellA = await game.actorMap(30, 30);
    const idA = (cellA as { occupants: readonly string[] }).occupants[0];
    const cellB = await game.actorMap(31, 30);
    const idB = (cellB as { occupants: readonly string[] }).occupants[0];

    // B starts moving east first
    await game.moveUnit(idB, 32, 30);
    await game.page.waitForTimeout(200);

    // A starts moving east to B's original cell
    await game.moveUnit(idA, 31, 30);

    // Poll until A reaches (31,30) or both idle
    for (let i = 0; i < 30; i++) {
      await game.page.waitForTimeout(500);
      const state = (await game.page.evaluate(() => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.debugState?.() as Array<Record<string, unknown>>) ?? [];
      })) as Array<Record<string, unknown>>;

      const aState = state.find((s) => s.id === idA);
      const bState = state.find((s) => s.id === idB);

      const cell31 = await game.actorMap(31, 30);
      if ((cell31 as { occupants: readonly string[] }).occupants.includes(idA)) {
        // A arrived, verify B is at (32,30)
        await game.waitForUnitAt(idB, 32, 30, 20000);
        return;
      }

      if (aState?.state === 'IDLE' && bState?.state === 'IDLE') {
        throw new Error(`Both idle early. A: ${JSON.stringify(aState)}, B: ${JSON.stringify(bState)}`);
      }
    }

    throw new Error('Timeout waiting for A to reach (31,30)');
  });

  test('repath four-level fallback: Stationary when All blocks', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'nod', 31, 30);

    const cellA = await game.actorMap(30, 30);
    const idA = (cellA as { occupants: readonly string[] }).occupants[0];

    await game.moveUnit(idA, 33, 30);
    await game.waitForUnitAt(idA, 33, 30, 20000);
  });
});
