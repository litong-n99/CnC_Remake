/**
 * ProductionQueue — Task-B1: 单位生产队列
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/ProductionQueue.cs`
 *
 * 管理单位的建造队列（WarFactory / Barracks / Shipyard）。
 * 支持多工厂负载均衡、暂停、取消。
 */

import type { UnitDefinition } from '../rules/UnitDefinitions';

/** 生产队列使用的单位定义扩展（添加 buildTime）。 */
export interface ProducibleUnit extends UnitDefinition {
  readonly buildTime?: number; // 秒，默认 1
}
import type { House } from '../house/House';

export interface ProductionItem {
  readonly definition: UnitDefinition;
  progress: number; // 0–1
  readonly totalTime: number; // ms
  paused: boolean;
}

export class ProductionQueue {
  private readonly house: House;
  private readonly items: ProductionItem[] = [];
  private readyItem: ProductionItem | null = null;

  constructor(house: House) {
    this.house = house;
  }

  /** 将单位加入生产队列。 */
  enqueue(definition: ProducibleUnit): boolean {
    if (!this.canAfford(definition)) return false;
    if (!this.house.economy.takeCash(definition.cost)) return false;

    const buildTime = definition.buildTime ?? 1;
    const totalTime = (buildTime * 1000) / Math.max(0.1, this.house.buildSpeedBias);
    this.items.push({
      definition,
      progress: 0,
      totalTime,
      paused: false,
    });
    return true;
  }

  /** 每 tick 推进队列中第一个项目的进度。 */
  tick(deltaTime: number): void {
    const current = this.items[0];
    if (!current || current.paused) return;

    current.progress += deltaTime / current.totalTime;
    if (current.progress >= 1) {
      this.readyItem = this.items.shift()!;
    }
  }

  /** 取出就绪的单位（由 Production Trait 调用）。 */
  dequeueReady(): ProductionItem | null {
    const item = this.readyItem;
    this.readyItem = null;
    return item;
  }

  /** 是否有就绪的单位待领取。 */
  hasReady(): boolean {
    return this.readyItem !== null;
  }

  /** 取消指定索引的队列项目（全额退款）。 */
  cancel(index: number): boolean {
    const item = this.items[index];
    if (!item) return false;
    this.house.economy.addCredits(item.definition.cost);
    this.items.splice(index, 1);
    return true;
  }

  /** 暂停/恢复指定索引的项目。 */
  togglePause(index: number): boolean {
    const item = this.items[index];
    if (!item) return false;
    item.paused = !item.paused;
    return true;
  }

  /** 当前队列长度（不含就绪项）。 */
  getQueueLength(): number {
    return this.items.length;
  }

  /** 获取队列状态（只读）。 */
  getItems(): readonly ProductionItem[] {
    return this.items;
  }

  /** 第一个项目的进度（0–1）。 */
  getCurrentProgress(): number {
    return this.items[0]?.progress ?? 0;
  }

  private canAfford(definition: UnitDefinition): boolean {
    return this.house.credits >= definition.cost;
  }
}
