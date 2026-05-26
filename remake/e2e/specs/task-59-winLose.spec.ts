import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 59: Win/Lose Conditions', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-59.1: all primary objectives complete triggers victory', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Checker = (window as unknown as Record<string, unknown>)._WinLoseChecker as new (
        om: {
          allPrimariesComplete: () => boolean;
          anyPrimaryFailed: () => boolean;
        },
        opts?: { timeLimitSeconds?: number }
      ) => {
        tick: (dt: number) => void;
        getResult: () => string;
        isPlaying: () => boolean;
        getElapsedSeconds: () => number;
      };

      const om = (window as unknown as Record<string, unknown>)._objectiveManager as {
        clear: () => void;
        addObjective: (obj: {
          id: string;
          description: string;
          type: string;
          status: string;
          progress: number;
          targetProgress: number;
          isPrimary: boolean;
        }) => void;
        completeObjective: (id: string) => void;
      };
      om.clear();
      om.addObjective({
        id: 'primary-1',
        description: 'Win objective',
        type: 'custom',
        status: 'incomplete',
        progress: 0,
        targetProgress: 1,
        isPrimary: true,
      });

      const checker = new Checker(om, { timeLimitSeconds: 0 });
      const before = checker.getResult();
      om.completeObjective('primary-1');
      checker.tick(1);
      const after = checker.getResult();
      return { before, after };
    });

    expect(result.before).toBe('playing');
    expect(result.after).toBe('victory');
  });

  test('task-59.2: time limit triggers victory when elapsed', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Checker = (window as unknown as Record<string, unknown>)._WinLoseChecker as new (
        om: {
          allPrimariesComplete: () => boolean;
          anyPrimaryFailed: () => boolean;
        },
        opts?: { timeLimitSeconds?: number }
      ) => {
        tick: (dt: number) => void;
        getResult: () => string;
        getElapsedSeconds: () => number;
      };

      const om = (window as unknown as Record<string, unknown>)._objectiveManager as {
        clear: () => void;
      };
      om.clear();

      const checker = new Checker(om, { timeLimitSeconds: 5 });
      checker.tick(3);
      const mid = checker.getResult();
      checker.tick(3);
      const end = checker.getResult();
      return { mid, end };
    });

    expect(result.mid).toBe('playing');
    expect(result.end).toBe('victory');
  });

  test('task-59.3: force victory and defeat work independently', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Checker = (window as unknown as Record<string, unknown>)._WinLoseChecker as new (om: {
        allPrimariesComplete: () => boolean;
        anyPrimaryFailed: () => boolean;
      }) => {
        forceVictory: () => void;
        forceDefeat: () => void;
        getResult: () => string;
        reset: () => void;
      };

      const om = (window as unknown as Record<string, unknown>)._objectiveManager as {
        clear: () => void;
      };
      om.clear();

      const checker = new Checker(om);
      checker.forceDefeat();
      const defeat = checker.getResult();
      checker.reset();
      checker.forceVictory();
      const victory = checker.getResult();
      return { defeat, victory };
    });

    expect(result.defeat).toBe('defeat');
    expect(result.victory).toBe('victory');
  });
});
