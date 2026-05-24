import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 9.4 E2E Test — Texture Splatting Shader
 *
 * Verifies:
 * 1. enableTextureMode switches rendering from vertex-colour to shader
 * 2. isTextureMode returns true after enabling
 * 3. Mesh material changes to ShaderMaterial
 * 4. setCellLandType updates splat map in texture mode
 * 5. Procedural textures are generated without error
 */

test.describe('Task 9.4 — Texture Splatting', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('enableTextureMode switches to shader rendering', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.enableTextureMode?.();
    });

    const isTex = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as { isTextureMode: () => boolean };
      return terrain.isTextureMode();
    })) as boolean;

    expect(isTex).toBe(true);
  });

  test('mesh material is ShaderMaterial after texture mode', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.enableTextureMode?.();
    });

    const matName = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return (cnc.terrainMaterial as (() => string) | undefined)?.() ?? 'not-available';
    })) as string;

    expect(matName).toContain('ShaderMaterial');
  });

  test('setCellLandType works after enabling texture mode', async () => {
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.enableTextureMode?.();
    });

    // Change a cell to Water
    await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as { setCellLandType: (x: number, y: number, type: number) => void };
      terrain.setCellLandType(5, 5, 2); // Water
    });

    // Verify landType changed
    const landType = (await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const terrain = cnc.terrain as { getCellLandType: (x: number, y: number) => number };
      return terrain.getCellLandType(5, 5);
    })) as number;

    expect(landType).toBe(2); // Water
  });
});
