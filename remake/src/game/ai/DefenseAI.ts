/**
 * DefenseAI — Task-AI1
 *
 * 管理 AI 阵营的防御：
 * 1. 修复受损建筑（自动触发维修，如果有资金）
 * 2. 建造防御建筑（Turret / SAMSite）应对威胁
 * 3. 电力危机时优先补充电厂
 *
 * OpenRA 对标: OpenRA.Mods.Common/Traits/BotModules/BuildingRepairBotModule.cs
 */

import type { House } from '../house/House';
import { GameObjectManager } from '../objects/GameObjectManager';
import { BUILDING_DEFINITIONS } from '../rules/BuildingDefinitions';
import { ConstructionQueue, QueueStatus } from '../building/ConstructionQueue';
import { TechTree } from '../building/TechTree';
import type { TerrainGrid } from '../terrain/TerrainGrid';
import { getBuildingFootprint } from '../rules/BuildingDefinitions';
import { ActorMap } from '../world/ActorMap';
import type { Scene } from '@babylonjs/core';

export interface DefenseAIOptions {
  /** 受损阈值（health/maxHealth 低于此值触发维修），默认 0.5 */
  repairThreshold?: number;
  /** 维修资金门槛，默认 500 */
  repairMinCredits?: number;
  /** 防御建筑建造间隔（ms），默认 60000 */
  defenseBuildInterval?: number;
  /** 防御建筑类型列表 */
  defenseBuildings?: string[];
}

export class DefenseAI {
  private repairThreshold: number;
  private repairMinCredits: number;
  private defenseBuildInterval: number;
  private defenseBuildings: string[];
  private defenseCooldown = 0;
  private repairQueue = new Set<string>(); // building IDs being repaired
  private constructionQueue: ConstructionQueue;
  private placingDefense = false;
  private pendingDefenseDef: (typeof BUILDING_DEFINITIONS)[string] | null = null;

  constructor(
    private house: House,
    private terrain: TerrainGrid,
    private scene: Scene,
    options: DefenseAIOptions = {}
  ) {
    this.repairThreshold = options.repairThreshold ?? 0.5;
    this.repairMinCredits = options.repairMinCredits ?? 500;
    this.defenseBuildInterval = options.defenseBuildInterval ?? 60000;
    this.defenseBuildings = options.defenseBuildings ?? ['Turret', 'SAMSite'];
    this.constructionQueue = new ConstructionQueue(house);
  }

  /** 每逻辑帧调用。 */
  tick(deltaTime: number): void {
    this.constructionQueue.tick(deltaTime);

    // 1. 修复受损建筑
    this.tryRepairDamagedBuildings();

    // 2. 处理防御建筑建造队列
    switch (this.constructionQueue.status) {
      case QueueStatus.Idle:
        this.tryBuildDefense();
        break;
      case QueueStatus.Ready:
        this.tryPlaceDefenseBuilding();
        break;
      case QueueStatus.Building:
        break;
    }

    // 3. 防御建造冷却
    if (this.defenseCooldown > 0) {
      this.defenseCooldown -= deltaTime;
    }
  }

  /** 获取当前受损建筑数量。 */
  getDamagedBuildingCount(): number {
    const manager = GameObjectManager.getInstance();
    let count = 0;
    for (const obj of manager.getBuildings()) {
      if (obj.house.id === this.house.id && obj.isAlive() && obj.health < obj.maxHealth * this.repairThreshold) {
        count++;
      }
    }
    return count;
  }

  /** 获取正在修复的建筑数量。 */
  getRepairingCount(): number {
    return this.repairQueue.size;
  }

  private tryRepairDamagedBuildings(): void {
    if (this.house.credits < this.repairMinCredits) return;

    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getBuildings()) {
      if (obj.house.id !== this.house.id) continue;
      if (!obj.isAlive()) continue;
      if (this.repairQueue.has(obj.id)) continue;

      const ratio = obj.health / obj.maxHealth;
      if (ratio < this.repairThreshold) {
        // 简化维修：直接扣除资金恢复生命值（C&C 原版的扳手维修）
        const repairCost = Math.ceil((obj.maxHealth - obj.health) * 0.1);
        if (this.house.credits >= repairCost) {
          this.house.addCredits(-repairCost);
          obj.health = Math.min(obj.maxHealth, obj.health + obj.maxHealth * 0.2);
          this.repairQueue.add(obj.id);
          console.warn(`[DefenseAI] Repairing ${obj.id} (${obj.definition.name}) for ${repairCost} credits`);
        }
      }
    }

