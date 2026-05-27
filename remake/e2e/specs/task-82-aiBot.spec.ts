import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 82 — AI Bot (Base Builder + Attack)', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('BaseBuilderAI can be created and reports initial state', async () => {
    const state = await game.baseBuilderAI('nod');
    expect(state.created).toBe(true);
    expect(state.buildIndex).toBe(0);
    expect(state.placedCount).toBe(0);
  });

  test('BaseBuilderAI queues PowerPlant when given enough credits', async () => {
    // Place a ConstructionYard for Nod first (prerequisite for all buildings)
    const placed = await game.placeBuildingDirect('ConstructionYard', 'nod', 30, 30);
    expect(placed.placed).toBe(true);

    // Give Nod enough credits
    await game.money('nod', 5000);

    const state = await game.baseBuilderAI('nod');
    expect(state.created).toBe(true);

    // Tick AI to start building
    const tick1 = await game.baseBuilderTick(100);
    expect(tick1.buildIndex).toBe(1); // started first building
  });

  test('BaseBuilderAI places building after construction completes', async () => {
    // Place a ConstructionYard for Nod first
    const placed = await game.placeBuildingDirect('ConstructionYard', 'nod', 30, 30);
    expect(placed.placed).toBe(true);

    await game.money('nod', 5000);
    await game.baseBuilderAI('nod');

    // Start building
    await game.baseBuilderTick(100);

    // Fast-forward construction (PowerPlant buildTime = 8s)
    await game.baseBuilderTick(8000);

    // Tick AI to place ready building
    const tick2 = await game.baseBuilderTick(100);
    expect(tick2.placedCount).toBeGreaterThanOrEqual(1);
  });

  test('AttackAI can be created and gathers squad from idle units', async () => {
    // Spawn combat units for Nod
    await game.spawnUnit('MediumTank', 'nod', 10, 10);
    await game.spawnUnit('MediumTank', 'nod', 11, 10);
    await game.spawnUnit('MediumTank', 'nod', 12, 10);

    const state = await game.attackAI('nod');
    expect(state.created).toBe(true);

    // Tick to gather squad
    const tick = await game.attackAITick(1000);
    expect(tick.squadSize).toBeGreaterThanOrEqual(3);
  });
});
