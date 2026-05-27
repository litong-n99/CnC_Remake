/**
 * 建筑工具系统 — Task 51
 *
 * Sell（出售）：点击建筑获得一半资金，建筑消失。
 * Repair（维修）：点击受损建筑开始维修（消耗资金，恢复生命值）。
 * Power（电力）：点击建筑切换电力状态（预留接口）。
 */

import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';
import { Building } from '../objects/Building';

export type ToolMode = 'normal' | 'sell' | 'repair' | 'power';

export class BuildingTools {
  private mode: ToolMode = 'normal';

  get currentMode(): ToolMode {
    return this.mode;
  }

  setMode(mode: ToolMode): void {
    this.mode = mode;
  }

  /** Sell 建筑：返还 50% 资金 */
  sellBuilding(buildingId: string): { success: boolean; refund: number; message: string } {
    const manager = GameObjectManager.getInstance();
    const obj = manager.get(buildingId);
    if (!obj || obj.type !== GameObjectType.Building) {
      return { success: false, refund: 0, message: 'Not a building' };
    }

    const building = obj as Building;
    const refund = Math.floor(building.definition.cost * 0.5);
    building.house.addCredits(refund);
    building.house.removeBuilding(building.definition.id);
    building.onSold();
    manager.unregister(buildingId);

    return { success: true, refund, message: `Sold ${building.definition.name} for $${refund}` };
  }

  /** Repair 建筑：消耗资金恢复生命值（每点生命 $1） */
  repairBuilding(buildingId: string): { success: boolean; cost: number; message: string } {
    const manager = GameObjectManager.getInstance();
    const obj = manager.get(buildingId);
    if (!obj || obj.type !== GameObjectType.Building) {
      return { success: false, cost: 0, message: 'Not a building' };
    }

    const building = obj as Building;
    const missingHealth = building.maxHealth - building.logic.currentHealth;
    if (missingHealth <= 0) {
      return { success: false, cost: 0, message: 'Building is at full health' };
    }

    const cost = missingHealth; // $1 per HP
    if (building.house.economy.getTotalSpendable() < cost) {
      return { success: false, cost, message: 'Insufficient funds for repair' };
    }

    building.house.economy.takeCash(cost);
    building.logic.currentHealth = building.maxHealth;

    return { success: true, cost, message: `Repaired ${building.definition.name} for $${cost}` };
  }

  /** 尝试对指定 ID 的对象使用当前工具 */
  applyTool(targetId: string): { success: boolean; message: string } {
    switch (this.mode) {
      case 'sell':
        return this.sellBuilding(targetId);
      case 'repair': {
        const result = this.repairBuilding(targetId);
        return { success: result.success, message: result.message };
      }
      case 'power':
        return { success: false, message: 'Power toggle not yet implemented' };
      default:
        return { success: false, message: 'No tool selected' };
    }
  }
}
