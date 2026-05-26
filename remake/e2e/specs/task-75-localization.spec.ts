import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 75: Localization (i18n)', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-75.1: t() returns English by default and supports language switch', async ({ page }) => {
    const result = await page.evaluate(() => {
      const loc = (window as unknown as Record<string, unknown>)._localization as {
        t: (key: string) => string;
        setLanguage: (lang: string) => void;
        getLanguage: () => string;
        getAvailableLanguages: () => string[];
      };
      const en = loc.t('menu.start');
      loc.setLanguage('zh');
      const zh = loc.t('menu.start');
      loc.setLanguage('en');
      return { en, zh, lang: loc.getLanguage(), available: loc.getAvailableLanguages() };
    });

    expect(result.en).toBe('Start Game');
    expect(result.zh).toBe('开始游戏');
    expect(result.lang).toBe('en');
    expect(result.available).toContain('en');
    expect(result.available).toContain('zh');
    expect(result.available).toContain('ja');
  });

  test('task-75.2: custom override works and fallback returns key if missing', async ({ page }) => {
    const overridden = await page.evaluate(() => {
      const loc = (window as unknown as Record<string, unknown>)._localization as {
        t: (key: string) => string;
        setOverride: (key: string, value: string) => void;
      };
      loc.setOverride('custom.key', 'Custom Value');
      return loc.t('custom.key');
    });

    const removed = await page.evaluate(() => {
      const loc = (window as unknown as Record<string, unknown>)._localization as {
        t: (key: string) => string;
        removeOverride: (key: string) => void;
      };
      loc.removeOverride('custom.key');
      return loc.t('custom.key');
    });

    const fallback = await page.evaluate(() => {
      const loc = (window as unknown as Record<string, unknown>)._localization as {
        t: (key: string) => string;
      };
      return loc.t('nonexistent.key');
    });

    expect(overridden).toBe('Custom Value');
    expect(removed).toBe('custom.key');
    expect(fallback).toBe('nonexistent.key');
  });
});
