import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 73: Background Music', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-73.1: MusicPlayer plays track and reports state', async ({ page }) => {
    const result = await page.evaluate(() => {
      const player = (window as unknown as Record<string, unknown>)._musicPlayer as {
        play: (id: string) => void;
        getIsPlaying: () => boolean;
        getCurrentTrack: () => { id: string; displayName: string } | null;
        getTracks: () => Array<{ id: string; displayName: string }>;
        setVolume: (v: number) => void;
        getVolume: () => number;
        stop: () => void;
      };
      player.stop();
      player.play('menu');
      const playing = player.getIsPlaying();
      const track = player.getCurrentTrack();
      const tracks = player.getTracks();
      player.setVolume(0.75);
      const vol = player.getVolume();
      player.stop();
      return { playing, trackId: track?.id, trackName: track?.displayName, trackCount: tracks.length, vol };
    });

    expect(result.playing).toBe(true);
    expect(result.trackId).toBe('menu');
    expect(result.trackName).toBe('Main Menu');
    expect(result.trackCount).toBeGreaterThanOrEqual(3);
    expect(result.vol).toBe(0.75);
  });
});
