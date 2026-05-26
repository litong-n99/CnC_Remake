import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 70: SHP 精灵序列解析
 *
 * 验收：SHP 头信息解析正确，帧数量和尺寸匹配。
 */
test.describe('Task 70: SHP Loader', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('task-70.1: ShpLoader parses dummy TS-format SHP header', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Shp = (window as unknown as Record<string, unknown>)._ShpLoader as {
        parse: (buf: ArrayBuffer) => {
          isValid: boolean;
          frameCount: number;
          width: number;
          height: number;
          frames: Array<{ width: number; height: number }>;
        };
      };

      // Build a minimal TS-format SHP:
      // signature(2) + unknown(4) + width(2) + height(2) + frameCount(2) + frameOffsets[] + frameHeaders[]
      const buf = new ArrayBuffer(14 + 8 + 24); // header + 1 offset entry + 1 frame header
      const view = new DataView(buf);
      view.setUint16(0, 0x0000, true); // signature
      // bytes 2-5: unknown / flags
      view.setUint16(6, 64, true); // width
      view.setUint16(8, 64, true); // height
      view.setUint16(10, 1, true); // frameCount = 1

      // Frame offset table (1 entry = 8 bytes)
      const offsetTable = 14;
      const frameHeaderOffset = offsetTable + 8;
      view.setUint32(offsetTable, frameHeaderOffset, true); // dataOffset
      view.setUint32(offsetTable + 4, 0, true); // format info

      // Frame header (24 bytes for TS)
      view.setUint16(frameHeaderOffset + 2, 0, true); // x
      view.setUint16(frameHeaderOffset + 4, 0, true); // y
      view.setUint16(frameHeaderOffset + 6, 32, true); // width
      view.setUint16(frameHeaderOffset + 8, 32, true); // height

      return Shp.parse(buf);
    });

    expect(result.isValid).toBe(true);
    expect(result.frameCount).toBe(1);
    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
    expect(result.frames.length).toBe(1);
    expect(result.frames[0].width).toBe(32);
    expect(result.frames[0].height).toBe(32);
  });

  test('task-70.2: ShpLoader rejects invalid buffer', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Shp = (window as unknown as Record<string, unknown>)._ShpLoader as {
        parse: (buf: ArrayBuffer) => { isValid: boolean };
      };
      return Shp.parse(new ArrayBuffer(4));
    });

    expect(result.isValid).toBe(false);
  });

  test('task-70.3: ShpLoader parses RA1-format SHP', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Shp = (window as unknown as Record<string, unknown>)._ShpLoader as {
        parse: (buf: ArrayBuffer) => { isValid: boolean; frameCount: number; width: number; height: number };
      };

      // Build a minimal RA1-format SHP:
      // frameCount(2) + unknown(2) + width(2) + height(2) + offsetTable[] + frameHeaders[]
      const buf = new ArrayBuffer(8 + 4 + 12); // header + 1 offset + 1 frame header
      const view = new DataView(buf);
      view.setUint16(0, 1, true); // frameCount = 1 (RA1 signature)
      view.setUint16(4, 48, true); // width
      view.setUint16(6, 48, true); // height

      // Offset table (1 entry = 4 bytes)
      const offsetTable = 8;
      const frameHeaderOffset = offsetTable + 4;
      view.setUint32(offsetTable, frameHeaderOffset, true);

      // RA1 frame header
      view.setUint16(frameHeaderOffset + 2, 24, true); // width
      view.setUint16(frameHeaderOffset + 4, 24, true); // height

      return Shp.parse(buf);
    });

    expect(result.isValid).toBe(true);
    expect(result.frameCount).toBe(1);
    expect(result.width).toBe(48);
    expect(result.height).toBe(48);
  });
});
