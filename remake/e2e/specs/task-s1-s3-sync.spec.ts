import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-S1/S3: Sync 字段标记 + RunUnsynced', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('registerSyncFields marks fields for deterministic hashing', async ({ page }) => {
    const result = await page.evaluate(() => {
      const registerSyncFields = (window as unknown as Record<string, unknown>)._registerSyncFields as
        | ((cls: new () => unknown, fields: string[]) => void)
        | undefined;
      const hashSyncObject = (window as unknown as Record<string, unknown>)._hashSyncObject as
        | ((obj: unknown, className?: string) => number)
        | undefined;

      if (!registerSyncFields || !hashSyncObject) {
        return { error: 'Sync functions not exposed' };
      }

      class TestUnit {
        x = 10;
        y = 20;
        health = 100;
        cosmetic = 999; // not registered for sync
      }

      registerSyncFields(TestUnit, ['x', 'y', 'health']);

      const u1 = new TestUnit();
      const hash1 = hashSyncObject(u1, 'TestUnit');

      u1.x = 11;
      const hash2 = hashSyncObject(u1, 'TestUnit');

      u1.cosmetic = 888; // should not affect hash
      const hash3 = hashSyncObject(u1, 'TestUnit');

      return { hash1, hash2, hash3, sameAfterCosmeticChange: hash2 === hash3 };
    });

    expect(result.error).toBeUndefined();
    expect(result.hash1).not.toBe(result.hash2); // x changed -> hash changed
    expect(result.sameAfterCosmeticChange).toBe(true); // cosmetic not synced
  });

  test('hashSyncObject is deterministic for same values', async ({ page }) => {
    const result = await page.evaluate(() => {
      const registerSyncFields = (window as unknown as Record<string, unknown>)._registerSyncFields as
        | ((cls: new () => unknown, fields: string[]) => void)
        | undefined;
      const hashSyncObject = (window as unknown as Record<string, unknown>)._hashSyncObject as
        | ((obj: unknown, className?: string) => number)
        | undefined;

      if (!registerSyncFields || !hashSyncObject) return { error: 'missing' };

      class TestObj {
        a = 1;
        b = 'hello';
      }
      registerSyncFields(TestObj, ['a', 'b']);

      const o1 = new TestObj();
      const o2 = new TestObj();

      return {
        hash1: hashSyncObject(o1, 'TestObj'),
        hash2: hashSyncObject(o2, 'TestObj'),
      };
    });

    expect(result.hash1).toBe(result.hash2);
  });

  test('runUnsynced tracks nesting depth correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const runUnsynced = (window as unknown as Record<string, unknown>)._runUnsynced as
        | (<T>(world: unknown, action: () => T) => T)
        | undefined;
      const isUnsynced = (window as unknown as Record<string, unknown>)._isUnsynced as (() => boolean) | undefined;
      const getUnsyncedDepth = (window as unknown as Record<string, unknown>)._getUnsyncedDepth as
        | (() => number)
        | undefined;

      if (!runUnsynced || !isUnsynced || !getUnsyncedDepth) {
        return { error: 'missing' };
      }

      const states: { isUnsynced: boolean; depth: number; value: number }[] = [];

      states.push({ isUnsynced: isUnsynced(), depth: getUnsyncedDepth(), value: 0 });

      const result = runUnsynced(null, () => {
        states.push({ isUnsynced: isUnsynced(), depth: getUnsyncedDepth(), value: 1 });

        const nested = runUnsynced(null, () => {
          states.push({ isUnsynced: isUnsynced(), depth: getUnsyncedDepth(), value: 2 });
          return 42;
        });

        states.push({ isUnsynced: isUnsynced(), depth: getUnsyncedDepth(), value: 3 });
        return nested;
      });

      states.push({ isUnsynced: isUnsynced(), depth: getUnsyncedDepth(), value: 4 });

      return { states, result };
    });

    expect(result.error).toBeUndefined();
    expect(result.result).toBe(42);
    expect(result.states).toEqual([
      { isUnsynced: false, depth: 0, value: 0 }, // before
      { isUnsynced: true, depth: 1, value: 1 }, // inside outer
      { isUnsynced: true, depth: 2, value: 2 }, // inside nested
      { isUnsynced: true, depth: 1, value: 3 }, // back to outer
      { isUnsynced: false, depth: 0, value: 4 }, // after
    ]);
  });

  test('runUnsynced handles exceptions safely', async ({ page }) => {
    const result = await page.evaluate(() => {
      const runUnsynced = (window as unknown as Record<string, unknown>)._runUnsynced as
        | (<T>(world: unknown, action: () => T) => T)
        | undefined;
      const getUnsyncedDepth = (window as unknown as Record<string, unknown>)._getUnsyncedDepth as
        | (() => number)
        | undefined;

      if (!runUnsynced || !getUnsyncedDepth) return { error: 'missing' };

      let depthAfterError = -1;
      try {
        runUnsynced(null, () => {
          throw new Error('test-error');
        });
      } catch {
        depthAfterError = getUnsyncedDepth();
      }

      return { depthAfterError };
    });

    expect(result.depthAfterError).toBe(0); // depth restored even on exception
  });
});
