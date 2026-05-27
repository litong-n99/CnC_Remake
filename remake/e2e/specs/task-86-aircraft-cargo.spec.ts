import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 86 — Aircraft & Cargo System', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('Aircraft follows path and triggers drop action', async ({ page }) => {
    const result = await page.evaluate(() => {
      const AircraftClass = (window as unknown as Record<string, unknown>).Aircraft as new (opts: {
        id: string;
        speed: number;
        path: Array<{ x: number; y: number; z?: number; action?: string }>;
        onDrop?: (x: number, y: number) => void;
        onComplete?: (id: string) => void;
      }) => {
        start: () => void;
        update: (dt: number) => void;
        isActive: () => boolean;
        getPosition: () => { x: number; y: number; z: number };
      };

      let dropped = false;
      let dropX = 0;
      let dropY = 0;
      let completed = false;

      const aircraft = new AircraftClass({
        id: 'a1',
        speed: 10,
        path: [
          { x: 0, y: 0, z: 10 },
          { x: 10, y: 0, z: 10, action: 'drop' },
          { x: 20, y: 0, z: 10 },
        ],
        onDrop: (x, y) => {
          dropped = true;
          dropX = x;
          dropY = y;
        },
        onComplete: () => {
          completed = true;
        },
      });

      aircraft.start();
      // Simulate 3 seconds at 10 units/sec: should reach end
      for (let i = 0; i < 300; i++) {
        aircraft.update(0.01);
      }

      const pos = aircraft.getPosition();
      return { dropped, dropX, dropY, completed, posX: pos.x, posZ: pos.z };
    });

    expect(result.dropped).toBe(true);
    expect(result.dropX).toBe(10);
    expect(result.completed).toBe(true);
    expect(result.posX).toBeCloseTo(20, 0);
  });

  test('CargoSystem loads and unloads passengers', async ({ page }) => {
    const result = await page.evaluate(() => {
      const CS = (window as unknown as Record<string, unknown>).CargoSystem as new () => {
        registerHolder: (id: string, max: number) => unknown;
        loadPassenger: (holderId: string, passenger: unknown) => boolean;
        unloadPassenger: (holderId: string, passengerId?: string) => unknown;
        unloadAll: (holderId: string) => unknown[];
        getPassengerCount: (holderId: string) => number;
        isFull: (holderId: string) => boolean;
      };

      const cs = new CS();
      cs.registerHolder('heli1', 5);

      const p1 = { id: 'inf1' };
      const p2 = { id: 'inf2' };

      const load1 = cs.loadPassenger('heli1', p1);
      const load2 = cs.loadPassenger('heli1', p2);
      const load3 = cs.loadPassenger('heli1', p1); // duplicate
      const count = cs.getPassengerCount('heli1');
      const full = cs.isFull('heli1');

      const unloaded = cs.unloadPassenger('heli1');
      const countAfter = cs.getPassengerCount('heli1');

      const all = cs.unloadAll('heli1');
      const countFinal = cs.getPassengerCount('heli1');

      return {
        load1,
        load2,
        load3,
        count,
        full,
        unloadedId: (unloaded as { id: string } | null)?.id,
        countAfter,
        allCount: all.length,
        countFinal,
      };
    });

    expect(result.load1).toBe(true);
    expect(result.load2).toBe(true);
    expect(result.load3).toBe(false);
    expect(result.count).toBe(2);
    expect(result.full).toBe(false);
    expect(result.unloadedId).toBe('inf1');
    expect(result.countAfter).toBe(1);
    expect(result.allCount).toBe(1);
    expect(result.countFinal).toBe(0);
  });
});
