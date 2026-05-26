import { test, expect } from '@playwright/test';

test.describe('Task 39: Skirmish Setup', () => {
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

  test('task-39.1: skirmish setup renders form fields', async ({ page }) => {
    await page.locator('#main-menu [data-action="skirmish"]').click();

    const setup = page.locator('#skirmish-setup');
    await expect(setup).toBeVisible();

    // Check all select fields exist
    await expect(setup.locator('select[data-key="map"]')).toBeVisible();
    await expect(setup.locator('select[data-key="startingCash"]')).toBeVisible();
    await expect(setup.locator('select[data-key="gameSpeed"]')).toBeVisible();
    await expect(setup.locator('select[data-key="aiDifficulty"]')).toBeVisible();

    // Check buttons
    await expect(setup.locator('[data-action="start"]')).toBeVisible();
    await expect(setup.locator('[data-action="back"]')).toBeVisible();
  });

  test('task-39.2: changing config updates state', async ({ page }) => {
    await page.locator('#main-menu [data-action="skirmish"]').click();

    const setup = page.locator('#skirmish-setup');
    await setup.locator('select[data-key="startingCash"]').selectOption('20000');
    await setup.locator('select[data-key="gameSpeed"]').selectOption('fast');

    const config = await page.evaluate(() => {
      const sm = (window as unknown as Record<string, unknown>)._skirmishSetup as
        | { getConfig: () => Record<string, unknown> }
        | undefined;
      return sm?.getConfig() ?? null;
    });

    expect(config).not.toBeNull();
    expect(config!.startingCash).toBe(20000);
    expect(config!.gameSpeed).toBe('fast');
  });

  test('task-39.3: back button returns to menu', async ({ page }) => {
    await page.locator('#main-menu [data-action="skirmish"]').click();
    await expect(page.locator('#skirmish-setup')).toBeVisible();

    await page.locator('#skirmish-setup [data-action="back"]').click();
    await expect(page.locator('#skirmish-setup')).toBeHidden();
    await expect(page.locator('#main-menu')).toBeVisible();
  });
});
