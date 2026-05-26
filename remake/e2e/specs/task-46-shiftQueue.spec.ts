import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 46: Shift Queue', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-46.1: queued move commands are enqueued', async ({ page }) => {
    // Spawn a unit
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    await page.waitForTimeout(200);

    const unitId = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string }>;
      };
      return goManager.getUnits()[0]?.id;
    });
    expect(unitId).toBeDefined();

    // Dispatch 3 queued move orders
    const results = await page.evaluate(
      ({ id }) => {
        const od = (window as unknown as Record<string, unknown>)._orderDispatcher as {
          dispatch: (o: unknown) => { success: boolean; message?: string };
        };
        const { groundOrder } = window as unknown as Record<string, unknown>;
        const orders = [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (groundOrder as any)('Move', id, 32, 30, true),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (groundOrder as any)('Move', id, 34, 30, true),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (groundOrder as any)('Move', id, 36, 30, true),
        ];
        return orders.map((o) => od.dispatch(o));
      },
      { id: unitId }
    );

    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
    expect(results[2].success).toBe(true);

    // Verify queue length
    const queueLen = await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.queueLength?.(id) as number) ?? -1;
      },
      { id: unitId }
    );

    expect(queueLen).toBe(2);
  });
});
