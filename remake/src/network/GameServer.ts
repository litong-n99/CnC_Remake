/**
 * Headless Relay Server — Task 63
 *
 * Node.js WebSocket relay that receives client Orders per frame
 * and broadcasts the aggregated OrderFrame to all clients.
 * No game logic runs on the server.
 *
 * OpenRA 对标: OpenRA.Game/Server/Server.cs
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { ConnectedPlayer } from './PlayerSlot';
import { MessageType, serialize, deserialize } from './NetworkProtocol';
import type { OrderFrameMessage, RoomStateMessage } from './NetworkProtocol';

export interface GameServerOptions {
  port: number;
  tickRate?: number; // frames per second (default 25)
}

export class GameServer {
  private wss: WebSocketServer;
  private players = new Map<string, ConnectedPlayer>();
  private frameOrders = new Map<number, OrderFrameMessage['orders']>();
  private currentFrame = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private readonly tickRate: number;
  private roomState: RoomStateMessage['state'] = 'lobby';
  private roomId: string;

  constructor(options: GameServerOptions) {
    this.tickRate = options.tickRate ?? 25;
    this.roomId = `room-${Math.random().toString(36).slice(2, 8)}`;
    this.wss = new WebSocketServer({ port: options.port });
    this.setupWss();
  }

  private setupWss(): void {
    this.wss.on('connection', (ws) => {
      const tempId = `conn-${Math.random().toString(36).slice(2, 8)}`;

      ws.on('message', (raw) => {
        try {
          const data = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayBuffer);
          const msg = deserialize(data);
          this.handleMessage(tempId, ws, msg);
        } catch {
          // ignore invalid messages
        }
      });

      ws.on('close', () => {
        this.removePlayer(tempId);
      });
    });
  }

  private handleMessage(connId: string, ws: WebSocket, msg: import('./NetworkProtocol').NetworkMessage): void {
    switch (msg.type) {
      case MessageType.Handshake: {
        const existing = this.findPlayerByWs(ws);
        if (!existing) {
          const isHost = this.players.size === 0;
          const player: ConnectedPlayer = {
            id: connId,
            name: msg.playerName || `Player ${this.players.size + 1}`,
            ready: false,
            isHost,
            ws,
          };
          this.players.set(connId, player);
        }
        this.broadcastRoomState();
        break;
      }
      case MessageType.OrderFrame: {
        if (this.roomState !== 'playing') break;
        const player = this.findPlayerByWs(ws);
        if (!player) break;
        // Tag orders with player id and buffer for current frame
        const tagged = msg.orders.map((o) => ({ ...o, playerId: player.id }));
        const existing = this.frameOrders.get(msg.frame) ?? [];
        this.frameOrders.set(msg.frame, [...existing, ...tagged]);
        break;
      }
      case MessageType.Chat: {
        this.broadcast(msg);
        break;
      }
      case MessageType.PlayerReady: {
        const player = this.findPlayerByWs(ws);
        if (player) {
          player.ready = msg.ready;
          this.broadcastRoomState();
        }
        break;
      }
    }
  }

  private findPlayerByWs(ws: WebSocket): ConnectedPlayer | undefined {
    for (const p of this.players.values()) {
      if (p.ws === ws) return p;
    }
    return undefined;
  }

  private removePlayer(connId: string): void {
    this.players.delete(connId);
    this.broadcastRoomState();
  }

  private broadcastRoomState(): void {
    const msg: RoomStateMessage = {
      type: MessageType.RoomState,
      roomId: this.roomId,
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        house: p.house,
        color: p.color,
        team: p.team,
        ready: p.ready,
        isHost: p.isHost,
      })),
      state: this.roomState,
    };
    this.broadcast(msg);
  }

  private broadcast(msg: import('./NetworkProtocol').NetworkMessage): void {
    const bytes = serialize(msg);
    for (const p of this.players.values()) {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(bytes);
      }
    }
  }

  /** Start the lockstep frame ticker. */
  startGame(): void {
    if (this.roomState === 'playing') return;
    this.roomState = 'playing';
    this.currentFrame = 0;
    this.frameOrders.clear();
    this.broadcastRoomState();

    const intervalMs = 1000 / this.tickRate;
    this.tickInterval = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  private tick(): void {
    // Broadcast aggregated orders for the current frame
    const orders = this.frameOrders.get(this.currentFrame) ?? [];
    const frameMsg: OrderFrameMessage = {
      type: MessageType.OrderFrame,
      frame: this.currentFrame,
      orders,
    };
    this.broadcast(frameMsg);

    // Clean up old frames
    this.frameOrders.delete(this.currentFrame);
    this.currentFrame++;
  }

  /** Stop the server. */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    for (const p of this.players.values()) {
      p.ws.close();
    }
    this.players.clear();
    this.wss.close();
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getRoomState(): RoomStateMessage['state'] {
    return this.roomState;
  }
}
