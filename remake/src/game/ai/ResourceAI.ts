/**
 * ResourceAI — Task-AI2
 *
 * 管理 AI 阵营的资源经济：
 * 1. 自动分配 harvester（根据精炼厂数量决定矿车数量）
 * 2. 保护 harvester（派遣空闲战斗单位护卫）
 * 3. 在矿区不足时扩张（建造新精炼厂或移动采矿区域）
 *
 * OpenRA 对标: OpenRA.Mods.Common/Traits/BotModules/HarvesterBotModule.cs
 */

import type { House } from '../house/House';
import { GameObjectManager } from '../objects/GameObjectManager';
import type { Unit } from '../objects/Unit';
import type { Pathfinder } from '../terrain/Pathfinder';
import type { TerrainGrid } from '../terrain/TerrainGrid';
import type { ResourceLayer } from '../economy/ResourceLayer';

export interface ResourceAIOptions {
  /** 每个精炼厂的理想矿车数量，默认 2 */
  harvestersPerRefinery?: number;
  /** 矿车保护半径（格子数），默认 5 */
  escortRadius?: number;
  /** 护卫派遣间隔（ms），默认 10000 */
  escortInterval?: number;
  /** 矿区不足阈值（最近矿距离），默认 15 格 */
  oreDistanceThreshold?: number;
}

interface EscortAssignment {
  harvesterId: string;
  guardId: string | null;
}

export class ResourceAI {
  private harvestersPerRefinery: number;
  private escortInterval: number;
  private oreDistanceThreshold: number;
  private escortCooldown = 0;
  private escorts: EscortAssignment[] = [];

  constructor(
    private house: House,
    private terrain: TerrainGrid,
    private pathfinder: Pathfinder,
    private resourceLayer: ResourceLayer,
    options: ResourceAIOptions = {}
  ) {
    this.harvestersPerRefinery = options.harvestersPerRefinery ?? 2;
    this.escortInterval = options.escortInterval ?? 10000;
    this.oreDistanceThreshold = options.oreDistanceThreshold ?? 15;
  }

  /** 每逻辑帧调用。 */
  tick(deltaTime: number): void {
    // 1. 维护矿车数量
    this.tryBuildHarvesters();

    // 2. 保护矿车
    if (this.escortCooldown <= 0) {
      this.updateEscorts();
      this.escortCooldown = this.escortInterval;
    } else {
      this.escortCooldown -= deltaTime;
    }

    // 3. 检查矿区距离
    this.checkOreDistance();
  }

  /** 获取当前矿车数量。 */
  getHarvesterCount(): number {
    const manager = GameObjectManager.getInstance();
    return manager
      .getUnits()
      .filter((u) => u.house.id === this.house.id && u.definition.id === 'UNIT_HARVESTER' && u.isAlive()).length;
  }

  /** 获取当前精炼厂数量。 */
  getRefineryCount(): number {
    const manager = GameObjectManager.getInstance();
    return manager
      .getBuildings()
      .filter((b) => b.house.id === this.house.id && b.definition.id === 'STRUCT_REFINERY' && b.isAlive()).length;
  }

  /** 获取当前护卫数量。 */
  getEscortCount(): number {
    return this.escorts.filter((e) => e.guardId !== null).length;
  }

  private tryBuildHarvesters(): void {
    const harvesterCount = this.getHarvesterCount();
    const refineryCount = this.getRefineryCount();
    const desiredHarvesters = refineryCount * this.harvestersPerRefinery;

    if (harvesterCount < desiredHarvesters) {
      // 记录需求，由 BaseBuilderAI 或生产队列处理
      // 简化：直接在控制台提示（实际应由 ProductionQueue 触发建造）
      console.warn(`[ResourceAI] Need ${desiredHarvesters - harvesterCount} more harvester(s)`);
    }
  }

  private updateEscorts(): void {
    const manager = GameObjectManager.getInstance();

    // 刷新现有护卫：移除死亡/丢失的单位
    this.escorts = this.escorts.filter((e) => {
      const harvester = manager.get(e.harvesterId);
      return harvester && harvester.isAlive();
    });

    // 获取所有己方矿车
    const harvesters = manager
      .getUnits()
      .filter((u) => u.house.id === this.house.id && u.definition.id === 'UNIT_HARVESTER' && u.isAlive()) as Unit[];

    for (const harvester of harvesters) {
      let assignment = this.escorts.find((e) => e.harvesterId === harvester.id);
      if (!assignment) {
        assignment = { harvesterId: harvester.id, guardId: null };
        this.escorts.push(assignment);
      }

      // 检查现有护卫是否仍然有效
      if (assignment.guardId) {
        const guard = manager.get(assignment.guardId);
        if (!guard || !guard.isAlive()) {
          assignment.guardId = null;
        }
      }

      // 如果没有护卫，尝试分配一个
      if (!assignment.guardId) {
        const guard = this.findIdleGuard(harvester);
        if (guard) {
          assignment.guardId = guard.id;
          // 命令护卫跟随矿车（移动到矿车附近）
          const hx = Math.round(harvester.x);
          const hy = Math.round(harvester.y);
          // 找一个矿车旁边的格子
          const offsets = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 },
          ];
          for (const off of offsets) {
            const tx = hx + off.dx;
            const ty = hy + off.dy;
            if (this.terrain.getCellLayer().contains(tx, ty)) {
              if ('logic' in guard && typeof (guard as Unit).logic.moveTo === 'function') {
                (guard as Unit).logic.moveTo(tx, ty, this.pathfinder);
              }
              break;
            }
          }
          console.warn(`[ResourceAI] Assigning guard ${guard.id} to harvester ${harvester.id}`);
        }
      }
    }
  }

  private findIdleGuard(_harvester: Unit): Unit | null {
    const manager = GameObjectManager.getInstance();

    for (const unit of manager.getUnits()) {
      if (unit.house.id !== this.house.id) continue;
      if (unit.definition.id === 'UNIT_HARVESTER' || unit.definition.id === 'UNIT_MCV') continue;
      if (this.escorts.some((e) => e.guardId === unit.id)) continue; // 已经是护卫
      if (!unit.logic.isMovingBetweenCells && !unit.logic.isDriving) {
        return unit;
      }
    }
    return null;
  }

  private checkOreDistance(): void {
    const manager = GameObjectManager.getInstance();
    const harvesters = manager
      .getUnits()
      .filter((u) => u.house.id === this.house.id && u.definition.id === 'UNIT_HARVESTER' && u.isAlive());

    let farHarvesters = 0;
    for (const harvester of harvesters) {
      const hx = Math.round(harvester.x);
      const hy = Math.round(harvester.y);

      // 检查附近是否有矿石
      let hasNearbyOre = false;
      for (let dx = -this.oreDistanceThreshold; dx <= this.oreDistanceThreshold && !hasNearbyOre; dx++) {
        for (let dy = -this.oreDistanceThreshold; dy <= this.oreDistanceThreshold && !hasNearbyOre; dy++) {
          const x = hx + dx;
          const y = hy + dy;
          if (!this.terrain.getCellLayer().contains(x, y)) continue;
          if (this.resourceLayer.getDensity(x, y) > 0) {
            hasNearbyOre = true;
          }
        }
      }

      if (!hasNearbyOre) {
        farHarvesters++;
      }
    }

    if (farHarvesters > 0) {
      console.warn(`[ResourceAI] ${farHarvesters} harvester(s) far from ore — consider building new refinery`);
    }
  }
}
