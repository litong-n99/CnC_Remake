import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 48: Patrol', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-48.1: Patrol order is registered and executable', async ({ page }) => {
    // Spawn a GDI tank
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    await page.waitForTimeout(200);

    // Verify Patrol handler is registered
    const hasHandler = await page.evaluate(() => {
      const od = (window as unknown as Record<string, unknown>)._orderDispatcher as {
        hasHandler: (s: string) => boolean;
      };
      return od.hasHandler('Patrol');
    });
    expect(hasHandler).toBe(true);

    // Dispatch a Patrol order
    const unitId = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string }>;
      };
      return goManager.getUnits()[0]?.id;
    });
    expect(unitId).toBeDefined();

    const result = await page.evaluate(
      ({ id }) => {
        const od = (window as unknown as Record<string, unknown>)._orderDispatcher as {
          dispatch: (o: unknown) => { success: boolean; message?: string };
        };
        const { groundOrder } = window as unknown as Record<string, unknown>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const order = (groundOrder as any)('Patrol', id, 40, 30);
        return od.dispatch(order);
      },
      { id: unitId }
    );

    expect(result.success).toBe(true);
  });
});
