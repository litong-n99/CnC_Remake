import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 92: 桌面应用打包（Electron / Tauri）
 *
 * 验收：平台检测正确，全屏 API 可调用。
 * 注意：实际桌面打包需额外 Electron/Tauri 工程，本测试仅验证适配层逻辑。
 */
test.describe('task-92 desktop adapter', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('detects browser platform in Playwright', async () => {
    const result = await game.desktopPlatform();
    expect(result.error).toBeUndefined();
    expect(result.platform).toBe('browser');
    expect(result.isDesktop).toBe(false);
  });

  test('fullscreen API returns success', async () => {
    const enter = await game.desktopFullscreen(true);
    expect(enter.error).toBeUndefined();
    expect(enter.success).toBe(true);

    const exit = await game.desktopFullscreen(false);
    expect(exit.error).toBeUndefined();
    expect(exit.success).toBe(true);
  });

  test('DesktopAdapter class is exposed', async ({ page }) => {
    const hasClass = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      return typeof w._DesktopAdapter === 'function' && typeof w._DesktopAdapter.getInstance === 'function';
    });
    expect(hasClass).toBe(true);
  });
});
