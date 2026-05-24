import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.17 E2E Test — Crush Logic
 *
 * Verifies:
 * - Tank crushes infantry when WarnCrush probability = 0 (no nudge)
 * - Tank nudges infantry when WarnCrush probability = 1 (always nudge)
 * - Infantry does not crush another infantry
 *
 * Test coordinates are within the default-scene safe zone (x=22-38, y=18-26).
 */

test.describe('Task 23.17 — Crush Logic', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('tank crushes infantry when warn probability is 0', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setCrushProb?.(0);
    });

    await game.spawnUnit('RifleInfantry', 'gdi', 25, 20);
    await game.spawnUnit('MediumTank', 'gdi', 25, 19);

    const state0 = await game.debugState();
    const infantry = state0.find((u) => u.currentHealth === 50);
    const tank = state0.find((u) => u.currentHealth === 400);
    expect(infantry).toBeDefined();
    expect(tank).toBeDefined();

    const started = await game.moveUnit(tank!.id, 25, 20);
    expect(started).toBe(true);

    // Wait for tank to physically reach destination and stop (3s is enough for 1-cell move)
    await game.page.waitForTimeout(3000);

    const state1 = await game.debugState();
    const infantryAfter = state1.find((u) => u.id === infantry!.id);
    expect(infantryAfter).toBeDefined();
    expect(infantryAfter!.state).toBe('DYING');
  });

  test('tank nudges infantry when warn probability is 1', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setCrushProb?.(1);
    });

    await game.spawnUnit('RifleInfantry', 'gdi', 25, 20);
    await game.spawnUnit('MediumTank', 'gdi', 25, 19);

    const state0 = await game.debugState();
    const infantry = state0.find((u) => u.currentHealth === 50);
    const tank = state0.find((u) => u.currentHealth === 400);
    expect(infantry).toBeDefined();
    expect(tank).toBeDefined();

    const started = await game.moveUnit(tank!.id, 25, 20);
    expect(started).toBe(true);

    // Wait for tank to physically reach destination and stop
    await game.page.waitForTimeout(3000);

    const state1 = await game.debugState();
    const infantryAfter = state1.find((u) => u.id === infantry!.id);
    expect(infantryAfter).toBeDefined();
    // Infantry should have been nudged away and still alive
    expect(infantryAfter!.state).not.toBe('Dying');
    // Infantry should no longer be at (25,20) — nudged to a neighbour
    expect(infantryAfter!.x !== 25 || infantryAfter!.y !== 20).toBe(true);
  });

  test('infantry does not crush another infantry', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.setCrushProb?.(0);
    });

    await game.spawnUnit('RifleInfantry', 'gdi', 25, 20);
    await game.spawnUnit('RifleInfantry', 'gdi', 25, 20);

    const state0 = await game.debugState();
    expect(state0.length).toBe(2);
    const ids = state0.map((u) => u.id);

    const started = await game.moveUnit(ids[0], 25, 21);
    expect(started).toBe(true);

    await game.page.waitForTimeout(3000);

    const state1 = await game.debugState();
    const other = state1.find((u) => u.id === ids[1]);
    expect(other).toBeDefined();
    expect(other!.state).not.toBe('Dying');
  });
});
