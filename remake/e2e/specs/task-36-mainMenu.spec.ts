import { test, expect } from '@playwright/test';

test.describe('Task 36: Main Menu', () => {
  test('task-36.1: main menu is visible on first load', async ({ page }) => {
    await page.goto('/');
    // Wait for shell router to be initialized
    await page.waitForFunction(
      () => {
        const router = (window as unknown as Record<string, unknown>)._router;
        return typeof router === 'object' && router !== null;
      },
      { timeout: 15000 }
    );
    // In e2e mode default page is 'game'; navigate to menu to test it
    await page.evaluate(() => {
      const router = (window as unknown as Record<string, unknown>)._router as
        | { navigate: (p: string) => void }
        | undefined;
      router?.navigate('menu');
    });
    const menu = page.locator('#main-menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('.cnc-title')).toContainText('COMMAND');
  });

  test('task-36.2: clicking start game navigates to loading then game', async ({ page }) => {
    await page.goto('/');
    // Wait for shell router to be initialized
    await page.waitForFunction(
      () => {
        const router = (window as unknown as Record<string, unknown>)._router;
        return typeof router === 'object' && router !== null;
      },
      { timeout: 15000 }
    );
    // In e2e mode default page is 'game'; navigate to menu to test the start flow
    await page.evaluate(() => {
      const router = (window as unknown as Record<string, unknown>)._router as
        | { navigate: (p: string) => void }
        | undefined;
      router?.navigate('menu');
    });
    await page.waitForTimeout(200);
    await page.locator('#main-menu [data-action="start"]').click();

    // Should show loading screen
    const loadScreen = page.locator('#load-screen');
    await expect(loadScreen).toBeVisible();
    await expect(loadScreen.locator('.cnc-load-title')).toContainText('LOADING');

    // Wait for game to start
    await page.waitForTimeout(2500);

    // Game canvas should be visible, menu hidden
    await expect(page.locator('#main-menu')).toBeHidden();
    await expect(page.locator('#renderCanvas')).toBeVisible();

    // cnc console should be available
    const hasCnc = await page.evaluate(() => {
      return typeof (window as unknown as Record<string, unknown>).cnc === 'object';
    });
    expect(hasCnc).toBe(true);
  });
});
