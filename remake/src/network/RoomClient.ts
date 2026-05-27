/**
 * Room Client — Task 64
 *
 * Browser-side WebSocket client for multiplayer room management.
 * Handles connection, handshake, ready toggle, and game-start events.
 *
 * OpenRA 对标: OpenRA.Game/Network/OrderManager.cs (client side)
 */

import {
  MessageType,
  serialize,
  parseMessage,
  type NetworkMessage,
  type RoomStateMessage,
  type GameStartMessage,
  type OrderFrameMessage,
  type PlayerSlot,
} from './NetworkProtocol';

export interface RoomClientOptions {
  url: string;
  playerName: string;
  clientVersion?: string;
}

export class RoomClient {
  private ws: WebSocket | null = null;
  private options: RoomClientOptions;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private _roomState: RoomStateMessage | null = null;

  // Callbacks
  onRoomStateChange: ((state: RoomStateMessage) => void) | null = null;
  onGameStart: ((msg: GameStartMessage) => void) | null = null;
  onOrderFrame: ((msg: OrderFrameMessage) => void) | null = null;
  onChat: ((sender: string, text: string) => void) | null = null;
  onDisconnect: ((reason: string) => void) | null = null;
  onError: ((err: Event) => void) | null = null;

  constructor(options: RoomClientOptions) {
    this.options = {
      clientVersion: '0.1.0',
      ...options,
    };
  }

  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  get roomState(): RoomStateMessage | null {
    return this._roomState;
  }

  get myPlayer(): PlayerSlot | undefined {
    if (!this._roomState) return undefined;
    // Use playerName as heuristic; server assigns id after handshake
    return this._roomState.players.find((p) => p.name === this.options.playerName);
  }

  /** Establish WebSocket connection and send Handshake. */
  connect(): void {
    if (this.ws) return;

    this.ws = new WebSocket(this.options.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.send({
        type: MessageType.Handshake,
        clientVersion: this.options.clientVersion ?? '0.1.0',
        playerName: this.options.playerName,
      });
    };

    this.ws.onmessage = async (ev) => {
      try {
        const msg = await parseMessage(ev.data);
        this.handleMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.onDisconnect) {
        this.onDisconnect('Connection closed');
      }
    };

    this.ws.onerror = (err) => {
      if (this.onError) this.onError(err);
    };
  }

  private handleMessage(msg: NetworkMessage): void {
    switch (msg.type) {
      case MessageType.RoomState:
        this._roomState = msg;
        if (this.onRoomStateChange) this.onRoomStateChange(msg);
        break;
      case MessageType.GameStart:
        if (this.onGameStart) this.onGameStart(msg);
        break;
      case MessageType.OrderFrame:
        if (this.onOrderFrame) this.onOrderFrame(msg);
        break;
      case MessageType.Chat:
        if (this.onChat) this.onChat(msg.sender, msg.text);
        break;
      case MessageType.Disconnect:
        if (this.onDisconnect) this.onDisconnect(msg.reason);
        break;
    }
  }

  private send(msg: NetworkMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(serialize(msg));
    }
  }

  /** Toggle ready state. Server broadcasts updated RoomState. */
  setReady(ready: boolean): void {
    this.send({ type: MessageType.PlayerReady, ready });
  }

  /** Send a chat message. */
  sendChat(text: string): void {
    this.send({
      type: MessageType.Chat,
      sender: this.options.playerName,
      text,
    });
  }

  /** Send local orders for the current frame. */
  sendOrderFrame(frame: number, orders: OrderFrameMessage['orders']): void {
    this.send({ type: MessageType.OrderFrame, frame, orders });
  }

  /** Close connection cleanly. */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
