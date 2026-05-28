import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 125 — Activity Tree', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('Activity has lifecycle hooks (onFirstRun/onLastRun)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Activity = (window as unknown as Record<string, unknown>)._Activity as new () => {
        status: string;
        runTick: () => string;
        onFirstRun: () => void;
        onLastRun: () => void;
      };
      const Status = (window as unknown as Record<string, unknown>)._ActivityStatus as Record<string, string>;

      // 创建自定义活动
      const hooks: string[] = [];
      const activity = new (class extends (Activity as unknown as new () => {
        status: string;
        runTick: () => string;
      }) {
        override onFirstRun() {
          hooks.push('firstRun');
        }
        override onLastRun() {
          hooks.push('lastRun');
        }
        override tick() {
          hooks.push('tick');
          return Status.Done;
        }
      })();

      const s1 = activity.runTick();
      const s2 = activity.runTick(); // should stay Done

      return { s1, s2, hooks };
    });

    expect(result.s1).toBe('Done');
    expect(result.s2).toBe('Done');
    expect(result.hooks).toEqual(['firstRun', 'tick', 'lastRun']);
  });

  test('Activity supports childActivity nesting', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Idle = (window as unknown as Record<string, unknown>)._IdleActivity as new () => {
        runTick: () => string;
      };
      const Move = (window as unknown as Record<string, unknown>)._MoveActivity as new (opts: {
        targetX: number;
        targetY: number;
      }) => {
        queueChild: (c: unknown) => void;
        runTick: () => string;
        getChainDescription: () => string;
        getChainDepth: () => number;
      };

      const parent = new Move({ targetX: 10, targetY: 10 });
      const child = new Idle();
      parent.queueChild(child);

      const desc = parent.getChainDescription();
      const depth = parent.getChainDepth();
      const s1 = parent.runTick(); // Idle child completes, Move parent still running (2 steps)
      const s2 = parent.runTick(); // Move step 1
      const s3 = parent.runTick(); // Move step 2 → Done

      return { desc, depth, s1, s2, s3 };
    });

    expect(result.desc).toContain('Move');
    expect(result.depth).toBe(2);
    expect(result.s1).toBe('Running');
    expect(result.s3).toBe('Done');
  });

  test('Activity queue chains next activities', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Idle = (window as unknown as Record<string, unknown>)._IdleActivity as new () => {
        runTick: () => string;
      };

      const a1 = new Idle();
      const a2 = new Idle();
      const a3 = new Idle();
      a1.queue(a2).queue(a3);

      const depth = a1.getChainDepth();
      return { depth };
    });

    expect(result.depth).toBe(3);
  });

  test('Activity cancel propagates to children and next', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Idle = (window as unknown as Record<string, unknown>)._IdleActivity as new () => {
        runTick: () => string;
        status: string;
        cancelReason?: string;
      };

      const parent = new Idle();
      const child = new Idle();
      const next = new Idle();
      parent.queueChild(child);
      parent.queue(next);

      parent.cancel('test-cancel');

      return {
        parentStatus: parent.status,
        childStatus: child.status,
        nextStatus: next.status,
        reason: parent.cancelReason,
      };
    });

    expect(result.parentStatus).toBe('Canceling');
    expect(result.childStatus).toBe('Canceling');
    expect(result.nextStatus).toBe('Canceling');
    expect(result.reason).toBe('test-cancel');
  });

  test('AttackMoveActivity contains Move child', async ({ page }) => {
    const result = await page.evaluate(() => {
      const AttackMove = (window as unknown as Record<string, unknown>)._AttackMoveActivity as new (opts: {
        targetX: number;
        targetY: number;
      }) => { getChainDescription: () => string; runTick: () => string };

      const am = new AttackMove({ targetX: 20, targetY: 30 });
      const desc = am.getChainDescription();
      const status = am.runTick();

      return { desc, status };
    });

    expect(result.desc).toContain('AttackMove');
    expect(result.status).toBe('Running');
  });

  test('SequenceActivity runs chained activities in order', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Idle = (window as unknown as Record<string, unknown>)._IdleActivity as new () => {
        runTick: () => string;
        queue: (a: unknown) => void;
      };
      const Sequence = (window as unknown as Record<string, unknown>)._SequenceActivity as new () => {
        queueChild: (a: unknown) => void;
        runTick: () => string;
      };

      const seq = new Sequence();
      const a1 = new Idle();
      const a2 = new Idle();
      a1.queue(a2);
      seq.queueChild(a1);

      const s1 = seq.runTick();
      const s2 = seq.runTick();

      return { s1, s2 };
    });

    expect(result.s1).toBe('Running');
    expect(result.s2).toBe('Done');
  });
});
