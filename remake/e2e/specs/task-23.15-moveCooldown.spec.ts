import { test, expect } from '@playwright/test';

/**
 * Task 23.15 — MoveCooldownHelper
 *
 * 验证 repath 冷却机制：
 * - cooldown 对象存在且可被查询
 * - 手动设置 cooldown 后，值正确
 * - 等待一段时间后 cooldown tick 减少
 * - 新 moveTo 命令重置 cooldown 为 0
 */

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:5173/CnC_Remake/');
  await page.waitForFunction(() => (window as unknown as Record<string, unknown>).cnc !== undefined, {
    timeout: 10000,
  });
  await page.evaluate(() => (window as unknown as Record<string, () => void>).cnc.clear());
});

test.describe('Task 23.15 — MoveCooldownHelper', () => {
  test('cooldown object exists and starts at 0', async ({ page }) => {
    const unit = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: unknown[]) => { id: string }>).cnc.unit(
        'MediumTank',
        'gdi',
        30,
        30
      )
    );

    const cooldown = await page.evaluate(
      (id) => (window as unknown as Record<string, (unitId: string) => number>).cnc.cooldown(id),
      unit.id
    );

    expect(cooldown).toBe(0);
  });

  test('setCooldown sets correct value', async ({ page }) => {
    const unit = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: unknown[]) => { id: string }>).cnc.unit(
        'MediumTank',
        'gdi',
        30,
        30
      )
    );

    await page.evaluate(
      (id) => (window as unknown as Record<string, (unitId: string, ms: number) => boolean>).cnc.setCooldown(id, 1000),
      unit.id
    );

    const cooldown = await page.evaluate(
      (id) => (window as unknown as Record<string, (unitId: string) => number>).cnc.cooldown(id),
      unit.id
    );

    expect(cooldown).toBe(1000);
  });

  test('cooldown ticks down over time', async ({ page }) => {
    const unit = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: unknown[]) => { id: string }>).cnc.unit(
        'MediumTank',
        'gdi',
        30,
        30
      )
    );

    // Order unit to move so isMoving=true and tick() is called
    await page.evaluate(
      (id) =>
        (window as unknown as Record<string, (unitId: string, x: number, y: number) => boolean>).cnc.moveUnit(
          id,
          35,
          30
        ),
      unit.id
    );

    // Set cooldown and read initial value in one evaluate to minimize timing drift
    const before = await page.evaluate((id) => {
      const cnc = (window as unknown as Record<string, Record<string, unknown>>).cnc;
      (cnc.setCooldown as (unitId: string, ms: number) => boolean)(id, 1000);
      return (cnc.cooldown as (unitId: string) => number)(id);
    }, unit.id);

    expect(before).toBe(1000);

    // Wait for engine tick to reduce cooldown (unit must be moving for tick() to run)
    await page.waitForTimeout(500);

    const after = await page.evaluate(
      (id) => (window as unknown as Record<string, (unitId: string) => number>).cnc.cooldown(id),
      unit.id
    );

    // Cooldown should have decreased (allow wide tolerance for varying frame rates)
    expect(after).toBeLessThan(950);
    expect(after).toBeGreaterThanOrEqual(0);
  });

  test('moveTo resets cooldown', async ({ page }) => {
    const unit = await page.evaluate(() =>
      (window as unknown as Record<string, (...args: unknown[]) => { id: string }>).cnc.unit(
        'MediumTank',
        'gdi',
        30,
        30
      )
    );

    await page.evaluate(
      (id) => (window as unknown as Record<string, (unitId: string, ms: number) => boolean>).cnc.setCooldown(id, 1000),
      unit.id
    );

    const before = await page.evaluate(
      (id) => (window as unknown as Record<string, (unitId: string) => number>).cnc.cooldown(id),
      unit.id
    );
    expect(before).toBe(1000);

    // New moveTo command should reset cooldown
    await page.evaluate(
      (id) =>
        (window as unknown as Record<string, (unitId: string, x: number, y: number) => boolean>).cnc.moveUnit(
          id,
          35,
          30
        ),
      unit.id
    );

    const after = await page.evaluate(
      (id) => (window as unknown as Record<string, (unitId: string) => number>).cnc.cooldown(id),
      unit.id
    );
    expect(after).toBe(0);
  });
});
