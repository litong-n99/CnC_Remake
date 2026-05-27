/**
 * Reconnect Handler — Task 67
 *
 * Manages client reconnection after a network dropout.
 * On reconnect, the server sends a world snapshot (or checkpoint)
 * so the client can resume from the current state.
 *
 * OpenRA 对标: ReplayConnection.cs (replay-from-checkpoint pattern)
 */

export interface ReconnectCheckpoint {
  frame: number;
  snapshot: string; // JSON-serialized world state (placeholder)
}

export class ReconnectHandler {
  private checkpoints: ReconnectCheckpoint[] = [];
  private maxCheckpoints = 10;

  /** Save a checkpoint every N frames. */
  saveCheckpoint(frame: number, worldState: unknown): void {
    const snapshot = JSON.stringify(worldState);
    this.checkpoints.push({ frame, snapshot });
    if (this.checkpoints.length > this.maxCheckpoints) {
      this.checkpoints.shift();
    }
  }

  /** Find the latest checkpoint at or before the given frame. */
  getLatestCheckpoint(frame: number): ReconnectCheckpoint | null {
    for (let i = this.checkpoints.length - 1; i >= 0; i--) {
      if (this.checkpoints[i].frame <= frame) {
        return this.checkpoints[i];
      }
    }
    return null;
  }

  /** Clear all checkpoints (e.g. game ended). */
  clear(): void {
    this.checkpoints = [];
  }

  getCheckpointCount(): number {
    return this.checkpoints.length;
  }
}
