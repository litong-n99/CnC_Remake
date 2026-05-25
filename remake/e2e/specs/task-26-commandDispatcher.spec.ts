import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 26: Command Dispatcher (Move / Attack / Guard / Stop)', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-26.1: orderList includes Move, Attack, Guard, Stop handlers', async ({ page }) => {
    const handlers = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.orderList?.() as string[];
    });

    expect(handlers).toContain('Move');
    expect(handlers).toContain('Attack');
    expect(handlers).toContain('Guard');
    expect(handlers).toContain('Stop');
  });

  test('task-26.2: orderDispatch Move moves a unit to target cell', async ({ page }) => {
    // Spawn a tank
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    await page.waitForTimeout(300);

    const unitId = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string }>;
      };
      return goManager.getUnits()[0]?.id;
    });
    expect(unitId).toBeDefined();

    const result = await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.orderDispatch?.('Move', id, 'ground', 35, 30) as { result?: { success: boolean } };
      },
      { id: unitId }
    );

    expect(result.result?.success).toBe(true);

    // Verify unit is moving (has a path)
    const hasPath = await page.evaluate(
      ({ id }) => {
        const goManager = (window as unknown as Record<string, unknown>)._goManager as {
          get: (id: string) => { logic: { movement: { path?: unknown[] } } } | undefined;
        };
        const unit = goManager.get(id);
        return unit?.logic.movement.path !== undefined && unit?.logic.movement.path.length > 0;
      },
      { id: unitId }
    );
    expect(hasPath).toBe(true);
  });

  test('task-26.3: orderDispatch Attack sets attack target on enemy unit', async ({ page }) => {
    // Spawn GDI tank and Nod tank
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
      cnc.unit?.('MediumTank', 'nod', 32, 30);
    });
    await page.waitForTimeout(300);

    const ids = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string; house: { id: number } }>;
      };
      const units = goManager.getUnits();
      const gdi = units.find((u) => u.house.id === 8); // HouseType.GDI = 8
      const nod = units.find((u) => u.house.id === 9); // HouseType.Nod = 9
      return { gdiId: gdi?.id, nodId: nod?.id };
    });
    expect(ids.gdiId).toBeDefined();
    expect(ids.nodId).toBeDefined();

    const result = await page.evaluate(
      ({ attacker, target }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.orderDispatch?.('Attack', attacker, 'actor', undefined, undefined, target) as {
          result?: { success: boolean };
        };
      },
      { attacker: ids.gdiId, target: ids.nodId }
    );

    expect(result.result?.success).toBe(true);

    // Verify attackTarget is set
    const attackTarget = await page.evaluate(
      ({ id }) => {
        const goManager = (window as unknown as Record<string, unknown>)._goManager as {
          get: (id: string) => { logic: { attackTarget?: { x: number; y: number } } } | undefined;
        };
        return goManager.get(id)?.logic.attackTarget;
      },
      { id: ids.gdiId }
    );

    expect(attackTarget).toBeDefined();
    expect(attackTarget?.x).toBe(32);
    expect(attackTarget?.y).toBe(30);
  });

  test('task-26.4: orderDispatch Stop halts a moving unit', async ({ page }) => {
    // Spawn and move a tank
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    await page.waitForTimeout(300);

    const unitId = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string }>;
      };
      return goManager.getUnits()[0]?.id;
    });
    expect(unitId).toBeDefined();

    // Start moving
    await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        cnc.orderDispatch?.('Move', id, 'ground', 35, 30);
      },
      { id: unitId }
    );
    await page.waitForTimeout(200);

    // Stop
    const result = await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.orderDispatch?.('Stop', id) as { result?: { success: boolean } };
      },
      { id: unitId }
    );

    expect(result.result?.success).toBe(true);

    // Verify path is cleared
    const hasPath = await page.evaluate(
      ({ id }) => {
        const goManager = (window as unknown as Record<string, unknown>)._goManager as {
          get: (id: string) => { logic: { movement: { path?: unknown[] } } } | undefined;
        };
        const unit = goManager.get(id);
        return unit?.logic.movement.path !== undefined && unit?.logic.movement.path.length > 0;
      },
      { id: unitId }
    );
    expect(hasPath).toBe(false);
  });

  test('task-26.5: orderDispatch Guard makes unit follow friendly unit', async ({ page }) => {
    // Spawn two GDI tanks
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
      cnc.unit?.('MediumTank', 'gdi', 30, 32);
    });
    await page.waitForTimeout(300);

    const ids = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string }>;
      };
      const units = goManager.getUnits();
      return { guardId: units[0]?.id, targetId: units[1]?.id };
    });
    expect(ids.guardId).toBeDefined();
    expect(ids.targetId).toBeDefined();

    const result = await page.evaluate(
      ({ guard, target }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.orderDispatch?.('Guard', guard, 'actor', undefined, undefined, target) as {
          result?: { success: boolean };
        };
      },
      { guard: ids.guardId, target: ids.targetId }
    );

    expect(result.result?.success).toBe(true);

    // Verify guard unit has a path (is moving toward target)
    const hasPath = await page.evaluate(
      ({ id }) => {
        const goManager = (window as unknown as Record<string, unknown>)._goManager as {
          get: (id: string) => { logic: { movement: { path?: unknown[] } } } | undefined;
        };
        const unit = goManager.get(id);
        return unit?.logic.movement.path !== undefined && unit?.logic.movement.path.length > 0;
      },
      { id: ids.guardId }
    );
    expect(hasPath).toBe(true);
  });
});
