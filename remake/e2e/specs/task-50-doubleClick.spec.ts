import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 50: Double-click select same type', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-50.1: double-click selects all visible units of same type', async ({ page }) => {
    // Spawn 3 MediumTanks and 2 LightTanks at known positions
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
      cnc.unit?.('MediumTank', 'gdi', 31, 30);
      cnc.unit?.('MediumTank', 'gdi', 32, 30);
      cnc.unit?.('LightTank', 'gdi', 30, 32);
      cnc.unit?.('LightTank', 'gdi', 31, 32);
    });
    await page.waitForTimeout(300);

    // Get screen position of the first MediumTank
    const tankScreenPos = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const goManager = w._goManager as {
        getUnits: () => Array<{ definition: { id: string }; getPosition: () => { x: number; y: number; z: number } }>;
      };
      const worldToScreen = w._worldToScreen as (x: number, y: number, z: number) => { x: number; y: number } | null;

      const units = goManager.getUnits();
      const medium = units.find((u) => u.definition.id === 'UNIT_MTANK2');
      if (!medium) return null;
      const pos = medium.getPosition();
      return worldToScreen?.(pos.x, pos.y, pos.z);
    });

    expect(tankScreenPos).not.toBeNull();

    // Double-click on the first MediumTank
    await page.mouse.dblclick(tankScreenPos!.x, tankScreenPos!.y);
    await page.waitForTimeout(200);

    // Verify all 3 MediumTanks are selected (and not the LightTanks)
    const selectedIds = await page.evaluate(() => {
      const sm = (window as unknown as Record<string, unknown>)._selectionManager as {
        getSelected: () => Array<{ definition: { id: string } }>;
      };
      return sm.getSelected().map((u) => u.definition.id);
    });

    expect(selectedIds.length).toBe(3);
    expect(selectedIds.every((id: string) => id === 'UNIT_MTANK2')).toBe(true);
  });
});
