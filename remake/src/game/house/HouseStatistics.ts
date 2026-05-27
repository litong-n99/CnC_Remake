/**
 * HouseStatistics — Task 100 (House 拆分)
 *
 * 管理阵营的摧毁/建造/击杀统计。
 */

export class HouseStatistics {
  destroyedBuildings = 0;
  destroyedUnits = 0;
  destroyedInfantry = 0;
  destroyedAircraft = 0;
  destroyedVessels = 0;
  capturedBuildings = 0;
  totalCrates = 0;

  /** 建筑被摧毁。 */
  onBuildingDestroyed(): void {
    this.destroyedBuildings++;
  }

  /** 单位被摧毁。 */
  onUnitDestroyed(): void {
    this.destroyedUnits++;
  }

  /** 步兵被摧毁。 */
  onInfantryDestroyed(): void {
    this.destroyedInfantry++;
  }

  /** 飞行器被摧毁。 */
  onAircraftDestroyed(): void {
    this.destroyedAircraft++;
  }

  /** 舰船被摧毁。 */
  onVesselDestroyed(): void {
    this.destroyedVessels++;
  }

  /** 建筑被占领。 */
  onBuildingCaptured(): void {
    this.capturedBuildings++;
  }

  /** 拾取箱子。 */
  onCrateCollected(): void {
    this.totalCrates++;
  }
}
