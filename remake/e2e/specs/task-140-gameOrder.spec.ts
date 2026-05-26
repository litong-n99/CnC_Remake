import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 140: GameOrder command abstraction', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('page loads and GameConsole is installed', async ({ page }) => {
    const cnc = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      return typeof w.cnc === 'object' && w.cnc !== null;
    });
    expect(cnc).toBe(true);
  });

  test('orderList returns registered handlers', async ({ page }) => {
    const list = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => string[]) | undefined>).cnc;
      return cnc.orderList?.() ?? [];
    });
    expect(list).toContain('Move');
    expect(list).toContain('Stop');
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  test('orderDispatch Move with missing unit returns failure', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.orderDispatch?.('Move', 'non-existent-unit', 'ground', 30, 30) as {
        result?: { success: boolean; message?: string };
      };
    });
    expect(result.result?.success).toBe(false);
    expect(result.result?.message).toContain('not found');
  });

  test('orderDispatch Move executes successfully for spawned unit', async ({ page }) => {
    const gp = new GamePage(page);
    await gp.clear();
    await gp.spawnUnit('MediumTank', 'gdi', 25, 25);
    await page.waitForTimeout(200);

    // Query the spawned unit ID via actorMap
    const actorMap = await gp.actorMap(25, 25);
    const occupants = 'occupants' in actorMap ? actorMap.occupants : [];
    expect(occupants.length).toBeGreaterThan(0);
    const unitId = occupants[0];

    // Dispatch Move order
    const result = await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.orderDispatch?.('Move', id, 'ground', 30, 30) as {
          result?: { success: boolean; message?: string };
        };
      },
      { id: unitId }
    );
    expect(result.result?.success).toBe(true);

    // Wait for unit to reach target
    await gp.waitForUnitAt(unitId, 30, 30);
  });

  test('orderDispatch Stop halts a moving unit', async ({ page }) => {
    const gp = new GamePage(page);
    await gp.clear();
    await gp.spawnUnit('MediumTank', 'gdi', 25, 25);
    await page.waitForTimeout(200);

    const actorMap = await gp.actorMap(25, 25);
    const occupants = 'occupants' in actorMap ? actorMap.occupants : [];
    expect(occupants.length).toBeGreaterThan(0);
    const unitId = occupants[0];

    // Start moving to a far cell
    await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        cnc.orderDispatch?.('Move', id, 'ground', 40, 40);
      },
      { id: unitId }
    );
    await page.waitForTimeout(500);

    // Dispatch Stop order
    const stopResult = await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.orderDispatch?.('Stop', id, 'none') as {
          result?: { success: boolean; message?: string };
        };
      },
      { id: unitId }
    );
    expect(stopResult.result?.success).toBe(true);

    // Verify unit is no longer moving (debugState)
    const state = await gp.debugState();
    const unitState = state.find((s) => s.id === unitId);
    expect(unitState).toBeDefined();
    expect(unitState?.isMoving).toBe(false);
  });

  test('orderDispatch for unregistered order returns error', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.orderDispatch?.('UnregisteredTestCommand', 'any-id', 'ground', 10, 10) as {
        result?: { success: boolean; message?: string };
      };
    });
    expect(result.result?.success).toBe(false);
    expect(result.result?.message).toContain('No handler registered');
  });
});
