/**
 * Lockstep Adapter — Task 65
 *
 * Bridges RoomClient (network) and GameLoop (simulation).
 * Ensures deterministic simulation by only advancing logic ticks
 * after receiving the aggregated OrderFrame from the server.
 *
 * OpenRA 对标: OrderManager.TryTick()
 */

import type { RoomClient } from './RoomClient';
import type { GameLoop } from '../game/GameLoop';
import type { OrderFrameMessage, GameStartMessage } from './NetworkProtocol';

export interface LockstepAdapterOptions {
  roomClient: RoomClient;
  gameLoop: GameLoop;
  localPlayerId: string;
}

export class LockstepAdapter {
  private roomClient: RoomClient;
  private gameLoop: GameLoop;
  // localPlayerId reserved for future order tagging
  // private localPlayerId: string;
  private started = false;
  private currentFrame = 0;

  constructor(options: LockstepAdapterOptions) {
    this.roomClient = options.roomClient;
    this.gameLoop = options.gameLoop;
    // this.localPlayerId = options.localPlayerId;
  }

  /** Start lockstep: enable lockstep mode and wire up network callbacks. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.gameLoop.setLockstepMode(true);

    this.roomClient.onGameStart = (_msg: GameStartMessage) => {
      this.currentFrame = 0;
    };

    this.roomClient.onOrderFrame = (msg: OrderFrameMessage) => {
      if (msg.frame === this.currentFrame) {
        this.gameLoop.approveLogicStep();
        this.currentFrame++;
      }
    };
  }

  /** Stop lockstep and revert to local simulation. */
  stop(): void {
    this.started = false;
    this.gameLoop.setLockstepMode(false);
    this.roomClient.onGameStart = null;
    this.roomClient.onOrderFrame = null;
  }

  /** Submit local orders for the current frame to the server. */
  submitOrders(orders: OrderFrameMessage['orders']): void {
    if (!this.started) return;
    this.roomClient.sendOrderFrame(this.currentFrame, orders);
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  isStarted(): boolean {
    return this.started;
  }
}
