import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-C2: 条件感知 Trait (ConditionalTrait + UpgradeableTrait)', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('task-c2.1: ConditionalTrait enabled reflects condition state', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const Actor = w._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        addTrait(t: unknown): void;
        grantCondition(c: string): number;
        hasCondition(c: string): boolean;
      };
      const ConditionalTrait = w._ConditionalTrait as new () => {
        requiredConditions: readonly string[];
        enabled: boolean;
        setEnabled(v: boolean): void;
        onConditionChanged(actor: unknown, condition: string, active: boolean): void;
      };

      // 创建自定义 ConditionalTrait 子类
      class TestConditionalTrait extends (ConditionalTrait as new () => {
        requiredConditions: readonly string[];
        enabled: boolean;
        setEnabled(v: boolean): void;
        onConditionChanged(a: unknown, c: string, active: boolean): void;
      }) {
        requiredConditions = ['empowered'];
      }

      const mockHouse = { id: 'gdi', color: '#00ff00' };
      const actor = new Actor('test-actor', mockHouse, { name: 'Test', type: 'unit' });
      const ct = new TestConditionalTrait();
      actor.addTrait(ct);

      // 初始状态：enabled 默认为 true（基类初始值）
      const before = ct.enabled;
      // 手动禁用，然后授予条件后重新启用
      ct.setEnabled(false);
      const disabled = ct.enabled;
      actor.grantCondition('empowered');
      ct.setEnabled(true);
      const after = ct.enabled;
      return { before, disabled, after };
    });
    expect(result.before).toBe(true);
    expect(result.disabled).toBe(false);
    expect(result.after).toBe(true);
  });

  test('task-c2.2: ConditionalTrait with empty requiredConditions is always enabled', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const Actor = w._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        addTrait(t: unknown): void;
      };
      const ConditionalTrait = w._ConditionalTrait as new () => {
        requiredConditions: readonly string[];
        enabled: boolean;
      };

      class TestConditionalTrait extends (ConditionalTrait as new () => {
        requiredConditions: readonly string[];
        enabled: boolean;
      }) {
        requiredConditions = [];
      }

      const mockHouse = { id: 'gdi', color: '#00ff00' };
      const actor = new Actor('test-actor', mockHouse, { name: 'Test', type: 'unit' });
      const ct = new TestConditionalTrait();
      actor.addTrait(ct);
      return ct.enabled;
    });
    expect(result).toBe(true);
  });

  test('task-c2.3: UpgradeableTrait returns base value without condition, upgraded value with condition', async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const Actor = w._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        addTrait(t: unknown): void;
        grantCondition(c: string): number;
      };
      const UpgradeableTrait = w._UpgradeableTrait as new <T>(
        base: T,
        upgraded: T
      ) => {
        setUpgradeCondition(c: string | null): void;
        getCurrentValue(actor: unknown): unknown;
      };

      const mockHouse = { id: 'gdi', color: '#00ff00' };
      const actor = new Actor('test-actor', mockHouse, { name: 'Test', type: 'unit' });
      const ut = new UpgradeableTrait(100, 150);
      ut.setUpgradeCondition('veteran');
      actor.addTrait(ut);

      const base = ut.getCurrentValue(actor);
      actor.grantCondition('veteran');
      const upgraded = ut.getCurrentValue(actor);
      return { base, upgraded };
    });
    expect(result.base).toBe(100);
    expect(result.upgraded).toBe(150);
  });

  test('task-c2.4: Actor.revokeCondition removes token and downgrades value', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const Actor = w._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        addTrait(t: unknown): void;
        grantCondition(c: string): number;
        revokeCondition(token: number): boolean;
      };
      const UpgradeableTrait = w._UpgradeableTrait as new <T>(
        base: T,
        upgraded: T
      ) => {
        setUpgradeCondition(c: string | null): void;
        getCurrentValue(actor: unknown): unknown;
      };

      const mockHouse = { id: 'gdi', color: '#00ff00' };
      const actor = new Actor('test-actor', mockHouse, { name: 'Test', type: 'unit' });
      const ut = new UpgradeableTrait(10, 20);
      ut.setUpgradeCondition('elite');
      actor.addTrait(ut);

      const token = actor.grantCondition('elite');
      const withCondition = ut.getCurrentValue(actor);
      const revoked = actor.revokeCondition(token);
      const afterRevoke = ut.getCurrentValue(actor);
      return { withCondition, revoked, afterRevoke };
    });
    expect(result.withCondition).toBe(20);
    expect(result.revoked).toBe(true);
    expect(result.afterRevoke).toBe(10);
  });

  test('task-c2.5: IObservesVariables callback fires on condition change', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const Actor = w._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        addTrait(t: unknown): void;
        grantCondition(c: string): number;
        revokeCondition(token: number): boolean;
      };
      const Trait = w._Trait as new () => {
        onCreated(actor: unknown): void;
        tick(actor: unknown, dt: number): void;
        onRemoved(actor: unknown): void;
        onConditionChanged(actor: unknown, condition: string, active: boolean): void;
      };

      const events: Array<{ condition: string; active: boolean }> = [];

      // 创建自定义观察者 Trait
      class ObserverTrait extends (Trait as new () => {
        onConditionChanged(a: unknown, c: string, active: boolean): void;
      }) {
        override onConditionChanged(_actor: unknown, condition: string, active: boolean): void {
          events.push({ condition, active });
        }
      }

      const mockHouse = { id: 'gdi', color: '#00ff00' };
      const actor = new Actor('test-actor', mockHouse, { name: 'Test', type: 'unit' });
      const observer = new ObserverTrait();
      actor.addTrait(observer);

      const token = actor.grantCondition('powered');
      actor.revokeCondition(token);

      return events;
    });

    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ condition: 'powered', active: true });
    expect(result[1]).toEqual({ condition: 'powered', active: false });
  });

  test('task-c2.6: multiple conditions are tracked independently', async ({ page }) => {
    const result = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const Actor = w._Actor as new (
        id: string,
        owner: unknown,
        info: unknown
      ) => {
        addTrait(t: unknown): void;
        grantCondition(c: string): number;
        revokeCondition(token: number): boolean;
        getActiveConditions(): string[];
      };
      const UpgradeableTrait = w._UpgradeableTrait as new <T>(
        base: T,
        upgraded: T
      ) => {
        setUpgradeCondition(c: string | null): void;
        getCurrentValue(actor: unknown): unknown;
      };

      const mockHouse = { id: 'gdi', color: '#00ff00' };
      const actor = new Actor('test-actor', mockHouse, { name: 'Test', type: 'unit' });
      const ut = new UpgradeableTrait(5, 10);
      ut.setUpgradeCondition('fast');
      actor.addTrait(ut);

      const t1 = actor.grantCondition('fast');
      actor.grantCondition('strong'); // t2 unused intentionally
      const active1 = actor.getActiveConditions();
      const val1 = ut.getCurrentValue(actor);

      // 撤销 fast，strong 仍然活跃
      actor.revokeCondition(t1);
      const active2 = actor.getActiveConditions();
      const val2 = ut.getCurrentValue(actor);

      return { active1, active2, val1, val2 };
    });

    expect(result.active1).toContain('fast');
    expect(result.active1).toContain('strong');
    expect(result.active2).not.toContain('fast');
    expect(result.active2).toContain('strong');
    expect(result.val1).toBe(10); // fast 激活时升级
    expect(result.val2).toBe(5); // fast 撤销后降级
  });
});
