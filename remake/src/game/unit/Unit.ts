import { UnitState, UnitStateMachine } from './UnitState';
import type { UnitDefinition } from '../rules/UnitDefinitions';
import type { House } from '../house/House';
import type { ArmorType } from '../rules/UnitDefinitions';
import { UnitMovement } from './UnitMovement';
import type { Pathfinder } from '../terrain/Pathfinder';

/**
 * 格子坐标目标 — 用于 moveTarget / attackTarget。
 * 对应 C++ `CELL` 或 `TARGET` 的简化表示。
 */
export interface UnitTarget {
  readonly x: number;
  readonly y: number;
}

/**
 * 单位逻辑控制器 — 翻译自 C++ UnitClass 核心属性与状态机。
 *
 * 继承链映射：
 *   ObjectClass (strength, coord)
 *     → TechnoClass (owner, ammo, armorBias, firepowerBias, attackTarget, facing)
 *     → FootClass (speed, path, isDriving)
 *     → DriveClass (trackIndex, isHarvesting)
 *     → UnitClass (turretFacing, reloadTimer, goldLoad…)
 *
 * 本类仅包含**数据层与状态机**；移动步进、战斗 AI、旋转插值等
 * 表现层逻辑由 `objects/Unit.ts` 的 `update()` 调用 `tick()` 后同步。
 */
export class UnitController {
  readonly definition: UnitDefinition;
  readonly owner: House;

  // ── 核心属性（ObjectClass / TechnoClass）──
  currentHealth: number;
  readonly maxHealth: number;
  currentAmmo: number;
  readonly maxAmmo: number;

  // ── 机动与装甲（FootClass / TechnoClass）──
  speed: number;
  armor: ArmorType;
  armorBias: number;
  firepowerBias: number;
  speedBias: number;

  // ── 状态机 ──
  readonly stateMachine = new UnitStateMachine();

  // ── 战斗状态（TechnoClass）──
  attackTarget?: UnitTarget;

  // ── 移动状态（FootClass / DriveClass）──
  moveTarget?: UnitTarget;
  isDriving = false;

  // ── 朝向（0–255，对应 C++ DirType）──
  bodyFacing = 0;
  turretFacing = 0;

  // ── 标志位（FootClass / DriveClass / UnitClass）──
  isFiring = false;
  isRotating = false;
  isDeploying = false;
  isHarvesting = false;

  // ── 采集负载（UnitClass）──
  goldLoad = 0;
  gemsLoad = 0;
  tiberiumLoad = 0;

  // ── 重装倒计时（UnitClass）──
  reloadTimer = 0;

  // ── 坐标（与 GameObject.x/y 双向同步）──
  x = 0;
  y = 0;

  // ── 移动控制器 ──
  readonly movement: UnitMovement;

  constructor(definition: UnitDefinition, owner: House, x = 0, y = 0) {
    this.definition = definition;
    this.owner = owner;
    this.x = x;
    this.y = y;

    this.maxHealth = definition.strength;
    this.currentHealth = definition.strength;

    // TODO: 未来从 WeaponDefinitions 提取真实 MaxAmmo
    this.maxAmmo = 0;
    this.currentAmmo = 0;

    this.speed = definition.speed;
    this.armor = definition.armor;

    // C++ 使用 0x0100 定点数表示 1.0；TS 直接用浮点数
    this.armorBias = 1.0;
    this.firepowerBias = 1.0;
    this.speedBias = 1.0;

    this.movement = new UnitMovement(this.speed);
  }

  /**
   * 请求移动到目标格子。
   * @returns 是否成功找到路径并开始移动。
   */
  moveTo(targetX: number, targetY: number, pathfinder: Pathfinder): boolean {
    return this.movement.moveTo(this, targetX, targetY, pathfinder);
  }

  /**
   * 每 Tick 更新 — 对应 C++ UnitClass::AI() 简化骨架。
   * Source: REDALERT/UNIT.CPP, Line 421
   */
  tick(deltaTime: number): void {
    const state = this.stateMachine.state;
    switch (state) {
      case UnitState.Idle:
        this.tickIdle();
        break;
      case UnitState.Moving:
        this.tickMoving(deltaTime);
        break;
      case UnitState.Attacking:
        this.tickAttacking();
        break;
      case UnitState.Dying:
        this.tickDying();
        break;
      case UnitState.TurretTracking:
        this.tickTurretTracking();
        break;
    }
  }

  /** 受到伤害 — 对应 C++ TechnoClass::Take_Damage() 简化。 */
  takeDamage(amount: number): void {
    // TODO: Phase 7 接入 DamageCalculator（含 ArmorBias / Warhead 修正）
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    if (this.currentHealth <= 0) {
      this.stateMachine.transition(UnitState.Dying);
    }
  }

  // ── 各状态 Tick 钩子（Phase 4+ 逐步填充）──

  private tickIdle(): void {
    // TODO: Phase 4+ — Enter_Idle_Mode() 逻辑、守卫/采集任务分配
  }

  private tickMoving(deltaTime: number): void {
    this.movement.update(this, deltaTime);
  }

  private tickAttacking(): void {
    // TODO: Phase 4+ — Firing_AI() 目标选择、开火判定
  }

  private tickDying(): void {
    // TODO: Phase 4+ — 死亡动画、爆炸、资源清理
  }

  private tickTurretTracking(): void {
    // TODO: Phase 4+ — Rotation_AI() 炮塔独立旋转
  }
}
