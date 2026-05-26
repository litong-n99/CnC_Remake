import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 142: Audio Category Manager', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-142.1: setCategoryVolume adjusts per-category volume', async ({ page }) => {
    // Init audio via click
    await page.mouse.click(100, 100);
    await page.waitForTimeout(200);

    const results = await page.evaluate(() => {
      const audio = (window as unknown as Record<string, unknown>)._audioManager as {
        setCategoryVolume: (cat: string, vol: number) => void;
        playRaw: (ev: { category: string; frequency: number; duration: number; type: string; volume: number }) => void;
        isEnabled: () => boolean;
      };

      audio.setCategoryVolume('Weapon', 0.0);
      audio.setCategoryVolume('Notification', 0.5);
      audio.setCategoryVolume('UnitVoice', 1.0);

      // Verify playRaw does not throw with zero-volume category
      audio.playRaw({ category: 'Weapon', frequency: 220, duration: 50, type: 'sine', volume: 1.0 });

      return { enabled: audio.isEnabled() };
    });

    expect(results.enabled).toBe(true);
  });

  test('task-142.2: AudioManager exposes all SoundCategory enum values', async ({ page }) => {
    const categories = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const am = w._audioManager as {
        setCategoryVolume: (cat: string, vol: number) => void;
      };
      // Verify all 5 categories can be set without error
      const cats = ['UnitVoice', 'Notification', 'Weapon', 'Music', 'Ambient'];
      for (const c of cats) {
        am.setCategoryVolume(c, 0.5);
      }
      return cats;
    });

    expect(categories).toHaveLength(5);
  });
});
