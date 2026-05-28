import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-C1: 动态条件管理', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('Actor grants and tracks condition tokens', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        grantCondition: (name: string) => number;
        getConditionCount: (name: string) => number;
        hasCondition: (name: string) => boolean;
      };

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const actor = new Actor('cond-test', mockHouse, mockInfo);

      const token1 = actor.grantCondition('veteran');
      const token2 = actor.grantCondition('veteran');
      const token3 = actor.grantCondition('elite');

      return {
        token1,
        token2,
        token3,
        veteranCount: actor.getConditionCount('veteran'),
        eliteCount: actor.getConditionCount('elite'),
        hasVeteran: actor.hasCondition('veteran'),
        hasElite: actor.hasCondition('elite'),
        hasNone: actor.hasCondition('nonexistent'),
      };
    });

    expect(result.token1).not.toBe(result.token2); // unique tokens
    expect(result.veteranCount).toBe(2);
    expect(result.eliteCount).toBe(1);
    expect(result.hasVeteran).toBe(true);
    expect(result.hasElite).toBe(true);
    expect(result.hasNone).toBe(false);
  });

  test('Actor.getActiveConditions returns only active conditions', async ({ page }) => {
    const result = await page.evaluate(() => {
      const Actor = (window as unknown as Record<string, unknown>)._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        grantCondition: (name: string) => number;
        getActiveConditions: () => string[];
        setConditionCount: (name: string, count: number) => void;
      };

      const mockHouse = { id: 0, credits: 0 };
      const mockInfo = { name: 'Test', type: 0 };
      const actor = new Actor('active-cond-test', mockHouse, mockInfo);

      actor.grantCondition('power-down');
      actor.grantCondition('damaged');
      actor.setConditionCount('power-down', 0); // deactivate

      return { active: actor.getActiveConditions() };
    });

    expect(result.active).toEqual(['damaged']);
  });
});
