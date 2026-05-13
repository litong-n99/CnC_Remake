import type { BuildingDefinition } from '../rules/BuildingDefinitions';
import type { House } from '../house/House';
import { BuildingState, BuildingStateMachine } from './BuildingState';

/**
 * 建筑逻辑控制器 — 翻译自 C++ `BuildingClass` 核心属性与状态机。
 *
 * 继承链映射：
 *   ObjectClass (strength, coord)
 *     → TechnoClass (owner, ammo, armorBias, firepowerBias)
 *     → BuildingClass (Factory, BState, Power_Output, Repair_AI, etc.)
 *
 * 本类仅包含**数据层与状态机**；建造动画、损伤表现等
 * 由 `objects/Building.ts` 的 `update()` 调用 `tick()` 后同步。
 */
export class BuildingController {
  readonly definition: BuildingDefinition;
  readonly owner: House;

  // ── 核心属性（ObjectClass / TechnoClass）──
  currentHealth: number;
  readonly maxHealth: number;
  currentAmmo: number;
  readonly maxAmmo: number;

  // ── 电力（BuildingClass::Power_Output）──
  /** 基础电力值（正=发电，负=耗电）。 */
  readonly basePower: number;

  // ── 状态机（BStateType）──
  readonly stateMachine = new BuildingStateMachine();

  // ── 标志位（BuildingClass 布尔字段）──
  /** 被摧毁后是否重建。 */
  isToRebuild = false;
  /** 是否允许自修。 */
  isToRepair = false;
  /** 是否允许出售（建造厂/不可建造建筑为 false）。 */
  isAllowedToSell: boolean;
  /** 是否正在维修（消耗资金）。 */
  isRepairing = false;
  /** 维修扳手是否可见（表现层标志）。 */
  isWrenchVisible = false;
  /** 是否被放置了 C4/塑料炸弹。 */
  isGoingToBlow = false;
  /** 是否正在充能（光棱塔等）。 */
  isCharging = false;
  /** 是否已充满能。 */
  isCharged = false;
  /** 是否曾被占领（影响驻兵数量）。 */
  isCaptured = false;
  /** Grand_Opening 是否已调用（防止重复）。 */
  hasOpened = false;

  // ── 倒计时（BuildingClass::CountDown）──
  /** 死亡倒计时（毫秒），用于死亡动画/爆炸延迟。 */
  deathCountdown = 0;
  /** 建造进度（0–1），Construction 状态中使用。
   * 注意：C++ 中地图上的生长动画很短（Rule.BuildupTime≈0.05 → 约 3 秒），
   * 与 Sidebar 生产倒计时（buildTime，几秒到几十秒）是独立系统。 */
  constructionProgress = 0;
  /** 地图生长动画时长（毫秒），对应 C++ Rule.BuildupTime。 */
  static readonly CONSTRUCTION_ANIM_TIME = 3000;

  // ── 坐标 ──
  x = 0;
  y = 0;

  // ── 上次生命值（BuildingClass::LastStrength）──
  /** 用于检测生命值变化，触发电力调整。 */
  lastStrength = 0;

  constructor(definition: BuildingDefinition, owner: House, x = 0, y = 0) {
    this.definition = definition;
    this.owner = owner;
    this.x = x;
    this.y = y;

    this.maxHealth = definition.strength;
    this.currentHealth = definition.strength;
    this.lastStrength = definition.strength;

    // TODO: 未来从 WeaponDefinitions 提取真实 MaxAmmo
    this.maxAmmo = 0;
    this.currentAmmo = 0;

    this.basePower = definition.power;

    // 建造厂和不可建造建筑不能出售（C++ BUILDING.CPP:1640）
    this.isAllowedToSell = definition.id !== 'STRUCT_CONST' && definition.cost > 0;
  }

  /**
   * 每 Tick 更新 — 对应 C++ `BuildingClass::AI()` 简化骨架。
   */
  tick(deltaTime: number): void {
    const state = this.stateMachine.state;
    switch (state) {
      case BuildingState.Construction:
        this.tickConstruction(deltaTime);
        break;
      case BuildingState.Idle:
        this.tickIdle(deltaTime);
        break;
      case BuildingState.Active:
        this.tickActive(deltaTime);
        break;
      case BuildingState.Full:
        this.tickFull(deltaTime);
        break;
      case BuildingState.Damaged:
        this.tickDamaged(deltaTime);
        break;
      case BuildingState.Dying:
        this.tickDying(deltaTime);
        break;
    }

    // 生命值变化时更新电力（C++ BUILDING.CPP:931-936）
    if (this.currentHealth !== this.lastStrength) {
      this.lastStrength = this.currentHealth;
    }

    // 建筑弹药瞬间重装（C++ BUILDING.CPP:884-886）
    if (this.currentAmmo === 0) {
      this.currentAmmo = this.maxAmmo;
    }
  }

