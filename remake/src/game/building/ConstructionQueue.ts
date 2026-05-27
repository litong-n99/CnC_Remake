/**
 * 建筑建造队列 — 每个 House 一个队列，一次只能建造一项建筑。
 *
 * 对应 C++ `BuildingClass::Begin_Construction()` 与 Sidebar 生产倒计时逻辑。
 * 资金在点击建造时立即扣除；取消建造（建造中）全额退款。
 */

import type { Scene } from '@babylonjs/core';
import type { BuildingDefinition } from '../rules/BuildingDefinitions';
import type { House } from '../house/House';
import { GameObjectFactory } from '../objects/GameObjectFactory';
import type { Building } from '../objects/Building';
import { TechTree } from './TechTree';

export enum QueueStatus {
  Idle = 'idle',
  Building = 'building',
  Ready = 'ready',
}

interface QueueItem {
  readonly definition: BuildingDefinition;
  elapsed: number;
  readonly totalTime: number;
}

export class ConstructionQueue {
  private readonly house: House;
  private current: QueueItem | null = null;
  private _status = QueueStatus.Idle;

  constructor(house: House) {
    this.house = house;
  }

  // ──  public API  ──

  /** 开始建造某建筑。立即扣款。 */
  startBuilding(definition: BuildingDefinition): boolean {
    if (this._status !== QueueStatus.Idle) return false;
    if (!this.canAfford(definition)) return false;
    if (!this.hasPrerequisites(definition)) return false;
    if (!this.house.economy.takeCash(definition.cost)) return false;

    const totalTime = (definition.buildTime * 1000) / Math.max(0.1, this.house.buildSpeedBias);
    this.current = { definition, elapsed: 0, totalTime };
    this._status = QueueStatus.Building;
    return true;
  }

  /** 每帧更新倒计时。 */
  tick(deltaTime: number): void {
    if (this._status !== QueueStatus.Building || !this.current) return;
    this.current.elapsed += deltaTime;
    if (this.current.elapsed >= this.current.totalTime) {
      this._status = QueueStatus.Ready;
    }
  }

  /**
   * 放置当前就绪的建筑到指定格子。
   * @returns 创建成功的 Building 实例，或 null（状态不对）。
   */
  placeBuilding(cellX: number, cellY: number, scene: Scene): Building | null {
    if (this._status !== QueueStatus.Ready || !this.current) return null;
    const building = GameObjectFactory.createBuilding({
      definition: this.current.definition,
      house: this.house,
      x: cellX,
      y: cellY,
      scene,
    });
    this.current = null;
    this._status = QueueStatus.Idle;
    return building;
  }

  /** 取消当前建造。建造中状态全额退款；就绪状态不退款（建筑保留就绪）。 */
  cancel(): void {
    if (this._status === QueueStatus.Building && this.current) {
      this.house.economy.addCredits(this.current.definition.cost);
    }
    this.current = null;
    this._status = QueueStatus.Idle;
  }

  // ──  查询  ──

  get status(): QueueStatus {
    return this._status;
  }

  get currentDefinition(): BuildingDefinition | null {
    return this.current?.definition ?? null;
  }

  /** 0.0 ~ 1.0 */
  get progress(): number {
    if (!this.current || this.current.totalTime <= 0) return 0;
    return Math.min(1, this.current.elapsed / this.current.totalTime);
  }

  canAfford(definition: BuildingDefinition): boolean {
    return this.house.economy.getTotalSpendable() >= definition.cost;
  }

  hasPrerequisites(definition: BuildingDefinition): boolean {
    return TechTree.canBuildBuilding(definition, this.house);
  }

  isBuilding(definition: BuildingDefinition): boolean {
    return this._status === QueueStatus.Building && this.current?.definition.id === definition.id;
  }

  isReady(definition: BuildingDefinition): boolean {
    return this._status === QueueStatus.Ready && this.current?.definition.id === definition.id;
  }
}
