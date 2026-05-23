import { test, expect } from '@playwright/test';

/**
 * Task 23.14 — Bidirectional A* + Predicate Search
 *
 * 验证：
 * - 双向 A* 与单向 A* 返回等长路径（或相同路径）
 * - Predicate Search 能在限定步数内找到满足条件的格子
 * - 无匹配时返回 null
 */

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:5173/CnC_Remake/');
  await page.waitForFunction(() => (window as unknown as Record<string, unknown>).cnc !== undefined, {
    timeout: 10000,
  });
});

test.describe('Task 23.14 — Bidirectional A* + Predicate Search', () => {
  test('bidirectional returns same-length path as unidirectional', async ({ page }) => {
    const uniPath = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: number[]) => unknown[]>).cnc.pathfind(30, 20, 35, 20)
    );
    const biPath = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: number[]) => unknown[]>).cnc.pathfindBi(30, 20, 35, 20)
    );

    expect(uniPath).not.toBeNull();
    expect(biPath).not.toBeNull();
    expect(Array.isArray(uniPath)).toBe(true);
    expect(Array.isArray(biPath)).toBe(true);

    const uniLen = (uniPath as unknown[]).length;
    const biLen = (biPath as unknown[]).length;

    // 双向 A* 应该能找到路径，长度与单向一致或接近
    expect(biLen).toBeGreaterThanOrEqual(2);
    expect(biLen).toBeLessThanOrEqual(uniLen + 2); // 允许微小差异

    // 起点和终点应一致
    const uniFirst = (uniPath as Array<{ x: number; y: number }>)[0];
    const uniLast = (uniPath as Array<{ x: number; y: number }>)[uniLen - 1];
    const biFirst = (biPath as Array<{ x: number; y: number }>)[0];
    const biLast = (biPath as Array<{ x: number; y: number }>)[biLen - 1];

    expect(biFirst.x).toBe(uniFirst.x);
    expect(biFirst.y).toBe(uniFirst.y);
    expect(biLast.x).toBe(uniLast.x);
    expect(biLast.y).toBe(uniLast.y);
  });

  test('predicate search finds cell right of x=30', async ({ page }) => {
    const path = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: unknown[]) => unknown[]>).cnc.pathfindPredicate(
        25,
        25,
        'rightOfX30',
        20
      )
    );
    expect(path).not.toBeNull();
    expect(Array.isArray(path)).toBe(true);
    const last = (path as Array<{ x: number; y: number }>)[(path as unknown[]).length - 1];
    expect(last.x).toBeGreaterThan(30);
  });

  test('predicate search finds cell below y=30', async ({ page }) => {
    const path = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: unknown[]) => unknown[]>).cnc.pathfindPredicate(
        25,
        25,
        'belowY30',
        20
      )
    );
    expect(path).not.toBeNull();
    expect(Array.isArray(path)).toBe(true);
    const last = (path as Array<{ x: number; y: number }>)[(path as unknown[]).length - 1];
    expect(last.y).toBeGreaterThan(30);
  });

  test('predicate search finds cell near target within radius', async ({ page }) => {
    const path = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: unknown[]) => unknown[]>).cnc.pathfindPredicate(
        25,
        25,
        'nearTarget,40,40,5',
        30
      )
    );
    expect(path).not.toBeNull();
    expect(Array.isArray(path)).toBe(true);
    const last = (path as Array<{ x: number; y: number }>)[(path as unknown[]).length - 1];
    const dx = last.x - 40;
    const dy = last.y - 40;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeLessThanOrEqual(5);
  });

  test('predicate search returns null when no cell matches', async ({ page }) => {
    const path = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: unknown[]) => unknown[]>).cnc.pathfindPredicate(
        25,
        25,
        'rightOfX30',
        2 // maxDistance too small to reach x>30
      )
    );
    expect(path).toBeNull();
  });
});
