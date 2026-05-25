import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 95: YAML rule parsing infrastructure', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-95.1: LightTank definition loaded from YAML matches built-in values', async ({ page }) => {
    const def = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const units = w.UNIT_DEFINITIONS as Record<string, Record<string, unknown>>;
      return units.LightTank;
    });

    expect(def).toBeDefined();
    expect(def.id).toBe('UNIT_LTANK');
    expect(def.name).toBe('Light Tank');
    expect(def.strength).toBe(300);
    expect(def.sight).toBe(5);
    expect(def.speed).toBe(7);
    expect(def.locomotion).toBe(1); // Locomotion.Track
    expect(def.cost).toBe(700);
    expect(def.techLevel).toBe(2);
    expect(def.armor).toBe(3); // ArmorType.Steel
    expect(def.range).toBe(4.75);
    expect(def.mzone).toBe(1); // MovementZone.Crusher
    expect(def.hasTurret).toBe(true);
    expect(def.isSelfHealing).toBe(false);
    expect(def.isCloakable).toBe(false);
    expect(def.isCrusher).toBe(true);
    expect(def.isScanner).toBe(false);
    expect(def.rotationSpeed).toBe(0.12);
  });

  test('task-95.2: Inheritance from ^Vehicle template resolved correctly', async ({ page }) => {
    const def = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const units = w.UNIT_DEFINITIONS as Record<string, Record<string, unknown>>;
      return units.LightTank;
    });

    // These fields come from ^Vehicle in defaults.yaml via Inherits
    expect(def.armor).toBe(3); // ArmorType.Steel
    expect(def.isSelfHealing).toBe(false);
    expect(def.isCloakable).toBe(false);
    expect(def.isScanner).toBe(false);

    // These fields come directly from units.yaml
    expect(def.strength).toBe(300);
    expect(def.speed).toBe(7);
    expect(def.isCrusher).toBe(true);
  });

  test('task-95.3: All built-in unit definitions remain accessible after YAML load', async ({ page }) => {
    const keys = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const units = w.UNIT_DEFINITIONS as Record<string, unknown>;
      return Object.keys(units);
    });

    // YAML only overrides LightTank; all other units must still exist via built-in fallback
    const expected = [
      'LightTank',
      'MediumTank',
      'HeavyTank',
      'MammothTank',
      'Harvester',
      'MCV',
      'Jeep',
      'APC',
      'Artillery',
      'V2Rocket',
      'RifleInfantry',
      'Grenadier',
      'RocketSoldier',
      'Flamethrower',
      'Engineer',
      'Tanya',
      'Spy',
      'Medic',
      'AttackDog',
    ];

    for (const name of expected) {
      expect(keys).toContain(name);
    }
  });

  test('task-95.4: GameRules object is exposed and contains expected defaults', async ({ page }) => {
    const rules = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      return w.GameRules as Record<string, unknown>;
    });

    expect(rules).toBeDefined();
    expect(rules.mpDefaultMoney).toBe(3000);
    expect(rules.soloCrateMoney).toBe(2000);
    expect(rules.buildupTime).toBe(0.05);
  });
});
