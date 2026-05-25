import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 139: OrderGenerator framework', () => {
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

  test('orderGeneratorCreate activates a TestOrderGenerator', async ({ page }) => {
    const state = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.orderGeneratorCreate?.();
      return cnc.orderGeneratorState?.() as { active: boolean; type?: string };
    });
    expect(state.active).toBe(true);
    expect(state.type).toBe('TestOrderGenerator');
  });

  test('orderGeneratorClick generates a GameOrder when active', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.orderGeneratorCreate?.();
      return cnc.orderGeneratorClick?.(200, 300, false) as {
        generated: boolean;
        feedback: string;
        order?: { orderString: string; subjectId: string; target: { type: string; x?: number; y?: number } };
      };
    });
    expect(result.generated).toBe(true);
    expect(result.feedback).toBe('valid');
    expect(result.order?.orderString).toBe('Move');
    expect(result.order?.subjectId).toBe('test-subject');
    expect(result.order?.target.type).toBe('ground');
    expect(result.order?.target.x).toBe(200);
    expect(result.order?.target.y).toBe(300);
  });

  test('orderGeneratorClick does not generate when cancelled', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.orderGeneratorCreate?.();
      cnc.orderGeneratorCancel?.();
      return cnc.orderGeneratorClick?.(200, 300) as {
        generated: boolean;
        feedback: string;
        message?: string;
      };
    });
    expect(result.generated).toBe(false);
    expect(result.feedback).toBe('none');
  });

  test('orderGeneratorState reflects click count', async ({ page }) => {
    const state = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.orderGeneratorCreate?.();
      cnc.orderGeneratorClick?.(150, 150);
      cnc.orderGeneratorClick?.(160, 160);
      return cnc.orderGeneratorState?.() as { active: boolean; clickCount?: number };
    });
    expect(state.active).toBe(true);
    expect(state.clickCount).toBe(2);
  });

  test('orderGeneratorCancel clears current generator', async ({ page }) => {
    const state = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.orderGeneratorCreate?.();
      cnc.orderGeneratorCancel?.();
      return cnc.orderGeneratorState?.() as { active: boolean };
    });
    expect(state.active).toBe(false);
  });
});
