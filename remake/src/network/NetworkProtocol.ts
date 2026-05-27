/**
 * Network Protocol — Task 61
 *
 * Client-Server Relay protocol over WebSocket (Star topology).
 * Defines message types, payload structures, and binary serialization.
 *
 * Architecture: Headless relay server forwards Orders per frame;
 * no game logic runs on the server.
 */

export enum MessageType {
  Handshake = 0x00,
  RoomState = 0x01,
  GameStart = 0x02,
  OrderFrame = 0x03,
  SyncHash = 0x04,
  Chat = 0x05,
  Disconnect = 0x06,
  PlayerReady = 0x07,
}

export interface PlayerSlot {
  id: string;
  name: string;
  house?: string;
  color?: string;
  team?: number;
  ready: boolean;
  isHost: boolean;
}

import type { GameOrder } from '../game/order/GameOrder';

export interface HandshakeMessage {
  type: MessageType.Handshake;
  clientVersion: string;
  playerName: string;
}

export interface RoomStateMessage {
  type: MessageType.RoomState;
  roomId: string;
  players: PlayerSlot[];
  state: 'lobby' | 'playing' | 'ended';
}

export interface GameStartMessage {
  type: MessageType.GameStart;
  seed: number;
  mapName: string;
  players: PlayerSlot[];
}

export interface OrderFrameMessage {
  type: MessageType.OrderFrame;
  frame: number;
  orders: GameOrder[];
}

export interface SyncHashMessage {
  type: MessageType.SyncHash;
  frame: number;
  hash: string;
}

export interface ChatMessage {
  type: MessageType.Chat;
  sender: string;
  text: string;
}

export interface DisconnectMessage {
  type: MessageType.Disconnect;
  reason: string;
}

export interface PlayerReadyMessage {
  type: MessageType.PlayerReady;
  ready: boolean;
}

export type NetworkMessage =
  | HandshakeMessage
  | RoomStateMessage
  | GameStartMessage
  | OrderFrameMessage
  | SyncHashMessage
  | ChatMessage
  | DisconnectMessage
  | PlayerReadyMessage;

/** Binary format: [type: 1 byte][payloadLength: 4 bytes LE][payload: JSON bytes] */
const HEADER_SIZE = 5;

export function serialize(msg: NetworkMessage): Uint8Array {
  const payload = new TextEncoder().encode(JSON.stringify(msg));
  const buf = new Uint8Array(HEADER_SIZE + payload.length);
  const view = new DataView(buf.buffer);
  view.setUint8(0, msg.type);
  view.setUint32(1, payload.length, true);
  buf.set(payload, HEADER_SIZE);
  return buf;
}

export function deserialize(data: Uint8Array): NetworkMessage {
  if (data.length < HEADER_SIZE) {
    throw new Error(`Invalid message: too short (${data.length} bytes)`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const type = view.getUint8(0);
  const payloadLength = view.getUint32(1, true);
  if (data.length < HEADER_SIZE + payloadLength) {
    throw new Error(`Invalid message: payload truncated`);
  }
  const payload = new TextDecoder().decode(data.subarray(HEADER_SIZE, HEADER_SIZE + payloadLength));
  const msg = JSON.parse(payload) as NetworkMessage;
  if (msg.type !== type) {
    throw new Error(`Type mismatch: header=${type} payload=${msg.type}`);
  }
  return msg;
}

/** Convenience: parse a Blob / ArrayBuffer from a WebSocket binary frame. */
export async function parseMessage(data: Blob | ArrayBuffer | Uint8Array): Promise<NetworkMessage> {
  let bytes: Uint8Array;
  if (data instanceof Blob) {
    bytes = new Uint8Array(await data.arrayBuffer());
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else {
    bytes = data;
  }
  return deserialize(bytes);
}
