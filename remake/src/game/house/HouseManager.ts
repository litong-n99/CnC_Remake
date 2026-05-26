import { HouseRelationship } from './HouseRelationship';
import { House, HouseType, type HouseOptions } from './House';

/**
 * 单例管理器，持有对局中所有 {@link House} 实例。
 *
 * 对应 C++ 中全局 `HouseClass Houses[HOUSE_COUNT]` 数组与
 * `HouseClass::As_Pointer()` 查找逻辑。
 */
export class HouseManager {
  private static instance: HouseManager | null = null;

  private houses = new Map<HouseType, House>();

  private constructor() {}

  static getInstance(): HouseManager {
    if (!HouseManager.instance) {
      HouseManager.instance = new HouseManager();
    }
    return HouseManager.instance;
  }

  /**
   * 创建并注册一个新的阵营。
   *
   * @param type    — 阵营类型（如 `HouseType.GDI`）。
   * @param options — 可选初始化参数（资金、难度修正等）。
   * @returns 新创建的 House 实例。
   * @throws 如果该类型已被注册。
   */
  createHouse(type: HouseType, options: HouseOptions = {}): House {
    if (this.houses.has(type)) {
      throw new Error(`[HouseManager] House ${HouseType[type]} already exists`);
    }
    const house = new House(type, options);
    this.houses.set(type, house);
    // 新阵营加入后，重新初始化所有阵营的外交关系
    this.reinitializeAllDiplomacy();
    return house;
  }

  /** 重新初始化所有已注册阵营的外交关系。 */
  private reinitializeAllDiplomacy(): void {
    const all = this.getAllHouses();
    const snapshot = all.map((h) => ({ type: h.id, team: h.team }));
    for (const house of all) {
      house.initializeDiplomacy(snapshot);
    }
  }

  /** 按类型获取已注册的阵营。 */
  getHouse(type: HouseType): House | undefined {
    return this.houses.get(type);
  }

  /** 获取所有已注册的阵营。 */
  getAllHouses(): House[] {
    return Array.from(this.houses.values());
  }

  /** 获取由人类玩家控制的阵营（假设只有一个）。 */
  getPlayerHouse(): House | undefined {
    return this.getAllHouses().find((h) => h.isHuman);
  }

  /** 获取所有 AI 控制的阵营。 */
  getAiHouses(): House[] {
    return this.getAllHouses().filter((h) => !h.isHuman);
  }

  /** 获取所有活跃且未战败的阵营。 */
  getActiveHouses(): House[] {
    return this.getAllHouses().filter((h) => h.isActive && !h.isDefeated);
  }

  /** 获取所有敌方阵营（相对于指定阵营，基于外交关系）。 */
  getEnemiesOf(type: HouseType): House[] {
    const house = this.houses.get(type);
    if (!house) return [];
    return this.getActiveHouses().filter((h) => h.id !== type && house.diplomacy.isEnemyWith(h.id));
  }

  /** 获取所有盟友阵营（相对于指定阵营，基于外交关系）。 */
  getAlliesOf(type: HouseType): House[] {
    const house = this.houses.get(type);
    if (!house) return [];
    return this.getActiveHouses().filter((h) => h.id !== type && house.diplomacy.isAlliedWith(h.id));
  }

  /** 获取与指定阵营中立的所有阵营。 */
  getNeutralsOf(type: HouseType): House[] {
    const house = this.houses.get(type);
    if (!house) return [];
    return this.getActiveHouses().filter((h) => h.id !== type && house.diplomacy.isNeutralWith(h.id));
  }

  /** 获取两个阵营之间的外交关系。 */
  getRelationship(a: HouseType, b: HouseType): HouseRelationship {
    const houseA = this.houses.get(a);
    if (!houseA) return HouseRelationship.Enemy;
    return houseA.diplomacy.getRelationship(b);
  }

  /** 检查是否已注册指定阵营。 */
  hasHouse(type: HouseType): boolean {
    return this.houses.has(type);
  }

  /** 注销并释放一个阵营。 */
  removeHouse(type: HouseType): boolean {
    return this.houses.delete(type);
  }

  /** 清除所有阵营（用于新游戏或重置）。 */
  clear(): void {
    this.houses.clear();
  }

  /** 释放单例引用。 */
  dispose(): void {
    this.clear();
    HouseManager.instance = null;
  }
}
