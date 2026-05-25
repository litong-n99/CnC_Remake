import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 9.6 E2E Test — OpenRA Map Format Compatibility
 *
 * Verifies that OpenRAMapLoader can parse `map.yaml` + `map.bin`
 * and expose metadata via the debug console (`window.cnc`).
 */

test.describe('Task 9.6 — OpenRA Map Loader', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('page loads and GameConsole is installed', async ({ page }) => {
    const cncReady = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc;
      return typeof cnc === 'object' && cnc !== null;
    });
    expect(cncReady).toBe(true);
  });

  test('openraMap returns correct metadata for test map', async () => {
    const result = await game.openraMap('/maps/test_openra');

    expect(result.error).toBeUndefined();
    expect(result.title).toBe('Test OpenRA Map');
    expect(result.author).toBe('CnC Remake Dev');
    expect(result.tileset).toBe('TEMPERAT');
    expect(result.mapFormat).toBe(11);
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);

    // Bounds
    const bounds = result.bounds as { x: number; y: number; width: number; height: number };
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(4);
    expect(bounds.height).toBe(4);
  });

  test('openraMap parses players correctly', async () => {
    const result = await game.openraMap('/maps/test_openra');

    expect(result.error).toBeUndefined();
    const players = result.players as Array<{
      id: string;
      name: string;
      playable?: boolean;
      ownsWorld?: boolean;
    }>;
    expect(players.length).toBe(2);

    const neutral = players.find((p) => p.id === 'Neutral');
    expect(neutral).toBeDefined();
    expect(neutral!.name).toBe('Neutral');
    expect(neutral!.ownsWorld).toBe(true);

    const multi0 = players.find((p) => p.id === 'Multi0');
    expect(multi0).toBeDefined();
    expect(multi0!.name).toBe('Multi0');
    expect(multi0!.playable).toBe(true);
  });

  test('openraMap parses actors correctly', async () => {
    const result = await game.openraMap('/maps/test_openra');

    expect(result.error).toBeUndefined();
    const actors = result.actors as Array<{
      id: string;
      type: string;
      location: { x: number; y: number };
      owner: string;
    }>;
    expect(actors.length).toBe(2);

    const mcv = actors.find((a) => a.type === 'mcv');
    expect(mcv).toBeDefined();
    expect(mcv!.location.x).toBe(1);
    expect(mcv!.location.y).toBe(1);
    expect(mcv!.owner).toBe('Multi0');

    const fact = actors.find((a) => a.type === 'fact');
    expect(fact).toBeDefined();
    expect(fact!.location.x).toBe(2);
    expect(fact!.location.y).toBe(2);
    expect(fact!.owner).toBe('Multi0');
  });

  test('openraMap returns bin header info', async () => {
    const result = await game.openraMap('/maps/test_openra');

    expect(result.error).toBeUndefined();
    const binHeader = result.binHeader as {
      format: number;
      tilesOffset: number;
      heightsOffset: number;
      resourcesOffset: number;
    };
    expect(binHeader.format).toBe(11);
    expect(typeof binHeader.tilesOffset).toBe('number');
    expect(typeof binHeader.heightsOffset).toBe('number');
    expect(typeof binHeader.resourcesOffset).toBe('number');
  });

  test('openraMap does not apply 4x4 map to 64x64 terrain (size mismatch)', async () => {
    const result = await game.openraMap('/maps/test_openra');

    expect(result.error).toBeUndefined();
    expect(result.applied).toBe(false);
  });
});
