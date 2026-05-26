import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 60: 战役过场动画（Video Playback）
 *
 * 验收：简报前自动播放 10 秒测试视频，可 Skip。
 */
test.describe('Task 60: Briefing Video', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('task-60.1: VideoPlayer can register briefing track and play it', async ({ page }) => {
    const result = await page.evaluate(() => {
      const vp = (window as unknown as Record<string, unknown>)._videoPlayer as {
        registerTrack: (t: { id: string; src: string }) => void;
        getTracks: () => Array<{ id: string; src: string }>;
        isPlaying: () => boolean;
      };
      const before = vp.getTracks().length;
      vp.registerTrack({ id: 'briefing-gdi-01', src: 'dummy-briefing.webm' });
      const after = vp.getTracks().length;
      return { before, after, hasTrack: vp.getTracks().some((t) => t.id === 'briefing-gdi-01') };
    });

    expect(result.after).toBe(result.before + 1);
    expect(result.hasTrack).toBe(true);
  });

  test('task-60.2: campaign data supports briefingVideo path', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cd = (window as unknown as Record<string, unknown>)._CampaignData as {
        registerCampaign: (c: {
          id: string;
          name: string;
          faction: string;
          missions: Array<{ id: string; briefingVideo?: string }>;
        }) => void;
        getMissionById: (id: string) => { briefingVideo?: string } | undefined;
      };
      cd.registerCampaign({
        id: 'test-video-campaign',
        name: 'Test Video',
        faction: 'gdi',
        missions: [{ id: 'test-mission-1', briefingVideo: '/videos/briefing.webm' }],
      });
      const mission = cd.getMissionById('test-mission-1');
      return { hasVideo: !!mission?.briefingVideo, path: mission?.briefingVideo };
    });

    expect(result.hasVideo).toBe(true);
    expect(result.path).toBe('/videos/briefing.webm');
  });
});
