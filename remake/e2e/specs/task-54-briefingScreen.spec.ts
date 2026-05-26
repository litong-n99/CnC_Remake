import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 54: 任务简报页面
 *
 * 验收：文字逐字显示，目标列表正确，点击 Skip 跳过。
 */
test.describe('Task 54: Briefing Screen', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('task-54.1: BriefingScreen displays mission info and objectives', async ({ page }) => {
    await page.evaluate(() => {
      const BSClass = (window as unknown as Record<string, unknown>)._BriefingScreen as {
        new (): {
          show: (mission: {
            name: string;
            briefingText: string;
            objectives: Array<{ description: string; type: string }>;
          }) => void;
        };
      };
      const bs = new BSClass();
      bs.show({
        name: 'Test Mission',
        briefingText: 'This is a test briefing message.',
        objectives: [
          { description: 'Build a base', type: 'primary' },
          { description: 'Find the spy', type: 'secondary' },
        ],
      });
    });

    // Verify title is visible
    const title = page.locator('h2', { hasText: 'TEST MISSION' });
    await expect(title).toBeVisible();

    // Verify objectives section
    const objTitle = page.locator('h3', { hasText: 'Objectives' });
    await expect(objTitle).toBeVisible();

    // Verify Skip button exists
    const skipBtn = page.locator('button', { hasText: 'SKIP' });
    await expect(skipBtn).toBeVisible();
  });

  test('task-54.2: Skip button removes briefing overlay', async ({ page }) => {
    await page.evaluate(() => {
      const BSClass = (window as unknown as Record<string, unknown>)._BriefingScreen as {
        new (): { show: (mission: { name: string; briefingText: string; objectives: unknown[] }) => void };
      };
      const bs = new BSClass();
      bs.show({
        name: 'Skip Test',
        briefingText: 'Text to skip.',
        objectives: [],
      });
    });

    const skipBtn = page.locator('button', { hasText: 'SKIP' });
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();

    // After skip, the overlay should be removed
    await expect(skipBtn).not.toBeVisible();
  });
});
