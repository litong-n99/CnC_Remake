/**
 * 矿车 AI — Task 30
 * Source: origin/REDALERT/UNIT.CPP (Mission_Harvest, Harvesting, Goto_Tiberium)
 *
 * 状态机：
 *   IDLE → LOOKING → HARVESTING → FINDHOME → HEADINGHOME → UNLOADING → LOOKING → ...
 *
 * 简化版（MVP）：
 *   - 寻找最近资源格（扫描 ResourceLayer）
 *   - 移动到资源格，开始采集（每 tick 减少 ResourceLayer 密度，增加负载）
 *   - 满载或资源耗尽后，寻找最近矿厂
 *   - 移动到矿厂，卸货（增加 House credits）
 *   - 循环
 */

import type { ResourceLayer } from './ResourceLayer';
import type { Pathfinder } from '../terrain/Pathfinder';
import type { UnitController } from '../unit/Unit';
import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';
import type { Building } from '../objects/Building';

export enum HarvestState {
  Idle = 'IDLE',
  Looking = 'LOOKING',
  Harvesting = 'HARVESTING',
  FindHome = 'FINDHOME',
  HeadingHome = 'HEADINGHOME',
  Unloading = 'UNLOADING',
}

export interface HarvesterOptions {
  /** 最大负载量（单位：资源密度单位）。 */
  maxLoad?: number;
  /** 每 tick 采集量。 */
  harvestRate?: number;
  /** 每单位资源的信用值。 */
  resourceValue?: number;
  /** 寻找资源的最大扫描半径（格子数）。 */
  scanRadius?: number;
}

/**
 * 矿车 AI 控制器。
 *
 * 绑定到 UnitController，在 tick() 中驱动状态机。
 */
export class HarvesterAI {
  private state = HarvestState.Idle;
  private readonly resourceLayer: ResourceLayer;
  private readonly pathfinder: Pathfinder;
  private readonly unit: UnitController;

  private readonly maxLoad: number;
  private readonly harvestRate: number;
  private readonly resourceValue: number;
  private readonly scanRadius: number;

  /** 当前负载。 */
  load = 0;

  /** 目标矿厂 ID。 */
  private targetRefineryId?: string;

  constructor(
    unit: UnitController,
    resourceLayer: ResourceLayer,
    pathfinder: Pathfinder,
    options: HarvesterOptions = {}
  ) {
    this.unit = unit;
    this.resourceLayer = resourceLayer;
    this.pathfinder = pathfinder;

    this.maxLoad = options.maxLoad ?? 100;
    this.harvestRate = options.harvestRate ?? 5;
    this.resourceValue = options.resourceValue ?? 25;
    this.scanRadius = options.scanRadius ?? 30;
  }

  /** 开始采矿循环。 */
  start(): void {
    if (this.state === HarvestState.Idle) {
      this.transition(HarvestState.Looking);
    }
  }

  /** 停止采矿，回到 Idle。 */
  stop(): void {
    this.targetRefineryId = undefined;
    this.transition(HarvestState.Idle);
  }

  /** 当前状态。 */
  getState(): HarvestState {
    return this.state;
  }

  /** 是否正在采矿流程中。 */
  isActive(): boolean {
    return this.state !== HarvestState.Idle;
  }

  /** 每逻辑帧调用（由 UnitController.tick 驱动）。 */
  tick(): void {
    switch (this.state) {
      case HarvestState.Looking:
        this.tickLooking();
        break;
      case HarvestState.Harvesting:
        this.tickHarvesting();
        break;
      case HarvestState.FindHome:
        this.tickFindHome();
        break;
      case HarvestState.HeadingHome:
        this.tickHeadingHome();
        break;
      case HarvestState.Unloading:
        this.tickUnloading();
        break;
      case HarvestState.Idle:
        // nothing
        break;
    }
  }

  // ── 状态 Tick 实现 ──

  private tickLooking(): void {
    // 如果已经在资源格上，直接开始采集
    const cx = Math.round(this.unit.x);
    const cy = Math.round(this.unit.y);
    if (this.resourceLayer.isHarvestable(cx, cy)) {
      this.transition(HarvestState.Harvesting);
      return;
    }

    // 寻找最近的资源格
    const nearest = this.findNearestResource();
    if (nearest) {
      const moved = this.unit.moveTo(nearest.x, nearest.y, this.pathfinder);
      if (moved) {
        this.transition(HarvestState.Harvesting);
      } else {
        // 无法到达，尝试其他资源或闲置
        this.transition(HarvestState.Idle);
      }
    } else {
      // 找不到资源，闲置
      this.transition(HarvestState.Idle);
    }
  }

