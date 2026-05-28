import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-B1/B2: 单位生产队列 + Production Trait', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('ProductionQueue enqueues and tracks progress', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ProductionQueue = (window as unknown as Record<string, unknown>)._ProductionQueue as new (
        house: unknown
      ) => {
        enqueue: (def: { cost: number; buildTime: number }) => boolean;
        tick: (dt: number) => void;
        getQueueLength: () => number;
        getCurrentProgress: () => number;
        hasReady: () => boolean;
      };

      const mockHouse = {
        credits: 1000,
        buildSpeedBias: 1,
        economy: {
          takeCash: (amount: number) => {
            if (mockHouse.credits >= amount) {
              mockHouse.credits -= amount;
              return true;
            }
            return false;
          },
          addCash: (amount: number) => {
            mockHouse.credits += amount;
          },
        },
      };

      const queue = new ProductionQueue(mockHouse);
      const ok = queue.enqueue({ cost: 100, buildTime: 0.1 }); // 100ms build time

      queue.tick(50); // 50ms
      const p1 = queue.getCurrentProgress();
      queue.tick(50); // 100ms total
      const p2 = queue.getCurrentProgress();
      const ready = queue.hasReady();

      return { ok, p1, p2: Math.round(p2 * 100) / 100, ready, queueLength: queue.getQueueLength() };
    });

    expect(result.ok).toBe(true);
    expect(result.p1).toBe(0.5);
    expect(result.p2).toBe(0); // item removed when ready
    expect(result.ready).toBe(true);
    expect(result.queueLength).toBe(0);
  });

  test('ProductionQueue cancel refunds cost', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ProductionQueue = (window as unknown as Record<string, unknown>)._ProductionQueue as new (
        house: unknown
      ) => {
        enqueue: (def: { cost: number; buildTime: number }) => boolean;
        cancel: (index: number) => boolean;
        getQueueLength: () => number;
      };

      const mockHouse = {
        credits: 1000,
        buildSpeedBias: 1,
        economy: {
          takeCash: (amount: number) => {
            if (mockHouse.credits >= amount) {
              mockHouse.credits -= amount;
              return true;
            }
            return false;
          },
          addCredits: (amount: number) => {
            mockHouse.credits += amount;
          },
        },
      };

      const queue = new ProductionQueue(mockHouse);
      queue.enqueue({ cost: 100, buildTime: 1 });
      const creditsBefore = mockHouse.credits;
      const cancelled = queue.cancel(0);
      const creditsAfter = mockHouse.credits;

      return { cancelled, creditsBefore, creditsAfter, refunded: creditsAfter - creditsBefore };
    });

    expect(result.cancelled).toBe(true);
    expect(result.refunded).toBe(100);
  });

  test('ProductionQueue pause/resume', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ProductionQueue = (window as unknown as Record<string, unknown>)._ProductionQueue as new (
        house: unknown
      ) => {
        enqueue: (def: { cost: number; buildTime: number }) => boolean;
        tick: (dt: number) => void;
        togglePause: (index: number) => boolean;
        getCurrentProgress: () => number;
      };

      const mockHouse = {
        credits: 1000,
        buildSpeedBias: 1,
        economy: {
          takeCash: () => true,
          addCredits: () => {},
        },
      };

      const queue = new ProductionQueue(mockHouse);
      queue.enqueue({ cost: 100, buildTime: 0.2 }); // 200ms

      queue.tick(50);
      const p1 = queue.getCurrentProgress();
      queue.togglePause(0);
      queue.tick(50); // should not progress while paused
      const p2 = queue.getCurrentProgress();
      queue.togglePause(0);
      queue.tick(100); // resume: 50 + 100 = 150 / 200 = 0.75
      const p3 = queue.getCurrentProgress();
      queue.tick(60); // 150 + 60 = 210 / 200 > 1.0 → should complete
      const ready = queue.hasReady();

      return { p1, p2, p3: Math.round(p3 * 100) / 100, ready };
    });

    expect(result.p1).toBe(0.25); // 50ms / 200ms
    expect(result.p2).toBe(0.25); // paused, no progress
    expect(result.p3).toBe(0.75); // 50 + 100 = 150 / 200
    expect(result.ready).toBe(true); // tick(60) completed it
  });

  test('Production Trait rally point', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Production = (window as unknown as Record<string, unknown>)._Production as new (
        queue: unknown,
        opts: unknown
      ) => {
        setRallyPoint: (x: number, y: number) => void;
        getRallyPoint: () => { x: number; y: number } | null;
        clearRallyPoint: () => void;
      };

      const mockQueue = {
        hasReady: () => false,
        dequeueReady: () => null,
      };

      const prod = new Production(mockQueue, {
        exitCellX: 10,
        exitCellY: 10,
        facing: 0,
        scene: null,
      });

      prod.setRallyPoint(20, 20);
      const rp1 = prod.getRallyPoint();
      prod.clearRallyPoint();
      const rp2 = prod.getRallyPoint();

      return { rp1, rp2 };
    });

    expect(result.rp1).toEqual({ x: 20, y: 20 });
    expect(result.rp2).toBeNull();
  });
});
