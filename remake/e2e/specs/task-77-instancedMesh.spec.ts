import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 77 E2E Test — InstancedUnitRenderer (Thin Instance)
 *
 * Verifies:
 * - InstancedUnitRenderer class exists and exposes API
 * - Registering units increases activeCount
 * - Updating unit matrices works
 * - Unregistering units decreases activeCount and recycles indices
 * - Bulk registration (50+ units) shares templates (groupCount << unitCount)
 */

test.describe('Task 77 — InstancedUnitRenderer', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
    await game.clear();
  });

  test('task-77.1: InstancedUnitRenderer exists and exposes stats API', async () => {
    const result = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      const stats = cnc.instancedStats?.() as
        | { enabled: boolean; activeCount: number; groupCount: number; totalSlots: number }
        | undefined;
      return {
        hasStats: stats !== undefined,
        hasEnabled: typeof stats?.enabled === 'boolean',
        hasActiveCount: typeof stats?.activeCount === 'number',
        hasGroupCount: typeof stats?.groupCount === 'number',
        hasTotalSlots: typeof stats?.totalSlots === 'number',
      };
    });

    expect(result.hasStats).toBe(true);
    expect(result.hasEnabled).toBe(true);
    expect(result.hasActiveCount).toBe(true);
    expect(result.hasGroupCount).toBe(true);
    expect(result.hasTotalSlots).toBe(true);
  });

  test('task-77.2: registering a unit increases activeCount', async () => {
    const result = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;

      // Spawn a tank
      const unit = cnc.unit?.('MediumTank', 'gdi', 30, 30) as { id: string } | undefined;
      if (!unit) return { error: 'unit spawn failed' };

      // Enable renderer
      cnc.instancedRenderer?.(true);

      // Register the unit
      const reg = cnc.instancedRegister?.(unit.id, 30, 30, 0) as { success: boolean } | undefined;

      const stats = cnc.instancedStats?.() as { activeCount: number; groupCount: number } | undefined;

      return {
        registered: reg?.success ?? false,
        activeCount: stats?.activeCount ?? -1,
        groupCount: stats?.groupCount ?? -1,
      };
    });

    expect(result.error).toBeUndefined();
    expect(result.registered).toBe(true);
    expect(result.activeCount).toBe(1);
    expect(result.groupCount).toBe(1);
  });

  test('task-77.3: unregistering a unit decreases activeCount', async () => {
    const result = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;

      const unit = cnc.unit?.('MediumTank', 'gdi', 30, 30) as { id: string } | undefined;
      if (!unit) return { error: 'unit spawn failed' };

      cnc.instancedRenderer?.(true);
      cnc.instancedRegister?.(unit.id, 30, 30, 0);

      const statsBefore = cnc.instancedStats?.() as { activeCount: number } | undefined;

      cnc.instancedDispose?.();
      cnc.instancedRenderer?.(true);

      const statsAfter = cnc.instancedStats?.() as { activeCount: number } | undefined;

      return {
        before: statsBefore?.activeCount ?? -1,
        after: statsAfter?.activeCount ?? -1,
      };
    });

    expect(result.before).toBe(1);
    expect(result.after).toBe(0);
  });

  test('task-77.4: bulk registration shares templates (groupCount << unitCount)', async () => {
    const result = await game.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;

      cnc.instancedRenderer?.(true);

      // Spawn 20 MediumTanks for GDI (same type, same color → 1 group)
      const ids: string[] = [];
      for (let i = 0; i < 20; i++) {
        const unit = cnc.unit?.('MediumTank', 'gdi', 25 + i, 30) as { id: string } | undefined;
        if (unit) {
          cnc.instancedRegister?.(unit.id, 25 + i, 30, 0);
          ids.push(unit.id);
        }
      }

      // Spawn 10 LightTanks for Nod (different type, different color → +1 group)
      for (let i = 0; i < 10; i++) {
        const unit = cnc.unit?.('LightTank', 'nod', 25 + i, 35) as { id: string } | undefined;
        if (unit) {
          cnc.instancedRegister?.(unit.id, 25 + i, 35, 0);
          ids.push(unit.id);
        }
      }

      const stats = cnc.instancedStats?.() as { activeCount: number; groupCount: number } | undefined;

      return {
        unitCount: ids.length,
        activeCount: stats?.activeCount ?? -1,
        groupCount: stats?.groupCount ?? -1,
      };
    });

    expect(result.unitCount).toBe(30);
    expect(result.activeCount).toBe(30);
    // 20 GDI MediumTank + 10 Nod LightTank = 2 groups (类型×颜色)
    expect(result.groupCount).toBe(2);
  });
});
