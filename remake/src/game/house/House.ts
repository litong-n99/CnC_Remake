/**
 * House (阵营 / 玩家) 数据层，翻译自 `origin/REDALERT/HOUSE.CPP`。
 *
 * 每个 House 实例代表一局游戏中的一个阵营（玩家、AI 或中立），
 * 独立管理资金、电力、已建造单位列表与难度修正。
 */

import { HouseRelationship, HouseDiplomacy } from './HouseRelationship';
import { HousePower } from './HousePower';

/** 阵营类型 — 映射 C++ `HousesType` (`DEFINES.H:1171`)。 */
export enum HouseType {
  None = -1,
  Spain = 0,
  Greece = 1,
  USSR = 2,
  England = 3,
  Ukraine = 4,
  Germany = 5,
  France = 6,
  Turkey = 7,
  GDI = 8,
  Nod = 9,
  Neutral = 10,
  JP = 11,
  Multi1 = 12,
  Multi2 = 13,
  Multi3 = 14,
  Multi4 = 15,
  Multi5 = 16,
  Multi6 = 17,
  Multi7 = 18,
  Multi8 = 19,
}

/** 阵营名称与颜色映射（与 C++ 侧栏配色一致）。 */
export const HOUSE_METADATA: Record<HouseType, { readonly name: string; readonly color: string }> = {
  [HouseType.None]: { name: 'None', color: '#888888' },
  [HouseType.Spain]: { name: 'Spain', color: '#FFD700' },
  [HouseType.Greece]: { name: 'Greece', color: '#87CEEB' },
  [HouseType.USSR]: { name: 'USSR', color: '#CC0000' },
  [HouseType.England]: { name: 'England', color: '#228B22' },
  [HouseType.Ukraine]: { name: 'Ukraine', color: '#FF8C00' },
  [HouseType.Germany]: { name: 'Germany', color: '#808080' },
  [HouseType.France]: { name: 'France', color: '#4169E1' },
  [HouseType.Turkey]: { name: 'Turkey', color: '#8B4513' },
  [HouseType.GDI]: { name: 'GDI', color: '#FFD700' },
  [HouseType.Nod]: { name: 'Nod', color: '#CC0000' },
  [HouseType.Neutral]: { name: 'Neutral', color: '#A9A9A9' },
  [HouseType.JP]: { name: 'Japan', color: '#9370DB' },
  [HouseType.Multi1]: { name: 'Player 1', color: '#FFD700' },
  [HouseType.Multi2]: { name: 'Player 2', color: '#CC0000' },
  [HouseType.Multi3]: { name: 'Player 3', color: '#228B22' },
  [HouseType.Multi4]: { name: 'Player 4', color: '#4169E1' },
  [HouseType.Multi5]: { name: 'Player 5', color: '#FF8C00' },
  [HouseType.Multi6]: { name: 'Player 6', color: '#808080' },
  [HouseType.Multi7]: { name: 'Player 7', color: '#8B4513' },
  [HouseType.Multi8]: { name: 'Player 8', color: '#9370DB' },
};

/** 创建 House 时的可选参数。 */
export interface HouseOptions {
  /** 控制器类型：'human' | 'bot-rush' | 'bot-normal' | 'bot-defensive'。 */
  controller?: string;
  /** @deprecated 使用 `controller` 替代。 */
  isHuman?: boolean;
  /** 是否为观战者。 */
  isSpectating?: boolean;
  /** 初始资金。 */
  credits?: number;
  /** 初始泰伯利亚储量。 */
  tiberium?: number;
  /** 存储容量上限。 */
  capacity?: number;
  /** 所属队伍（同队默认为盟友）。 */
  team?: number;
  /** 难度修正 — 火力倍率。 */
  firepowerBias?: number;
  /** 难度修正 — 装甲倍率。 */
  armorBias?: number;
  /** 难度修正 — 建造速度倍率。 */
  buildSpeedBias?: number;
  /** 难度修正 — 造价倍率。 */
  costBias?: number;
}

/**
 * 单个阵营实例。
 *
 * 映射 C++ `HouseClass` 的核心字段：
 * - 经济：`Credits`, `Tiberium`, `Capacity`, `CreditsSpent`, `HarvestedCredits`
 * - 电力：`Power`, `Drain`
 * - 计数：`CurUnits`, `CurBuildings`, `CurInfantry`, `CurVessels`, `CurAircraft`
 * - 设施：`UnitFactories`, `BuildingFactories`, `InfantryFactories`, `AircraftFactories`, `VesselFactories`
 * - 修正：`FirepowerBias`, `ArmorBias`, `BuildSpeedBias`, `CostBias`
 */
export class House {
  readonly id: HouseType;
  readonly name: string;
  readonly color: string;

  // ── 状态 ──
  isActive = true;
  controller = 'human';
  /** @deprecated 使用 `controller === 'human'` 替代。 */
  isHuman = false;
  isSpectating = false;
  isDefeated = false;
  isStarted = false;
  isAlerted = false;
  isBaseBuilding = false;
  isDiscovered = false;
  isMaxedOut = false;
  isVisionary = false;
  isTiberiumShort = false;
  isSpied = false;
  isThieved = false;
  isGPSActive = false;

  // ── 外交关系 ──
  readonly diplomacy: HouseDiplomacy;
  /** 所属队伍编号（同队默认盟友）。 */
  team?: number;

  // ── 经济 ──
  credits = 0;
  tiberium = 0;
  capacity = 0;
  creditsSpent = 0;
  harvestedCredits = 0;
  stolenBuildingsCredits = 0;

