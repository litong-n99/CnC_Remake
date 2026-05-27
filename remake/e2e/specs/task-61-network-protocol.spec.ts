import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 61 — Network Protocol', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('serialize and deserialize Handshake message', async ({ page }) => {
    const result = await page.evaluate(() => {
      const np = (window as unknown as Record<string, unknown>)._networkProtocol as {
        MessageType: Record<string, number>;
        serialize: (msg: unknown) => Uint8Array;
        deserialize: (data: Uint8Array) => unknown;
      };
      const msg = {
        type: np.MessageType.Handshake,
        clientVersion: '1.0.0',
        playerName: 'TestPlayer',
      };
      const bytes = np.serialize(msg);
      const back = np.deserialize(bytes) as typeof msg;
      return {
        type: back.type,
        clientVersion: back.clientVersion,
        playerName: back.playerName,
        byteLength: bytes.length,
      };
    });

    expect(result.type).toBe(0x00);
    expect(result.clientVersion).toBe('1.0.0');
    expect(result.playerName).toBe('TestPlayer');
    expect(result.byteLength).toBeGreaterThan(5);
  });

  test('serialize and deserialize OrderFrame message', async ({ page }) => {
    const result = await page.evaluate(() => {
      const np = (window as unknown as Record<string, unknown>)._networkProtocol as {
        MessageType: Record<string, number>;
        serialize: (msg: unknown) => Uint8Array;
        deserialize: (data: Uint8Array) => unknown;
      };
      const msg = {
        type: np.MessageType.OrderFrame,
        frame: 42,
        orders: [
          {
            playerId: 'p1',
            orderType: 'move' as const,
            targetX: 10,
            targetY: 20,
            unitIds: ['u1', 'u2'],
            queued: false,
          },
        ],
      };
      const bytes = np.serialize(msg);
      const back = np.deserialize(bytes) as typeof msg;
      return {
        type: back.type,
        frame: back.frame,
        orderCount: back.orders.length,
        firstOrderType: back.orders[0]?.orderType,
        firstOrderTargetX: back.orders[0]?.targetX,
      };
    });

    expect(result.type).toBe(0x03);
    expect(result.frame).toBe(42);
    expect(result.orderCount).toBe(1);
    expect(result.firstOrderType).toBe('move');
    expect(result.firstOrderTargetX).toBe(10);
  });

  test('deserialize rejects truncated data', async ({ page }) => {
    const result = await page.evaluate(() => {
      const np = (window as unknown as Record<string, unknown>)._networkProtocol as {
        deserialize: (data: Uint8Array) => unknown;
      };
      try {
        np.deserialize(new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x10]));
        return { error: false };
      } catch (e) {
        return { error: true, message: (e as Error).message };
      }
    });

    expect(result.error).toBe(true);
  });

  test('all message types have unique byte values', async ({ page }) => {
    const result = await page.evaluate(() => {
      const np = (window as unknown as Record<string, unknown>)._networkProtocol as {
        MessageType: Record<string, number>;
      };
      const values = Object.values(np.MessageType).filter((v) => typeof v === 'number') as number[];
      const unique = new Set(values);
      return { count: values.length, uniqueCount: unique.size };
    });

    expect(result.uniqueCount).toBe(result.count);
    expect(result.count).toBe(8);
  });
});
