import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 51.5 — Relationship Colors (立场着色)', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('RelationshipColor config exists with four entries', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const cfg = (w._getRelationshipColorConfig as () => Record<string, string>)();
      return {
        hasSelf: 'self' in cfg,
        hasAlly: 'ally' in cfg,
        hasEnemy: 'enemy' in cfg,
        hasNeutral: 'neutral' in cfg,
        selfColor: cfg.self,
        allyColor: cfg.ally,
        enemyColor: cfg.enemy,
      };
    });

    expect(result.hasSelf).toBe(true);
    expect(result.hasAlly).toBe(true);
    expect(result.hasEnemy).toBe(true);
    expect(result.hasNeutral).toBe(true);
    expect(result.selfColor).toBe('#00FF00');
    expect(result.allyColor).toBe('#00AAFF');
    expect(result.enemyColor).toBe('#FF0000');
  });

  test('getRelationshipColorForLocalPlayer returns enemy color for Nod from GDI perspective', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const getColor = w._getRelationshipColorForLocalPlayer as (target: number) => string;
      // GDI (local player) looking at Nod = Enemy = red
      const nodColor = getColor(9); // HouseType.Nod
      return { nodColor };
    });

    expect(result.nodColor).toBe('#FF0000');
  });

  test('getRelationshipColorFor returns self color when viewer equals target', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const getColor = w._getRelationshipColorFor as (viewer: number, target: number) => string;
      return {
        selfColor: getColor(10, 10), // GDI looking at GDI
      };
    });

    expect(result.selfColor).toBe('#00FF00');
  });

  test('hexToColor3 converts hex to Babylon Color3', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const hexToColor3 = w._hexToColor3 as (hex: string) => { r: number; g: number; b: number };
      const c = hexToColor3('#FF0000');
      return { r: Math.round(c.r * 255), g: Math.round(c.g * 255), b: Math.round(c.b * 255) };
    });

    expect(result.r).toBe(255);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  test('SelectionManager viewer is set to GDI (local player)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sm = (window as unknown as Record<string, unknown>)._selectionManager as {
        getViewerHouseType: () => number;
      };
      const viewer = sm.getViewerHouseType();
      return { viewerHouse: viewer };
    });

    // GDI is the local player / viewer
    expect(result.viewerHouse).toBe(8); // HouseType.GDI
  });

  test('HUD minimap canvas exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('#cnc-minimap canvas') as HTMLCanvasElement | null;
      return {
        hasCanvas: !!canvas,
        width: canvas?.width,
        height: canvas?.height,
      };
    });

    expect(result.hasCanvas).toBe(true);
    expect(result.width).toBe(160);
    expect(result.height).toBe(160);
  });

  test('UnitHealthBarManager can be instantiated', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HBM = (window as unknown as Record<string, unknown>)._UnitHealthBarManager as new () => unknown;
      const mgr = new HBM();
      return { hasShow: typeof (mgr as Record<string, unknown>).show === 'function' };
    });

    expect(result.hasShow).toBe(true);
  });

  test('BuildingPlacer accepts tintColor parameter', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;
      // Start building placement for GDI (tint should be applied)
      const ok = cnc.building('PowerPlant', 'gdi');
      return { started: ok };
    });

    expect(result.started).toBe(true);
  });
});
