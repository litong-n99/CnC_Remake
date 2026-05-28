import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-A4: Trait 依赖自动排序', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('sortTypes returns correct order for requires dependency', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TraitRegistry = (window as unknown as Record<string, unknown>)._TraitRegistry as {
        clear: () => void;
        register: (type: string, factory: () => unknown, deps?: unknown) => void;
        sortTypes: (types: string[]) => string[];
      };

      TraitRegistry.clear();

      const factory = () => ({ tick: () => {}, onCreated: () => {}, onRemoved: () => {} });

      // Mobile requires Health
      TraitRegistry.register('Mobile', factory, { type: 'Mobile', requires: ['Health'] });
      TraitRegistry.register('Health', factory, { type: 'Health' });

      const sorted = TraitRegistry.sortTypes(['Mobile', 'Health']);
      return { sorted };
    });

    expect(result.sorted).toEqual(['Health', 'Mobile']);
  });

  test('sortTypes respects notBefore constraint', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TraitRegistry = (window as unknown as Record<string, unknown>)._TraitRegistry as {
        clear: () => void;
        register: (type: string, factory: () => unknown, deps?: unknown) => void;
        sortTypes: (types: string[]) => string[];
      };

      TraitRegistry.clear();

      const factory = () => ({ tick: () => {}, onCreated: () => {}, onRemoved: () => {} });

      // Render must be constructed after Mobile (Mobile notBefore Render)
      TraitRegistry.register('Render', factory, { type: 'Render' });
      TraitRegistry.register('Mobile', factory, { type: 'Mobile', notBefore: ['Render'] });

      const sorted = TraitRegistry.sortTypes(['Render', 'Mobile']);
      return { sorted };
    });

    expect(result.sorted).toEqual(['Mobile', 'Render']);
  });

  test('sortTypes handles complex dependency chain', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TraitRegistry = (window as unknown as Record<string, unknown>)._TraitRegistry as {
        clear: () => void;
        register: (type: string, factory: () => unknown, deps?: unknown) => void;
        sortTypes: (types: string[]) => string[];
      };

      TraitRegistry.clear();

      const factory = () => ({ tick: () => {}, onCreated: () => {}, onRemoved: () => {} });

      // Health → Mobile → Render
      TraitRegistry.register('Render', factory, { type: 'Render', requires: ['Mobile'] });
      TraitRegistry.register('Mobile', factory, { type: 'Mobile', requires: ['Health'] });
      TraitRegistry.register('Health', factory, { type: 'Health' });

      const sorted = TraitRegistry.sortTypes(['Render', 'Mobile', 'Health']);
      return { sorted };
    });

    expect(result.sorted).toEqual(['Health', 'Mobile', 'Render']);
  });

  test('sortTypes throws on missing dependency', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TraitRegistry = (window as unknown as Record<string, unknown>)._TraitRegistry as {
        clear: () => void;
        register: (type: string, factory: () => unknown, deps?: unknown) => void;
        sortTypes: (types: string[]) => string[];
      };

      TraitRegistry.clear();

      const factory = () => ({ tick: () => {}, onCreated: () => {}, onRemoved: () => {} });
      TraitRegistry.register('Mobile', factory, { type: 'Mobile', requires: ['Missing'] });

      try {
        TraitRegistry.sortTypes(['Mobile']);
        return { error: null };
      } catch (e: unknown) {
        return { error: (e as Error).message };
      }
    });

    expect(result.error).toContain('requires missing dependency');
  });

  test('sortTypes throws on cyclic dependency', async ({ page }) => {
    const result = await page.evaluate(() => {
      const TraitRegistry = (window as unknown as Record<string, unknown>)._TraitRegistry as {
        clear: () => void;
        register: (type: string, factory: () => unknown, deps?: unknown) => void;
        sortTypes: (types: string[]) => string[];
      };

      TraitRegistry.clear();

      const factory = () => ({ tick: () => {}, onCreated: () => {}, onRemoved: () => {} });
      TraitRegistry.register('A', factory, { type: 'A', requires: ['B'] });
      TraitRegistry.register('B', factory, { type: 'B', requires: ['A'] });

      try {
        TraitRegistry.sortTypes(['A', 'B']);
        return { error: null };
      } catch (e: unknown) {
        return { error: (e as Error).message };
      }
    });

    expect(result.error).toContain('Cyclic dependency');
  });
});
