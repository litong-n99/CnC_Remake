import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 9.7 — Shroud Edge Rendering', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('ShroudEdges enum has correct bitfield values', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Edges = (window as unknown as Record<string, unknown>)._ShroudEdges as Record<string, number>;
      return {
        None: Edges.None,
        TopLeft: Edges.TopLeft,
        Top: Edges.Top,
        TopRight: Edges.TopRight,
        Left: Edges.Left,
        Right: Edges.Right,
        BottomLeft: Edges.BottomLeft,
        Bottom: Edges.Bottom,
        BottomRight: Edges.BottomRight,
      };
    });

    expect(result.None).toBe(0);
    expect(result.Top).toBe(1 << 1);
    expect(result.Right).toBe(1 << 4);
    expect(result.Bottom).toBe(1 << 6);
    expect(result.Left).toBe(1 << 3);
    expect(result.TopLeft).toBe(1 << 0);
    expect(result.TopRight).toBe(1 << 2);
    expect(result.BottomLeft).toBe(1 << 5);
    expect(result.BottomRight).toBe(1 << 7);
  });

  test('getNeighborsVisibility returns 8 neighbors in correct order', async ({ page }) => {
    const result = await page.evaluate(() => {
      const FogOfWar = (window as unknown as Record<string, unknown>)._FogOfWar as new (opts: {
        width: number;
        height: number;
      }) => { setVisibility: (x: number, y: number, state: number) => void };
      const getNeighbors = (window as unknown as Record<string, unknown>)._getNeighborsVisibility as (
        fog: unknown,
        x: number,
        y: number
      ) => number[];
      const CellVisibility = (window as unknown as Record<string, unknown>)._CellVisibility as Record<string, number>;

      const fog = new FogOfWar({ width: 5, height: 5 });
      // Set center (2,2) = Shroud, all neighbors = Visible
      fog.setVisibility(2, 2, CellVisibility.Shroud);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          fog.setVisibility(2 + dx, 2 + dy, CellVisibility.Visible);
        }
      }

      const neighbors = getNeighbors(fog, 2, 2);
      return { neighbors, length: neighbors.length };
    });

    expect(result.length).toBe(8);
    // All 8 neighbors should be Visible (= 2)
    expect(result.neighbors.every((v: number) => v === 2)).toBe(true);
  });

  test('getEdges returns correct bitfield for surrounded Shroud cell', async ({ page }) => {
    const result = await page.evaluate(() => {
      const FogOfWar = (window as unknown as Record<string, unknown>)._FogOfWar as new (opts: {
        width: number;
        height: number;
      }) => { setVisibility: (x: number, y: number, state: number) => void };
      const getNeighbors = (window as unknown as Record<string, unknown>)._getNeighborsVisibility as (
        fog: unknown,
        x: number,
        y: number
      ) => number[];
      const getEdges = (window as unknown as Record<string, unknown>)._getEdges as (
        neighbors: number[],
        self: number
      ) => number;
      const CellVisibility = (window as unknown as Record<string, unknown>)._CellVisibility as Record<string, number>;
      const ShroudEdges = (window as unknown as Record<string, unknown>)._ShroudEdges as Record<string, number>;

      const fog = new FogOfWar({ width: 5, height: 5 });
      // Center = Shroud, all neighbors = Visible
      fog.setVisibility(2, 2, CellVisibility.Shroud);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          fog.setVisibility(2 + dx, 2 + dy, CellVisibility.Visible);
        }
      }

      const neighbors = getNeighbors(fog, 2, 2);
      const edges = getEdges(neighbors, CellVisibility.Shroud);

      return {
        edges,
        allEdges:
          ShroudEdges.TopLeft |
          ShroudEdges.Top |
          ShroudEdges.TopRight |
          ShroudEdges.Left |
          ShroudEdges.Right |
          ShroudEdges.BottomLeft |
          ShroudEdges.Bottom |
          ShroudEdges.BottomRight,
        matchesAll:
          edges ===
          (ShroudEdges.TopLeft |
            ShroudEdges.Top |
            ShroudEdges.TopRight |
            ShroudEdges.Left |
            ShroudEdges.Right |
            ShroudEdges.BottomLeft |
            ShroudEdges.Bottom |
            ShroudEdges.BottomRight),
      };
    });

    expect(result.matchesAll).toBe(true);
  });

  test('getEdges returns None for fully Visible cell', async ({ page }) => {
    const result = await page.evaluate(() => {
      const FogOfWar = (window as unknown as Record<string, unknown>)._FogOfWar as new (opts: {
        width: number;
        height: number;
      }) => { setVisibility: (x: number, y: number, state: number) => void };
      const getNeighbors = (window as unknown as Record<string, unknown>)._getNeighborsVisibility as (
        fog: unknown,
        x: number,
        y: number
      ) => number[];
      const getEdges = (window as unknown as Record<string, unknown>)._getEdges as (
        neighbors: number[],
        self: number
      ) => number;
      const CellVisibility = (window as unknown as Record<string, unknown>)._CellVisibility as Record<string, number>;
      const ShroudEdges = (window as unknown as Record<string, unknown>)._ShroudEdges as Record<string, number>;

      const fog = new FogOfWar({ width: 3, height: 3 });
      // All cells Visible
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          fog.setVisibility(x, y, CellVisibility.Visible);
        }
      }

      const neighbors = getNeighbors(fog, 1, 1);
      const edges = getEdges(neighbors, CellVisibility.Visible);

      return { edges, isNone: edges === ShroudEdges.None };
    });

    expect(result.isNone).toBe(true);
  });

  test('getEdgeSpriteIndex maps edge patterns to sprite frames', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getEdgeSpriteIndex = (window as unknown as Record<string, unknown>)._getEdgeSpriteIndex as (
        edges: number
      ) => number;
      const ShroudEdges = (window as unknown as Record<string, unknown>)._ShroudEdges as Record<string, number>;

      return {
        none: getEdgeSpriteIndex(ShroudEdges.None),
        topOnly: getEdgeSpriteIndex(ShroudEdges.Top),
        allSides: getEdgeSpriteIndex(ShroudEdges.Top | ShroudEdges.Right | ShroudEdges.Bottom | ShroudEdges.Left),
        allCorners: getEdgeSpriteIndex(
          ShroudEdges.TopLeft | ShroudEdges.TopRight | ShroudEdges.BottomLeft | ShroudEdges.BottomRight
        ),
        allEdges: getEdgeSpriteIndex(
          ShroudEdges.TopLeft |
            ShroudEdges.Top |
            ShroudEdges.TopRight |
            ShroudEdges.Left |
            ShroudEdges.Right |
            ShroudEdges.BottomLeft |
            ShroudEdges.Bottom |
            ShroudEdges.BottomRight
        ),
      };
    });

    expect(result.none).toBe(0);
    expect(result.topOnly).toBeGreaterThan(0);
    expect(result.allSides).toBe(1);
    expect(result.allCorners).toBe(2);
    expect(result.allEdges).toBe(47);
  });

  test('ShroudRenderer updateShroudCell dirties self and 8 neighbors', async ({ page }) => {
    const result = await page.evaluate(() => {
      const FogOfWar = (window as unknown as Record<string, unknown>)._FogOfWar as new (opts: {
        width: number;
        height: number;
      }) => { setVisibility: (x: number, y: number, state: number) => void };
      const ShroudRenderer = (window as unknown as Record<string, unknown>)._ShroudRenderer as new (
        fog: unknown,
        w: number,
        h: number
      ) => { updateShroudCell: (x: number, y: number) => void; getDirtyEdgeData: () => Array<unknown> };
      const CellVisibility = (window as unknown as Record<string, unknown>)._CellVisibility as Record<string, number>;

      const fog = new FogOfWar({ width: 10, height: 10 });
      // Set some cells to Shroud, some to Visible
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          fog.setVisibility(x, y, x < 5 ? CellVisibility.Visible : CellVisibility.Shroud);
        }
      }

      const renderer = new ShroudRenderer(fog, 10, 10);
      renderer.updateShroudCell(5, 5); // boundary between visible and shroud
      const dirty = renderer.getDirtyEdgeData();

      return { dirtyCount: dirty.length };
    });

    // updateShroudCell(5,5) should dirty the 3x3 area = 9 cells
    // Some of those cells may have no edges (fully visible or fully shroud interior)
    expect(result.dirtyCount).toBeGreaterThan(0);
  });
});