  // ── 电力 ──
  power = 0;
  drain = 0;
  readonly housePower: HousePower;

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

  // ── 难度修正 ──
  firepowerBias = 1;
  armorBias = 1;
  buildSpeedBias = 1;
  costBias = 1;
  groundSpeedBias = 1;
  airSpeedBias = 1;
  rofBias = 1;
  repairDelay = 1;
  buildDelay = 0;

  // ── 已建造类型集合（替代 C++ BScan / UScan 位图）──
  availableBuildings = new Set<string>();
  availableUnits = new Set<string>();
  availableInfantry = new Set<string>();
  availableAircraft = new Set<string>();
  availableVessels = new Set<string>();

  // ── 统计 ──
  destroyedBuildings = 0;
  destroyedUnits = 0;
  destroyedInfantry = 0;
  destroyedAircraft = 0;
  destroyedVessels = 0;
  capturedBuildings = 0;
  totalCrates = 0;

  constructor(id: HouseType, options: HouseOptions = {}) {
    this.id = id;
    const meta = HOUSE_METADATA[id];
    this.name = meta.name;
    this.color = meta.color;

    this.controller = options.controller ?? (options.isHuman ? 'human' : 'bot-normal');
    this.isHuman = this.controller === 'human';
    this.isSpectating = options.isSpectating ?? false;
    this.credits = options.credits ?? 0;
    this.tiberium = options.tiberium ?? 0;
    this.capacity = options.capacity ?? 0;
    this.team = options.team;
    this.firepowerBias = options.firepowerBias ?? 1;
    this.armorBias = options.armorBias ?? 1;
    this.buildSpeedBias = options.buildSpeedBias ?? 1;
    this.costBias = options.costBias ?? 1;
    this.diplomacy = new HouseDiplomacy(id);
    this.housePower = new HousePower(this);
  }

  /**
   * 初始化外交关系（需在 HouseManager 注册所有阵营后调用）。
   * @param allHouses — 所有已注册阵营的列表
   */
  initializeDiplomacy(allHouses: ReadonlyArray<{ type: HouseType; team?: number }>): void {
    this.diplomacy.initializeByTeam(allHouses, this.team);
  }

  /** 获取对指定阵营的关系。 */
  getRelationshipWith(other: HouseType): HouseRelationship {
    return this.diplomacy.getRelationship(other);
  }

  // ── 经济操作 ──

  /** 增加资金（收入、矿车卸货）。 */
  addCredits(amount: number): void {
    this.credits += amount;
    this.harvestedCredits += amount;
  }

  /**
   * 尝试花费资金。
   * @returns 是否成功扣除（余额不足时返回 false，不扣款）。
   */
  spendCredits(amount: number): boolean {
    if (this.credits < amount) return false;
    this.credits -= amount;
    this.creditsSpent += amount;
    return true;
  }

  // ── 单位管理 ──

  /** 注册一座新建建筑。 */
  addBuilding(typeId: string): void {
    this.curBuildings++;
    this.availableBuildings.add(typeId);
  }

  /** 注册一个新建单位。 */
  addUnit(typeId: string): void {
    this.curUnits++;
    this.availableUnits.add(typeId);
  }

  /** 注册一个新建步兵。 */
  addInfantry(typeId: string): void {
    this.curInfantry++;
    this.availableInfantry.add(typeId);
  }

  /** 注册一个新建飞行器。 */
  addAircraft(typeId: string): void {
    this.curAircraft++;
    this.availableAircraft.add(typeId);
  }

  /** 注册一个新建舰船。 */
  addVessel(typeId: string): void {
    this.curVessels++;
    this.availableVessels.add(typeId);
  }

  /** 建筑被摧毁。 */
  removeBuilding(typeId: string, isLastOfType = false): void {
    this.curBuildings = Math.max(0, this.curBuildings - 1);
    if (isLastOfType) {
      this.availableBuildings.delete(typeId);
    }
    this.destroyedBuildings++;
  }

  /** 单位被摧毁。 */
  removeUnit(_typeId: string): void {
    this.curUnits = Math.max(0, this.curUnits - 1);
    this.destroyedUnits++;
  }

  /** 步兵被摧毁。 */
  removeInfantry(): void {
    this.curInfantry = Math.max(0, this.curInfantry - 1);
    this.destroyedInfantry++;
  }

  /** 飞行器被摧毁。 */
  removeAircraft(): void {
    this.curAircraft = Math.max(0, this.curAircraft - 1);
    this.destroyedAircraft++;
  }

  /** 舰船被摧毁。 */
  removeVessel(): void {
    this.curVessels = Math.max(0, this.curVessels - 1);
    this.destroyedVessels++;
  }

  /** 总物体数（建筑 + 单位 + 步兵 + 飞行器 + 舰船）。 */
  getTotalObjects(): number {
    return this.curBuildings + this.curUnits + this.curInfantry + this.curAircraft + this.curVessels;
  }

  // ── 生产检查 ──

  /** 是否拥有指定建筑类型。 */
  hasBuilding(typeId: string): boolean {
    return this.availableBuildings.has(typeId);
  }

  /** 是否拥有指定单位类型。 */
  hasUnit(typeId: string): boolean {
    return this.availableUnits.has(typeId);
  }

  /** 获取电力余额（产出 - 消耗）。 */
  getPowerBalance(): number {
    return this.housePower.getBalance();
  }

  /** @deprecated 由 HousePower 自动维护，不再需要外部调用。 */
  updatePower(production: number, consumption: number): void {
    this.power = production;
    this.drain = consumption;
  }
}
