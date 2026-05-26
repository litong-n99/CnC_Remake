import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 93: 移动端触控适配
 *
 * 验收：TouchInputManager 可绑定/解绑，平台检测正确。
 * 注意：实际触控交互需在真实设备上验证，本测试验证 API 层可用性。
 */
test.describe('task-93 touch input', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('touchBind and touchUnbind succeed', async () => {
    const bindResult = await game.touchBind();
    expect(bindResult.error).toBeUndefined();
    expect(bindResult.bound).toBe(true);

    const unbindResult = await game.touchUnbind();
    expect(unbindResult.error).toBeUndefined();
    expect(unbindResult.unbound).toBe(true);
  });

  test('touchDevice detection returns boolean', async () => {
    const result = await game.touchDevice();
    expect(result.error).toBeUndefined();
    expect(typeof result.isTouchDevice).toBe('boolean');
  });

  test('touch pan moves camera target', async ({ page }) => {
    // Bind touch input
    await game.touchBind();

    // Get initial camera position
    const initial = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cam = (window as any)._rtsCamera;
      return cam ? cam.getTargetCoords() : null;
    });
    expect(initial).not.toBeNull();

    // Simulate a touch drag on the canvas
    const canvas = page.locator('canvas');
    await canvas.evaluate((el: HTMLCanvasElement) => {
      const rect = el.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      const endX = startX - 100;
      const endY = startY;

      const touchStart = new Touch({
        identifier: 1,
        target: el,
        clientX: startX,
        clientY: startY,
      });
      const touchMove = new Touch({
        identifier: 1,
        target: el,
        clientX: endX,
        clientY: endY,
      });

      el.dispatchEvent(
        new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart], bubbles: true })
      );
      el.dispatchEvent(
        new TouchEvent('touchmove', { touches: [touchMove], changedTouches: [touchMove], bubbles: true })
      );
      el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchMove], bubbles: true }));
    });

    // Camera should have moved (pan was applied)
    const after = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cam = (window as any)._rtsCamera;
      return cam ? cam.getTargetCoords() : null;
    });
    expect(after).not.toBeNull();

    // Touch pan moves camera in the direction of drag (with panSpeed 0.15, 100px = ~15 world units)
    // We just verify it changed
    const dx = Math.abs((after?.x as number) - (initial?.x as number));
    expect(dx).toBeGreaterThan(0);

    // Cleanup
    await game.touchUnbind();
  });

  test('TouchInputManager class is exposed', async ({ page }) => {
    const hasClass = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      return typeof w._TouchInputManager === 'function';
    });
    expect(hasClass).toBe(true);
  });
});
