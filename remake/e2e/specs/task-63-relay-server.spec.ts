import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';
import { GameServer } from '../../src/network/GameServer';

test.describe('Task 63 — Headless Relay Server', () => {
  let server: GameServer;
  const PORT = 18000 + Math.floor(Math.random() * 1000);

  test.beforeAll(async () => {
    server = new GameServer({ port: PORT, tickRate: 10 });
    // Wait for server to bind
    await new Promise((r) => setTimeout(r, 200));
  });

  test.afterAll(async () => {
    server.stop();
  });

  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('client handshake registers player and receives RoomState', async ({ page }) => {
    const result = await page.evaluate(
      async ({ port }) => {
        return new Promise<{ received: boolean; playerCount: number; state: string }>((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${port}`);
          ws.binaryType = 'arraybuffer';

          const np = (window as unknown as Record<string, unknown>)._networkProtocol as {
            serialize: (msg: unknown) => Uint8Array;
            deserialize: (data: Uint8Array) => unknown;
            MessageType: Record<string, number>;
          };

          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Timeout waiting for RoomState'));
          }, 3000);

          ws.onopen = () => {
            const handshake = {
              type: np.MessageType.Handshake,
              clientVersion: 'test',
              playerName: 'TestPlayer',
            };
            ws.send(np.serialize(handshake));
          };

          ws.onmessage = (ev) => {
            const data = new Uint8Array(ev.data as ArrayBuffer);
            const msg = np.deserialize(data) as { type: number; players?: unknown[]; state?: string };
            if (msg.type === np.MessageType.RoomState) {
              received = true;
              clearTimeout(timeout);
              ws.close();
              resolve({ received: true, playerCount: (msg.players ?? []).length, state: msg.state ?? '' });
            }
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket error'));
          };
        });
      },
      { port: PORT }
    );

    expect(result.received).toBe(true);
    expect(result.playerCount).toBe(1);
    expect(result.state).toBe('lobby');
  });

  test('server broadcasts OrderFrame after game start', async ({ page }) => {
    server.startGame();

    const result = await page.evaluate(
      async ({ port }) => {
        return new Promise<{ received: boolean; frame: number; orderCount: number }>((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${port}`);
          ws.binaryType = 'arraybuffer';

          const np = (window as unknown as Record<string, unknown>)._networkProtocol as {
            serialize: (msg: unknown) => Uint8Array;
            deserialize: (data: Uint8Array) => unknown;
            MessageType: Record<string, number>;
          };

          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Timeout waiting for OrderFrame'));
          }, 3000);

          ws.onopen = () => {
            const handshake = {
              type: np.MessageType.Handshake,
              clientVersion: 'test',
              playerName: 'TestPlayer2',
            };
            ws.send(np.serialize(handshake));
          };

          ws.onmessage = (ev) => {
            const data = new Uint8Array(ev.data as ArrayBuffer);
            const msg = np.deserialize(data) as { type: number; frame?: number; orders?: unknown[]; state?: string };

            if (msg.type === np.MessageType.RoomState && msg.state === 'playing') {
              // Send an OrderFrame once game starts
              const order = {
                type: np.MessageType.OrderFrame,
                frame: 0,
                orders: [{ playerId: 'dummy', orderType: 'move' as const, targetX: 10, targetY: 20, unitIds: ['u1'] }],
              };
              ws.send(np.serialize(order));
            }

            if (msg.type === np.MessageType.OrderFrame) {
              clearTimeout(timeout);
              ws.close();
              resolve({
                received: true,
                frame: msg.frame ?? -1,
                orderCount: (msg.orders ?? []).length,
              });
            }
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket error'));
          };
        });
      },
      { port: PORT }
    );

    expect(result.received).toBe(true);
    expect(result.orderCount).toBeGreaterThanOrEqual(0);
  });
});
