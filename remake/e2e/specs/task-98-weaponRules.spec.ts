import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 98 — Weapon Rules System', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('WeaponDefinitions contain expected weapons', async ({ page }) => {
    const result = await page.evaluate(() => {
      const defs = (window as unknown as Record<string, unknown>)._WeaponDefinitions as Record<string, unknown>;
      return {
        has105mm: '105mm' in defs,
        has90mm: '90mm' in defs,
        has120mm: '120mm' in defs,
        hasMammothTusk: 'MammothTusk' in defs,
        hasDragon: 'Dragon' in defs,
        hasGrenade: 'Grenade' in defs,
        hasFlamethrower: 'Flamethrower' in defs,
        hasM1Carbine: 'M1Carbine' in defs,
        hasColt45: 'Colt45' in defs,
        hasV2Rocket: 'V2Rocket' in defs,
        has155mm: '155mm' in defs,
      };
    });

    expect(result.has105mm).toBe(true);
    expect(result.has90mm).toBe(true);
    expect(result.has120mm).toBe(true);
    expect(result.hasMammothTusk).toBe(true);
    expect(result.hasDragon).toBe(true);
    expect(result.hasGrenade).toBe(true);
    expect(result.hasFlamethrower).toBe(true);
    expect(result.hasM1Carbine).toBe(true);
    expect(result.hasColt45).toBe(true);
    expect(result.hasV2Rocket).toBe(true);
    expect(result.has155mm).toBe(true);
  });

  test('getWeaponInfo returns correct weapon data', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getWeapon = (window as unknown as Record<string, unknown>)._getWeaponInfo as (name: string) =>
        | {
            name: string;
            range: number;
            burst: number;
            reloadDelay: number;
            projectile: { type: string; speed: number; inaccuracy: number };
            warhead: { damage: number; spread: number; verses: Record<string, number> };
          }
        | undefined;

      const w = getWeapon('105mm');
      return {
        exists: w !== undefined,
        name: w?.name,
        range: w?.range,
        burst: w?.burst,
        reloadDelay: w?.reloadDelay,
        projectileType: w?.projectile.type,
        projectileSpeed: w?.projectile.speed,
        warheadDamage: w?.warhead.damage,
        warheadSpread: w?.warhead.spread,
        vsSteel: w?.warhead.verses.Steel,
      };
    });

    expect(result.exists).toBe(true);
    expect(result.name).toBe('105mm');
    expect(result.range).toBe(4.75);
    expect(result.burst).toBe(1);
    expect(result.reloadDelay).toBe(50);
    expect(result.projectileType).toBe('Bullet');
    expect(result.projectileSpeed).toBe(8);
    expect(result.warheadDamage).toBe(25);
    expect(result.warheadSpread).toBe(0.5);
    expect(result.vsSteel).toBe(100);
  });

  test('canTarget respects validTargets and invalidTargets', async ({ page }) => {
    const result = await page.evaluate(() => {
      const canTarget = (window as unknown as Record<string, unknown>)._canTarget as (
        weapon: { validTargets: string[]; invalidTargets: string[] },
        targetType: string
      ) => boolean;
      const TargetType = (window as unknown as Record<string, unknown>)._TargetType as Record<string, string>;

      const groundWeapon = {
        validTargets: [TargetType.Ground],
        invalidTargets: [TargetType.Air],
      };
      const airWeapon = {
        validTargets: [TargetType.Ground, TargetType.Air, TargetType.Water],
        invalidTargets: [],
      };

      return {
        groundCanHitGround: canTarget(groundWeapon, TargetType.Ground),
        groundCanHitAir: canTarget(groundWeapon, TargetType.Air),
        groundCanHitWater: canTarget(groundWeapon, TargetType.Water),
        airCanHitAir: canTarget(airWeapon, TargetType.Air),
        airCanHitGround: canTarget(airWeapon, TargetType.Ground),
      };
    });

    expect(result.groundCanHitGround).toBe(true);
    expect(result.groundCanHitAir).toBe(false);
    expect(result.groundCanHitWater).toBe(false);
    expect(result.airCanHitAir).toBe(true);
    expect(result.airCanHitGround).toBe(true);
  });

  test('computeDamage applies versus and falloff', async ({ page }) => {
    const result = await page.evaluate(() => {
      const compute = (window as unknown as Record<string, unknown>)._computeDamage as (
        baseDamage: number,
        versus: number,
        distanceRatio?: number
      ) => number;

      return {
        full: compute(100, 100, 0),
        halfVersus: compute(100, 50, 0),
        edge: compute(100, 100, 1),
        edgeHalfVersus: compute(100, 50, 1),
        minimum: compute(1, 1, 0),
      };
    });

    expect(result.full).toBe(100);
    expect(result.halfVersus).toBe(50);
    expect(result.edge).toBe(50);
    expect(result.edgeHalfVersus).toBe(25);
    expect(result.minimum).toBe(1);
  });

  test('missile weapons have turnRate', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getWeapon = (window as unknown as Record<string, unknown>)._getWeaponInfo as (
        name: string
      ) => { projectile: { type: string; turnRate?: number } } | undefined;

      const missile = getWeapon('Dragon');
      const bullet = getWeapon('105mm');

      return {
        missileHasTurnRate: missile?.projectile.turnRate !== undefined,
        missileTurnRate: missile?.projectile.turnRate,
        bulletHasTurnRate: bullet?.projectile.turnRate !== undefined,
      };
    });

    expect(result.missileHasTurnRate).toBe(true);
    expect(result.missileTurnRate).toBe(0.15);
    expect(result.bulletHasTurnRate).toBe(false);
  });

  test('burst weapons have burstDelays', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getWeapon = (window as unknown as Record<string, unknown>)._getWeaponInfo as (
        name: string
      ) => { burst: number; burstDelays?: number } | undefined;

      const colt = getWeapon('Colt45');
      const m1 = getWeapon('M1Carbine');

      return {
        coltBurst: colt?.burst,
        coltDelay: colt?.burstDelays,
        m1Burst: m1?.burst,
        m1Delay: m1?.burstDelays,
      };
    });

    expect(result.coltBurst).toBe(2);
    expect(result.coltDelay).toBe(5);
    expect(result.m1Burst).toBe(1);
    expect(result.m1Delay).toBeUndefined();
  });

  test('UnitDefinition backward compatibility: range still exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      const GOM = (window as unknown as Record<string, unknown>)._goManager as {
        getUnits: () => { definition: { primaryWeapon?: string; range: number } }[];
      };
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (...args: unknown[]) => unknown>;

      cnc.clear();
      cnc.unit('MediumTank', 'gdi', 30, 30);
      const units = GOM.getUnits();
      const tank = units[0];

      return {
        legacyRange: tank.definition.range,
      };
    });

    // legacyRange 保持向后兼容，primaryWeapon 为可选字段
    expect(result.legacyRange).toBeGreaterThan(0);
  });
});
