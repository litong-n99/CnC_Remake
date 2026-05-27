/**
 * Player Slot — Task 63
 *
 * Represents a connected client in the relay server.
 */
export interface PlayerSlot {
  id: string;
  name: string;
  house?: string;
  color?: string;
  team?: number;
  ready: boolean;
  isHost: boolean;
}

export interface ConnectedPlayer extends PlayerSlot {
  ws: import('ws').WebSocket;
}
