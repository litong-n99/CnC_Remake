import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.1 E2E Test — ActorMap 格子占用映射
 *
 * Verifies that ActorMap correctly tracks unit occupancy at the cell level.
 * These tests interact with the game via the debug console (`window.cnc`).
 */

test.describe('Task 23.1 — ActorMap', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    // Start each test with a clean world
    await game.clear();
  });

  test('page loads and GameConsole is installed', async ({ page }) => {
    const cncReady = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc;
      return typeof cnc === 'object' && cnc !== null;
    });
    expect(cncReady).toBe(true);
  });

  test('after clear, ActorMap has no occupied cells', async () => {
    const result = await game.actorMap();
    expect('cells' in result).toBe(true);
    const allCells = (result as { cells: Array<{ x: number; y: number; occupants: readonly string[] }> }).cells;
    expect(allCells.length).toBe(0);
  });

  test('spawning one tank occupies exactly one cell', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);

    // Query single cell
    const cellResult = await game.actorMap(30, 30);
    expect('occupants' in cellResult).toBe(true);
    const cellData = cellResult as { x: number; y: number; occupants: readonly string[] };
    expect(cellData.x).toBe(30);
    expect(cellData.y).toBe(30);
    expect(cellData.occupants.length).toBe(1);

    // Query all cells
    const allResult = await game.actorMap();
    const allCells = (allResult as { cells: Array<{ x: number; y: number; occupants: readonly string[] }> }).cells;
    expect(allCells.length).toBe(1);
  });

  test('spawning five tanks in a row occupies five distinct cells', async () => {
    for (let i = 0; i < 5; i++) {
      await game.spawnUnit('MediumTank', 'gdi', 25 + i, 30);
    }

    const result = await game.actorMap();
    const cells = (result as { cells: Array<{ x: number; y: number; occupants: readonly string[] }> }).cells;

    expect(cells.length).toBe(5);

    // Verify each cell x: 25..29, y: 30, each with exactly 1 occupant
    const expectedXs = [25, 26, 27, 28, 29];
    for (const expectedX of expectedXs) {
      const found = cells.find((c) => c.x === expectedX && c.y === 30);
      expect(found, `expected cell (${expectedX}, 30) to be occupied`).toBeDefined();
      expect(found!.occupants.length).toBe(1);
    }
  });

  test('spawning tanks for both houses tracks them independently', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 40, 40);
    await game.spawnUnit('LightTank', 'nod', 40, 40);

    const cellResult = await game.actorMap(40, 40);
    const cellData = cellResult as { x: number; y: number; occupants: readonly string[] };

    expect(cellData.occupants.length).toBe(2);
  });

  test(' ActorMap reflects cleared world correctly', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 50, 50);
    await game.spawnUnit('MediumTank', 'gdi', 51, 50);

    let result = await game.actorMap();
    let cells = (result as { cells: Array<{ x: number; y: number; occupants: readonly string[] }> }).cells;
    expect(cells.length).toBe(2);

    await game.clear();

    result = await game.actorMap();
    cells = (result as { cells: Array<{ x: number; y: number; occupants: readonly string[] }> }).cells;
    expect(cells.length).toBe(0);
  });
});
