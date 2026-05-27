import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 67 — Reconnect & Spectator', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('ReconnectHandler saves and retrieves checkpoints', async ({ page }) => {
    const result = await page.evaluate(() => {
      const RH = (window as unknown as Record<string, unknown>).ReconnectHandler as new () => {
        saveCheckpoint: (frame: number, state: unknown) => void;
        getLatestCheckpoint: (frame: number) => { frame: number; snapshot: string } | null;
        getCheckpointCount: () => number;
        clear: () => void;
      };

      const rh = new RH();
      rh.saveCheckpoint(100, { units: [{ id: 'u1', x: 10 }] });
      rh.saveCheckpoint(200, { units: [{ id: 'u1', x: 20 }] });
      rh.saveCheckpoint(300, { units: [{ id: 'u1', x: 30 }] });

      const cp = rh.getLatestCheckpoint(250);
      return {
        count: rh.getCheckpointCount(),
        cpFrame: cp?.frame,
        cpSnapshot: cp ? JSON.parse(cp.snapshot) : null,
      };
    });

    expect(result.count).toBe(3);
    expect(result.cpFrame).toBe(200);
    expect(result.cpSnapshot).toEqual({ units: [{ id: 'u1', x: 20 }] });
  });

  test('SpectatorManager adds and removes spectators', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SM = (window as unknown as Record<string, unknown>).SpectatorManager as new () => {
        addSpectator: (id: string, name: string, frame: number) => unknown;
        removeSpectator: (id: string) => boolean;
        getCount: () => number;
        getAllSpectators: () => Array<{ id: string; name: string }>;
      };

      const sm = new SM();
      sm.addSpectator('s1', 'Watcher1', 50);
      sm.addSpectator('s2', 'Watcher2', 60);
      const countBefore = sm.getCount();
      const removed = sm.removeSpectator('s1');
      const countAfter = sm.getCount();
      const names = sm.getAllSpectators().map((s) => s.name);
      return { countBefore, removed, countAfter, names };
    });

    expect(result.countBefore).toBe(2);
    expect(result.removed).toBe(true);
    expect(result.countAfter).toBe(1);
    expect(result.names).toEqual(['Watcher2']);
  });
});
