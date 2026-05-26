import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 52: 战役数据层
 *
 * 验收：JSON 配置加载后，CampaignMenu 正确显示任务列表和完成状态。
 */
test.describe('Task 52: Campaign Data Layer', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('task-52.1: getAllCampaigns returns built-in campaigns', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cd = (window as unknown as Record<string, unknown>)._CampaignData as {
        getAllCampaigns: () => Array<{ id: string; name: string; faction: string; missions: unknown[] }>;
      };
      return cd.getAllCampaigns();
    });

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some((c) => c.id === 'gdi-campaign')).toBe(true);
    expect(result.some((c) => c.id === 'nod-campaign')).toBe(true);
  });

  test('task-52.2: getCampaignById returns correct campaign with missions', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cd = (window as unknown as Record<string, unknown>)._CampaignData as {
        getCampaignById: (
          id: string
        ) =>
          | { id: string; name: string; missions: Array<{ id: string; name: string; prerequisites: string[] }> }
          | undefined;
      };
      return cd.getCampaignById('gdi-campaign');
    });

    expect(result).toBeDefined();
    expect(result?.name).toBe('GDI Campaign');
    expect(result?.missions.length).toBeGreaterThanOrEqual(2);
    expect(result?.missions[0].prerequisites.length).toBe(0);
    expect(result?.missions[1].prerequisites.length).toBeGreaterThan(0);
  });

  test('task-52.3: getMissionById finds mission across campaigns', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cd = (window as unknown as Record<string, unknown>)._CampaignData as {
        getMissionById: (
          id: string
        ) => { id: string; name: string; briefingText: string; objectives: unknown[] } | undefined;
      };
      return cd.getMissionById('gdi-01');
    });

    expect(result).toBeDefined();
    expect(result?.name).toBe('First Strike');
    expect(result?.briefingText.length).toBeGreaterThan(0);
    expect(result?.objectives.length).toBeGreaterThanOrEqual(2);
  });

  test('task-52.4: registerCampaign adds custom campaign', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cd = (window as unknown as Record<string, unknown>)._CampaignData as {
        registerCampaign: (c: { id: string; name: string; faction: string; missions: unknown[] }) => void;
        getAllCampaigns: () => Array<{ id: string }>;
      };
      cd.registerCampaign({
        id: 'custom-test',
        name: 'Custom Test',
        faction: 'gdi',
        missions: [],
      });
      return cd.getAllCampaigns().some((c) => c.id === 'custom-test');
    });

    expect(result).toBe(true);
  });
});
