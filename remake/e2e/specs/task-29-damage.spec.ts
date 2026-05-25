import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 29: Damage Calculator and Armor System', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
    await gp.clear();
  });

  test('task-29.1: AP warhead deals more damage to Steel than to None armor', async ({ page }) => {
    // Spawn AP attacker (MediumTank) and two targets
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('MediumTank', 'gdi', 30, 30); // AP weapon, 40 dmg
      cnc.unit?.('MediumTank', 'nod', 31, 30); // Steel armor, 400 HP
      cnc.unit?.('RifleInfantry', 'nod', 33, 30); // None armor, 50 HP
    });
    await page.waitForTimeout(300);

    const ids = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string; definitionId: string; health: number }>;
      };
      const units = goManager.getUnits();
      const attacker = units.find((u) => u.definitionId === 'UNIT_MTANK2');
      const tankTarget = units.find((u) => u.definitionId === 'UNIT_MTANK2' && u.id !== attacker?.id);
      const infantryTarget = units.find((u) => u.definitionId === 'INFANTRY_E1');
      return {
        attacker: attacker?.id,
        tankTarget: tankTarget?.id,
        infantryTarget: infantryTarget?.id,
        tankHpBefore: tankTarget?.health,
        infantryHpBefore: infantryTarget?.health,
      };
    });
    expect(ids.attacker).toBeDefined();
    expect(ids.tankTarget).toBeDefined();
    expect(ids.infantryTarget).toBeDefined();

    // Attack Steel target (tank)
    await page.evaluate(({ attacker }) => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.attack?.(attacker, 31, 30);
    }, ids);
    await page.waitForTimeout(800);

    const tankHpAfter = await page.evaluate(({ tankTarget }) => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        get: (id: string) => { health: number } | undefined;
      };
      return goManager.get(tankTarget)?.health;
    }, ids);

    // Attack None target (infantry)
    await page.evaluate(({ attacker }) => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.attack?.(attacker, 33, 30);
    }, ids);
    await page.waitForTimeout(800);

    const infantryHpAfter = await page.evaluate(({ infantryTarget }) => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        get: (id: string) => { health: number } | undefined;
      };
      return goManager.get(infantryTarget)?.health;
    }, ids);

    const tankDamage = (ids.tankHpBefore ?? 0) - (tankHpAfter ?? 0);
    const infantryDamage = (ids.infantryHpBefore ?? 0) - (infantryHpAfter ?? 0);

    // AP vs Steel (115%) should deal more damage than AP vs None (30%)
    expect(tankDamage).toBeGreaterThan(infantryDamage);
    // Approximate: 40 * 1.15 = 46, 40 * 0.30 = 12
    expect(tankDamage).toBeGreaterThanOrEqual(40);
    expect(infantryDamage).toBeLessThanOrEqual(20);
  });

  test('task-29.2: SA warhead deals more damage to None than to Steel armor', async ({ page }) => {
    // Spawn SA attacker (RifleInfantry) and two targets
    await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.unit?.('RifleInfantry', 'gdi', 30, 30); // SA weapon, 15 dmg
      cnc.unit?.('RifleInfantry', 'nod', 31, 30); // None armor, 50 HP
      cnc.unit?.('MediumTank', 'nod', 33, 30); // Steel armor, 400 HP
    });
    await page.waitForTimeout(300);

    const ids = await page.evaluate(() => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => Array<{ id: string; definitionId: string; health: number }>;
      };
      const units = goManager.getUnits();
      const attacker = units.find((u) => u.definitionId === 'INFANTRY_E1');
      const infantryTarget = units.find((u) => u.definitionId === 'INFANTRY_E1' && u.id !== attacker?.id);
      const tankTarget = units.find((u) => u.definitionId === 'UNIT_MTANK2');
      return {
        attacker: attacker?.id,
        infantryTarget: infantryTarget?.id,
        tankTarget: tankTarget?.id,
        infantryHpBefore: infantryTarget?.health,
        tankHpBefore: tankTarget?.health,
      };
    });
    expect(ids.attacker).toBeDefined();
    expect(ids.infantryTarget).toBeDefined();
    expect(ids.tankTarget).toBeDefined();

    // Attack None target (infantry)
    await page.evaluate(({ attacker }) => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.attack?.(attacker, 31, 30);
    }, ids);
    await page.waitForTimeout(800);

    const infantryHpAfter = await page.evaluate(({ infantryTarget }) => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        get: (id: string) => { health: number } | undefined;
      };
      return goManager.get(infantryTarget)?.health;
    }, ids);

    // Attack Steel target (tank)
    await page.evaluate(({ attacker }) => {
      const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
      cnc.attack?.(attacker, 33, 30);
    }, ids);
    await page.waitForTimeout(800);

    const tankHpAfter = await page.evaluate(({ tankTarget }) => {
      const goManager = (window as unknown as Record<string, unknown>)._goManager as {
        get: (id: string) => { health: number } | undefined;
      };
      return goManager.get(tankTarget)?.health;
    }, ids);

    const infantryDamage = (ids.infantryHpBefore ?? 0) - (infantryHpAfter ?? 0);
    const tankDamage = (ids.tankHpBefore ?? 0) - (tankHpAfter ?? 0);

    // SA vs None (120%) should deal more damage than SA vs Steel (28%)
    expect(infantryDamage).toBeGreaterThan(tankDamage);
    // Approximate: 15 * 1.20 = 18, 15 * 0.28 = 4.2
    expect(infantryDamage).toBeGreaterThanOrEqual(10);
    expect(tankDamage).toBeLessThanOrEqual(10);
  });

  test('task-29.3: DamageCalculator formula correctness', async ({ page }) => {
    const results = await page.evaluate(() => {
      const dc = (window as unknown as Record<string, unknown>).DamageCalculator as {
        calculateDamage: (
          rawDamage: number,
          warhead: string,
          armor: number,
          firepowerBias?: number,
          armorBias?: number,
          distanceCells?: number
        ) => number;
      };
      const wt = (window as unknown as Record<string, unknown>).WarheadType as Record<string, string>;
      const at = (window as unknown as Record<string, unknown>).ArmorType as Record<string, number>;

      return {
        // AP vs Steel = 40 * 1.15 = 46
        apVsSteel: dc.calculateDamage(40, wt.AP, at.Steel),
        // AP vs None = 40 * 0.30 = 12
        apVsNone: dc.calculateDamage(40, wt.AP, at.None),
        // SA vs None = 15 * 1.20 = 18
        saVsNone: dc.calculateDamage(15, wt.SA, at.None),
        // SA vs Steel = 15 * 0.28 = 4.2 ≈ 4
        saVsSteel: dc.calculateDamage(15, wt.SA, at.Steel),
        // HE vs Wood = 60 * 0.75 = 45
        heVsWood: dc.calculateDamage(60, wt.HE, at.Wood),
        // Fire vs Wood = 50 * 2.0 = 100
        fireVsWood: dc.calculateDamage(50, wt.Fire, at.Wood),
        // With armorBias = 0.5
        apVsSteelHalfArmor: dc.calculateDamage(40, wt.AP, at.Steel, 1.0, 0.5),
        // With firepowerBias = 2.0
        apVsSteelDoublePower: dc.calculateDamage(40, wt.AP, at.Steel, 2.0, 1.0),
        // Zero damage
        zeroDamage: dc.calculateDamage(0, wt.AP, at.Steel),
      };
    });

    expect(results.apVsSteel).toBe(46);
    expect(results.apVsNone).toBe(12);
    expect(results.saVsNone).toBe(18);
    expect(results.saVsSteel).toBe(4);
    expect(results.heVsWood).toBe(45);
    expect(results.fireVsWood).toBe(100);
    expect(results.apVsSteelHalfArmor).toBe(23); // 46 * 0.5 = 23
    expect(results.apVsSteelDoublePower).toBe(92); // 46 * 2 = 92
    expect(results.zeroDamage).toBe(0);
  });
});
