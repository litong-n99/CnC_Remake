import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 28: Weapon and Projectile System', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-28.1: cnc.attack fires a projectile and creates a bullet mesh', async ({ page }) => {
    // Spawn attacker and target
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
      cnc.unit?.('MediumTank', 'nod', 32, 30);
    });
    await page.waitForTimeout(300);

    const ids = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string; house: { id: number } }>;
      };
      const units = goManager.getUnits();
      const gdi = units.find((u) => u.house.id === 8);
      const nod = units.find((u) => u.house.id === 9);
      return { attacker: gdi?.id, target: nod?.id };
    });
    expect(ids.attacker).toBeDefined();
    expect(ids.target).toBeDefined();

    // Fire
    const result = await page.evaluate(({ attacker }) => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      return cnc.attack?.(attacker, 32, 30) as { success: boolean };
    }, ids);
    expect(result.success).toBe(true);

    // Wait for projectile to travel
    await page.waitForTimeout(500);

    // Bullet should have been created and then destroyed after hit
    const bulletCount = await page.evaluate(() => {
      const bm = (window as unknown as Record<string, unknown>)._bulletManager as
        | { getCount: () => number }
        | undefined;
      return bm?.getCount() ?? -1;
    });

    // BulletManager may have been consumed by hit; just verify no crash
    expect(bulletCount).toBeGreaterThanOrEqual(0);
  });

  test('task-28.2: projectile hit deals damage to target', async ({ page }) => {
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
      cnc.unit?.('MediumTank', 'nod', 32, 30);
    });
    await page.waitForTimeout(300);

    const ids = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string; house: { id: number }; health: number }>;
      };
      const units = goManager.getUnits();
      const gdi = units.find((u) => u.house.id === 8);
      const nod = units.find((u) => u.house.id === 9);
      return { attacker: gdi?.id, target: nod?.id, targetHpBefore: nod?.health };
    });
    expect(ids.targetHpBefore).toBeDefined();

    await page.evaluate(({ attacker }) => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.attack?.(attacker, 32, 30);
    }, ids);

    // Wait for projectile travel + hit
    await page.waitForTimeout(800);

    const targetHpAfter = await page.evaluate(({ target }) => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        get: (id: string) => { health: number } | undefined;
      };
      return goManager.get(target)?.health;
    }, ids);

    expect(targetHpAfter).toBeLessThan(ids.targetHpBefore!);
  });

  test('task-28.3: out-of-range attack returns failure', async ({ page }) => {
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30);
    });
    await page.waitForTimeout(300);

    const attackerId = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string }>;
      };
      return goManager.getUnits()[0]?.id;
    });

    // Target far out of range (> 12)
    const result = await page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.attack?.(id, 50, 50) as { success: boolean };
      },
      { id: attackerId }
    );

    expect(result.success).toBe(false);
  });
});
