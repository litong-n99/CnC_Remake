import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.2 E2E Test — UnitCollision 重构（ActorMap 格子级查询）
 *
 * Verifies that UnitCollision.isPositionBlocked and getBlockedCells
 * now query ActorMap cell occupancy instead of floating-point distance.
 */

test.describe('Task 23.2 — UnitCollision', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('self cell is not blocked (excludeId works)', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    const cell = await game.actorMap(30, 30);
    const unitId = (cell as { x: number; y: number; occupants: readonly string[] }).occupants[0];

    const blocked = await game.collision(30, 30, unitId);
    expect(blocked).toBe(false);
  });

  test('neighbour cell with another unit is blocked', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'gdi', 31, 30);

    const cellA = await game.actorMap(30, 30);
    const idA = (cellA as { x: number; y: number; occupants: readonly string[] }).occupants[0];

    const blocked = await game.collision(31, 30, idA);
    expect(blocked).toBe(true);
  });

  test('empty cell is free', async () => {
    const blocked = await game.collision(40, 40, '');
    expect(blocked).toBe(false);
  });

  test('pathfind to occupied cell returns null', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'gdi', 31, 30);

    const path = await game.pathfind(30, 30, 31, 30);
    expect(path).toBeNull();
  });

  test('pathfind auto-reroutes around blocked cell', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30); // A
    await game.spawnUnit('MediumTank', 'gdi', 31, 30); // B (blocks east)

    // A wants to go to (32, 30). B is at (31, 30) blocking the direct path.
    // A* should find a detour (e.g. via north or south).
    const path = await game.pathfind(30, 30, 32, 30);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(2);

    // The detour must NOT step onto (31, 30) where B sits.
    const steppedOnB = path!.some((node) => node.x === 31 && node.y === 30);
    expect(steppedOnB, 'path should not step onto blocked cell (31,30)').toBe(false);
  });

  test('pathfind straight line when no blockers', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);

    const path = await game.pathfind(30, 30, 32, 30);
    expect(path).not.toBeNull();
    // Straight east: (30,30) → (31,30) → (32,30)
    expect(path!.map((n) => `${n.x},${n.y}`)).toEqual(['30,30', '31,30', '32,30']);
  });

  test('multi-unit blockers are all respected', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'gdi', 31, 30); // blocks east
    await game.spawnUnit('MediumTank', 'gdi', 30, 31); // blocks south

    // A* from (29,30) to (32,30) must avoid both blockers
    const path = await game.pathfind(29, 30, 32, 30);
    expect(path).not.toBeNull();

    const blockedKeys = new Set(['31,30', '30,31']);
    const steppedOnBlocked = path!.some((n) => blockedKeys.has(`${n.x},${n.y}`));
    expect(steppedOnBlocked, 'path should avoid all blocked cells').toBe(false);
  });
});
