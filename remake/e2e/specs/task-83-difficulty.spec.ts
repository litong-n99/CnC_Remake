import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 83: AI Difficulty', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-83.1: DifficultyScaler applies correct multipliers', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Scaler = (window as unknown as Record<string, unknown>)._DifficultyScaler as new (level: string) => {
        getModifiedDamage: (base: number, isEnemy: boolean) => number;
        getModifiedArmor: (base: number, isEnemy: boolean) => number;
        getModifiedBuildTime: (base: number) => number;
        getDisplayName: () => string;
      };

      const easy = new Scaler('easy');
      const hard = new Scaler('hard');

      return {
        easyName: easy.getDisplayName(),
        hardName: hard.getDisplayName(),
        easyDmg: easy.getModifiedDamage(100, true),
        hardDmg: hard.getModifiedDamage(100, true),
        playerDmg: easy.getModifiedDamage(100, false),
        easyArmor: easy.getModifiedArmor(100, true),
        hardArmor: hard.getModifiedArmor(100, true),
        easyBuild: easy.getModifiedBuildTime(1000),
      };
    });

    expect(result.easyName).toBe('Easy');
    expect(result.hardName).toBe('Hard');
    expect(result.playerDmg).toBe(100); // 玩家不受敌方倍率影响
    expect(result.hardDmg).toBe(100); // hard firepowerBias = 1
    expect(result.hardArmor).toBe(150); // hard armourBias = 1.5
    expect(result.easyBuild).toBe(1000);
  });
});