  /** 受到伤害 — 对应 C++ `TechnoClass::Take_Damage()` 建筑分支。 */
  takeDamage(amount: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - amount);

    if (this.currentHealth <= 0) {
      this.stateMachine.transition(BuildingState.Dying);
      this.deathCountdown = 2000; // 2 秒死亡动画/爆炸延迟
      return;
    }

    // 血量低于 50% 进入受损状态
    if (
      this.currentHealth < this.maxHealth * 0.5 &&
      (this.stateMachine.state === BuildingState.Idle || this.stateMachine.state === BuildingState.Active)
    ) {
      this.stateMachine.transition(BuildingState.Damaged);
    }

    // 血量恢复到 50% 以上，从受损状态恢复
    if (this.currentHealth >= this.maxHealth * 0.5 && this.stateMachine.state === BuildingState.Damaged) {
      this.stateMachine.transition(BuildingState.Idle);
    }
  }

  /** 开始维修 — 对应 C++ `BuildingClass::Repair()`。 */
  beginRepair(): boolean {
    if (!this.isToRepair || this.currentHealth >= this.maxHealth || this.isRepairing) {
      return false;
    }
    this.isRepairing = true;
    this.isWrenchVisible = true;
    return true;
  }

  /** 停止维修。 */
  stopRepair(): void {
    this.isRepairing = false;
    this.isWrenchVisible = false;
  }

  /** 出售建筑 — 对应 C++ `BuildingClass::Sell_Back()`。 */
  sell(): number {
    if (!this.isAllowedToSell) return 0;
    // 返还一半造价（C&C 经典规则）
    return Math.floor(this.definition.cost * 0.5);
  }

  // ── 各状态 Tick 钩子（Phase 5+ 逐步填充）──

  private tickConstruction(deltaTime: number): void {
    // buildTime <= 0 表示预放置建筑（如 ConstructionYard），立即完成
    if (this.definition.buildTime <= 0) {
      this.constructionProgress = 1.0;
      this.stateMachine.transition(BuildingState.Idle);
      this.hasOpened = true;
      return;
    }
    // C++ 中地图生长动画统一约 3 秒（Rule.BuildupTime * TICKS_PER_MINUTE / count），
    // 与 Sidebar 生产倒计时（buildTime）是独立系统。
    const rate = 1.0 / BuildingController.CONSTRUCTION_ANIM_TIME;
    this.constructionProgress += rate * deltaTime;
    if (this.constructionProgress >= 1.0) {
      this.constructionProgress = 1.0;
      this.stateMachine.transition(BuildingState.Idle);
      this.hasOpened = true;
    }
  }

  private tickIdle(_deltaTime: number): void {
    // TODO: Phase 5+ — 工厂生产、雷达扫描、自修判断
    // 如果 isRepairing 且资金充足，缓慢恢复生命值
    if (this.isRepairing && this.currentHealth < this.maxHealth) {
      // 维修速率：每秒恢复 5% 最大生命值，每秒消耗造价 1% 的资金
      // TODO: Phase 5+ 接入 EconomyManager
    }
  }

  private tickActive(_deltaTime: number): void {
    // TODO: Phase 5+ — 矿厂卸货、工厂生产进度、兵营训练
  }

  private tickFull(_deltaTime: number): void {
    // TODO: Phase 5+ — 矿厂满仓、 silo 满载处理
  }

  private tickDamaged(_deltaTime: number): void {
    // TODO: Phase 5+ — 受损动画（冒烟、火花）、紧急自修
  }

  private tickDying(deltaTime: number): void {
    this.deathCountdown -= deltaTime;
    if (this.deathCountdown <= 0) {
      this.deathCountdown = 0;
      // TODO: Phase 5+ — 真正销毁建筑、释放资源、掉落残骸
    }
  }
}
