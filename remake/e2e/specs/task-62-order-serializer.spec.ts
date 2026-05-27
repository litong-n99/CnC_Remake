import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 62 — Order Serializer', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('MoveOrder serializes to less than 32 bytes', async ({ page }) => {
    const result = await page.evaluate(() => {
      const os = (window as unknown as Record<string, unknown>)._orderSerializer as {
        serializeOrder: (order: unknown) => Uint8Array;
        serializedSize: (order: unknown) => number;
      };
      const order = {
        orderString: 'Move' as const,
        subjectId: 'p1',
        target: { type: 'ground' as const, x: 30, y: 40 },
        queued: false,
      };
      const bytes = os.serializeOrder(order);
      return { size: bytes.length, sizeFn: os.serializedSize(order) };
    });

    expect(result.size).toBeLessThan(32);
    expect(result.sizeFn).toBe(result.size);
  });

  test('MoveOrder round-trip preserves all fields', async ({ page }) => {
    const result = await page.evaluate(() => {
      const os = (window as unknown as Record<string, unknown>)._orderSerializer as {
        serializeOrder: (order: unknown) => Uint8Array;
        deserializeOrder: (data: Uint8Array) => unknown;
      };
      const order = {
        orderString: 'Move' as const,
        subjectId: 'p1',
        target: { type: 'ground' as const, x: 30, y: 40 },
        queued: false,
      };
      const back = os.deserializeOrder(os.serializeOrder(order)) as typeof order;
      return {
        orderString: back.orderString,
        subjectId: back.subjectId,
        targetType: back.target.type,
        targetX: back.target.x,
        targetY: back.target.y,
        queued: back.queued,
      };
    });

    expect(result.orderString).toBe('Move');
    expect(result.subjectId).toBe('p1');
    expect(result.targetType).toBe('ground');
    expect(result.targetX).toBe(30);
    expect(result.targetY).toBe(40);
    expect(result.queued).toBe(false);
  });

  test('Actor-target order round-trip', async ({ page }) => {
    const result = await page.evaluate(() => {
      const os = (window as unknown as Record<string, unknown>)._orderSerializer as {
        serializeOrder: (order: unknown) => Uint8Array;
        deserializeOrder: (data: Uint8Array) => unknown;
      };
      const order = {
        orderString: 'Attack' as const,
        subjectId: 'u_5',
        target: { type: 'actor' as const, actorId: 'enemy_3' },
        queued: true,
      };
      const back = os.deserializeOrder(os.serializeOrder(order)) as typeof order;
      return {
        orderString: back.orderString,
        subjectId: back.subjectId,
        targetType: back.target.type,
        actorId: back.target.actorId,
        queued: back.queued,
      };
    });

    expect(result.orderString).toBe('Attack');
    expect(result.subjectId).toBe('u_5');
    expect(result.targetType).toBe('actor');
    expect(result.actorId).toBe('enemy_3');
    expect(result.queued).toBe(true);
  });

  test('Self order (Stop) round-trip', async ({ page }) => {
    const result = await page.evaluate(() => {
      const os = (window as unknown as Record<string, unknown>)._orderSerializer as {
        serializeOrder: (order: unknown) => Uint8Array;
        deserializeOrder: (data: Uint8Array) => unknown;
      };
      const order = {
        orderString: 'Stop' as const,
        subjectId: 'u_1',
        target: { type: 'none' as const },
        queued: false,
      };
      const back = os.deserializeOrder(os.serializeOrder(order)) as typeof order;
      return {
        orderString: back.orderString,
        subjectId: back.subjectId,
        targetType: back.target.type,
        queued: back.queued,
      };
    });

    expect(result.orderString).toBe('Stop');
    expect(result.subjectId).toBe('u_1');
    expect(result.targetType).toBe('none');
    expect(result.queued).toBe(false);
  });

  test('deserialize rejects truncated data', async ({ page }) => {
    const result = await page.evaluate(() => {
      const os = (window as unknown as Record<string, unknown>)._orderSerializer as {
        deserializeOrder: (data: Uint8Array) => unknown;
      };
      try {
        os.deserializeOrder(new Uint8Array([0x01, 0x00, 0x00]));
        return { error: false };
      } catch (e) {
        return { error: true, message: (e as Error).message };
      }
    });

    expect(result.error).toBe(true);
  });
});