    // 清理已修复完毕的建筑
    for (const id of this.repairQueue) {
      const obj = manager.get(id);
      if (!obj || !obj.isAlive() || obj.health >= obj.maxHealth * 0.95) {
        this.repairQueue.delete(id);
      }
    }
  }

  private tryBuildDefense(): void {
    if (this.defenseCooldown > 0) return;
    if (this.placingDefense) return;

    // 检查是否需要更多防御（根据基地大小和敌方威胁评估）
    const manager = GameObjectManager.getInstance();
    const myBuildings = manager.getBuildings().filter((b) => b.house.id === this.house.id && b.isAlive());
    const myDefenseCount = myBuildings.filter(
      (b) => b.definition.id === 'STRUCT_TURRET' || b.definition.id === 'STRUCT_SAM'
    ).length;

    // 简单启发式：每 3 个建筑配 1 个防御
    if (myDefenseCount >= Math.ceil(myBuildings.length / 3)) return;

    // 选择一个可建造的防御建筑
    for (const key of this.defenseBuildings) {
      const def = BUILDING_DEFINITIONS[key];
      if (!def) continue;
      if (!TechTree.canBuildBuilding(def, this.house, false)) continue;

      const started = this.constructionQueue.startBuilding(def);
      if (started) {
        this.pendingDefenseDef = def;
        this.placingDefense = true;
        this.defenseCooldown = this.defenseBuildInterval;
        console.warn(`[DefenseAI] Starting construction of ${def.name}`);
        return;
      }
    }
  }

  private tryPlaceDefenseBuilding(): void {
    if (!this.pendingDefenseDef) return;
    const loc = this.findDefensePlacement(this.pendingDefenseDef);
    if (!loc) return;

    const building = this.constructionQueue.placeBuilding(loc.x, loc.y, this.scene);
    if (building) {
      console.warn(`[DefenseAI] Placed ${this.pendingDefenseDef.name} at (${loc.x}, ${loc.y})`);
    }
    this.pendingDefenseDef = null;
    this.placingDefense = false;
  }

  private findDefensePlacement(def: (typeof BUILDING_DEFINITIONS)[string]): { x: number; y: number } | null {
    const footprint = getBuildingFootprint(def);
    const manager = GameObjectManager.getInstance();

    // 找到己方基地中心
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const obj of manager.getBuildings()) {
      if (obj.house.id === this.house.id && obj.isAlive()) {
        sumX += obj.x;
        sumY += obj.y;
        count++;
      }
    }
    const centerX = count > 0 ? Math.round(sumX / count) : Math.round(this.terrain.getWidth() / 2);
    const centerY = count > 0 ? Math.round(sumY / count) : Math.round(this.terrain.getHeight() / 2);

    // 螺旋搜索：优先放在基地边缘（半径 3-8）
    const maxRadius = Math.max(this.terrain.getWidth(), this.terrain.getHeight());
    for (let radius = 3; radius < Math.min(maxRadius, 15); radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const cx = centerX + dx;
          const cy = centerY + dy;
          if (this.isValidPlacement(cx, cy, footprint)) {
            return { x: cx, y: cy };
          }
        }
      }
    }
    return null;
  }

  private isValidPlacement(
    cx: number,
    cy: number,
    footprint: readonly { readonly dx: number; readonly dy: number }[]
  ): boolean {
    for (const cell of footprint) {
      const x = cx + cell.dx;
      const y = cy + cell.dy;
      if (!this.terrain.getCellLayer().contains(x, y)) return false;
      if (this.terrain.getCellLandType(x, y) === 2 /* Water */) return false;
      if (this.terrain.getCellLandType(x, y) === 3 /* Rock */) return false;
      if (ActorMap.getInstance().isOccupied(x, y)) return false;
    }
    return true;
  }
}
