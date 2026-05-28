import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 129 — MovePart Split + Arc + Backwards', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('facingDiff returns shortest path difference (0–128)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const facingDiff = (window as unknown as Record<string, unknown>)._facingDiff as (a: number, b: number) => number;
      return {
        same: facingDiff(64, 64),
        small: facingDiff(60, 70),
        crossZero: facingDiff(250, 10),
        opposite: facingDiff(0, 128),
        crossBackward: facingDiff(200, 50),
      };
    });

    expect(result.same).toBe(0);
    expect(result.small).toBe(10);
    expect(result.crossZero).toBe(16); // |250-10|=240 > 128, so 240-256=-16, abs=16
    expect(result.opposite).toBe(128);
    expect(result.crossBackward).toBe(106); // |200-50|=150 > 128, so 150-256=-106, abs=106
  });

  test('dirToFacing converts direction vector to DirType', async ({ page }) => {
    const result = await page.evaluate(() => {
      const dirToFacing = (window as unknown as Record<string, unknown>)._dirToFacing as (
        dx: number,
        dy: number
      ) => number;
      return {
        north: dirToFacing(0, -1),
        east: dirToFacing(1, 0),
        south: dirToFacing(0, 1),
        west: dirToFacing(-1, 0),
        northeast: dirToFacing(1, -1),
      };
    });

    expect(result.north).toBe(0);
    expect(result.east).toBe(64);
    expect(result.south).toBe(128);
    expect(result.west).toBe(192);
    // northeast should be around 32
    expect(result.northeast).toBeGreaterThan(28);
    expect(result.northeast).toBeLessThan(36);
  });

  test('shouldMoveBackwards triggers when angle > 180 and distance <= 2', async ({ page }) => {
    const result = await page.evaluate(() => {
      const shouldMoveBackwards = (window as unknown as Record<string, unknown>)._shouldMoveBackwards as (
        facing: number,
        dx: number,
        dy: number,
        dist: number
      ) => boolean;
      return {
        // Facing north (0), target south (0,1) → diff=128 (opposite), dist=1
        backwards: shouldMoveBackwards(0, 0, 1, 1),
        // Facing north (0), target south (0,1) → diff=128, dist=3 (>2)
        tooFar: shouldMoveBackwards(0, 0, 1, 3),
        // Facing north (0), target north (0,-1) → diff=0
        forward: shouldMoveBackwards(0, 0, -1, 1),
        // Facing east (64), target west (-1,0) → diff=128
        backwardsEast: shouldMoveBackwards(64, -1, 0, 2),
      };
    });

    expect(result.backwards).toBe(true);
    expect(result.tooFar).toBe(false);
    expect(result.forward).toBe(false);
    expect(result.backwardsEast).toBe(true);
  });

  test('arcLerp produces curved path when arcIntensity > 0', async ({ page }) => {
    const result = await page.evaluate(() => {
      const arcLerp = (window as unknown as Record<string, unknown>)._arcLerp as (
        from: { x: number; y: number },
        to: { x: number; y: number },
        progress: number,
        intensity: number
      ) => { x: number; y: number };

      const from = { x: 0, y: 0 };
      const to = { x: 10, y: 0 };

      const straight = arcLerp(from, to, 0.5, 0);
      const curved = arcLerp(from, to, 0.5, 1);

      return {
        straightMidY: straight.y,
        curvedMidY: curved.y,
        straightMidX: straight.x,
        curvedMidX: curved.x,
      };
    });

    // Straight line midpoint should be (5, 0)
    expect(result.straightMidY).toBeCloseTo(0, 5);
    expect(result.straightMidX).toBeCloseTo(5, 5);

    // Curved path midpoint should deviate from y=0
    expect(Math.abs(result.curvedMidY)).toBeGreaterThan(0.5);
    expect(result.curvedMidX).toBeCloseTo(5, 5);
  });

  test('MoveFirstHalf progresses from fromCell to midpoint', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MoveFirstHalf = (window as unknown as Record<string, unknown>)._MoveFirstHalf as new (opts: {
        fromX: number;
        fromY: number;
        toX: number;
        toY: number;
        speed: number;
        currentFacing: number;
        turnsWhileMoving: boolean;
      }) => { tick: () => string; getPosition: () => { x: number; y: number } };

      const mf = new MoveFirstHalf({
        fromX: 10,
        fromY: 10,
        toX: 12,
        toY: 10,
        speed: 0.6,
        currentFacing: 64, // east
        turnsWhileMoving: true,
      });

      const s1 = mf.tick();
      const pos1 = mf.getPosition();
      const s2 = mf.tick();
      const pos2 = mf.getPosition();

      return { s1, s2, pos1, pos2 };
    });

    expect(result.s1).toBe('Running');
    expect(result.s2).toBe('Done');
    // midpoint of (10,10) and (12,10) = (11, 10)
    expect(result.pos2.x).toBeCloseTo(11, 1);
    expect(result.pos2.y).toBeCloseTo(10, 1);
  });

  test('MoveSecondHalf supports carryover progress', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MoveSecondHalf = (window as unknown as Record<string, unknown>)._MoveSecondHalf as new (opts: {
        midX: number;
        midY: number;
        toX: number;
        toY: number;
        speed: number;
        facing: number;
        carryover?: number;
      }) => { tick: () => string; getPosition: () => { x: number; y: number } };

      // With carryover=0.8 and speed=2.0, should finish in 1 tick
      // totalDist = 2, progressStep = 2.0/2 = 1.0, 0.8 + 1.0 = 1.8 > 1
      const ms = new MoveSecondHalf({
        midX: 10,
        midY: 10,
        toX: 12,
        toY: 10,
        speed: 2.0,
        facing: 64,
        carryover: 0.8,
      });

      const s1 = ms.tick();
      const pos1 = ms.getPosition();

      return { s1, pos1 };
    });

    expect(result.s1).toBe('Done');
    expect(result.pos1.x).toBeCloseTo(12, 1);
    expect(result.pos1.y).toBeCloseTo(10, 1);
  });
});
