import { test, expect } from '@playwright/test';

test.describe('Task 41: Settings Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for shell router to be initialized
    await page.waitForFunction(
      () => {
        const router = (window as unknown as Record<string, unknown>)._router;
        return typeof router === 'object' && router !== null;
      },
      { timeout: 15000 }
    );
    // In e2e mode default page is 'game'; navigate to menu to test settings flow
    await page.evaluate(() => {
      const router = (window as unknown as Record<string, unknown>)._router as
        | { navigate: (p: string) => void }
        | undefined;
      router?.navigate('menu');
    });
  });

  test('task-41.1: settings page renders sliders and toggles', async ({ page }) => {
    await page.locator('#main-menu [data-action="settings"]').click();
    await expect(page.locator('#settings-menu')).toBeVisible();

    // Check sliders exist
    await expect(page.locator('#settings-menu input[type="range"][data-key="masterVolume"]')).toBeVisible();
    await expect(page.locator('#settings-menu input[type="range"][data-key="musicVolume"]')).toBeVisible();
    await expect(page.locator('#settings-menu input[type="range"][data-key="sfxVolume"]')).toBeVisible();

    // Check toggles exist
    await expect(page.locator('#settings-menu input[type="checkbox"][data-key="showFps"]')).toBeVisible();
    await expect(page.locator('#settings-menu input[type="checkbox"][data-key="edgeScroll"]')).toBeVisible();
  });

  test('task-41.2: settings persist to localStorage', async ({ page }) => {
    await page.locator('#main-menu [data-action="settings"]').click();

    // Change a setting
    await page.locator('#settings-menu input[type="range"][data-key="masterVolume"]').fill('0.25');
    await page.locator('#settings-menu input[type="checkbox"][data-key="showFps"]').check();

    // Save
    await page.locator('#settings-menu [data-action="save"]').click();

    // Verify localStorage
    const stored = await page.evaluate(() => localStorage.getItem('cnc-remake-settings'));
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.masterVolume).toBe(0.25);
    expect(parsed.showFps).toBe(true);
  });

  test('task-41.3: getSettings returns current values', async ({ page }) => {
    await page.locator('#main-menu [data-action="settings"]').click();

    const settings = await page.evaluate(() => {
      const sm = (window as unknown as Record<string, unknown>)._settingsMenu as
        | { getSettings: () => Record<string, unknown> }
        | undefined;
      return sm?.getSettings() ?? null;
    });

    expect(settings).not.toBeNull();
    expect(typeof settings!.masterVolume).toBe('number');
    expect(typeof settings!.musicVolume).toBe('number');
    expect(typeof settings!.sfxVolume).toBe('number');
    expect(typeof settings!.showFps).toBe('boolean');
    expect(typeof settings!.edgeScroll).toBe('boolean');
  });
});
