/**
 * HouseProduction — Task 100 (House 拆分)
 *
 * 管理阵营的生产设施计数与当前单位/建筑计数。
 */

export class HouseProduction {
  // ── 生产设施计数 ──
  aircraftFactories = 0;
  infantryFactories = 0;
  unitFactories = 0;
  vesselFactories = 0;
  buildingFactories = 0;

  // ── 当前单位计数 ──
  curUnits = 0;
  curBuildings = 0;
  curInfantry = 0;
  curVessels = 0;
  curAircraft = 0;

  // ── 已建造类型集合 ──
  availableBuildings = new Set<string>();
  availableUnits = new Set<string>();
  availableInfantry = new Set<string>();
  availableAircraft = new Set<string>();
  availableVessels = new Set<string>();

  addBuilding(typeId: string): void {
    this.curBuildings++;
    this.availableBuildings.add(typeId);
  }

  addUnit(typeId: string): void {
    this.curUnits++;
    this.availableUnits.add(typeId);
  }

  addInfantry(typeId: string): void {
    this.curInfantry++;
    this.availableInfantry.add(typeId);
  }

  addAircraft(typeId: string): void {
    this.curAircraft++;
    this.availableAircraft.add(typeId);
  }

  addVessel(typeId: string): void {
    this.curVessels++;
    this.availableVessels.add(typeId);
  }

  removeBuilding(typeId: string, isLastOfType = false): void {
    this.curBuildings = Math.max(0, this.curBuildings - 1);
    if (isLastOfType) {
      this.availableBuildings.delete(typeId);
    }
  }

  removeUnit(): void {
    this.curUnits = Math.max(0, this.curUnits - 1);
  }

  removeInfantry(): void {
    this.curInfantry = Math.max(0, this.curInfantry - 1);
  }

  removeAircraft(): void {
    this.curAircraft = Math.max(0, this.curAircraft - 1);
  }

  removeVessel(): void {
    this.curVessels = Math.max(0, this.curVessels - 1);
  }

  hasBuilding(typeId: string): boolean {
    return this.availableBuildings.has(typeId);
  }

  hasUnit(typeId: string): boolean {
    return this.availableUnits.has(typeId);
  }

  getTotalObjects(): number {
    return this.curBuildings + this.curUnits + this.curInfantry + this.curAircraft + this.curVessels;
  }
}
