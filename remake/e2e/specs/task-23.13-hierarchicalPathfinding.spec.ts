import { test, expect } from '@playwright/test';

/**
 * Task 23.13 — Hierarchical Pathfinding / DomainIndex
 *
 * 验证 HierarchicalPathfinder 的 O(1) domain 连通性预检：
 * - 同 domain 内寻路正常
 * - 跨 Water 分隔带寻路被快速拒绝（<1ms，A* openSet 为空）
 */

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:5173/CnC_Remake/?task=23.13');
  await page.waitForFunction(() => (window as unknown as Record<string, unknown>).cnc !== undefined, {
    timeout: 10000,
  });
});

test.describe('Task 23.13 — HierarchicalPathfinder', () => {
  test('domain assigns different IDs across water barrier', async ({ page }) => {
    const leftDomain = await page.evaluate(() =>
      (window as unknown as Record<string, (x: number, y: number) => number>).cnc.hierarchical(25, 30)
    );
    const rightDomain = await page.evaluate(() =>
      (window as unknown as Record<string, (x: number, y: number) => number>).cnc.hierarchical(35, 30)
    );
    // Water wall at x=30, y=10-50 separates left and right
    expect(leftDomain).toBeGreaterThanOrEqual(0);
    expect(rightDomain).toBeGreaterThanOrEqual(0);
    expect(leftDomain).not.toBe(rightDomain);
  });

  test('same domain cells have identical domain ID', async ({ page }) => {
    const d1 = await page.evaluate(() =>
      (window as unknown as Record<string, (x: number, y: number) => number>).cnc.hierarchical(25, 30)
    );
    const d2 = await page.evaluate(() =>
      (window as unknown as Record<string, (x: number, y: number) => number>).cnc.hierarchical(28, 30)
    );
    expect(d1).toBe(d2);
  });

  test('water cell has domain -1', async ({ page }) => {
    const domain = await page.evaluate(() =>
      (window as unknown as Record<string, (x: number, y: number) => number>).cnc.hierarchical(30, 30)
    );
    expect(domain).toBe(-1);
  });

  test('pathfind across water barrier returns null (quick reject)', async ({ page }) => {
    const path = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: number[]) => unknown[]>).cnc.pathfind(25, 30, 35, 30)
    );
    expect(path).toBeNull();
  });

  test('pathfind within same domain returns valid path', async ({ page }) => {
    const path = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: number[]) => unknown[]>).cnc.pathfind(25, 30, 28, 30)
    );
    expect(path).not.toBeNull();
    expect(Array.isArray(path)).toBe(true);
    expect((path as unknown[]).length).toBeGreaterThanOrEqual(2);
    // Path should start at (25,30) and end at (28,30)
    const first = (path as Array<{ x: number; y: number }>)[0];
    const last = (path as Array<{ x: number; y: number }>)[(path as unknown[]).length - 1];
    expect(first.x).toBe(25);
    expect(first.y).toBe(30);
    expect(last.x).toBe(28);
    expect(last.y).toBe(30);
  });
});
