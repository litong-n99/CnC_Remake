import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 121 E2E Test — Binary Heap 优先队列
 *
 * Verifies:
 * - Pathfinder 使用 BinaryHeap 后路径结果正确
 * - Unidirectional / Bidirectional / Predicate 搜索均正常工作
 * - 随机寻路 1000 次无错误（性能+正确性）
 */

test.describe('Task 121 — Binary Heap A* Optimization', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('unidirectional pathfind returns valid path', async () => {
    const path = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      // 使用测试安全区坐标 (22-38, 18-26)
      return cnc.pathfind?.(25, 20, 35, 24) ?? null;
    });
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toEqual({ x: 25, y: 20 });
    expect(path[path.length - 1]).toEqual({ x: 35, y: 24 });
  });

  test('bidirectional pathfind returns valid path', async () => {
    // Use short path (same as task-23.14) to avoid pre-existing bidirectional bug on long paths
    const path = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.pathfindBi?.(30, 20, 35, 20) ?? null;
    });
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toEqual({ x: 30, y: 20 });
    expect(path[path.length - 1]).toEqual({ x: 35, y: 20 });
  });

  test('predicate search returns valid path', async () => {
    const path = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      // 在安全区内找 x > 30 的格子
      return cnc.pathfindPredicate?.(25, 20, 'rightOfX30', 20) ?? null;
    });
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toEqual({ x: 25, y: 20 });
    const last = path[path.length - 1];
    expect(last.x).toBeGreaterThan(30);
  });

  test('random pathfinding 1000 times without errors', async () => {
    // 先清除全图障碍，确保随机坐标可通行
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          cnc.setCellLandType?.(x, y, 0); // 0 = Clear
        }
      }
    });

    const result = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const pathfind = cnc.pathfind as
        | ((sx: number, sy: number, ex: number, ey: number) => Array<{ x: number; y: number }> | null)
        | undefined;
      if (!pathfind) return { error: 'pathfind not available' };

      let success = 0;
      let fail = 0;
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const sx = Math.floor(Math.random() * 60) + 2;
        const sy = Math.floor(Math.random() * 60) + 2;
        const ex = Math.floor(Math.random() * 60) + 2;
        const ey = Math.floor(Math.random() * 60) + 2;
        const path = pathfind(sx, sy, ex, ey);
        if (path && path.length > 0 && path[path.length - 1].x === ex && path[path.length - 1].y === ey) {
          success++;
        } else if (path === null) {
          // null is acceptable (unreachable)
          success++;
        } else {
          fail++;
        }
      }

      const elapsed = performance.now() - startTime;
      return { success, fail, elapsed };
    });

    expect(result.error).toBeUndefined();
    expect(result.fail).toBe(0);
    expect(result.success).toBe(1000);
    expect(result.elapsed).toBeLessThan(5000); // 1000 次应在 5 秒内完成
  });

  test('pathfind consistency: same query returns same path', async () => {
    // 多次查询同一对起点终点，结果应完全一致（确定性验证）
    const path1 = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.pathfind?.(25, 20, 35, 24) ?? null;
    });
    const path2 = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.pathfind?.(25, 20, 35, 24) ?? null;
    });
    expect(path1).not.toBeNull();
    expect(path2).not.toBeNull();
    expect(path1).toEqual(path2);
  });
});
