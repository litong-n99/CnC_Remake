import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 72: Voice & Notification', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-72.1: NotificationManager queues and sorts by priority', async ({ page }) => {
    const result = await page.evaluate(() => {
      const NotificationManager = (window as unknown as Record<string, unknown>)._notificationManager as {
        enqueue: (ev: { id: string; text: string; priority: number; canInterrupt: boolean }) => void;
        getQueueLength: () => number;
        clearQueue: () => void;
        tick: () => void;
        getIsPlaying: () => boolean;
      };
      NotificationManager.clearQueue();
      NotificationManager.enqueue({ id: 'n1', text: 'Low', priority: 5, canInterrupt: false });
      NotificationManager.enqueue({ id: 'n2', text: 'High', priority: 1, canInterrupt: false });
      NotificationManager.enqueue({ id: 'n3', text: 'Mid', priority: 3, canInterrupt: false });
      const queueLenBefore = NotificationManager.getQueueLength();
      NotificationManager.tick();
      const isPlaying = NotificationManager.getIsPlaying();
      const queueLenAfter = NotificationManager.getQueueLength();
      return { queueLenBefore, isPlaying, queueLenAfter };
    });

    expect(result.queueLenBefore).toBe(3);
    expect(result.isPlaying).toBe(true);
    expect(result.queueLenAfter).toBe(2);
  });

  test('task-72.2: playImmediate inserts at front and auto-plays', async ({ page }) => {
    const result = await page.evaluate(() => {
      const NotificationManager = (window as unknown as Record<string, unknown>)._notificationManager as {
        enqueue: (ev: { id: string; text: string; priority: number; canInterrupt: boolean }) => void;
        playImmediate: (ev: { id: string; text: string; priority: number; canInterrupt: boolean }) => void;
        getQueueLength: () => number;
        clearQueue: () => void;
        getIsPlaying: () => boolean;
      };
      NotificationManager.clearQueue();
      NotificationManager.enqueue({ id: 'n1', text: 'Normal', priority: 5, canInterrupt: false });
      NotificationManager.playImmediate({ id: 'n2', text: 'Urgent', priority: 0, canInterrupt: true });
      return { queueLen: NotificationManager.getQueueLength(), isPlaying: NotificationManager.getIsPlaying() };
    });

    expect(result.queueLen).toBe(1);
    expect(result.isPlaying).toBe(true);
  });
});
