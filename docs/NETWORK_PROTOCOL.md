# C&C Remake — Network Protocol Specification

> **Scope**: Task 61 — Client-Server Relay architecture for multiplayer.
> **Transport**: WebSocket (binary frames).
> **Topology**: Star (Relay), no P2P.

---

## 1. Architecture Overview

```
┌─────────┐      WebSocket      ┌─────────────┐      WebSocket      ┌─────────┐
│ Client A│◄───────────────────►│ Relay Server│◄───────────────────►│ Client B│
└─────────┘                      └─────────────┘                      └─────────┘
```

- **Server**: Headless Node.js relay. Receives orders from all clients, buffers them per frame, and broadcasts the aggregated `OrderFrame` to every client.
- **Client**: Browser (Babylon.js). Runs the full game simulation deterministically. Only sends local player input as `GameOrder` and receives `OrderFrame` from the server.
- **No game logic on server**: The server never runs `Unit.update()` or `GameLoop.tick()`. It is a pure message router + frame synchronizer.

---

## 2. Message Format

All messages share a common binary header:

| Field | Size | Description |
|-------|------|-------------|
| `type` | 1 byte | `MessageType` enum value |
| `payloadLength` | 4 bytes LE | Length of JSON payload in bytes |
| `payload` | *N* bytes | UTF-8 JSON object |

Total header size: **5 bytes**.

---

## 3. Message Types

```typescript
enum MessageType {
  Handshake   = 0x00,
  RoomState   = 0x01,
  GameStart   = 0x02,
  OrderFrame  = 0x03,
  SyncHash    = 0x04,
  Chat        = 0x05,
  Disconnect  = 0x06,
}
```

### 3.1 Handshake (0x00)
Sent by client immediately after WebSocket connection.

```json
{
  "type": 0,
  "clientVersion": "0.1.0",
  "playerName": "Commander"
}
```

### 3.2 RoomState (0x01)
Broadcast by server whenever a player joins, leaves, changes slot, or toggles ready.

```json
{
  "type": 1,
  "roomId": "room-abc",
  "players": [
    { "id": "p1", "name": "Commander", "house": "gdi", "ready": true, "isHost": true }
  ],
  "state": "lobby"
}
```

### 3.3 GameStart (0x02)
Broadcast by server when the host clicks "Start" and all players are ready.

```json
{
  "type": 2,
  "seed": 123456,
  "mapName": "map-01",
  "players": [ /* same as RoomState.players */ ]
}
```

### 3.4 OrderFrame (0x03)
Sent by client every logic tick (25 FPS) containing all local player orders generated since the last frame. Broadcast by server after collecting orders from all clients for that frame.

```json
{
  "type": 3,
  "frame": 120,
  "orders": [
    {
      "playerId": "p1",
      "orderType": "move",
      "targetX": 30,
      "targetY": 40,
      "unitIds": ["u_7", "u_8"],
      "queued": false
    }
  ]
}
```

### 3.5 SyncHash (0x04)
Sent by client every 30 frames. Server compares hashes from all clients and broadcasts a `Desync` warning if any mismatch.

```json
{
  "type": 4,
  "frame": 300,
  "hash": "a3f7b2d1"
}
```

### 3.6 Chat (0x05)

```json
{
  "type": 5,
  "sender": "Commander",
  "text": "GL HF"
}
```

### 3.7 Disconnect (0x06)

```json
{
  "type": 6,
  "reason": "Connection timeout"
}
```

---

## 4. Lockstep Flow

1. Client connects → sends `Handshake`.
2. Server assigns `playerId` and broadcasts `RoomState`.
3. Host clicks Start → server broadcasts `GameStart` (includes random `seed`).
4. All clients begin deterministic simulation using shared `seed`.
5. Every logic tick:
   - Client collects local input → sends `OrderFrame` to server.
   - Server waits until it has received `OrderFrame` from **all** clients for the current frame.
   - Server broadcasts aggregated `OrderFrame` back to all clients.
   - Client applies received orders and advances simulation by 1 frame.
6. Every 30 frames:
   - Client computes `SyncHash` of full world state → sends to server.
   - Server compares; mismatch triggers desync handling.

---

## 5. Files

| File | Purpose |
|------|---------|
| `remake/src/network/NetworkProtocol.ts` | TypeScript interfaces + serialize / deserialize |
| `remake/src/network/GameOrder.ts` | `GameOrder` interface (shared with single-player) |
| `remake/src/network/NetworkManager.ts` | WebSocket client, frame queue, lockstep ticker |
| `server/src/GameServer.ts` | Node.js relay server (Task 63) |

---

## 6. Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-25 | 1.0.0 | Initial protocol definition (Task 61) |
