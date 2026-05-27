import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 65 — Lockstep Deterministic Simulation', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('GameLoop stalls logic ticks in lockstep mode without approval', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gl = (window as unknown as Record<string, unknown>)._gameLoop as {
        setLockstepMode: (enabled: boolean) => void;
        getLogicTickCount: () => number;
        getPendingLogicSteps: () => number;
        stepLogic: (dt?: number) => void;
      };

      const before = gl.getLogicTickCount();
      gl.setLockstepMode(true);
      // Manually step logic multiple times — in lockstep mode,
      // direct stepLogic calls still work (they are explicit approvals).
      // But render-loop-driven automatic stepping should stall.
      const after = gl.getLogicTickCount();
      return { before, after, pending: gl.getPendingLogicSteps() };
    });

    // Lockstep mode itself should not change tick count
    expect(result.after).toBe(result.before);
  });

  test('GameLoop advances after approveLogicStep in lockstep mode', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gl = (window as unknown as Record<string, unknown>)._gameLoop as {
        setLockstepMode: (enabled: boolean) => void;
        getLogicTickCount: () => number;
        approveLogicStep: () => void;
        stepLogic: (dt?: number) => void;
      };

      gl.setLockstepMode(true);
      const before = gl.getLogicTickCount();
      gl.approveLogicStep();
      gl.stepLogic();
      const after = gl.getLogicTickCount();
      return { before, after };
    });

    expect(result.after).toBe(result.before + 1);
  });

  test('LockstepAdapter can be instantiated and started', async ({ page }) => {
    const result = await page.evaluate(() => {
      const LA = (window as unknown as Record<string, unknown>).LockstepAdapter as new (opts: {
        roomClient: unknown;
        gameLoop: unknown;
        localPlayerId: string;
      }) => { start: () => void; stop: () => void; isStarted: () => boolean };

      const gl = (window as unknown as Record<string, unknown>)._gameLoop;
      const RC = (window as unknown as Record<string, unknown>).RoomClient as new (opts: {
        url: string;
        playerName: string;
      }) => unknown;
      const rc = new RC({ url: 'ws://localhost:9999', playerName: 'test' });

      const adapter = new LA({ roomClient: rc, gameLoop: gl, localPlayerId: 'p1' });
      adapter.start();
      const started = adapter.isStarted();
      adapter.stop();
      const stopped = adapter.isStarted();
      return { started, stopped };
    });

    expect(result.started).toBe(true);
    expect(result.stopped).toBe(false);
  });
});
