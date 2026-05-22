import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.5 E2E Test — BlockedByActor 四级阻塞分级
 *
 * Verifies that pathfinding respects different levels of actor blocking:
 * All (strict), Stationary (ignore moving), Immovable (ignore movable), None.
 */

test.describe('Task 23.5 — BlockedByActor分级', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('BlockedByActor.All blocks stationary unit', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'nod', 31, 30); // stationary blocker

    const path = await game.pathfind(30, 30, 33, 30, 'All');
    expect(path).not.toBeNull();
    // Path must detour around (31,30)
    expect(path!.some((n) => n.x === 31 && n.y === 30)).toBe(false);
  });

  test('BlockedByActor.Stationary ignores moving unit', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'nod', 31, 30);

    const cellB = await game.actorMap(31, 30);
    const idB = (cellB as { occupants: readonly string[] }).occupants[0];

    // Start B moving east
    await game.moveUnit(idB, 34, 30);
    await game.page.waitForTimeout(200); // let B start moving (dual-cell active)

    // A pathfinds with Stationary — should see (31,30) as free
    const path = await game.pathfind(30, 30, 33, 30, 'Stationary');
    expect(path).not.toBeNull();
    expect(path!.some((n) => n.x === 31 && n.y === 30)).toBe(true);
  });

  test('BlockedByActor.None ignores all units', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'nod', 31, 30); // stationary blocker

    const path = await game.pathfind(30, 30, 33, 30, 'None');
    expect(path).not.toBeNull();
    // Straight line should be returned
    expect(path!.length).toBe(4); // (30,30) → (31,30) → (32,30) → (33,30)
  });
});
