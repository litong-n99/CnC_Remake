/**
 * House (阵营 / 玩家) — 轻量容器 — Task 100
 *
 * 将原有 God Class 拆分为组合式子模块：
 * - HouseEconomy: 资金、矿石、容量
 * - HousePower: 电力（Task 23.32）
 * - HouseProduction: 工厂计数 + 单位计数 + add/remove
 * - HouseStatistics: 摧毁/建造/击杀统计
 * - HouseTechTree: 可建造类型集合（Task 101 升级为 Watcher）
 * - HouseDiplomacy: 外交关系（Task 27.5）
 */

import { HouseRelationship, HouseDiplomacy } from './HouseRelationship';
import { HousePower } from './HousePower';
import { HouseEconomy } from './HouseEconomy';
import { HouseProduction } from './HouseProduction';
import { HouseStatistics } from './HouseStatistics';
import { HouseTechTree } from './HouseTechTree';
import { DynamicTechTree } from '../rules/DynamicTechTree';

export { HouseRelationship, HouseDiplomacy };

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

export interface HouseOptions {
  controller?: string;
  /** @deprecated 使用 `controller` 替代。 */
  isHuman?: boolean;
  isSpectating?: boolean;
  credits?: number;
  tiberium?: number;
  capacity?: number;
  team?: number;
  firepowerBias?: number;
  armorBias?: number;
  buildSpeedBias?: number;
  costBias?: number;
}

/** 轻量容器：保留 id/name/color/状态标志，所有数据委托给子模块。 */
export class House {
  readonly id: HouseType;
  readonly name: string;
  readonly color: string;

  // ── 子模块 ──
  readonly economy: HouseEconomy;
  readonly production: HouseProduction;
  readonly statistics: HouseStatistics;
  readonly techTree: HouseTechTree;
  readonly diplomacy: HouseDiplomacy;
  private readonly _power: HousePower;
  readonly dynamicTechTree: DynamicTechTree;

  // ── 状态标志 ──
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

  team?: number;

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

  constructor(id: HouseType, options: HouseOptions = {}) {
    this.id = id;
    const meta = HOUSE_METADATA[id];
    this.name = meta.name;
    this.color = meta.color;
    this.controller = options.controller ?? (options.isHuman ? 'human' : 'bot-normal');
    this.isHuman = this.controller === 'human';
    this.isSpectating = options.isSpectating ?? false;
    this.team = options.team;
    this.firepowerBias = options.firepowerBias ?? 1;
    this.armorBias = options.armorBias ?? 1;
    this.buildSpeedBias = options.buildSpeedBias ?? 1;
    this.costBias = options.costBias ?? 1;
    this.economy = new HouseEconomy(options);
    this._power = new HousePower(this);
    this.production = new HouseProduction();
    this.statistics = new HouseStatistics();
    this.techTree = new HouseTechTree();
    this.dynamicTechTree = new DynamicTechTree();
    this.diplomacy = new HouseDiplomacy(id);
  }

  initializeDiplomacy(allHouses: ReadonlyArray<{ type: HouseType; team?: number }>): void {
    this.diplomacy.initializeByTeam(allHouses, this.team);
  }

  getRelationshipWith(other: HouseType): HouseRelationship {
    return this.diplomacy.getRelationship(other);
  }

  // ── 向后兼容代理：经济 ──
  get credits(): number {
    return this.economy.credits;
  }
  set credits(v: number) {
    this.economy.credits = v;
  }
  get tiberium(): number {
    return this.economy.tiberium;
  }
  set tiberium(v: number) {
    this.economy.tiberium = v;
  }
  get capacity(): number {
    return this.economy.capacity;
  }
  set capacity(v: number) {
    this.economy.capacity = v;
  }
  get creditsSpent(): number {
    return this.economy.creditsSpent;
  }
  set creditsSpent(v: number) {
    this.economy.creditsSpent = v;
  }
  get harvestedCredits(): number {
    return this.economy.harvestedCredits;
  }
  set harvestedCredits(v: number) {
    this.economy.harvestedCredits = v;
  }
  get stolenBuildingsCredits(): number {
    return this.economy.stolenBuildingsCredits;
  }
  set stolenBuildingsCredits(v: number) {
    this.economy.stolenBuildingsCredits = v;
  }

  addCredits(amount: number): void {
    this.economy.addCredits(amount);
  }
  spendCredits(amount: number): boolean {
    return this.economy.spendCredits(amount);
  }

  // ── 向后兼容代理：电力 ──
  getPowerBalance(): number {
    return this._power.getBalance();
  }
  /** @deprecated 由 HousePower 自动维护 */
  updatePower(_production: number, _consumption: number): void {
    // no-op: HousePower auto-maintains
  }

