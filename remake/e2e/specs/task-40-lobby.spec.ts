import { test, expect } from '@playwright/test';

test.describe('Task 40: Multiplayer Lobby', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(
      () => {
        const router = (window as unknown as Record<string, unknown>)._router;
        return typeof router === 'object' && router !== null;
      },
      { timeout: 15000 }
    );
    await page.evaluate(() => {
      const router = (window as unknown as Record<string, unknown>)._router as
        | { navigate: (p: string) => void }
        | undefined;
      router?.navigate('menu');
    });
    await page.waitForTimeout(200);
  });

  test('task-40.1: lobby renders room list and actions', async ({ page }) => {
    await page.locator('#main-menu [data-action="multiplayer"]').click();

    const lobby = page.locator('#multiplayer-lobby');
    await expect(lobby).toBeVisible();

    // Should show dummy rooms
    const rooms = lobby.locator('.cnc-room');
    expect(await rooms.count()).toBeGreaterThanOrEqual(1);

    // Should have create and back buttons
    await expect(lobby.locator('[data-action="create"]')).toBeVisible();
    await expect(lobby.locator('[data-action="back"]')).toBeVisible();
  });

  test('task-40.2: back button returns to menu', async ({ page }) => {
    await page.locator('#main-menu [data-action="multiplayer"]').click();
    await expect(page.locator('#multiplayer-lobby')).toBeVisible();

    await page.locator('#multiplayer-lobby [data-action="back"]').click();
    await expect(page.locator('#multiplayer-lobby')).toBeHidden();
    await expect(page.locator('#main-menu')).toBeVisible();
  });
});
