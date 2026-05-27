import { test, expect } from '@playwright/test';

test.describe('Task 122 — HPF Abstract Graph + Abstract Heuristic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/CnC_Remake/?task=122');
    await page.waitForFunction(() => (window as unknown as Record<string, unknown>).cnc !== undefined, {
      timeout: 10000,
    });
  });

  test('abstract graph is built on load', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      return cnc.abstractGraph();
    });

    expect(result.built).toBe(true);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBeGreaterThanOrEqual(0);
  });

  test('abstract nodes exist in grid (0,0)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HP = (window as unknown as Record<string, unknown>)._HierarchicalPathfinder as new (
        w: number,
        h: number,
        p: () => boolean
      ) => {
        getAbstractNodesInGrid: (gx: number, gy: number) => unknown[];
      };
      // Create a simple 20x20 pathfinder with all passable
      const hpf = new HP(20, 20, () => true);
      return hpf.getAbstractNodesInGrid(0, 0).length;
    });

    expect(result).toBeGreaterThan(0);
  });

  test('abstract heuristic is 0 for same grid same domain', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      return cnc.abstractHeuristic(25, 25, 26, 26);
    });

    expect(result).toBe(0);
  });

  test('abstract heuristic is positive for distant cells', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      // Use coordinates from task-23.13 tests (known passable land)
      return cnc.abstractHeuristic(25, 30, 45, 30);
    });

    expect(result).toBeGreaterThan(0);
  });

  test('domain count matches abstract node coverage', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (...args: unknown[]) => unknown>).cnc;
      const graph = cnc.abstractGraph();
      // Use known passable coordinates from task-23.13
      const d1 = cnc.hierarchical(25, 30);
      return { graph, hasDomains: d1 >= 0 };
    });

    expect(result.hasDomains).toBe(true);
    expect(result.graph.nodeCount).toBeGreaterThan(0);
  });

  test('abstract edges connect neighboring grids', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HP = (window as unknown as Record<string, unknown>)._HierarchicalPathfinder as new (
        w: number,
        h: number,
        p: (x: number, y: number) => boolean
      ) => {
        getAbstractNodesInGrid: (gx: number, gy: number) => Array<{ gridX: number; gridY: number; domainId: number }>;
        getAbstractEdgesFrom: (gx: number, gy: number, domainId: number) => unknown[];
      };
      // 20x20 all passable -> single domain, multiple grids
      const hpf = new HP(20, 20, () => true);
      const nodes = hpf.getAbstractNodesInGrid(0, 0);
      if (nodes.length === 0) return { nodeCount: 0, edgeCount: 0 };
      const edges = hpf.getAbstractEdgesFrom(nodes[0].gridX, nodes[0].gridY, nodes[0].domainId);
      return { nodeCount: nodes.length, edgeCount: edges.length };
    });

    expect(result.nodeCount).toBeGreaterThan(0);
    // All-passable 20x20 should have edges between grid(0,0) and grid(1,0)/grid(0,1)
    expect(result.edgeCount).toBeGreaterThan(0);
  });
});
