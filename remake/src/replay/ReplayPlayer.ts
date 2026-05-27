/**
 * Replay Player — Task 68
 *
 * Loads a `.cncreplay` file and replays orders frame-by-frame.
 * Used for deterministic playback of recorded matches.
 *
 * OpenRA 对标: ReplayConnection.cs (playback side)
 */

import type { ReplayData, ReplayFrame } from './ReplayRecorder';

export class ReplayPlayer {
  private data: ReplayData | null = null;
  private currentIndex = 0;
  private playing = false;
  private speed = 1; // 1x, 2x, 4x

  load(data: ReplayData): void {
    this.data = data;
    this.currentIndex = 0;
    this.playing = false;
  }

  loadFromJSON(json: string): void {
    this.load(JSON.parse(json) as ReplayData);
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  seekToFrame(frame: number): void {
    if (!this.data) return;
    this.currentIndex = this.data.frames.findIndex((f) => f.frame >= frame);
    if (this.currentIndex < 0) this.currentIndex = this.data.frames.length;
  }

  /** Advance one frame and return the orders for that frame (if any). */
  tick(): ReplayFrame | null {
    if (!this.data || !this.playing || this.currentIndex >= this.data.frames.length) {
      return null;
    }
    const frame = this.data.frames[this.currentIndex];
    this.currentIndex++;
    return frame;
  }

  getHeader(): ReplayData['header'] | null {
    return this.data?.header ?? null;
  }

  getCurrentFrameNumber(): number {
    if (!this.data || this.currentIndex >= this.data.frames.length) return -1;
    return this.data.frames[this.currentIndex]?.frame ?? -1;
  }

  getProgress(): number {
    if (!this.data || this.data.frames.length === 0) return 0;
    return this.currentIndex / this.data.frames.length;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  isFinished(): boolean {
    if (!this.data) return true;
    return this.currentIndex >= this.data.frames.length;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  getSpeed(): number {
    return this.speed;
  }
}
