import { test, expect } from '@playwright/test';

test.describe('Task 55 — Script Runtime Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('task-55.1: ScriptRuntime class exists and can be instantiated', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SR = (window as unknown as Record<string, unknown>)._ScriptRuntime as new () => {
        registerGlobal(name: string, value: unknown): void;
        execute(code: string): unknown;
        listGlobals(): string[];
        getExecutionCount(): number;
      };
      if (!SR) return { ok: false, reason: '_ScriptRuntime not exposed' };
      const rt = new SR();
      rt.registerGlobal('testValue', 42);
      return {
        ok: true,
        globals: rt.listGlobals(),
        count: rt.getExecutionCount(),
      };
    });
    expect(result.ok).toBe(true);
    expect(result.globals).toContain('testValue');
    expect(result.count).toBe(0);
  });

  test('task-55.2: execute runs simple JS code and returns result', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const SR = (window as unknown as Record<string, unknown>)._ScriptRuntime as new () => {
        executeAsync(code: string): Promise<unknown>;
        getExecutionCount(): number;
      };
      const rt = new SR();
      const value = await rt.executeAsync('return 2 + 3');
      return { value, count: rt.getExecutionCount() };
    });
    expect(result.value).toBe(5);
    expect(result.count).toBe(1);
  });

  test('task-55.3: registerGlobal injects variables into script scope', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const SR = (window as unknown as Record<string, unknown>)._ScriptRuntime as new () => {
        registerGlobal(name: string, value: unknown): void;
        executeAsync(code: string): Promise<unknown>;
      };
      const rt = new SR();
      rt.registerGlobal('x', 10);
      rt.registerGlobal('y', 20);
      const value = await rt.executeAsync('return x + y');
      return { value };
    });
    expect(result.value).toBe(30);
  });

  test('task-55.4: executeAsync supports async code', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const SR = (window as unknown as Record<string, unknown>)._ScriptRuntime as new () => {
        registerGlobal(name: string, value: unknown): void;
        executeAsync(code: string): Promise<unknown>;
      };
      const rt = new SR();
      rt.registerGlobal('wait', (ms: number) => new Promise((r) => setTimeout(r, ms)));
      const value = await rt.executeAsync('await wait(50); return 99');
      return { value };
    });
    expect(result.value).toBe(99);
  });

  test('task-55.5: locals parameter provides one-time variables', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const SR = (window as unknown as Record<string, unknown>)._ScriptRuntime as new () => {
        executeAsync(code: string, locals?: Record<string, unknown>): Promise<unknown>;
      };
      const rt = new SR();
      const value = await rt.executeAsync('return a * b', { a: 7, b: 6 });
      return { value };
    });
    expect(result.value).toBe(42);
  });

  test('task-55.6: clearGlobals removes all registered globals', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SR = (window as unknown as Record<string, unknown>)._ScriptRuntime as new () => {
        registerGlobal(name: string, value: unknown): void;
        clearGlobals(): void;
        listGlobals(): string[];
      };
      const rt = new SR();
      rt.registerGlobal('foo', 1);
      rt.clearGlobals();
      return { globals: rt.listGlobals() };
    });
    expect(result.globals).toEqual([]);
  });
});
