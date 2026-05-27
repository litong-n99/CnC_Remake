import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 27.6 — Bot Type Support', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('BotRegistry has three bot types registered', async ({ page }) => {
    const result = await page.evaluate(() => {
      const reg = (window as unknown as Record<string, unknown>)._BotRegistry as {
        getTypes: () => string[];
      };
      return { types: reg.getTypes() };
    });

    expect(result.types).toContain('bot-rush');
    expect(result.types).toContain('bot-normal');
    expect(result.types).toContain('bot-defensive');
  });

  test('GDI house has controller = human', async ({ page }) => {
    const result = await page.evaluate(() => {
      const hm = (window as unknown as Record<string, unknown>)._houseManager as {
        getHouse: (type: number) => { controller: string } | undefined;
      };
      const gdi = hm.getHouse(8); // HouseType.GDI
      return { controller: gdi?.controller };
    });

    expect(result.controller).toBe('human');
  });

  test('creating a bot house sets controller correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager as {
        getInstance: () => {
          createHouse: (type: number, opts: Record<string, unknown>) => { controller: string; id: number };
        };
      };
      const hm = HM.getInstance();
      // Create a new bot house (use a neutral slot)
      const botHouse = hm.createHouse(12, {
        // HouseType.Neutral
        controller: 'bot-rush',
        credits: 5000,
      });
      return {
        controller: botHouse.controller,
      };
    });

    expect(result.controller).toBe('bot-rush');
  });

  test('BotRegistry.create returns null for unknown type', async ({ page }) => {
    const result = await page.evaluate(() => {
      const reg = (window as unknown as Record<string, unknown>)._BotRegistry as {
        create: (type: string) => unknown;
      };
      return { bot: reg.create('unknown-bot') };
    });

    expect(result.bot).toBeNull();
  });
});
