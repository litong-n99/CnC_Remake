import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 81: Texture Atlas', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-81.1: SheetBuilder allocates slots and returns UV coordinates', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SB = (window as unknown as Record<string, unknown>)._SheetBuilder as new (
        w: number,
        h: number
      ) => {
        allocate: (
          id: string,
          frame: { width: number; height: number; data: Uint8Array }
        ) => {
          u: number;
          v: number;
          u2: number;
          v2: number;
          x: number;
          y: number;
          width: number;
          height: number;
        } | null;
      };

      const builder = new SB(256, 256);
      const slot1 = builder.allocate('frame1', { width: 32, height: 32, data: new Uint8Array(32 * 32 * 4) });
      const slot2 = builder.allocate('frame2', { width: 64, height: 32, data: new Uint8Array(64 * 32 * 4) });
      const slotFull = builder.allocate('frame3', { width: 300, height: 300, data: new Uint8Array(300 * 300 * 4) });

      return {
        hasSlot1: slot1 !== null,
        hasSlot2: slot2 !== null,
        slotFullIsNull: slotFull === null,
        slot1u: slot1?.u ?? -1,
        slot1v: slot1?.v ?? -1,
        slot1u2: slot1?.u2 ?? -1,
        slot1v2: slot1?.v2 ?? -1,
        slot1w: slot1?.width ?? -1,
        slot1h: slot1?.height ?? -1,
      };
    });

    expect(result.hasSlot1).toBe(true);
    expect(result.hasSlot2).toBe(true);
    expect(result.slotFullIsNull).toBe(true);
    expect(result.slot1u).toBeGreaterThanOrEqual(0);
    expect(result.slot1v).toBeGreaterThanOrEqual(0);
    expect(result.slot1u2).toBeGreaterThan(result.slot1u);
    expect(result.slot1v2).toBeGreaterThan(result.slot1v);
    expect(result.slot1w).toBe(32);
    expect(result.slot1h).toBe(32);
  });
});
