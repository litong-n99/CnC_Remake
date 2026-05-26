import { test, expect } from '@playwright/test';

test.describe('Task 38: Campaign Menu', () => {
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

  test('task-38.1: campaign menu renders factions and missions', async ({ page }) => {
    await page.locator('#main-menu [data-action="campaign"]').click();

    const campaignMenu = page.locator('#campaign-menu');
    await expect(campaignMenu).toBeVisible();

    // Should show GDI and Nod campaigns
    await expect(campaignMenu.locator('.cnc-campaign')).toHaveCount(2);
    await expect(campaignMenu).toContainText('GDI 战役');
    await expect(campaignMenu).toContainText('Nod 战役');

    // Should show missions
    const missions = campaignMenu.locator('.cnc-mission');
    expect(await missions.count()).toBeGreaterThanOrEqual(4);
  });

  test('task-38.2: back button returns to menu', async ({ page }) => {
    await page.locator('#main-menu [data-action="campaign"]').click();
    await expect(page.locator('#campaign-menu')).toBeVisible();

    await page.locator('#campaign-menu [data-action="back"]').click();
    await expect(page.locator('#campaign-menu')).toBeHidden();
    await expect(page.locator('#main-menu')).toBeVisible();
  });
});
