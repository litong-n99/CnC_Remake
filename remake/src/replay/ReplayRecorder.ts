/**
 * Replay Recorder — Task 68
 *
 * Records all GameOrders + initial seed + map info during a match.
 * Output format: `.cncreplay` (JSON internally, can be exported as Blob).
 *
 * OpenRA 对标: ReplayConnection.cs (recording side)
 */

import type { GameOrder } from '../game/order/GameOrder';

export interface ReplayHeader {
  version: number;
  seed: number;
  mapName: string;
  timestamp: number;
  players: string[];
}

export interface ReplayFrame {
  frame: number;
  orders: GameOrder[];
}

export interface ReplayData {
  header: ReplayHeader;
  frames: ReplayFrame[];
}

export class ReplayRecorder {
  private data: ReplayData;
  private recording = false;

  constructor() {
    this.data = {
      header: { version: 1, seed: 0, mapName: '', timestamp: 0, players: [] },
      frames: [],
    };
  }

  start(seed: number, mapName: string, players: string[]): void {
    this.data.header = {
      version: 1,
      seed,
      mapName,
      timestamp: Date.now(),
      players,
    };
    this.data.frames = [];
    this.recording = true;
  }

  recordFrame(frame: number, orders: GameOrder[]): void {
    if (!this.recording) return;
    this.data.frames.push({ frame, orders: orders.slice() });
  }

  stop(): ReplayData {
    this.recording = false;
    return this.data;
  }

  isRecording(): boolean {
    return this.recording;
  }

  getFrameCount(): number {
    return this.data.frames.length;
  }

  /** Export as a JSON string. */
  toJSON(): string {
    return JSON.stringify(this.data);
  }

  /** Export as a Blob for download. */
  toBlob(): Blob {
    return new Blob([this.toJSON()], { type: 'application/json' });
  }

  /** Load from a JSON string (for verification). */
  static fromJSON(json: string): ReplayData {
    return JSON.parse(json) as ReplayData;
  }
}
