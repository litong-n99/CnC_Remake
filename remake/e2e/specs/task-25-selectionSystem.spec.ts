import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 25: Selection System (squads + double-click)', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-25.1: Ctrl+Number squad save and restore', async ({ page }) => {
    // Spawn 3 MediumTanks in a row
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
      cnc.unit?.('MediumTank', 'gdi', 31, 30);
      cnc.unit?.('MediumTank', 'gdi', 32, 30);
    });
    await page.waitForTimeout(300);

    // Directly select all 3 tanks via SelectionManager API (bypassing box-select coords)
    const selectedCount = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const sm = w._selectionManager as {
        selectMultiple: (units: unknown[], scene: unknown) => void;
        getSelected: () => unknown[];
      };
      const scene = w._scene as unknown;
      const goManager = w._goManager as { getUnits: () => unknown[] };
      const units = goManager.getUnits();
      sm.selectMultiple(units, scene);
      return sm.getSelected().length;
    });
    expect(selectedCount).toBe(3);

    // Save to squad 1 with Ctrl+1
    await page.keyboard.down('Control');
    await page.keyboard.press('1');
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);

    // Clear selection
    await page.evaluate(() => {
      const sm = (window as unknown as Record<string, unknown>)._selectionManager as { clear: () => void };
      sm.clear();
    });

    const selectedAfterClear = await page.evaluate(() => {
      const sm = (window as unknown as Record<string, unknown>)._selectionManager as { getSelected: () => unknown[] };
      return sm.getSelected().length;
    });
    expect(selectedAfterClear).toBe(0);

    // Restore squad 1 by pressing 1
    await page.keyboard.press('1');
    await page.waitForTimeout(100);

    const selectedAfterRestore = await page.evaluate(() => {
      const sm = (window as unknown as Record<string, unknown>)._selectionManager as { getSelected: () => unknown[] };
      return sm.getSelected().length;
    });
    expect(selectedAfterRestore).toBe(3);
  });

  test('task-25.2: double-click selects all units of same type', async ({ page }) => {
    // Spawn 3 MediumTanks and 2 LightTanks
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
