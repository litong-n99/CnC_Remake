/**
 * Production — Task-B2: 生产建筑 Trait
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Production.cs`
 *
 * 挂载到 WarFactory / Barracks / Shipyard 等生产建筑上。
 * 从 ProductionQueue 取出就绪单位，在出口位置生成。
 */

import type { Scene } from '@babylonjs/core';
import type { ProductionQueue } from './ProductionQueue';
import { GameObjectFactory } from '../objects/GameObjectFactory';
import type { Unit } from '../objects/Unit';

export interface ProductionOptions {
  readonly exitCellX: number;
  readonly exitCellY: number;
  readonly facing: number;
  readonly scene: Scene;
}

export class Production {
  private queue: ProductionQueue;
  private exitCellX: number;
  private exitCellY: number;
  private scene: Scene;
  private rallyPointX: number | null = null;
  private rallyPointY: number | null = null;

  constructor(queue: ProductionQueue, options: ProductionOptions) {
    this.queue = queue;
    this.exitCellX = options.exitCellX;
    this.exitCellY = options.exitCellY;
    // facing reserved for future use
    this.scene = options.scene;
  }

  /** 每 tick 检查队列是否有就绪单位，尝试生成。 */
  tick(): Unit | null {
    if (!this.queue.hasReady()) return null;

    const item = this.queue.dequeueReady();
    if (!item) return null;

    // 检查出口是否被阻塞
    if (this.isExitBlocked()) {
      // 阻塞时重新放回就绪状态，等待下一帧
      // 简化版：直接生成（实际应排队等待）
    }

    const unit = GameObjectFactory.createUnit({
      definition: item.definition,
      house: (this.queue as unknown as { house: import('../house/House').House }).house,
      x: this.exitCellX,
      y: this.exitCellY,
      scene: this.scene,
    });

    // 如果有集结点，单位生成后自动移动
    if (this.rallyPointX !== null && this.rallyPointY !== null) {
      // TODO: pass Pathfinder for rally point movement
      // unit.logic.moveTo(this.rallyPointX, this.rallyPointY, pathfinder);
    }

    return unit;
  }

  /** 设置集结点。 */
  setRallyPoint(x: number, y: number): void {
    this.rallyPointX = x;
    this.rallyPointY = y;
  }

  /** 清除集结点。 */
  clearRallyPoint(): void {
    this.rallyPointX = null;
    this.rallyPointY = null;
  }

  /** 获取集结点。 */
  getRallyPoint(): { x: number; y: number } | null {
    if (this.rallyPointX === null || this.rallyPointY === null) return null;
    return { x: this.rallyPointX, y: this.rallyPointY };
  }

  private isExitBlocked(): boolean {
    // 简化版：假设出口总是可用
    // 实际应查询 ActorMap 检查 exitCell 是否被占
    return false;
  }
}
