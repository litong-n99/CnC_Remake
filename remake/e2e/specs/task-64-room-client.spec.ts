import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';
import { GameServer } from '../../src/network/GameServer';

test.describe('Task 64 — Room Client & Connection', () => {
  let server: GameServer;
  const PORT = 19000 + Math.floor(Math.random() * 1000);

  test.beforeAll(async () => {
    server = new GameServer({ port: PORT, tickRate: 10 });
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

  test('RoomClient connects and receives RoomState', async ({ page }) => {
    const result = await page.evaluate(
      async ({ port }) => {
        const RoomClientClass = (window as unknown as Record<string, unknown>).RoomClient as new (opts: {
          url: string;
          playerName: string;
        }) => {
          connect: () => void;
          onRoomStateChange: ((state: { players: unknown[]; state: string }) => void) | null;
          disconnect: () => void;
        };

        const client = new RoomClientClass({
          url: `ws://localhost:${port}`,
          playerName: 'TestPlayer',
        });

        return new Promise<{ playerCount: number; state: string }>((resolve, reject) => {
          const timeout = setTimeout(() => {
            client.disconnect();
            reject(new Error('Timeout'));
          }, 3000);

          client.onRoomStateChange = (state) => {
            clearTimeout(timeout);
            client.disconnect();
            resolve({ playerCount: state.players.length, state: state.state });
          };

          client.connect();
        });
      },
      { port: PORT }
    );

    expect(result.playerCount).toBe(1);
    expect(result.state).toBe('lobby');
  });

  test('RoomClient setReady updates server state', async ({ page }) => {
    const result = await page.evaluate(
      async ({ port }) => {
        const RoomClientClass = (window as unknown as Record<string, unknown>).RoomClient as new (opts: {
          url: string;
          playerName: string;
        }) => {
          connect: () => void;
          setReady: (ready: boolean) => void;
          onRoomStateChange: ((state: { players: Array<{ name: string; ready: boolean }> }) => void) | null;
          disconnect: () => void;
        };

        const client = new RoomClientClass({
          url: `ws://localhost:${port}`,
          playerName: 'ReadyPlayer',
        });

        return new Promise<{ ready: boolean }>((resolve, reject) => {
          const timeout = setTimeout(() => {
            client.disconnect();
            reject(new Error('Timeout'));
          }, 3000);

          let receivedOnce = false;
          client.onRoomStateChange = (state) => {
            const me = state.players.find((p) => p.name === 'ReadyPlayer');
            if (!me) return;

            if (!receivedOnce) {
              receivedOnce = true;
              // First RoomState: player just joined, ready=false
              // Send ready=true
              client.setReady(true);
            } else if (me.ready) {
              clearTimeout(timeout);
              client.disconnect();
              resolve({ ready: me.ready });
            }
          };

          client.connect();
        });
      },
      { port: PORT }
    );

    expect(result.ready).toBe(true);
  });
});
