import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 53: 战役进度保存
 *
 * 验收：通关第一个任务后刷新页面，该任务显示"已完成"，下一个任务解锁。
 */
test.describe('Task 53: Campaign Progress', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test.afterEach(async ({ page }) => {
    // Clean up progress after each test
    await page.evaluate(() => {
      const cp = (window as unknown as Record<string, unknown>)._CampaignProgress as {
        clearAllCampaignProgress: () => void;
      };
      cp.clearAllCampaignProgress();
    });
  });

  test('task-53.1: markMissionCompleted saves progress to localStorage', async ({ page }) => {
    const before = await page.evaluate(() => {
      const cp = (window as unknown as Record<string, unknown>)._CampaignProgress as {
        loadCampaignProgress: (id: string) => { missions: Record<string, unknown> };
      };
      return cp.loadCampaignProgress('gdi-campaign');
    });
    expect(before.missions['gdi-01']).toBeUndefined();

    await page.evaluate(() => {
      const cp = (window as unknown as Record<string, unknown>)._CampaignProgress as {
        markMissionCompleted: (campaignId: string, missionId: string, elapsed: number, difficulty: string) => void;
      };
      cp.markMissionCompleted('gdi-campaign', 'gdi-01', 120, 'normal');
    });

    const after = await page.evaluate(() => {
      const cp = (window as unknown as Record<string, unknown>)._CampaignProgress as {
        loadCampaignProgress: (id: string) => {
          missions: Record<string, { completed: boolean; bestTimeSeconds: number; completedDifficulties: string[] }>;
        };
      };
      return cp.loadCampaignProgress('gdi-campaign');
    });

    expect(after.missions['gdi-01']).toBeDefined();
    expect(after.missions['gdi-01'].completed).toBe(true);
    expect(after.missions['gdi-01'].bestTimeSeconds).toBe(120);
    expect(after.missions['gdi-01'].completedDifficulties).toContain('normal');
  });

  test('task-53.2: isMissionUnlocked respects prerequisites', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cp = (window as unknown as Record<string, unknown>)._CampaignProgress as {
        isMissionUnlocked: (campaignId: string, missionId: string, getPrereqs: (id: string) => string[]) => boolean;
        markMissionCompleted: (campaignId: string, missionId: string, elapsed: number, difficulty: string) => void;
      };
      const cd = (window as unknown as Record<string, unknown>)._CampaignData as {
        getMissionById: (id: string) => { prerequisites: string[] } | undefined;
      };

      const getPrereqs = (id: string) => cd.getMissionById(id)?.prerequisites ?? [];

      const unlockedBefore = cp.isMissionUnlocked('gdi-campaign', 'gdi-02', getPrereqs);
      cp.markMissionCompleted('gdi-campaign', 'gdi-01', 60, 'normal');
      const unlockedAfter = cp.isMissionUnlocked('gdi-campaign', 'gdi-02', getPrereqs);

      return { unlockedBefore, unlockedAfter };
    });

    expect(result.unlockedBefore).toBe(false);
    expect(result.unlockedAfter).toBe(true);
  });

  test('task-53.3: clearAllCampaignProgress removes all saves', async ({ page }) => {
    await page.evaluate(() => {
      const cp = (window as unknown as Record<string, unknown>)._CampaignProgress as {
        markMissionCompleted: (campaignId: string, missionId: string, elapsed: number, difficulty: string) => void;
        clearAllCampaignProgress: () => void;
        getSavedCampaignIds: () => string[];
      };
      cp.markMissionCompleted('gdi-campaign', 'gdi-01', 60, 'normal');
      cp.clearAllCampaignProgress();
      return cp.getSavedCampaignIds();
    });

    const ids = await page.evaluate(() => {
      const cp = (window as unknown as Record<string, unknown>)._CampaignProgress as {
        getSavedCampaignIds: () => string[];
      };
      return cp.getSavedCampaignIds();
    });

    expect(ids.length).toBe(0);
  });
});
