import { test, expect } from '@playwright/test';

test.describe('Task 37: Shell Router', () => {
  test('task-37.1: router exposes current page state', async ({ page }) => {
    await page.goto('/');
    // Wait for shell router to be initialized
    await page.waitForFunction(
      () => {
        const router = (window as unknown as Record<string, unknown>)._router;
        return typeof router === 'object' && router !== null;
      },
      { timeout: 15000 }
    );

    const pageState = await page.evaluate(() => {
      const router = (window as unknown as Record<string, unknown>)._router as
        | { getCurrentPage: () => string }
        | undefined;
      return router?.getCurrentPage() ?? 'missing';
    });

    expect(pageState).toBe('game');
  });

  test('task-37.2: settings navigation works from menu', async ({ page }) => {
    await page.goto('/');
    // Wait for shell router to be initialized
    await page.waitForFunction(
      () => {
        const router = (window as unknown as Record<string, unknown>)._router;
        return typeof router === 'object' && router !== null;
      },
      { timeout: 15000 }
    );
    // Navigate to menu first (e2e default is game)
    await page.evaluate(() => {
      const router = (window as unknown as Record<string, unknown>)._router as
        | { navigate: (p: string) => void }
        | undefined;
      router?.navigate('menu');
    });
    await page.locator('#main-menu [data-action="settings"]').click();

    await expect(page.locator('#settings-menu')).toBeVisible();
    await expect(page.locator('#main-menu')).toBeHidden();

    const pageState = await page.evaluate(() => {
      const router = (window as unknown as Record<string, unknown>)._router as
        | { getCurrentPage: () => string }
        | undefined;
      return router?.getCurrentPage() ?? 'missing';
    });
    expect(pageState).toBe('settings');
  });

  test('task-37.3: ESC toggles pause during game', async ({ page }) => {
    await page.goto('/');
    // Wait for shell router to be initialized
    await page.waitForFunction(
      () => {
        const router = (window as unknown as Record<string, unknown>)._router;
        return typeof router === 'object' && router !== null;
      },
      { timeout: 15000 }
    );
    // Navigate to menu first (e2e default is game), then start game
    await page.evaluate(() => {
      const router = (window as unknown as Record<string, unknown>)._router as
        | { navigate: (p: string) => void }
        | undefined;
      router?.navigate('menu');
    });
    await page.locator('#main-menu [data-action="start"]').click();
    await page.waitForTimeout(2500);

    // Press ESC to pause
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(page.locator('#pause-menu')).toBeVisible();

    // Press ESC again to resume
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(page.locator('#pause-menu')).toBeHidden();
  });
});
