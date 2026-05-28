import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-CB3/CB4: 转向约束 + 射程检测', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('TurnConstraint limits facing change per tick', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TurnConstraint = (window as unknown as Record<string, unknown>)._TurnConstraint as new (
        turnSpeed: number,
        initial: number
      ) => {
        turnToward: (target: number) => number;
        isAligned: (target: number) => boolean;
        canAimAt: (target: number) => boolean;
        currentFacing: number;
      };

      const tc = new TurnConstraint(8, 0); // turn speed 8 per tick

      const facings: number[] = [];
      for (let i = 0; i < 20; i++) {
        facings.push(tc.turnToward(100));
      }

      return {
        facings,
        aligned: tc.isAligned(100),
        canAim: tc.canAimAt(100),
        maxStep: Math.max(...facings.slice(1).map((f, i) => Math.abs(f - facings[i]))),
      };
    });

    expect(result.aligned).toBe(true);
    expect(result.canAim).toBe(true);
    expect(result.maxStep).toBeLessThanOrEqual(8);
  });

  test('TurnConstraint handles wrap-around (0/256)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TurnConstraint = (window as unknown as Record<string, unknown>)._TurnConstraint as new (
        turnSpeed: number,
        initial: number
      ) => {
        turnToward: (target: number) => number;
        isAligned: (target: number, tolerance?: number) => boolean;
      };

      const tc = new TurnConstraint(16, 250); // near 0 boundary
      const f1 = tc.turnToward(10); // should go 250 → 250+16=266 → 10 (wrap)

      return { f1, aligned: tc.isAligned(10) };
    });

    expect(result.aligned).toBe(true);
  });

  test('RangeCheck respects min/max range', async ({ page }) => {
    const result = await page.evaluate(() => {
      const RangeCheck = (window as unknown as Record<string, unknown>)._RangeCheck as new (opts: {
        minRange?: number;
        maxRange: number;
      }) => {
        isInRange: (mx: number, my: number, tx: number, ty: number) => boolean;
        isTooClose: (mx: number, my: number, tx: number, ty: number) => boolean;
        isTooFar: (mx: number, my: number, tx: number, ty: number) => boolean;
      };

      const rc = new RangeCheck({ minRange: 3, maxRange: 10 });

      return {
        tooClose: rc.isTooClose(0, 0, 2, 0),
        inRange: rc.isInRange(0, 0, 5, 0),
        tooFar: rc.isTooFar(0, 0, 15, 0),
        edgeMin: rc.isInRange(0, 0, 3, 0),
        edgeMax: rc.isInRange(0, 0, 10, 0),
      };
    });

    expect(result.tooClose).toBe(true);
    expect(result.inRange).toBe(true);
    expect(result.tooFar).toBe(true);
    expect(result.edgeMin).toBe(true);
    expect(result.edgeMax).toBe(true);
  });

  test('RangeCheck getDistance is accurate', async ({ page }) => {
    const result = await page.evaluate(() => {
      const RangeCheck = (window as unknown as Record<string, unknown>)._RangeCheck as new (opts: {
        maxRange: number;
      }) => {
        getDistance: (mx: number, my: number, tx: number, ty: number) => number;
      };

      const rc = new RangeCheck({ maxRange: 10 });
      const d = rc.getDistance(0, 0, 3, 4);

      return { d };
    });

    expect(result.d).toBe(5); // 3-4-5 triangle
  });
});
