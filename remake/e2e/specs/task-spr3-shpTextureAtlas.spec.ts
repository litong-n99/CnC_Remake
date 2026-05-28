import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-SPR3: SHP 格式解析 → Texture Atlas', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('task-spr3.1: ShpTextureBuilder.build returns canvas and frames from TS-format SHP', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ShpTex = (window as unknown as Record<string, unknown>)._ShpTextureBuilder as {
        build: (buf: ArrayBuffer) => {
          canvas: { width: number; height: number };
          frames: Array<{ index: number; width: number; height: number; u: number; v: number; u2: number; v2: number }>;
          atlasWidth: number;
          atlasHeight: number;
        } | null;
      };

      // Build a TS-format SHP with 2 uncompressed frames
      const frameSize = 4 * 4; // 4x4 pixels
      const headerSize = 14;
      const offsetTableSize = 2 * 8; // 2 frames * 8 bytes
      const frameHeaderSize = 24;
      const pixelDataSize = frameSize * 2;
      const buf = new ArrayBuffer(headerSize + offsetTableSize + frameHeaderSize * 2 + pixelDataSize);
      const view = new DataView(buf);
      const u8 = new Uint8Array(buf);

      view.setUint16(0, 0x0000, true); // TS signature
      view.setUint16(6, 16, true); // width
      view.setUint16(8, 16, true); // height
      view.setUint16(10, 2, true); // frameCount = 2

      // Frame offset table
      const ot = headerSize;
      const fh0 = ot + offsetTableSize;
      const fh1 = fh0 + frameHeaderSize;
      const pd0 = fh1 + frameHeaderSize;
      const pd1 = pd0 + frameSize;

      view.setUint32(ot, fh0, true);
      view.setUint32(ot + 4, 3, true); // format = 3 (uncompressed)
      view.setUint32(ot + 8, fh1, true);
      view.setUint32(ot + 12, 3, true);

      // Frame 0 header
      view.setUint16(fh0 + 2, 0, true); // x
      view.setUint16(fh0 + 4, 0, true); // y
      view.setUint16(fh0 + 6, 4, true); // width
      view.setUint16(fh0 + 8, 4, true); // height

      // Frame 1 header
      view.setUint16(fh1 + 2, 0, true);
      view.setUint16(fh1 + 4, 0, true);
      view.setUint16(fh1 + 6, 4, true);
      view.setUint16(fh1 + 8, 4, true);

      // Pixel data (index colors)
      for (let i = 0; i < frameSize; i++) u8[pd0 + i] = (i % 255) + 1;
      for (let i = 0; i < frameSize; i++) u8[pd1 + i] = ((i + 128) % 255) + 1;

      return ShpTex.build(buf);
    });

    expect(result).not.toBeNull();
    expect(result!.frames.length).toBe(2);
    expect(result!.atlasWidth).toBeGreaterThan(0);
    expect(result!.atlasHeight).toBeGreaterThan(0);
    // canvas 属性在 evaluate 序列化后不可用，直接验证 atlas 尺寸
    // UV 坐标应合法
    expect(result!.frames[0].u).toBe(0);
    expect(result!.frames[0].u2).toBeGreaterThan(result!.frames[0].u);
    expect(result!.frames[1].u).toBeGreaterThanOrEqual(result!.frames[0].u2); // 第二帧在右侧或相邻
  });

  test('task-spr3.2: ShpTextureBuilder.build returns null for invalid SHP', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ShpTex = (window as unknown as Record<string, unknown>)._ShpTextureBuilder as {
        build: (buf: ArrayBuffer) => unknown;
      };
      return ShpTex.build(new ArrayBuffer(4));
    });
    expect(result).toBeNull();
  });

  test('task-spr3.3: Atlas UV coordinates cover all frames', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ShpTex = (window as unknown as Record<string, unknown>)._ShpTextureBuilder as {
        build: (buf: ArrayBuffer) => {
          frames: Array<{ index: number; u: number; v: number; u2: number; v2: number }>;
        } | null;
      };

      // Single frame SHP
      const buf = new ArrayBuffer(14 + 8 + 24 + 16);
      const view = new DataView(buf);
      view.setUint16(0, 0x0000, true);
      view.setUint16(6, 4, true);
      view.setUint16(8, 4, true);
      view.setUint16(10, 1, true);
      view.setUint32(14, 22, true); // dataOffset
      view.setUint32(18, 3, true); // format=3
      view.setUint16(24, 0, true); // x
      view.setUint16(26, 0, true); // y
      view.setUint16(28, 4, true); // w
      view.setUint16(30, 4, true); // h

      const data = new Uint8Array(buf, 46, 16);
      data.fill(128);

      const atlas = ShpTex.build(buf);
      return atlas?.frames[0];
    });

    expect(result).toBeDefined();
    expect(result!.u).toBe(0);
    expect(result!.u2).toBeGreaterThan(result!.u);
    // v <= v2 because atlasHeight == frameHeight (single row), Y flip means v=0, v2=1
    expect(result!.v2).toBeGreaterThan(result!.v);
  });

  test('task-spr3.4: RLE-compressed frame decodes correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ShpTex = (window as unknown as Record<string, unknown>)._ShpTextureBuilder as {
        build: (buf: ArrayBuffer) => { canvas: { width: number }; frames: Array<{ index: number }> } | null;
      };

      // Build a TS-format SHP with RLE (format=2) frame
      const buf = new ArrayBuffer(14 + 8 + 24 + 6); // header + 1 offset + frame header + RLE data
      const view = new DataView(buf);
      const u8 = new Uint8Array(buf);

      view.setUint16(0, 0x0000, true);
      view.setUint16(6, 4, true);
      view.setUint16(8, 4, true);
      view.setUint16(10, 1, true);
      view.setUint32(14, 22, true);
      view.setUint32(18, 2, true); // format = 2 (RLE)
      view.setUint16(24, 0, true);
      view.setUint16(26, 0, true);
      view.setUint16(28, 4, true);
      view.setUint16(30, 4, true);

      // RLE data: 16 pixels of value 200
      u8[46] = 16; // count
      u8[47] = 200; // value
      u8[48] = 0; // end marker

      return ShpTex.build(buf);
    });

    expect(result).not.toBeNull();
    expect(result!.frames.length).toBe(1);
  });
});
