/**
 * 电力管理器 — 判断建筑是否因电力不足而停摆。
 *
 * Source: origin/REDALERT/BUILDING.CPP, Line ~3053
 * Original: if (Class->IsPowered && House->Power_Fraction() < 1) return FIRE_BUSY;
 *
 * 在原始 C&C 中，Class->IsPowered 为 true 的建筑在电力不足时：
 * - 防御建筑不能开火
 * - 炮塔停止旋转
 * - 雷达失效
 * - 特斯拉线圈停止充电
 * - 生产建筑速度减半（Task 23 暂不模拟生产速度，仅标记停摆状态）
 */

import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';
import { Building } from '../objects/Building';

/**
 * 单例管理器，提供全局电力状态查询。
 *
 * 不主动修改 House 的 power/drain（由外部 `updateHousePower` 维护），
 * 只根据当前电力余额判断建筑是否可用。
 */
export class PowerManager {
  private static instance: PowerManager | null = null;

  private constructor() {}

  static getInstance(): PowerManager {
    if (!PowerManager.instance) {
      PowerManager.instance = new PowerManager();
    }
    return PowerManager.instance;
  }

  /**
   * 检查某建筑是否处于有电状态。
   *
   * @returns `true` = 建筑功能正常（不需要电力，或电力充足）；
   *          `false` = 建筑因电力不足而停摆。
   */
  isBuildingPowered(building: Building): boolean {
    if (!building.definition.requiresPower) return true;
    if (!building.isAlive()) return false;
    return building.house.getPowerBalance() >= 0;
  }

  /** 获取所有因电力不足而停摆的建筑列表。 */
  getUnpoweredBuildings(): Building[] {
    const result: Building[] = [];
    for (const obj of GameObjectManager.getInstance().getBuildings()) {
      if (obj.type !== GameObjectType.Building) continue;
      const b = obj as Building;
      if (b.isAlive() && !this.isBuildingPowered(b)) {
        result.push(b);
      }
    }
    return result;
  }

  /** 获取指定阵营中因电力不足而停摆的建筑列表。 */
  getUnpoweredBuildingsForHouse(houseId: number): Building[] {
    return this.getUnpoweredBuildings().filter((b) => b.house.id === houseId);
  }

  dispose(): void {
    PowerManager.instance = null;
  }
}
