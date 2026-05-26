import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 49: Unit Squads', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-49.1: Ctrl+Number saves squad and Number restores it', async ({ page }) => {
    // Spawn 3 MediumTanks
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
      cnc.unit?.('MediumTank', 'gdi', 31, 30);
      cnc.unit?.('MediumTank', 'gdi', 32, 30);
    });
    await page.waitForTimeout(300);

    // Select all 3 tanks via API
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const sm = w._selectionManager as {
        selectMultiple: (units: unknown[], scene: unknown) => void;
      };
      const scene = w._scene as unknown;
      const goManager = w._goManager as { getUnits: () => unknown[] };
      sm.selectMultiple(goManager.getUnits(), scene);
    });

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
    const afterClear = await page.evaluate(() => {
      const sm = (window as unknown as Record<string, unknown>)._selectionManager as { getSelected: () => unknown[] };
      return sm.getSelected().length;
    });
    expect(afterClear).toBe(0);

    // Restore squad 1
    await page.keyboard.press('1');
    await page.waitForTimeout(100);

    const afterRestore = await page.evaluate(() => {
      const sm = (window as unknown as Record<string, unknown>)._selectionManager as { getSelected: () => unknown[] };
      return sm.getSelected().length;
    });
    expect(afterRestore).toBe(3);
  });

  test('task-49.2: double-tapping squad key jumps camera to squad center', async ({ page }) => {
    // Spawn tanks at a known position far from default camera target
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 10, 10);
      cnc.unit?.('MediumTank', 'gdi', 11, 10);
    });
    await page.waitForTimeout(300);

    // Select and save to squad 2
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const sm = w._selectionManager as { selectMultiple: (units: unknown[], scene: unknown) => void };
      const scene = w._scene as unknown;
      const goManager = w._goManager as { getUnits: () => unknown[] };
      sm.selectMultiple(goManager.getUnits(), scene);
    });

    await page.keyboard.down('Control');
    await page.keyboard.press('2');
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);

    // Ensure Control is not stuck down from previous test
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);

    // Move camera far away first to ensure measurable jump
    await page.evaluate(() => {
      const rtsCamera = (window as unknown as Record<string, unknown>)._rtsCamera as {
        setTargetCoords: (x: number, y: number, z: number) => void;
      };
      rtsCamera.setTargetCoords(60, 0, 60);
    });
    await page.waitForTimeout(200);

    // Get camera target before double-tap
    const targetBefore = await page.evaluate(() => {
      const rtsCamera = (window as unknown as Record<string, unknown>)._rtsCamera as {
        getTargetCoords: () => { x: number; z: number };
      };
      const t = rtsCamera.getTargetCoords();
      return { x: t.x, z: t.z };
    });

    // Double-tap 2 via JS dispatch for precise timing (camera jump)
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    });
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    });
    await page.waitForTimeout(300);

    // Get camera target after double-tap
    const targetAfter = await page.evaluate(() => {
      const rtsCamera = (window as unknown as Record<string, unknown>)._rtsCamera as {
        getTargetCoords: () => { x: number; z: number };
      };
      const t = rtsCamera.getTargetCoords();
      return { x: t.x, z: t.z };
    });

    // Camera should have jumped closer to the squad center at (~-21, ~-21)
    // (cell 10,10 maps to world ~-21,-21 because worldX = (cellX - 32) * 1.5 approx)
    const squadCenterX = -21;
    const squadCenterZ = -21;
    const distBefore = Math.sqrt((targetBefore.x - squadCenterX) ** 2 + (targetBefore.z - squadCenterZ) ** 2);
    const distAfter = Math.sqrt((targetAfter.x - squadCenterX) ** 2 + (targetAfter.z - squadCenterZ) ** 2);
    expect(distAfter).toBeLessThan(distBefore);
  });
});
