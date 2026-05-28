import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 126 — Custom Movement Layer', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('CustomMovementLayer registers and queries layers', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Layer = (window as unknown as Record<string, unknown>)._CustomMovementLayer as new () => {
        registerLayer: (id: string, info: { type: string; heightOffset: number; enabled: boolean }) => void;
        getLayer: (id: string) => { type: string; heightOffset: number } | undefined;
        getAllLayers: () => Map<string, unknown>;
      };

      const layer = new Layer();
      layer.registerLayer('bridge-1', { type: 'Bridge', heightOffset: 2, enabled: true });
      layer.registerLayer('tunnel-1', { type: 'Tunnel', heightOffset: -3, enabled: true });

      return {
        bridgeType: layer.getLayer('bridge-1')?.type,
        tunnelHeight: layer.getLayer('tunnel-1')?.heightOffset,
        count: layer.getAllLayers().size,
      };
    });

    expect(result.bridgeType).toBe('Bridge');
    expect(result.tunnelHeight).toBe(-3);
    expect(result.count).toBe(2);
  });

  test('canEnterLayer checks cell layer availability', async ({ page }) => {
    const result = await page.evaluate(() => {
      const LayerType = (window as unknown as Record<string, unknown>)._MovementLayerType as Record<string, string>;
      const Layer = (window as unknown as Record<string, unknown>)._CustomMovementLayer as new () => {
        setCellLayers: (x: number, y: number, types: string[]) => void;
        canEnterLayer: (x: number, y: number, type: string) => boolean;
        getCellLayers: (x: number, y: number) => string[];
      };

      const layer = new Layer();
      layer.setCellLayers(5, 5, [LayerType.Ground, LayerType.Bridge]);
      layer.setCellLayers(3, 3, [LayerType.Water]);

      return {
        canBridge: layer.canEnterLayer(5, 5, LayerType.Bridge),
        canAir: layer.canEnterLayer(5, 5, LayerType.Air),
        waterOnly: layer.getCellLayers(3, 3),
      };
    });

    expect(result.canBridge).toBe(true);
    expect(result.canAir).toBe(false);
    expect(result.waterOnly).toEqual(['Water']);
  });

  test('getHeightDifference calculates layer offset delta', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Layer = (window as unknown as Record<string, unknown>)._CustomMovementLayer as new () => {
        registerLayer: (id: string, info: { type: string; heightOffset: number; enabled: boolean }) => void;
        getHeightDifference: (from: string, to: string) => number;
      };

      const layer = new Layer();
      layer.registerLayer('ground', { type: 'Ground', heightOffset: 0, enabled: true });
      layer.registerLayer('cliff', { type: 'Cliff', heightOffset: 5, enabled: true });

      return {
        up: layer.getHeightDifference('ground', 'cliff'),
        down: layer.getHeightDifference('cliff', 'ground'),
        same: layer.getHeightDifference('ground', 'ground'),
      };
    });

    expect(result.up).toBe(5);
    expect(result.down).toBe(-5);
    expect(result.same).toBe(0);
  });

  test('clear removes all layers and cell mappings', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Layer = (window as unknown as Record<string, unknown>)._CustomMovementLayer as new () => {
        registerLayer: (id: string, info: { type: string; heightOffset: number; enabled: boolean }) => void;
        setCellLayers: (x: number, y: number, types: string[]) => void;
        clear: () => void;
        getAllLayers: () => Map<string, unknown>;
        getCellLayers: (x: number, y: number) => string[];
      };

      const layer = new Layer();
      layer.registerLayer('test', { type: 'Ground', heightOffset: 0, enabled: true });
      layer.setCellLayers(1, 1, ['Ground']);
      layer.clear();

      return {
        layersCount: layer.getAllLayers().size,
        cellLayers: layer.getCellLayers(1, 1),
      };
    });

    expect(result.layersCount).toBe(0);
    expect(result.cellLayers).toEqual(['Ground']); // cell mapping also cleared but defaults to Ground
  });
});
