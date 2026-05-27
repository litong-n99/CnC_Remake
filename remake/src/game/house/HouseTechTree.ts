/**
 * HouseTechTree — Task 100 (House 拆分)
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Player/TechTree.cs`
 *
 * 管理阵营的科技树状态：可建造类型集合 + 前提条件检查。
 * 当前为静态集合，Task 101 升级为 Watcher 机制。
 */

export class HouseTechTree {
  /** 已拥有的建筑类型。 */
  availableBuildings = new Set<string>();
  /** 已拥有的单位类型。 */
  availableUnits = new Set<string>();
  /** 已拥有的步兵类型。 */
  availableInfantry = new Set<string>();
  /** 已拥有的飞行器类型。 */
  availableAircraft = new Set<string>();
  /** 已拥有的舰船类型。 */
  availableVessels = new Set<string>();

  /** 是否拥有指定建筑类型。 */
  hasBuilding(typeId: string): boolean {
    return this.availableBuildings.has(typeId);
  }

  /** 是否拥有指定单位类型。 */
  hasUnit(typeId: string): boolean {
    return this.availableUnits.has(typeId);
  }

  /** 添加建筑类型到科技树。 */
  addBuilding(typeId: string): void {
    this.availableBuildings.add(typeId);
  }

  /** 添加单位类型到科技树。 */
  addUnit(typeId: string): void {
    this.availableUnits.add(typeId);
  }

  /** 添加步兵类型到科技树。 */
  addInfantry(typeId: string): void {
    this.availableInfantry.add(typeId);
  }

  /** 添加飞行器类型到科技树。 */
  addAircraft(typeId: string): void {
    this.availableAircraft.add(typeId);
  }

  /** 添加舰船类型到科技树。 */
  addVessel(typeId: string): void {
    this.availableVessels.add(typeId);
  }

  /** 移除建筑类型（当最后一个该类型建筑被摧毁时）。 */
  removeBuilding(typeId: string): void {
    this.availableBuildings.delete(typeId);
  }

  /** 清空科技树（新游戏/重置用）。 */
  clear(): void {
    this.availableBuildings.clear();
    this.availableUnits.clear();
    this.availableInfantry.clear();
    this.availableAircraft.clear();
    this.availableVessels.clear();
  }
}
