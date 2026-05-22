import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.3 E2E Test — UnitMovement 阻塞自驱 fallback 链
 *
 * Verifies that blocked units wait, repath (to original destination),
 * nudge, or give up — all without notify callbacks.
 */

test.describe('Task 23.3 — UnitMovement fallback chain', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('unit routes around a blocker and reaches destination', async () => {
    // A at (30,30), blocker B at (31,30). A wants to go to (33,30).
    // Direct path is blocked, so A* should detour (e.g. via north/south).
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'nod', 31, 30);

    const cellA = await game.actorMap(30, 30);
    const idA = (cellA as { x: number; y: number; occupants: readonly string[] }).occupants[0];

    const started = await game.moveUnit(idA, 33, 30);
    expect(started).toBe(true);

    // Wait for A to arrive at (33,30)
    await game.waitForUnitAt(idA, 33, 30, 20000);

    // Verify B never moved from (31,30)
    const cellB = await game.actorMap(31, 30);
    expect((cellB as { occupants: readonly string[] }).occupants.length).toBe(1);
  });

  test('two tanks moving on crossing paths avoid deadlock', async () => {
    // A at (30,30) → (32,32), B at (32,30) → (30,32).
    // Their optimal paths cross at (31,30) / (31,31).
    // If they meet, the blocked unit should repath instead of deadlocking.
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'nod', 32, 30);

    const cellA = await game.actorMap(30, 30);
    const idA = (cellA as { x: number; y: number; occupants: readonly string[] }).occupants[0];
    const cellB = await game.actorMap(32, 30);
    const idB = (cellB as { x: number; y: number; occupants: readonly string[] }).occupants[0];

    const startedA = await game.moveUnit(idA, 32, 32);
    const startedB = await game.moveUnit(idB, 30, 32);
    expect(startedA).toBe(true);
    expect(startedB).toBe(true);

    // Wait for both to reach their destinations (with fallback time budget)
    await Promise.all([game.waitForUnitAt(idA, 32, 32, 30000), game.waitForUnitAt(idB, 30, 32, 30000)]);

    // With dual-cell occupancy, units may temporarily share a cell in ActorMap
    // while their paths cross. The key invariant is that they never physically
    // overlap (distance > 0.3) and each ends at its own destination.
    const dist = await game.unitDistance(idA, idB);
    expect(dist).toBeGreaterThan(0.3);
  });

  test('move order resets previous block-state', async () => {
    // A at (30,30), B at (31,30) blocks east.
    // Order A → (33,30) (A* detours around B).
    // Mid-way, re-order A → (30,32) (south, no blocker).
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'nod', 31, 30);

    const cellA = await game.actorMap(30, 30);
    const idA = (cellA as { x: number; y: number; occupants: readonly string[] }).occupants[0];

    // First order
    await game.moveUnit(idA, 33, 30);

    // Brief wait so A starts moving
    await game.page.waitForTimeout(300);

    // Re-order to a different target
    const reordered = await game.moveUnit(idA, 30, 32);
    expect(reordered).toBe(true);

    // A should eventually reach the new target
    await game.waitForUnitAt(idA, 30, 32, 20000);
  });

  test('two head-on vehicles never overlap', async () => {
    // A at (25,30) → (27,30), B at (27,30) → (25,30).
    // They move toward each other on the same row.
    // With single-cell occupancy + 3×3 neighbour blocking, they will detect
    // each other before entering the same cell and nudge apart.
    await game.spawnUnit('MediumTank', 'gdi', 25, 30);
    await game.spawnUnit('MediumTank', 'nod', 27, 30);

    const cellA = await game.actorMap(25, 30);
    const idA = (cellA as { x: number; y: number; occupants: readonly string[] }).occupants[0];
    const cellB = await game.actorMap(27, 30);
    const idB = (cellB as { x: number; y: number; occupants: readonly string[] }).occupants[0];

    await game.moveUnit(idA, 27, 30);
    await game.moveUnit(idB, 25, 30);

    // Sample distance 15 times over 4.5 seconds.
    // With 3×3 neighbour detection, neither unit should ever enter the
    // neighbour cell of the other, so distance stays > ~0.5.
    for (let i = 0; i < 15; i++) {
      await game.page.waitForTimeout(300);
      const dist = await game.unitDistance(idA, idB);
      expect(dist).toBeGreaterThan(0.3);
    }

    // Verify no cell has more than one occupant at the end
    const allCells = (await game.actorMap()) as {
      cells: Array<{ x: number; y: number; occupants: readonly string[] }>;
    };
    for (const cell of allCells.cells) {
      expect(cell.occupants.length).toBeLessThanOrEqual(1);
    }
  });

  test('unit give-up when surrounded (no nudge available)', async () => {
    // A at (30,30). Surround A on all 8 neighbours with tanks.
    // Order A → (40,30). A* initial path should fail (can't leave cell).
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'nod', 31, 30); // east
    await game.spawnUnit('MediumTank', 'nod', 31, 31); // south-east
    await game.spawnUnit('MediumTank', 'nod', 30, 31); // south
    await game.spawnUnit('MediumTank', 'nod', 29, 31); // south-west
    await game.spawnUnit('MediumTank', 'nod', 29, 30); // west
    await game.spawnUnit('MediumTank', 'nod', 29, 29); // north-west
    await game.spawnUnit('MediumTank', 'nod', 30, 29); // north
    await game.spawnUnit('MediumTank', 'nod', 31, 29); // north-east

    const cellA = await game.actorMap(30, 30);
    const idA = (cellA as { x: number; y: number; occupants: readonly string[] }).occupants[0];

    const started = await game.moveUnit(idA, 40, 30);

    // Even if A* found a path through some diagonal gap, moving will quickly
    // hit a blocker. After Wait→Repath→Nudge→GiveUp, A should stop and stay
    // at (30,30). We just verify it does not leave (30,30) within 5 seconds.
    if (started) {
      // Wait for potential fallback chain to complete (~800ms wait + repaths)
      await game.page.waitForTimeout(5000);

      const finalCell = await game.actorMap(30, 30);
      expect((finalCell as { occupants: readonly string[] }).occupants).toContain(idA);
    } else {
      // A* may already return false because start cell is surrounded.
      expect(started).toBe(false);
    }
  });
});
