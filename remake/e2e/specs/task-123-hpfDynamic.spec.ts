import { test, expect } from '@playwright/test';

test.describe('Task 123 — HPF Dynamic Update (Dirty Grid Incremental Rebuild)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/CnC_Remake/?task=123');
    await page.waitForFunction(() => (window as unknown as Record<string, unknown>).cnc !== undefined, {
      timeout: 10000,
    });
  });

  test('markDirtyCell increases dirty grid count', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      const before = cnc.dirtyGridCount();
      cnc.markDirtyCell(30, 30);
      const after = cnc.dirtyGridCount();
      return { before, after };
    });

    expect(result.before).toBe(0);
    expect(result.after).toBeGreaterThan(0);
  });

  test('flushDirtyGrids clears dirty grids on areConnected query', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      cnc.markDirtyCell(25, 30);
      const before = cnc.dirtyGridCount();
      // areConnected triggers flush (via pathfind internal check)
      cnc.pathfind(25, 25, 28, 28);
      const after = cnc.dirtyGridCount();
      return { before, after };
    });

    expect(result.before).toBeGreaterThan(0);
    expect(result.after).toBe(0);
  });

  test('abstract graph remains valid after marking dirty', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      const before = cnc.abstractGraph();
      cnc.markDirtyCell(25, 30);
      // trigger rebuild via areConnected
      cnc.hierarchical(25, 30);
      const after = cnc.abstractGraph();
      return { before, after };
    });

    expect(result.after.built).toBe(true);
    expect(result.after.nodeCount).toBeGreaterThan(0);
  });

  test('pathfind works after terrain change via dirty grid', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      // Mark a cell dirty and verify pathfind still works
      cnc.markDirtyCell(25, 30);
      const path = cnc.pathfind(25, 25, 28, 28);
      return path !== null && Array.isArray(path) && path.length >= 2;
    });

    expect(result).toBe(true);
  });

  test('markDirtyCell affects neighboring grids', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      // Clear any previous dirty state
      cnc.hierarchical(0, 0);
      const before = cnc.dirtyGridCount();
      // Mark a cell dirty — should also dirty 8 neighbors
      cnc.markDirtyCell(30, 30);
      const after = cnc.dirtyGridCount();
      return { before, after };
    });

    expect(result.before).toBe(0);
    // grid size = 10, cell(30,30) is in grid(3,3)
    // 8 neighbors + self = 9 grids dirty
    expect(result.after).toBeGreaterThanOrEqual(9);
  });
});
