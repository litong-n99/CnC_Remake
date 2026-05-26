import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 84: Super Weapons', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-84.1: SupportPower charges and becomes ready', async ({ page }) => {
    const chargeTime = await page.evaluate(() => {
      const Mgr = (window as unknown as Record<string, unknown>)._SupportPowerManager as new () => {
        addPower: (id: string, type: string) => { config: { chargeTime: number } };
      };
      const mgr = new Mgr();
      const power = mgr.addPower('nuke-1', 'Nuke');
      return power.config.chargeTime;
    });

    const beforeReady = await page.evaluate(() => {
      const Mgr = (window as unknown as Record<string, unknown>)._SupportPowerManager as new () => {
        getPower: (id: string) => { isReady: boolean } | undefined;
      };
      const mgr = new Mgr();
      mgr.addPower('nuke-1', 'Nuke');
      return mgr.getPower('nuke-1')!.isReady;
    });

    const midReady = await page.evaluate((dt) => {
      const Mgr = (window as unknown as Record<string, unknown>)._SupportPowerManager as new () => {
        addPower: (id: string, type: string) => void;
        tick: (dt: number) => void;
        getPower: (id: string) => { isReady: boolean } | undefined;
      };
      const mgr = new Mgr();
      mgr.addPower('nuke-1', 'Nuke');
      mgr.tick(dt);
      return mgr.getPower('nuke-1')!.isReady;
    }, chargeTime / 2);

    const afterReady = await page.evaluate((dt) => {
      const Mgr = (window as unknown as Record<string, unknown>)._SupportPowerManager as new () => {
        addPower: (id: string, type: string) => void;
        tick: (dt: number) => void;
        getPower: (id: string) => { isReady: boolean } | undefined;
      };
      const mgr = new Mgr();
      mgr.addPower('nuke-1', 'Nuke');
      mgr.tick(dt);
      return mgr.getPower('nuke-1')!.isReady;
    }, chargeTime + 1);

    expect(beforeReady).toBe(false);
    expect(midReady).toBe(false);
    expect(afterReady).toBe(true);
    expect(chargeTime).toBe(600);
  });

  test('task-84.2: firePower sets target and returns success only when ready', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Mgr = (window as unknown as Record<string, unknown>)._SupportPowerManager as new () => {
        addPower: (id: string, type: string) => void;
        tick: (dt: number) => void;
        firePower: (id: string, x: number, y: number) => boolean;
        getPower: (id: string) => { isFired: boolean; targetCell?: { x: number; y: number } } | undefined;
      };
      const mgr = new Mgr();
      mgr.addPower('ion-1', 'IonCannon');
      const fireBeforeReady = mgr.firePower('ion-1', 30, 30);
      mgr.tick(601);
      const fireAfterReady = mgr.firePower('ion-1', 30, 30);
      const power = mgr.getPower('ion-1')!;
      return { fireBeforeReady, fireAfterReady, isFired: power.isFired, targetX: power.targetCell?.x };
    });

    expect(result.fireBeforeReady).toBe(false);
    expect(result.fireAfterReady).toBe(true);
    expect(result.isFired).toBe(true);
    expect(result.targetX).toBe(30);
  });
});