  // ── 向后兼容代理：生产计数 ──
  get aircraftFactories(): number {
    return this.production.aircraftFactories;
  }
  set aircraftFactories(v: number) {
    this.production.aircraftFactories = v;
  }
  get infantryFactories(): number {
    return this.production.infantryFactories;
  }
  set infantryFactories(v: number) {
    this.production.infantryFactories = v;
  }
  get unitFactories(): number {
    return this.production.unitFactories;
  }
  set unitFactories(v: number) {
    this.production.unitFactories = v;
  }
  get vesselFactories(): number {
    return this.production.vesselFactories;
  }
  set vesselFactories(v: number) {
    this.production.vesselFactories = v;
  }
  get buildingFactories(): number {
    return this.production.buildingFactories;
  }
  set buildingFactories(v: number) {
    this.production.buildingFactories = v;
  }

  get curUnits(): number {
    return this.production.curUnits;
  }
  set curUnits(v: number) {
    this.production.curUnits = v;
  }
  get curBuildings(): number {
    return this.production.curBuildings;
  }
  set curBuildings(v: number) {
    this.production.curBuildings = v;
  }
  get curInfantry(): number {
    return this.production.curInfantry;
  }
  set curInfantry(v: number) {
    this.production.curInfantry = v;
  }
  get curVessels(): number {
    return this.production.curVessels;
  }
  set curVessels(v: number) {
    this.production.curVessels = v;
  }
  get curAircraft(): number {
    return this.production.curAircraft;
  }
  set curAircraft(v: number) {
    this.production.curAircraft = v;
  }

  get availableBuildings(): Set<string> {
    return this.production.availableBuildings;
  }
  get availableUnits(): Set<string> {
    return this.production.availableUnits;
  }
  get availableInfantry(): Set<string> {
    return this.production.availableInfantry;
  }
  get availableAircraft(): Set<string> {
    return this.production.availableAircraft;
  }
  get availableVessels(): Set<string> {
    return this.production.availableVessels;
  }

  addBuilding(typeId: string): void {
    this.production.addBuilding(typeId);
  }
  addUnit(typeId: string): void {
    this.production.addUnit(typeId);
  }
  addInfantry(typeId: string): void {
    this.production.addInfantry(typeId);
  }
  addAircraft(typeId: string): void {
    this.production.addAircraft(typeId);
  }
  addVessel(typeId: string): void {
    this.production.addVessel(typeId);
  }
  removeBuilding(typeId: string, isLastOfType = false): void {
    this.production.removeBuilding(typeId, isLastOfType);
  }
  removeUnit(): void {
    this.production.removeUnit();
  }
  removeInfantry(): void {
    this.production.removeInfantry();
  }
  removeAircraft(): void {
    this.production.removeAircraft();
  }
  removeVessel(): void {
    this.production.removeVessel();
  }
  hasBuilding(typeId: string): boolean {
    return this.production.hasBuilding(typeId);
  }
  hasUnit(typeId: string): boolean {
    return this.production.hasUnit(typeId);
  }
  getTotalObjects(): number {
    return this.production.getTotalObjects();
  }

  // ── 向后兼容代理：统计 ──
  get destroyedBuildings(): number {
    return this.statistics.destroyedBuildings;
  }
  set destroyedBuildings(v: number) {
    this.statistics.destroyedBuildings = v;
  }
  get destroyedUnits(): number {
    return this.statistics.destroyedUnits;
  }
  set destroyedUnits(v: number) {
    this.statistics.destroyedUnits = v;
  }
  get destroyedInfantry(): number {
    return this.statistics.destroyedInfantry;
  }
  set destroyedInfantry(v: number) {
    this.statistics.destroyedInfantry = v;
  }
  get destroyedAircraft(): number {
    return this.statistics.destroyedAircraft;
  }
  set destroyedAircraft(v: number) {
    this.statistics.destroyedAircraft = v;
  }
  get destroyedVessels(): number {
    return this.statistics.destroyedVessels;
  }
  set destroyedVessels(v: number) {
    this.statistics.destroyedVessels = v;
  }
  get capturedBuildings(): number {
    return this.statistics.capturedBuildings;
  }
  set capturedBuildings(v: number) {
    this.statistics.capturedBuildings = v;
  }
  get totalCrates(): number {
    return this.statistics.totalCrates;
  }
  set totalCrates(v: number) {
    this.statistics.totalCrates = v;
  }

  // ── 向后兼容代理：电力 legacy 字段 ──
  get power(): number {
    return this._power.getBalance() >= 0 ? this._power['totalProduction'] : 0;
  }
  set power(_v: number) {
    /* legacy no-op */
  }
  get drain(): number {
    return this._power['totalConsumption'];
  }
  set drain(_v: number) {
    /* legacy no-op */
  }

  // ── housePower 字段兼容 (Task 23.32 e2e 直接访问 house.housePower) ──
  get housePower(): HousePower {
    return this._power;
  }
}
