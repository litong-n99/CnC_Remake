import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 131 — ActorMap Bin + Trigger System', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('ActorMap bin query returns actors in box and circle', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;

      cnc.clear();
      cnc.unit('MediumTank', 'gdi', 5, 5);
      cnc.unit('MediumTank', 'gdi', 6, 6);
      cnc.unit('MediumTank', 'gdi', 50, 50);

      const actorMap = (window as unknown as Record<string, unknown>).ActorMap as {
        getInstance: () => {
          actorsInBox: (minX: number, minY: number, maxX: number, maxY: number) => string[];
          actorsInCircle: (cx: number, cy: number, r: number) => string[];
        };
      };
      const am = actorMap.getInstance();
      const boxResults = am.actorsInBox(0, 0, 10, 10);
      const circleResults = am.actorsInCircle(5, 5, 3);

      return { boxCount: boxResults.length, circleCount: circleResults.length };
    });

    expect(result.boxCount).toBe(2);
    expect(result.circleCount).toBeGreaterThanOrEqual(1);
  });

  test('SpatialTriggerSystem fires CellTrigger enter and exit', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;
      const TS = (window as unknown as Record<string, unknown>).SpatialTriggerSystem as new () => {
        addCellTrigger: (
          id: string,
          x: number,
          y: number,
          onEnter: (id: string) => void,
          onExit: (id: string) => void
        ) => unknown;
        tick: () => void;
      };
      const AM = (window as unknown as Record<string, unknown>).ActorMap as {
        getInstance: () => { move: (id: string, fx: number, fy: number, tx: number, ty: number) => void };
      };

      cnc.clear();
      cnc.unit('MediumTank', 'gdi', 10, 10);

      const ts = new TS();
      const events: string[] = [];
      ts.addCellTrigger(
        't1',
        15,
        15,
        (id) => events.push(`enter:${id}`),
        (id) => events.push(`exit:${id}`)
      );

      // Move unit into (15,15)
      const am = AM.getInstance();
      am.move('go_1', 10, 10, 15, 15);
      ts.tick();

      // Move unit out
      am.move('go_1', 15, 15, 20, 20);
      ts.tick();

      return { events };
    });

    expect(result.events.length).toBe(2);
    expect(result.events.some((e) => e.startsWith('enter:'))).toBe(true);
    expect(result.events.some((e) => e.startsWith('exit:'))).toBe(true);
  });

  test('SpatialTriggerSystem fires ProximityTrigger enter and exit', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;
      const TS = (window as unknown as Record<string, unknown>).SpatialTriggerSystem as new () => {
        addProximityTrigger: (
          id: string,
          cx: number,
          cy: number,
          r: number,
          onEnter: (id: string) => void,
          onExit: (id: string) => void
        ) => unknown;
        tick: () => void;
      };
      const AM = (window as unknown as Record<string, unknown>).ActorMap as {
        getInstance: () => { move: (id: string, fx: number, fy: number, tx: number, ty: number) => void };
      };

      cnc.clear();
      cnc.unit('MediumTank', 'gdi', 10, 10);

      const ts = new TS();
      const events: string[] = [];
      ts.addProximityTrigger(
        'p1',
        20,
        20,
        5,
        (id) => events.push(`enter:${id}`),
        (id) => events.push(`exit:${id}`)
      );

      // Initial tick: unit at (10,10) is outside radius 5 of (20,20)
      ts.tick();

      // Move unit close
      const am = AM.getInstance();
      am.move('go_1', 10, 10, 19, 19);
      ts.tick();

      // Move unit away
      am.move('go_1', 19, 19, 10, 10);
      ts.tick();

      return { events };
    });

    expect(result.events.length).toBe(2);
    expect(result.events.some((e) => e.startsWith('enter:'))).toBe(true);
    expect(result.events.some((e) => e.startsWith('exit:'))).toBe(true);
  });
});
