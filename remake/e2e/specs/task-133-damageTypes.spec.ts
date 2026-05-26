import { test, expect } from '@playwright/test';

test.describe('Task 133 — DamageTypes Tag System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('task-133.1: DamageType enum exists with expected values', async ({ page }) => {
    const result = await page.evaluate(() => {
      const DT = (window as unknown as Record<string, unknown>)._DamageType;
      if (!DT) return { ok: false, reason: '_DamageType not exposed' };
      return {
        ok:
          DT.Prone50Percent === 'Prone50Percent' &&
          DT.TriggerProne === 'TriggerProne' &&
          DT.FireDeath === 'FireDeath' &&
          DT.ExplosionDeath === 'ExplosionDeath' &&
          DT.ElectroDeath === 'ElectroDeath',
        values: {
          Prone50Percent: DT.Prone50Percent,
          FireDeath: DT.FireDeath,
          ExplosionDeath: DT.ExplosionDeath,
        },
      };
    });
    expect(result.ok).toBe(true);
  });

  test('task-133.2: Rifle (Prone50Percent) damage is halved for infantry and triggers prone', async ({ page }) => {
    const result = await page.evaluate(() => {
      const DC = (window as unknown as Record<string, unknown>).DamageCalculator;
      const AT = (window as unknown as Record<string, unknown>).ArmorType;
      const DT = (window as unknown as Record<string, unknown>)._DamageType;
      const WT = (window as unknown as Record<string, unknown>).WarheadType;

      // 步枪伤害 15，对 None 装甲 SA 弹头 verses=120%
      // 基础伤害 = 15 * 1.2 = 18
      // 带 Prone50Percent = 18 * 0.5 = 9
      const withProne = DC.calculate(
        {
          rawDamage: 15,
          warhead: WT.SA,
          damageTypes: [DT.Prone50Percent],
          isInfantry: true,
        },
        AT.None
      );

      // 不带 Prone50Percent
      const withoutProne = DC.calculate(
        {
          rawDamage: 15,
          warhead: WT.SA,
          damageTypes: [],
          isInfantry: true,
        },
        AT.None
      );

      return {
        withProneDamage: withProne.actualDamage,
        withProneTriggered: withProne.triggeredProne,
        withoutProneDamage: withoutProne.actualDamage,
        withoutProneTriggered: withoutProne.triggeredProne,
      };
    });

    // 15 * 1.2 = 18 → 带 Prone50Percent 减半 = 9
    expect(result.withProneDamage).toBe(9);
    expect(result.withProneTriggered).toBe(true);
    expect(result.withoutProneDamage).toBe(18);
    expect(result.withoutProneTriggered).toBe(false);
  });

  test('task-133.3: Prone50Percent does not affect non-infantry', async ({ page }) => {
    const result = await page.evaluate(() => {
      const DC = (window as unknown as Record<string, unknown>).DamageCalculator;
      const AT = (window as unknown as Record<string, unknown>).ArmorType;
      const DT = (window as unknown as Record<string, unknown>)._DamageType;
      const WT = (window as unknown as Record<string, unknown>).WarheadType;

      const res = DC.calculate(
        {
          rawDamage: 15,
          warhead: WT.SA,
          damageTypes: [DT.Prone50Percent],
          isInfantry: false,
        },
        AT.Steel
      );

      return {
        damage: res.actualDamage,
        triggered: res.triggeredProne,
      };
    });

    // 非步兵不受 Prone50Percent 影响，伤害不减半
    expect(result.damage).toBeGreaterThan(0);
    expect(result.triggered).toBe(false);
  });

  test('task-133.4: FireDeath sets deathType on DamageResult', async ({ page }) => {
    const result = await page.evaluate(() => {
      const DC = (window as unknown as Record<string, unknown>).DamageCalculator;
      const AT = (window as unknown as Record<string, unknown>).ArmorType;
      const DT = (window as unknown as Record<string, unknown>)._DamageType;
      const WT = (window as unknown as Record<string, unknown>).WarheadType;

      const res = DC.calculate(
        {
          rawDamage: 25,
          warhead: WT.Fire,
          damageTypes: [DT.FireDeath],
          isInfantry: true,
        },
        AT.None
      );

      return {
        deathType: res.deathType,
        damage: res.actualDamage,
      };
    });

    expect(result.deathType).toBe('FireDeath');
    expect(result.damage).toBeGreaterThan(0);
  });

  test('task-133.5: ExplosionDeath and ElectroDeath are resolved correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const DC = (window as unknown as Record<string, unknown>).DamageCalculator;
      const AT = (window as unknown as Record<string, unknown>).ArmorType;
      const DT = (window as unknown as Record<string, unknown>)._DamageType;
      const WT = (window as unknown as Record<string, unknown>).WarheadType;

      const explosion = DC.calculate(
        {
          rawDamage: 60,
          warhead: WT.HE,
          damageTypes: [DT.ExplosionDeath],
          isInfantry: false,
        },
        AT.Steel
      );

      const electro = DC.calculate(
        {
          rawDamage: 100,
          warhead: WT.Tesla,
          damageTypes: [DT.ElectroDeath],
          isInfantry: true,
        },
        AT.None
      );

      return {
        explosionDeathType: explosion.deathType,
        electroDeathType: electro.deathType,
      };
    });

    expect(result.explosionDeathType).toBe('ExplosionDeath');
    expect(result.electroDeathType).toBe('ElectroDeath');
  });

  test('task-133.6: Weapon definitions include damageTypes', async ({ page }) => {
    const result = await page.evaluate(() => {
      const WD = (window as unknown as Record<string, unknown>).WEAPON_DEFINITIONS;
      return {
        rifleHasProne: WD.Rifle?.damageTypes?.includes('Prone50Percent') ?? false,
        cannonHasExplosion: WD.Cannon105mm?.damageTypes?.includes('ExplosionDeath') ?? false,
        rocketHasExplosion: WD.Rocket?.damageTypes?.includes('ExplosionDeath') ?? false,
        flamethrowerExists: !!WD.Flamethrower,
        flamethrowerHasFire: WD.Flamethrower?.damageTypes?.includes('FireDeath') ?? false,
        teslaExists: !!WD.TeslaZap,
        teslaHasElectro: WD.TeslaZap?.damageTypes?.includes('ElectroDeath') ?? false,
      };
    });

    expect(result.rifleHasProne).toBe(true);
    expect(result.cannonHasExplosion).toBe(true);
    expect(result.rocketHasExplosion).toBe(true);
    expect(result.flamethrowerExists).toBe(true);
    expect(result.flamethrowerHasFire).toBe(true);
    expect(result.teslaExists).toBe(true);
    expect(result.teslaHasElectro).toBe(true);
  });
});
