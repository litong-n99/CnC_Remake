import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-VEH1: Aircraft 集成 (Actor/Trait 架构)', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('task-veh1.1: AircraftTrait has CruiseAltitude/LandAltitude/CanHover', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const AircraftTrait = w._AircraftTrait as new (opts: {
        cruiseAltitude: number;
        landAltitude: number;
        canHover: boolean;
        speed: number;
        turnRadius: number;
      }) => { getAltitude(): number; getState(): string };

      const trait = new AircraftTrait({
        cruiseAltitude: 20,
        landAltitude: 0,
        canHover: true,
        speed: 10,
        turnRadius: 5,
      });
      return { altitude: trait.getAltitude(), state: trait.getState() };
    });
    expect(result.altitude).toBe(0); // starts at landAltitude
    expect(result.state).toBe('Idle');
  });

  test('task-veh1.2: AircraftTrait state transitions TakeOff → Cruise', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const Actor = w._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        addTrait(t: unknown): void;
        x: number;
        y: number;
      };
      const AircraftTrait = w._AircraftTrait as new (opts: {
        cruiseAltitude: number;
        landAltitude: number;
        canHover: boolean;
        speed: number;
        turnRadius: number;
      }) => {
        flyTo(actor: unknown, x: number, y: number): void;
        getState(): string;
        getAltitude(): number;
        tick(actor: unknown, dt: number): void;
      };

      const mockHouse = { id: 'gdi', color: '#00ff00' };
      const actor = new Actor('ac-1', mockHouse, { name: 'Yak', type: 'aircraft' });
      const at = new AircraftTrait({
        cruiseAltitude: 20,
        landAltitude: 0,
        canHover: false,
        speed: 10,
        turnRadius: 5,
      });
      actor.addTrait(at);

      const states: string[] = [];
      states.push(at.getState());

      at.flyTo(actor, 50, 50);
      states.push(at.getState());

      // tick with large dt to force takeoff completion
      at.tick(actor, 5000);
      states.push(at.getState());

      return { states, altitude: at.getAltitude() };
    });

    expect(result.states[0]).toBe('Idle');
    expect(result.states[1]).toBe('Cruise');
    expect(result.states[2]).toBe('Cruise');
    expect(result.altitude).toBe(20); // reached cruise altitude
  });

  test('task-veh1.3: Reservable manages airport slot limits', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const Reservable = w._Reservable as new (slots: number) => {
        reserve(id: string, x: number, y: number): boolean;
        release(id: string): boolean;
        getOccupiedCount(): number;
        getMaxSlots(): number;
        hasReservation(id: string): boolean;
      };

      const pad = new Reservable(2);
      const r1 = pad.reserve('plane-1', 10, 10);
      const r2 = pad.reserve('plane-2', 20, 20);
      const r3 = pad.reserve('plane-3', 30, 30); // should fail, only 2 slots
      const released = pad.release('plane-1');
      const r4 = pad.reserve('plane-3', 30, 30); // now should succeed

      return { r1, r2, r3, released, r4, occupied: pad.getOccupiedCount(), max: pad.getMaxSlots() };
    });

    expect(result.r1).toBe(true);
    expect(result.r2).toBe(true);
    expect(result.r3).toBe(false);
    expect(result.released).toBe(true);
    expect(result.r4).toBe(true);
    expect(result.occupied).toBe(2);
    expect(result.max).toBe(2);
  });

  test('task-veh1.4: Reservable.getReservation returns correct landing spot', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const Reservable = w._Reservable as new (slots: number) => {
        reserve(id: string, x: number, y: number): boolean;
        getReservation(id: string): { x: number; y: number } | undefined;
      };

      const pad = new Reservable(1);
      pad.reserve('mig-1', 42, 56);
      return pad.getReservation('mig-1');
    });

    expect(result).toEqual({ x: 42, y: 56 });
  });
});
