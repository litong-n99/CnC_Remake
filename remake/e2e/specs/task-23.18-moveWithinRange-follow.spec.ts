import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.18 E2E Test — MoveWithinRange + Follow
 *
 * Verifies:
 * - MoveWithinRange stops unit within min/max ring around target
 * - Follow keeps unit within range of a moving target
 * - Follow stops when target stops
 */

test.describe('Task 23.18 — MoveWithinRange + Follow', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('moveWithinRange stops rocket soldier within 3-5 cells of target', async () => {
    await game.spawnUnit('RocketSoldier', 'gdi', 25, 20);

    const state0 = await game.debugState();
    const rocket = state0.find((u) => u.currentHealth === 50);
    expect(rocket).toBeDefined();

    // Target is at (35, 20); expect unit to stop somewhere in [3,5] cells away
    const started = await game.moveWithinRange(rocket!.id, 35, 20, 3, 5);
    expect(started).toBe(true);

    // Wait for movement to settle (max 10s)
    await game.page.waitForTimeout(8000);

    const state1 = await game.debugState();
    const rocketAfter = state1.find((u) => u.id === rocket!.id);
    expect(rocketAfter).toBeDefined();

    const dx = (rocketAfter!.x as number) - 35;
    const dy = (rocketAfter!.y as number) - 20;
    const dist = Math.sqrt(dx * dx + dy * dy);

    expect(dist).toBeGreaterThanOrEqual(2.5);
    expect(dist).toBeLessThanOrEqual(5.5);
    expect(rocketAfter!.state).toBe('IDLE');
  });

  test('follow keeps infantry within 3 cells of moving leader', async () => {
    // Leader = RifleInfantry (same speed as follower, avoids "can never catch up")
    await game.spawnUnit('RifleInfantry', 'gdi', 25, 20);
    await game.spawnUnit('RifleInfantry', 'gdi', 25, 21);

    const state0 = await game.debugState();
    const leader = state0[0];
    const follower = state0[1];
    expect(leader).toBeDefined();
    expect(follower).toBeDefined();

    // Start follow
    const followStarted = await game.follow(follower!.id, leader!.id, 3);
    expect(followStarted).toBe(true);

    // Order leader to move far away
    const leaderMoved = await game.moveUnit(leader!.id, 40, 20);
    expect(leaderMoved).toBe(true);

    // Wait for leader to reach destination, then give follower time to catch up
    await game.waitForUnitAt(leader!.id, 40, 20, 15000);
    await game.page.waitForTimeout(5000);

    const state1 = await game.debugState();
    const leaderAfter = state1.find((u) => u.id === leader!.id);
    const followerAfter = state1.find((u) => u.id === follower!.id);
    expect(leaderAfter).toBeDefined();
    expect(followerAfter).toBeDefined();

    const dx = (followerAfter!.x as number) - (leaderAfter!.x as number);
    const dy = (followerAfter!.y as number) - (leaderAfter!.y as number);
    const dist = Math.sqrt(dx * dx + dy * dy);

    expect(dist).toBeLessThanOrEqual(3.5);
  });

  test('follow stops when leader stops', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 25, 20);
    await game.spawnUnit('RifleInfantry', 'gdi', 25, 21);

    const state0 = await game.debugState();
    const leader = state0.find((u) => u.currentHealth === 400);
    const follower = state0.find((u) => u.currentHealth === 50);
    expect(leader).toBeDefined();
    expect(follower).toBeDefined();

    await game.follow(follower!.id, leader!.id, 3);
    await game.moveUnit(leader!.id, 28, 20);

    // Wait for leader to reach destination
    await game.waitForUnitAt(leader!.id, 28, 20, 10000);

    // Wait a bit more for follower to catch up and settle
    await game.page.waitForTimeout(3000);

    const state1 = await game.debugState();
    const followerAfter = state1.find((u) => u.id === follower!.id);
    expect(followerAfter).toBeDefined();
    expect(followerAfter!.state).toBe('IDLE');
  });
});
