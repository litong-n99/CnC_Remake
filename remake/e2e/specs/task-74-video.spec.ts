import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 74: Video Playback', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-74.1: VideoPlayer registers tracks and exposes list', async ({ page }) => {
    const result = await page.evaluate(() => {
      const player = (window as unknown as Record<string, unknown>)._videoPlayer as {
        getTracks: () => Array<{ id: string }>;
        registerTrack: (t: { id: string; src: string }) => void;
        isPlaying: () => boolean;
      };
      const before = player.getTracks().length;
      player.registerTrack({ id: 'custom-movie', src: 'dummy.webm' });
      const after = player.getTracks().length;
      return { before, after, hasCustom: player.getTracks().some((t) => t.id === 'custom-movie') };
    });

    expect(result.before).toBeGreaterThanOrEqual(3);
    expect(result.after).toBe(result.before + 1);
    expect(result.hasCustom).toBe(true);
  });
});
