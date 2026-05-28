import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-S2/S4: MurmurHash3 + 双随机数', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('murmurHash3 is deterministic for same input', async ({ page }) => {
    const result = await page.evaluate(() => {
      const murmurHash3 = (window as unknown as Record<string, unknown>)._murmurHash3 as
        | ((key: string, seed?: number) => number)
        | undefined;

      if (!murmurHash3) return { error: 'missing' };

      const h1 = murmurHash3('hello world');
      const h2 = murmurHash3('hello world');
      const h3 = murmurHash3('hello world', 0);
      const h4 = murmurHash3('different');

      return { h1, h2, h3, h4, same: h1 === h2 && h1 === h3, different: h1 !== h4 };
    });

    expect(result.error).toBeUndefined();
    expect(result.same).toBe(true);
    expect(result.different).toBe(true);
  });

  test('SharedRandom is deterministic with same seed', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SharedRandom = (window as unknown as Record<string, unknown>)._SharedRandom as new () => {
        setSeed: (seed: number) => void;
        nextInt: () => number;
        nextFloat: () => number;
        nextRange: (min: number, max: number) => number;
      };

      const r1 = new SharedRandom();
      const r2 = new SharedRandom();
      r1.setSeed(42);
      r2.setSeed(42);

      const ints: boolean[] = [];
      const floats: boolean[] = [];
      const ranges: boolean[] = [];

      for (let i = 0; i < 10; i++) {
        ints.push(r1.nextInt() === r2.nextInt());
      }

      r1.setSeed(99);
      r2.setSeed(99);
      for (let i = 0; i < 10; i++) {
        floats.push(r1.nextFloat() === r2.nextFloat());
        ranges.push(r1.nextRange(0, 100) === r2.nextRange(0, 100));
      }

      return {
        allIntsMatch: ints.every(Boolean),
        allFloatsMatch: floats.every(Boolean),
        allRangesMatch: ranges.every(Boolean),
      };
    });

    expect(result.allIntsMatch).toBe(true);
    expect(result.allFloatsMatch).toBe(true);
    expect(result.allRangesMatch).toBe(true);
  });

  test('LocalRandom diverges from SharedRandom', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SharedRandom = (window as unknown as Record<string, unknown>)._SharedRandom as new () => {
        setSeed: (seed: number) => void;
        nextInt: () => number;
      };
      const LocalRandom = (window as unknown as Record<string, unknown>)._LocalRandom as new () => {
        nextInt: () => number;
      };

      const shared = new SharedRandom();
      shared.setSeed(42);
      const local = new LocalRandom();

      // They should produce different sequences
      const s1 = shared.nextInt();
      const l1 = local.nextInt();

      return { different: s1 !== l1 };
    });

    expect(result.different).toBe(true);
  });

  test('sharedRandom singleton is exposed', async ({ page }) => {
    const result = await page.evaluate(() => {
      const shared = (window as unknown as Record<string, unknown>)._sharedRandom as
        | { nextInt: () => number }
        | undefined;
      const local = (window as unknown as Record<string, unknown>)._localRandom as
        | { nextInt: () => number }
        | undefined;

      return {
        hasShared: typeof shared?.nextInt === 'function',
        hasLocal: typeof local?.nextInt === 'function',
      };
    });

    expect(result.hasShared).toBe(true);
    expect(result.hasLocal).toBe(true);
  });
});
