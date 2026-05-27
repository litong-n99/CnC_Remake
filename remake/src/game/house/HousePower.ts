/**
 * 电力系统自动汇总 — Task 23.32
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Power/Player/PowerManager.cs`
 *
 * 将当前外部显式调用 `house.updatePower()` 改为建筑自注册模式：
 * - 建筑 `onPlaced()` 时自注册电力贡献到所属 House
 * - 建筑 `onDestroyed()` / `onSold()` 时自动注销
 * - 低电力状态变化时触发事件
 */

import type { House } from './House';

interface BuildingPowerEntry {
  readonly buildingId: string;
  readonly production: number;
  readonly consumption: number;
}

export class HousePower {
  private readonly owner: House;
  private entries = new Map<string, BuildingPowerEntry>();
  private _totalProduction = 0;
  private _totalConsumption = 0;
  private _wasLowPower = false;

  /** 低电力状态变化时的回调。 */
  onLowPowerChanged: ((isLowPower: boolean) => void) | null = null;

  constructor(owner: House) {
    this.owner = owner;
  }

  /** 注册建筑的电力贡献。 */
  registerBuilding(buildingId: string, power: number): void {
    const production = Math.max(0, power);
    const consumption = Math.max(0, -power);
    this.entries.set(buildingId, { buildingId, production, consumption });
    this.recalculate();
  }

  /** 注销建筑的电力贡献。 */
  unregisterBuilding(buildingId: string): void {
    if (this.entries.delete(buildingId)) {
      this.recalculate();
    }
  }

  /** 重新计算总电力。 */
  private recalculate(): void {
    let production = 0;
    let consumption = 0;
    for (const entry of this.entries.values()) {
      production += entry.production;
      consumption += entry.consumption;
    }
    this._totalProduction = production;
    this._totalConsumption = consumption;

    // 同步到 House 的 legacy 字段
    this.owner.power = production;
    this.owner.drain = consumption;

    // 触发低电力状态变化事件
    const isLowPower = this.getBalance() < 0;
    if (isLowPower !== this._wasLowPower) {
      this._wasLowPower = isLowPower;
      this.onLowPowerChanged?.(isLowPower);
    }
  }

  /** 总电力产出。 */
  get totalProduction(): number {
    return this._totalProduction;
  }

  /** 总电力消耗。 */
  get totalConsumption(): number {
    return this._totalConsumption;
  }

  /** 电力余额（产出 - 消耗）。 */
  getBalance(): number {
    return this._totalProduction - this._totalConsumption;
  }

  /** 是否处于低电力状态。 */
  isLowPower(): boolean {
    return this.getBalance() < 0;
  }

  /** 获取当前注册的建筑数量。 */
  getRegisteredCount(): number {
    return this.entries.size;
  }

  /** 清空所有注册（用于重置/新游戏）。 */
  clear(): void {
    this.entries.clear();
    this._totalProduction = 0;
    this._totalConsumption = 0;
    this._wasLowPower = false;
  }
}
