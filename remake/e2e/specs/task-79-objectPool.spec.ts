import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 79: Object Pool', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-79.1: pool reuses objects and tracks stats', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Pool = (window as unknown as Record<string, unknown>)._ObjectPool as new <T extends { reset(): void }>(
        factory: () => T,
        initial: number,
        max: number
      ) => {
        acquire: () => T;
        release: (obj: T) => void;
        getFreeCount: () => number;
        getActiveCount: () => number;
        getTotalCreated: () => number;
        getTotalReused: () => number;
      };

      let id = 0;
      const pool = new Pool(
        () => {
          const i = ++id;
          return {
            id: i,
            payload: 0,
            reset: () => {
              /* no-op */
            },
          };
        },
        2,
        10
      );

      const a = pool.acquire();
      pool.acquire(); // b
      pool.acquire(); // c
      pool.release(a);
      const d = pool.acquire();

      return {
        free: pool.getFreeCount(),
        active: pool.getActiveCount(),
        created: pool.getTotalCreated(),
        reused: pool.getTotalReused(),
        aId: a.id,
        dId: d.id,
      };
    });

    expect(result.created).toBe(3);
    expect(result.reused).toBe(3);
    expect(result.free).toBe(0);
    expect(result.active).toBe(3);
    expect(result.dId).toBe(result.aId);
  });

  test('task-79.2: reset is called on release', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Pool = (window as unknown as Record<string, unknown>)._ObjectPool as new <T extends { reset(): void }>(
        factory: () => T,
        initial: number,
        max: number
      ) => {
        acquire: () => T;
        release: (obj: T) => void;
      };

      const pool = new Pool(
        () => {
          return {
            dirty: true,
            reset: function () {
              this.dirty = false;
            },
          };
        },
        0,
        10
      );

      const obj = pool.acquire();
      const before = obj.dirty;
      pool.release(obj);
      const after = obj.dirty;
      return { before, after };
    });

    expect(result.before).toBe(true);
    expect(result.after).toBe(false);
  });
});
