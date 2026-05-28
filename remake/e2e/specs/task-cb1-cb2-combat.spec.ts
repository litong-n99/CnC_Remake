import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-CB1/CB2: 武器装填 + 目标选择', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('ReloadState tracks reload progress', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ReloadState = (window as unknown as Record<string, unknown>)._ReloadState as new () => {
        startReload: (delay: number) => void;
        tick: () => boolean;
        isReady: () => boolean;
        isReloading: () => boolean;
        getProgressRatio: () => number;
      };

      const rs = new ReloadState();
      rs.startReload(5);

      const states: { ready: boolean; reloading: boolean; ratio: number; completed: boolean }[] = [];
      for (let i = 0; i < 7; i++) {
        states.push({
          ready: rs.isReady(),
          reloading: rs.isReloading(),
          ratio: Math.round(rs.getProgressRatio() * 100) / 100,
          completed: rs.tick(),
        });
      }

      return { states };
    });

    // Tick 0: just started, not ready
    expect(result.states[0].ready).toBe(false);
    expect(result.states[0].reloading).toBe(true);
    expect(result.states[0].ratio).toBe(0);

    // Tick 4 (index 4): completes on this tick (0→1→2→3→4→5)
    expect(result.states[4].completed).toBe(true);
    expect(result.states[4].ready).toBe(false); // ready checked before tick

    // Tick 5 (index 5): now ready
    expect(result.states[5].ready).toBe(true);
    expect(result.states[5].completed).toBe(false); // no state change

    // Tick 6 (index 6): still ready
    expect(result.states[6].ready).toBe(true);
  });

  test('ReloadState instantReady bypasses reload', async ({ page }) => {
    const result = await page.evaluate(() => {
      const ReloadState = (window as unknown as Record<string, unknown>)._ReloadState as new () => {
        startReload: (delay: number) => void;
        instantReady: () => void;
        isReady: () => boolean;
      };

      const rs = new ReloadState();
      rs.startReload(100);
      rs.instantReady();

      return { ready: rs.isReady() };
    });

    expect(result.ready).toBe(true);
  });

  test('TargetScanner selects attacking enemy first', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TargetScanner = (window as unknown as Record<string, unknown>)._TargetScanner as new (opts: {
        range: number;
      }) => {
        scan: (myX: number, myY: number, candidates: unknown[]) => { id: string } | null;
      };

      const scanner = new TargetScanner({ range: 10 });

      const candidates = [
        { id: 'far', x: 20, y: 20, isEnemy: true, threatValue: 50, isAttackingMe: false },
        { id: 'near', x: 3, y: 3, isEnemy: true, threatValue: 10, isAttackingMe: false },
        { id: 'attacker', x: 5, y: 5, isEnemy: true, threatValue: 10, isAttackingMe: true },
        { id: 'friendly', x: 2, y: 2, isEnemy: false, threatValue: 50, isAttackingMe: false },
      ];

      const target = scanner.scan(0, 0, candidates);

      return { targetId: target?.id ?? null };
    });

    expect(result.targetId).toBe('attacker');
  });

  test('TargetScanner respects range and cooldown', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TargetScanner = (window as unknown as Record<string, unknown>)._TargetScanner as new (opts: {
        range: number;
        scanInterval: number;
      }) => {
        scan: (myX: number, myY: number, candidates: unknown[]) => { id: string } | null;
      };

      const scanner = new TargetScanner({ range: 5, scanInterval: 3 });

      const candidates = [
        { id: 'in-range', x: 3, y: 3, isEnemy: true, threatValue: 10, isAttackingMe: false },
        { id: 'out-range', x: 10, y: 10, isEnemy: true, threatValue: 10, isAttackingMe: false },
      ];

      const t1 = scanner.scan(0, 0, candidates);
      const t2 = scanner.scan(0, 0, candidates); // should return same (cooldown)
      const t3 = scanner.scan(0, 0, candidates); // should return same (cooldown)
      const t4 = scanner.scan(0, 0, candidates); // cooldown expired, rescan

      return {
        t1: t1?.id,
        t2: t2?.id,
        t3: t3?.id,
        t4: t4?.id,
      };
    });

    expect(result.t1).toBe('in-range');
    expect(result.t2).toBe('in-range'); // cached
    expect(result.t3).toBe('in-range'); // cached
    expect(result.t4).toBe('in-range'); // rescanned
  });
});