  private tickHarvesting(): void {
    // 如果正在移动中，等待到达
    if (this.unit.isDriving || this.unit.isMovingBetweenCells) {
      return;
    }

    const cx = Math.round(this.unit.x);
    const cy = Math.round(this.unit.y);

    // 检查是否仍在资源格上
    if (!this.resourceLayer.isHarvestable(cx, cy)) {
      // 资源耗尽或不在资源格上
      if (this.load >= this.maxLoad * 0.5) {
        // 至少半满，去卸货
        this.transition(HarvestState.FindHome);
      } else {
        // 寻找新资源
        this.transition(HarvestState.Looking);
      }
      return;
    }

    // 执行采集
    const amount = this.resourceLayer.harvest(cx, cy, this.harvestRate);
    this.load += amount;
    this.unit.tiberiumLoad = this.load;
    this.unit.isHarvesting = true;

    // 检查是否满载
    if (this.load >= this.maxLoad) {
      this.load = this.maxLoad;
      this.unit.tiberiumLoad = this.load;
      this.transition(HarvestState.FindHome);
    } else if (amount === 0) {
      // 资源耗尽
      this.transition(HarvestState.FindHome);
    }
  }

  private tickFindHome(): void {
    const refinery = this.findNearestRefinery();
    if (refinery) {
      this.targetRefineryId = refinery.id;
      // 移动到矿厂附近（使用矿厂的第一个 footprint 格子）
      const rx = Math.round(refinery.x);
      const ry = Math.round(refinery.y);
      const moved = this.unit.moveTo(rx, ry, this.pathfinder);
      if (moved) {
        this.transition(HarvestState.HeadingHome);
      } else {
        // 无法到达，可能矿厂被堵
        this.transition(HarvestState.Idle);
      }
    } else {
      // 没有矿厂，闲置
      this.transition(HarvestState.Idle);
    }
  }

  private tickHeadingHome(): void {
    // 等待到达
    if (this.unit.isDriving || this.unit.isMovingBetweenCells) {
      return;
    }

    // 检查是否到达矿厂附近
    if (this.targetRefineryId) {
      const refinery = GameObjectManager.getInstance().get(this.targetRefineryId);
      if (refinery && refinery.isAlive()) {
        const dx = this.unit.x - refinery.x;
        const dy = this.unit.y - refinery.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 3) {
          this.transition(HarvestState.Unloading);
          return;
        }
      }
    }

    // 未到达，重新寻找矿厂
    this.transition(HarvestState.FindHome);
  }

  private tickUnloading(): void {
    // 卸货：将负载转换为矿石储量（Task 30.5 双轨经济）
    if (this.load > 0 && this.targetRefineryId) {
      const refinery = GameObjectManager.getInstance().get(this.targetRefineryId) as Building | undefined;
      if (refinery && refinery.isAlive()) {
        // 存入 resources（受 capacity 限制）
        const stored = refinery.house.economy.giveResources(this.load);
        // 超出 capacity 的部分直接转为 cash
        const overflow = this.load - stored;
        if (overflow > 0) {
          refinery.house.economy.addCredits(overflow * this.resourceValue);
        }
        // 记录精炼收入（统计兼容）
        refinery.house.harvestedCredits += this.load * this.resourceValue;
      }
    }

    // 清空负载
    this.load = 0;
    this.unit.tiberiumLoad = 0;
    this.unit.isHarvesting = false;
    this.targetRefineryId = undefined;

    // 卸货完成，继续采矿
    this.transition(HarvestState.Looking);
  }

  // ── 辅助方法 ──

  private transition(newState: HarvestState): void {
    this.state = newState;
  }

  /** 寻找最近的资源格。 */
  private findNearestResource(): { x: number; y: number } | undefined {
    const cells = this.resourceLayer.getHarvestableCells();
    if (cells.length === 0) return undefined;

    let best: { x: number; y: number } | undefined;
    let bestDist = Infinity;

    for (const cell of cells) {
      const dx = cell.x - this.unit.x;
      const dy = cell.y - this.unit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist && dist <= this.scanRadius) {
        bestDist = dist;
        best = { x: cell.x, y: cell.y };
      }
    }

    return best;
  }

  /** 寻找最近的属于同一阵营的矿厂。 */
  private findNearestRefinery(): Building | undefined {
    const manager = GameObjectManager.getInstance();
    let best: Building | undefined;
    let bestDist = Infinity;

    for (const obj of manager.getAll()) {
      if (!obj.isAlive()) continue;
      if (obj.type !== GameObjectType.Building) continue;

      const building = obj as Building;
      // 必须是矿厂且属于同一阵营
      if (!building.definition.isRefinery) continue;
      if (building.house.id !== this.unit.owner.id) continue;

      const dx = building.x - this.unit.x;
      const dy = building.y - this.unit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = building;
      }
    }

    return best;
  }
}
