import { test, expect } from '@playwright/test';

test.describe('Task 42: Load Screen', () => {
  test('task-42.1: load screen shows progress bar and tip', async ({ page }) => {
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
    await page.locator('#main-menu [data-action="start"]').click();

    // Wait for load screen to appear
    await page.waitForSelector('#load-screen', { state: 'visible', timeout: 5000 });

    // Verify content via evaluate to avoid visibility race conditions
    const content = await page.evaluate(() => {
      const screen = document.getElementById('load-screen');
      if (!screen) return null;
      return {
        title: screen.querySelector('.cnc-load-title')?.textContent ?? '',
        tip: screen.querySelector('.cnc-load-tip')?.textContent ?? '',
        hasBar: !!screen.querySelector('.cnc-load-bar-track'),
      };
    });

    expect(content).not.toBeNull();
    expect(content!.title).toContain('LOADING');
    expect(content!.tip).toContain('初始化');
    expect(content!.hasBar).toBe(true);
  });

  test('task-42.2: progress bar advances during load', async ({ page }) => {
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
    await page.locator('#main-menu [data-action="start"]').click();

    // Check initial width is near 0% (setInterval may already have started)
    const initialWidth = await page.evaluate(() => {
      const fill = document.querySelector('#load-screen .cnc-load-bar-fill') as HTMLElement;
      return fill?.style.width ?? 'unknown';
    });
    const numericInitial = parseFloat(initialWidth);
    expect(numericInitial).toBeLessThan(20);

    // Wait a bit and check progress has increased
    await page.waitForTimeout(600);

    const laterWidth = await page.evaluate(() => {
      const fill = document.querySelector('#load-screen .cnc-load-bar-fill') as HTMLElement;
      return fill?.style.width ?? 'unknown';
    });

    // Should be greater than 0%
    const numericWidth = parseFloat(laterWidth);
    expect(numericWidth).toBeGreaterThan(0);
  });
});
