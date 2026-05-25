import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 10.6 E2E Test — Palette-Indexed Shader Support
 *
 * Verifies:
 * 1. TerrainIndexedMaterial can be instantiated via GameConsole
 * 2. Shader compiles and renders without error
 * 3. Palette lookup produces expected colours (index → RGBA mapping)
 * 4. Index 0 is treated as transparent (discard)
 */

test.describe('Task 10.6 — Palette-Indexed Shader', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('createIndexedTest succeeds and returns mesh name', async () => {
    const result = (await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return (cnc.createIndexedTest as () => Promise<Record<string, unknown>>)();
    })) as Record<string, unknown>;

    expect(result.success).toBe(true);
    expect(result.meshName).toBe('indexedTestQuad');
  });

  test('palette lookup renders correct colours and index-0 is transparent', async () => {
    // Create the indexed test scene
    await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      await (cnc.createIndexedTest as () => Promise<Record<string, unknown>>)();
    });

    // Read back the 4×4 RTT pixels (16 pixels × 4 channels = 64 values)
    const pixels = (await game.page.evaluate(async () => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return (cnc.readIndexedPixels as () => Promise<number[] | null>)();
    })) as number[] | null;

    expect(pixels).not.toBeNull();
    expect(pixels!.length).toBe(64); // 4×4 RGBA

    // Count how many pixels match each expected colour.
    // The 2×2 indexed texture has four quadrants; because the ortho RTT
    // camera may mirror axes, we don't assert on specific pixel positions.
    // Instead we verify that each of the four colours appears exactly 4 times
    // (each quadrant is 2×2 pixels in the 4×4 RTT).
    let redCount = 0;
    let greenCount = 0;
    let blueCount = 0;
    let blackCount = 0;

    for (let i = 0; i < pixels!.length; i += 4) {
      const r = pixels![i];
      const g = pixels![i + 1];
      const b = pixels![i + 2];
      const a = pixels![i + 3];

      if (r > 200 && g < 50 && b < 50 && a > 200) {
        redCount++;
      } else if (r < 50 && g > 200 && b < 50 && a > 200) {
        greenCount++;
      } else if (r < 50 && g < 50 && b > 200 && a > 200) {
        blueCount++;
      } else if (r < 50 && g < 50 && b < 50) {
        // Index 0 is discarded → background stays as RTT clear colour (black)
        blackCount++;
      }
    }

    expect(redCount).toBe(4);
    expect(greenCount).toBe(4);
    expect(blueCount).toBe(4);
    expect(blackCount).toBe(4);
  });
});
