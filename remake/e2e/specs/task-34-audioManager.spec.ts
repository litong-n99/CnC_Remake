import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 34: AudioManager (Dummy)', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-34.1: AudioManager plays events without error', async ({ page }) => {
    // Trigger audio init via click
    await page.mouse.click(100, 100);
    await page.waitForTimeout(200);

    const results = await page.evaluate(() => {
      const audio = (window as unknown as Record<string, unknown>)._audioManager as {
        play: (name: string) => void;
        isEnabled: () => boolean;
        setEnabled: (v: boolean) => void;
      };
      const before = audio.isEnabled();
      audio.play('select');
      audio.play('move');
      audio.play('fire');
      audio.setEnabled(false);
      const after = audio.isEnabled();
      audio.setEnabled(true);
      return { before, after };
    });

    expect(results.before).toBe(true);
    expect(results.after).toBe(false);
  });
});
