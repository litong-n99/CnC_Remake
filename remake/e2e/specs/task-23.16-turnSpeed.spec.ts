import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.16 E2E Test — Turn Speed / Pre-movement Turn
 *
 * Verifies:
 * - Track units (turnsWhileMoving=false) stop to turn when direction change > 90°
 * - Track units with small direction change move without stopping
 * - Foot units (turnsWhileMoving=true) never stop to turn
 * - Turn completes and unit resumes moving
 *
 * Test coordinates are within the default-scene safe zone (x=22-38, y=18-26),
 * avoiding dummy_map Water outside that region.
 */

test.describe('Task 23.16 — Turn Speed / Pre-movement Turn', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('Track unit with large facing diff triggers stop-and-turn', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 25, 20);
    const state0 = await game.debugState();
    expect(state0.length).toBe(1);
    const id = state0[0].id;

    await game.setFacing(id, 0); // North
    // Target (28,21): dx=3, dy=1 → targetFacing ≈ 74, diff = 74 > 64
    const started = await game.moveUnit(id, 28, 21);
    expect(started).toBe(true);

    await game.page.waitForTimeout(200);

    const state1 = await game.debugState();
    const unit = state1.find((u) => u.id === id);
    expect(unit).toBeDefined();
    expect(unit!.isTurningInPlace).toBe(true);
    // Position should not have changed much during stop-and-turn
    expect(unit!.x).toBeCloseTo(25, 0);
    expect(unit!.y).toBeCloseTo(20, 0);
  });

  test('Track unit with small facing diff moves without stopping', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 25, 20);
    const state0 = await game.debugState();
    const id = state0[0].id;

    await game.setFacing(id, 64); // East
    // Target (28,21): dx=3, dy=1 → targetFacing ≈ 74, diff = 10 <= 64
    const started = await game.moveUnit(id, 28, 21);
    expect(started).toBe(true);

    await game.page.waitForTimeout(500);

    const state1 = await game.debugState();
    const unit = state1.find((u) => u.id === id);
    expect(unit).toBeDefined();
    expect(unit!.isTurningInPlace).toBe(false);
    // Unit should have started moving
    expect(unit!.x + unit!.y).toBeGreaterThan(45.1);
  });

  test('Track unit resumes moving after stop-and-turn completes', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 25, 20);
    const state0 = await game.debugState();
    const id = state0[0].id;

    await game.setFacing(id, 0); // North
    // Target (28,21): dx=3, dy=1 → targetFacing ≈ 74, diff = 74 > 64
    const started = await game.moveUnit(id, 28, 21);
    expect(started).toBe(true);

    // Wait for turn to complete (~0.9s for 74 DirType at 120°/s + margin)
    await game.page.waitForTimeout(2000);

    const state1 = await game.debugState();
    const unit = state1.find((u) => u.id === id);
    expect(unit).toBeDefined();
    expect(unit!.isTurningInPlace).toBe(false);
    // Unit should have moved significantly
    expect(unit!.x + unit!.y).toBeGreaterThan(46);
  });

  test('Foot unit never stops to turn even with large facing diff', async () => {
    await game.spawnUnit('RifleInfantry', 'gdi', 25, 20);
    const state0 = await game.debugState();
    const id = state0[0].id;

    await game.setFacing(id, 0); // North
    // Target (28,21): dx=3, dy=1 → targetFacing ≈ 74, diff = 74 > 64
    const started = await game.moveUnit(id, 28, 21);
    expect(started).toBe(true);

    await game.page.waitForTimeout(500);

    const state1 = await game.debugState();
    const unit = state1.find((u) => u.id === id);
    expect(unit).toBeDefined();
    expect(unit!.isTurningInPlace).toBe(false);
    // Unit should have started moving immediately
    expect(unit!.x + unit!.y).toBeGreaterThan(45.1);
  });
});
