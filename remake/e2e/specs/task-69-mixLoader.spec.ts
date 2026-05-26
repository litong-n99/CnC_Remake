import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 69: MIX/MPR 资源包解析
 *
 * 验收：上传一个 `.mix` 文件，控制台列出内部所有文件名和大小。
 */
test.describe('Task 69: MIX Loader', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('task-69.1: MixLoader parses dummy MIX file header', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Mix = (window as unknown as Record<string, unknown>)._MixLoader as {
        parse: (buf: ArrayBuffer) => {
          isValid: boolean;
          fileCount: number;
          entries: Array<{ id: number; offset: number; size: number }>;
        };
      };

      // Build a minimal valid MIX file:
      // signature(2) + fileCount(2) + dataSize(4) + entries[]
      const buf = new ArrayBuffer(6 + 12); // header + 1 entry
      const view = new DataView(buf);
      view.setUint16(0, 0x0000, true); // signature
      view.setUint16(2, 1, true); // fileCount = 1
      view.setUint32(4, 100, true); // dataSize = 100
      // Entry 0: id=0x12345678, offset=6+12=18, size=10
      view.setUint32(6, 0x12345678, true);
      view.setUint32(10, 18, true);
      view.setUint32(14, 10, true);

      return Mix.parse(buf);
    });

    expect(result.isValid).toBe(true);
    expect(result.fileCount).toBe(1);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].id).toBe(0x12345678);
    expect(result.entries[0].size).toBe(10);
  });

  test('task-69.2: MixLoader CRC32 produces consistent hashes', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Mix = (window as unknown as Record<string, unknown>)._MixLoader as {
        crc32: (name: string) => number;
      };
      return {
        a: Mix.crc32('TEST.TXT'),
        b: Mix.crc32('TEST.TXT'),
        c: Mix.crc32('OTHER.TXT'),
      };
    });

    expect(result.a).toBe(result.b);
    expect(result.a).not.toBe(result.c);
  });

  test('task-69.3: MixLoader rejects invalid signature', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Mix = (window as unknown as Record<string, unknown>)._MixLoader as {
        parse: (buf: ArrayBuffer) => { isValid: boolean };
      };
      const buf = new ArrayBuffer(8);
      const view = new DataView(buf);
      view.setUint16(0, 0x1234, true); // invalid signature
      return Mix.parse(buf);
    });

    expect(result.isValid).toBe(false);
  });
});
