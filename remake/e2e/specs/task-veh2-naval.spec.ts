import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-VEH2: Naval / Ship', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('veh2.1: WaterPathGraph only allows water/beach/river cells', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = (window as unknown as Record<string, unknown>)._WaterPathGraph as new (...args: unknown[]) => {
        isPassable(n: { x: number; y: number }): boolean;
        isInside(n: { x: number; y: number }): boolean;
      };
      const LandType = (window as unknown as Record<string, unknown>)._LandType as Record<string, number>;
      if (!w || !LandType) return { ok: false, reason: 'missing exports' };

      // 构造一个 3x3 地图：中心 Water，四周 Clear
      const getTerrain = (x: number, y: number) => {
        if (x === 1 && y === 1) return LandType.Water;
        return LandType.Clear;
      };
      const graph = new w(3, 3, getTerrain);
      const center = { x: 1, y: 1 };
      const top = { x: 1, y: 0 };

      return {
        ok: true,
        centerPassable: graph.isPassable(center),
        topPassable: graph.isPassable(top),
        centerInside: graph.isInside(center),
        topInside: graph.isInside(top),
      };
    });
    expect(result.ok).toBe(true);
    expect(result.centerPassable).toBe(true);
    expect(result.topPassable).toBe(false);
  });

  test('veh2.2: WaterPathGraph connections exclude land neighbors', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = (window as unknown as Record<string, unknown>)._WaterPathGraph as new (...args: unknown[]) => {
        getConnections(n: { x: number; y: number }): ReadonlyArray<{ node: { x: number; y: number }; cost: number }>;
      };
      const LandType = (window as unknown as Record<string, unknown>)._LandType as Record<string, number>;
      if (!w || !LandType) return { ok: false, reason: 'missing exports' };

      // 3x3 地图，全部为 Water
      const graph = new w(3, 3, () => LandType.Water);
      const conns = graph.getConnections({ x: 1, y: 1 });
      return {
        ok: true,
        connCount: conns.length,
        hasNorth: conns.some((c: { node: { x: number; y: number } }) => c.node.x === 1 && c.node.y === 0),
        hasEast: conns.some((c: { node: { x: number; y: number } }) => c.node.x === 2 && c.node.y === 1),
      };
    });
    expect(result.ok).toBe(true);
    expect(result.connCount).toBe(8); // 八方向全通
    expect(result.hasNorth).toBe(true);
    expect(result.hasEast).toBe(true);
  });

  test('veh2.3: ShipTrait has low turnSpeed and inertia', async ({ page }) => {
    const result = await page.evaluate(() => {
      const s = (window as unknown as Record<string, unknown>)._ShipTrait as new (o: {
        speed: number;
        turnSpeed: number;
        inertia: number;
      }) => { getState(): string; getCurrentSpeed(): number };
      if (!s) return { ok: false, reason: 'missing ShipTrait' };
      const ship = new s({ speed: 4, turnSpeed: 30, inertia: 0.85 });
      return {
        ok: true,
        state: ship.getState(),
        speed: ship.getCurrentSpeed(),
      };
    });
    expect(result.ok).toBe(true);
    expect(result.state).toBe('Idle');
    expect(result.speed).toBe(0);
  });

  test('veh2.4: ShipTrait turning is slow — facing changes gradually', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (...args: unknown[]) => {
        addTrait(t: unknown): void;
        x: number;
        y: number;
      };
      const ShipTrait = (window as unknown as Record<string, unknown>)._ShipTrait as new (o: {
        speed: number;
        turnSpeed: number;
        inertia: number;
      }) => {
        sailTo(a: unknown, x: number, y: number): void;
        tick(a: unknown, dt: number): void;
        getFacing(): number;
        getState(): string;
      };
      const House = (window as unknown as Record<string, unknown>)._House as new (...args: unknown[]) => unknown;
      const HouseType = (window as unknown as Record<string, unknown>)._HouseType as Record<string, unknown>;
      if (!Actor || !ShipTrait || !House || !HouseType) return { ok: false, reason: 'missing exports' };

      const house = new House(HouseType.USSR, {});
      const actor = new Actor('ship-1', house, { name: 'Destroyer', type: 'unit' });
      const ship = new ShipTrait({ speed: 4, turnSpeed: 30, inertia: 0.85 });
      actor.addTrait(ship);
      actor.x = 0;
      actor.y = 0;

      // 目标在正北方向 (facing = -PI/2)，与初始 facing=0 有差距
      ship.sailTo(actor, 0, -100);

      // tick 100ms — 转向速度 30 deg/s = 0.524 rad/s
      // 100ms 内应转向约 0.0524 rad，远不到正东
      ship.tick(actor, 100);
      const facing1 = ship.getFacing();

      // tick 再 500ms
      ship.tick(actor, 500);
      const facing2 = ship.getFacing();

      return {
        ok: true,
        facing1,
        facing2,
        turned: Math.abs(facing2 - facing1),
      };
    });
    expect(result.ok).toBe(true);
    // 600ms 内转向约 0.314 rad，两次 tick 之间应有明显转向
    expect(result.turned).toBeGreaterThan(0.05);
    // 但 600ms 不足以完成 PI/2 转向
    expect(Math.abs(result.facing2)).toBeLessThan(Math.PI / 2 - 0.1);
  });

  test('veh2.5: ShipTrait inertia — speed ramps up gradually', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (...args: unknown[]) => {
        addTrait(t: unknown): void;
        x: number;
        y: number;
      };
      const ShipTrait = (window as unknown as Record<string, unknown>)._ShipTrait as new (o: {
        speed: number;
        turnSpeed: number;
        inertia: number;
      }) => {
        sailTo(a: unknown, x: number, y: number): void;
        tick(a: unknown, dt: number): void;
        getCurrentSpeed(): number;
        getState(): string;
      };
      const House = (window as unknown as Record<string, unknown>)._House as new (...args: unknown[]) => unknown;
      const HouseType = (window as unknown as Record<string, unknown>)._HouseType as Record<string, unknown>;
      if (!Actor || !ShipTrait || !House || !HouseType) return { ok: false, reason: 'missing exports' };

      const house = new House(HouseType.USSR, {});
      const actor = new Actor('ship-2', house, { name: 'Destroyer', type: 'unit' });
      const ship = new ShipTrait({ speed: 10, turnSpeed: 45, inertia: 0.9 });
      actor.addTrait(ship);
      actor.x = 0;
      actor.y = 0;

      // 直接朝正东，无需转向
      ship.sailTo(actor, 1000, 0);

      const speeds: number[] = [];
      for (let i = 0; i < 10; i++) {
        ship.tick(actor, 100); // 100ms per tick
        speeds.push(ship.getCurrentSpeed());
      }

      return {
        ok: true,
        speeds,
        first: speeds[0],
        last: speeds[9],
        max: 10,
        isMonotonicIncreasing: speeds.every((v, i) => i === 0 || v >= speeds[i - 1] - 0.001),
      };
    });
    expect(result.ok).toBe(true);
    // 惯性 0.9，速度应逐渐上升，不会立即达到最大值
    expect(result.first).toBeLessThan(result.max);
    // 经过足够 tick 应接近最大值
    expect(result.last).toBeGreaterThan(result.max * 0.5);
    // 速度单调递增（允许浮点误差）
    expect(result.isMonotonicIncreasing).toBe(true);
  });

  test('veh2.6: naval unit definitions exist with Float locomotion', async ({ page }) => {
    const result = await page.evaluate(() => {
      const defs = (window as unknown as Record<string, unknown>).UNIT_DEFINITIONS as Record<
        string,
        { locomotion: number; mzone: number }
      >;
      if (!defs) return { ok: false, reason: 'missing UNIT_DEFINITIONS' };

      const naval = ['Gunboat', 'Destroyer', 'Submarine', 'Transport'];
      const found = naval.map((name) => {
        const d = defs[name];
        return d ? { name, locomotion: d.locomotion, mzone: d.mzone } : null;
      });
      return { ok: true, found };
    });
    expect(result.ok).toBe(true);
    expect(result.found.length).toBe(4);
    for (const u of result.found) {
      expect(u).not.toBeNull();
      expect(u.locomotion).toBe(4); // Locomotion.Float = 4
    }
  });
});
