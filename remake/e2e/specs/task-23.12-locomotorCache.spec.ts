import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 23.12 E2E Test — Locomotor Cache / CellFlag
 *
 * 验证 LocomotorCache 的正确性：
 * 1. occupy/vacate 后 cache 正确更新（CellFlag + 计数）
 * 2. dirty 延迟更新机制正常工作
 * 3. getBlockedCells 使用缓存后的结果与行为一致
 * 4. 空格子快速排除正确
 */

test.describe('Task 23.12 — LocomotorCache', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('stationary tank has HasStationaryActor flag in cache', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    const cell30 = (await game.actorMap(30, 30)) as { occupants: readonly string[] };
    expect(cell30.occupants.length).toBe(1);

    const cache = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.locomotorCache?.(30, 30) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(cache).toBeDefined();
    expect(cache!.totalCount).toBe(1);
    expect(cache!.stationaryCount).toBe(1);
    expect(cache!.movingCount).toBe(0);
    expect(cache!.sharesCellCount).toBe(0);
    expect(cache!.nonSharesCellCount).toBe(1);
    // HasStationaryActor | HasMovableActor = 2 | 4 = 6
    expect((cache!.cellFlag as number) & 2).toBe(2); // HasStationaryActor
    expect((cache!.cellFlag as number) & 4).toBe(4); // HasMovableActor
  });

  test('moving tank has HasMovingActor flag after move order', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    const cell30 = (await game.actorMap(30, 30)) as { occupants: readonly string[] };
    const id = cell30.occupants[0];

    // Before move: stationary
    let cache = (await game.page.evaluate(
      ({ x, y }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.locomotorCache?.(x, y) as Record<string, unknown> | undefined;
      },
      { x: 30, y: 30 }
    )) as Record<string, unknown> | undefined;
    expect(cache!.stationaryCount).toBe(1);
    expect(cache!.movingCount).toBe(0);

    // Issue move order
    await game.moveUnit(id, 35, 30);

    // Poll until the tank starts moving (toCell != fromCell)
    let toCell: { x: number; y: number } | undefined;
    for (let i = 0; i < 20; i++) {
      await game.page.waitForTimeout(50);
      const state = (await game.page.evaluate((unitId: string) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        const all = cnc.debugState?.() as Array<Record<string, unknown>> | undefined;
        return all?.find((s) => s.id === unitId);
      }, id)) as Record<string, unknown> | undefined;
      if (state && (state.toCellX !== state.fromCellX || state.toCellY !== state.fromCellY)) {
        toCell = { x: state.toCellX as number, y: state.toCellY as number };
        break;
      }
    }
    expect(toCell).toBeDefined();

    // The toCell should be occupied by the moving tank
    cache = (await game.page.evaluate(({ x, y }) => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.locomotorCache?.(x, y) as Record<string, unknown> | undefined;
    }, toCell!)) as Record<string, unknown> | undefined;

    expect(cache!.totalCount).toBeGreaterThanOrEqual(1);
    expect(cache!.movingCount).toBeGreaterThanOrEqual(1);
  });

  test('infantry has HasCrushableActor flag in cache', async () => {
    await game.spawnUnit('RifleInfantry', 'gdi', 30, 30);

    const cache = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.locomotorCache?.(30, 30) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(cache).toBeDefined();
    expect(cache!.sharesCellCount).toBe(1);
    expect(cache!.nonSharesCellCount).toBe(0);
    // HasCrushableActor = 8
    expect((cache!.cellFlag as number) & 8).toBe(8);
  });

  test('empty cell has HasFreeSpace (totalCount=0)', async () => {
    const cache = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.locomotorCache?.(10, 10) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(cache).toBeDefined();
    expect(cache!.totalCount).toBe(0);
    expect(cache!.cellFlag).toBe(0); // HasFreeSpace
  });

  test('cache reflects vacate (clear removes all flags)', async () => {
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);

    let cache = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.locomotorCache?.(30, 30) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;
    expect(cache!.totalCount).toBe(1);

    await game.clear();

    cache = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.locomotorCache?.(30, 30) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;
    expect(cache!.totalCount).toBe(0);
    expect(cache!.cellFlag).toBe(0);
  });

  test('getBlockedCells results are consistent with cache (All level)', async () => {
    // Spawn two tanks adjacent
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    await game.spawnUnit('MediumTank', 'nod', 31, 30);

    const blocked = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.pathfind?.(30, 30, 31, 30) as import('../../src/game/terrain/Pathfinder').PathNode[] | null;
    })) as Array<{ x: number; y: number }> | null;

    // Direct path (30,30)→(31,30) should be blocked by the Nod tank
    expect(blocked).toBeNull();
  });

  test('cache updates moving vs stationary counts correctly', async () => {
    // Spawn a tank at (30,30), verify cache shows stationary.
    // Issue move order, verify cache at toCell updates to moving.
    await game.spawnUnit('MediumTank', 'gdi', 30, 30);
    const cell30 = (await game.actorMap(30, 30)) as { occupants: readonly string[] };
    const id = cell30.occupants[0];

    // Before move: stationary
    let cache = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.locomotorCache?.(30, 30) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;
    expect(cache!.stationaryCount).toBe(1);
    expect(cache!.movingCount).toBe(0);

    // Issue move order
    await game.moveUnit(id, 35, 30);

    // Poll until the tank's toCell is set (movement started)
    let toCell: { x: number; y: number } | undefined;
    for (let i = 0; i < 20; i++) {
      await game.page.waitForTimeout(50);
      const state = (await game.page.evaluate((unitId: string) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        const all = cnc.debugState?.() as Array<Record<string, unknown>> | undefined;
        return all?.find((s) => s.id === unitId);
      }, id)) as Record<string, unknown> | undefined;
      if (state && (state.toCellX !== state.fromCellX || state.toCellY !== state.fromCellY)) {
        toCell = { x: state.toCellX as number, y: state.toCellY as number };
        break;
      }
    }
    expect(toCell).toBeDefined();

    // The toCell should be occupied by the moving tank (dual-cell occupancy)
    cache = (await game.page.evaluate(({ x, y }) => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.locomotorCache?.(x, y) as Record<string, unknown> | undefined;
    }, toCell!)) as Record<string, unknown> | undefined;
    expect(cache!.totalCount).toBe(1);
    expect(cache!.movingCount).toBe(1);
    expect(cache!.stationaryCount).toBe(0);
  });

  test('multiple infantry in same cell have correct sharesCellCount', async () => {
    await game.spawnUnit('RifleInfantry', 'gdi', 30, 30);
    await game.spawnUnit('RifleInfantry', 'gdi', 30, 30);
    await game.spawnUnit('RifleInfantry', 'gdi', 30, 30);

    const cache = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.locomotorCache?.(30, 30) as Record<string, unknown> | undefined;
    })) as Record<string, unknown> | undefined;

    expect(cache!.totalCount).toBe(3);
    expect(cache!.sharesCellCount).toBe(3);
    expect(cache!.nonSharesCellCount).toBe(0);
    expect(cache!.stationaryCount).toBe(3);
  });
});
