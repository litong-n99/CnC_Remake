import { UnitState, UnitStateMachine } from './UnitState';
import type { UnitDefinition } from '../rules/UnitDefinitions';
import type { House } from '../house/House';
import type { ArmorType } from '../rules/UnitDefinitions';
import { UnitMovement } from './UnitMovement';
import { UnitRotation } from './UnitRotation';
import type { Pathfinder } from '../terrain/Pathfinder';
import { getLocomotor, type LocomotorInfo } from '../rules/Locomotor';
import { UnitCollision } from './UnitCollision';
import { BlockedByActor } from './BlockedByActor';
import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';
import type { WeaponDef } from '../weapon/Weapon';
import { WEAPON_DEFINITIONS } from '../weapon/Weapon';
import { BulletManager } from '../weapon/Bullet';
import type { Scene } from '@babylonjs/core';

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
  targetBodyFacing = 0;
  turretFacing = 0;

  // ── 标志位（FootClass / DriveClass / UnitClass）──
  isFiring = false;
  isRotating = false;
  isDeploying = false;
  isHarvesting = false;
  isTurningInPlace = false;

  // ── 采集负载（UnitClass）──
  goldLoad = 0;
  gemsLoad = 0;
  tiberiumLoad = 0;

  // ── 重装倒计时（UnitClass）──
  reloadTimer = 0;

  // ── Task 28: 武器系统 ──
  primaryWeapon?: WeaponDef;

  // ── 坐标（与 GameObject.x/y 双向同步）──
  x = 0;
  y = 0;

  // ── 双格占用状态（OpenRA FromCell / ToCell）──
  fromCellX = 0;
  fromCellY = 0;
  toCellX = 0;
  toCellY = 0;
  isMovingBetweenCells = false;

  // ── OpenRA 阻塞标记 ──
  isBlocking = false; // 被通知后标记"我也在阻塞别人"
  isNudging = false; // 正在 nudge 让路中，不响应 notify
  isWaiting = false; // 正在 handleBlocked 中等待，用于 CellIsEvacuating 死锁检测

  // ── 移动控制器 ──
  readonly movement: UnitMovement;

  // ── Locomotor 配置缓存 ──
  readonly locomotor: LocomotorInfo;

  // ── Task 23.18: Follow 状态 ──
  private followTargetId?: string;
  private followRange = 0;
  private followPathfinder?: Pathfinder;

  /** 运行时唯一 ID（用于碰撞排除自身）。 */
  readonly unitId: string;

  constructor(definition: UnitDefinition, owner: House, x = 0, y = 0, unitId = '') {
    this.definition = definition;
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.unitId = unitId;

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

    this.locomotor = getLocomotor(definition.locomotion);
    this.movement = new UnitMovement(this.locomotor, this.speed);

    // 初始化双格状态（静止时 from=to）
    const cx = Math.round(x);
    const cy = Math.round(y);
    this.fromCellX = cx;
    this.fromCellY = cy;
    this.toCellX = cx;
    this.toCellY = cy;
  }

  /**
   * 返回当前占用的所有格子坐标。
   * 静止时返回 [fromCell]；移动中返回 [fromCell, toCell]。
   */
  getOccupiedCells(): ReadonlyArray<{ readonly x: number; readonly y: number }> {
    if (this.isMovingBetweenCells) {
      return [
        { x: this.fromCellX, y: this.fromCellY },
        { x: this.toCellX, y: this.toCellY },
      ];
    }
    return [{ x: this.fromCellX, y: this.fromCellY }];
  }

  /** 被其他单位通知阻塞时的回调（OpenRA NotifyBlocker）。
   *
   * Task 23.8 完整实现：
   *   - Idle 状态 → 尝试向旁边空闲格 Nudge 让路
   *   - Moving 状态 → 设置 isBlocking 标记，后续 Backup 会处理
   */
  onNotifyBlockingMove(_blockerId: string, pathfinder?: Pathfinder): void {
    if (this.isNudging) return;
    if (this.stateMachine.state === UnitState.Idle && pathfinder) {
      const nudged = this.tryNudge(pathfinder);
      if (nudged) {
        this.isNudging = true;
      }
    } else {
      this.isBlocking = true;
    }
  }

  /**
   * 向相邻空闲格移动一格（OpenRA Nudge / Scatter）。
   *
   * OpenRA 使用随机方向（GetAdjacentCell 从 availCells 中随机选取）。
   * 这里使用基于 unitId 的确定性随机，确保测试稳定，同时让多个步兵
   * 分散到不同方向。
   *
   * @returns 是否成功开始 Nudge 移动。
   */
  private tryNudge(pathfinder: Pathfinder): boolean {
    const cx = Math.round(this.x);
    const cy = Math.round(this.y);
    const dirs = this.getShuffledNudgeDirs();
    for (const dir of dirs) {
      const nx = cx + dir.x;
      const ny = cy + dir.y;
      if (
        pathfinder.isCellPassable(nx, ny) &&
        !UnitCollision.isPositionBlocked(nx, ny, this.unitId, BlockedByActor.All)
      ) {
        return this.moveTo(nx, ny, pathfinder);
      }
    }
    return false;
  }

  /** 基于 unitId 的 Fisher-Yates 确定性随机，打乱 Nudge 方向顺序。 */
  private getShuffledNudgeDirs(): Array<{ x: number; y: number }> {
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: 1, y: 1 },
    ];

    // 用 unitId 生成确定性种子
    let seed = 0;
    for (let i = 0; i < this.unitId.length; i++) {
      seed = (seed * 31 + this.unitId.charCodeAt(i)) % 1000000007;
    }

    // Fisher-Yates shuffle
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = seed % (i + 1);
      seed = (seed * 48271 + 1) % 2147483647;
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }

    return dirs;
  }

  /**
   * 请求移动到目标格子。
   * @returns 是否成功找到路径并开始移动。
   */
  moveTo(targetX: number, targetY: number, pathfinder: Pathfinder): boolean {
    return this.movement.moveTo(this, targetX, targetY, pathfinder);
  }

  /**
   * Task 23.18: 移动到目标的 min/max 环形范围内。
   * 使用 Predicate Search 找到第一个满足距离条件的可达格子。
   * @returns 是否成功找到路径并开始移动（已在范围内时返回 true）。
   */
  moveWithinRange(
    targetX: number,
    targetY: number,
    minRange: number,
    maxRange: number,
    pathfinder: Pathfinder
  ): boolean {
    const dx = this.x - targetX;
    const dy = this.y - targetY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= minRange && dist <= maxRange) return true;

    const path = pathfinder.findPathToPredicate(
      Math.round(this.x),
      Math.round(this.y),
      (x, y) => {
        const ddx = x - targetX;
        const ddy = y - targetY;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        return d >= minRange && d <= maxRange;
      },
      maxRange + 20,
      undefined,
      BlockedByActor.All,
      0,
      this.movement['getTerrainCost'] as ((x: number, y: number) => number) | undefined
    );

    if (path && path.length > 1) {
      const dest = path[path.length - 1];
      return this.movement.moveTo(this, dest.x, dest.y, pathfinder);
    }
    return false;
  }

  /**
   * Task 23.18: 开始持续跟随目标单位。
   * 在 tickIdle/tickMoving 中自动检测目标位置并重新定位。
   */
  follow(targetId: string, range: number, pathfinder: Pathfinder): void {
    this.followTargetId = targetId;
    this.followRange = range;
    this.followPathfinder = pathfinder;
  }

  /** 停止跟随。 */
  stopFollow(): void {
    this.followTargetId = undefined;
    this.followRange = 0;
    this.followPathfinder = undefined;
  }

  /**
   * 每 Tick 更新 — 对应 C++ UnitClass::AI() 简化骨架。
   * Source: REDALERT/UNIT.CPP, Line 421
   */
  tick(deltaTime: number): void {
    // 炮塔追踪独立于状态 — 只要有攻击目标就持续更新
    if (this.definition.hasTurret && this.attackTarget) {
      UnitRotation.updateTurretFacing(this, deltaTime, this.attackTarget);
    }

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
        this.tickTurretTracking(deltaTime);
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
    // Nudge 移动完成后回到 Idle，重置 isNudging 标志
    if (this.isNudging) {
      this.isNudging = false;
    }

    // Task 23.18: Follow — 目标移动后重新定位
    if (this.followTargetId && this.followPathfinder) {
      const target = GameObjectManager.getInstance().get(this.followTargetId);
      if (target && target.isAlive()) {
        const dx = this.x - target.x;
        const dy = this.y - target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.followRange) {
          this.moveWithinRange(target.x, target.y, 0, this.followRange, this.followPathfinder);
        }
      } else {
        this.stopFollow();
      }
    }
  }

  private tickMoving(deltaTime: number): void {
    // 先更新朝向，再更新移动 — 确保 isTurningInPlace 时 bodyFacing 仍能推进
    // Task 23.16: 使用 locomotor.turnSpeed 限制旋转速度
    UnitRotation.updateBodyFacing(this, deltaTime, this.locomotor.turnSpeed);
    this.movement.update(this, deltaTime);
  }

  private tickAttacking(): void {
    // TODO: Phase 4+ — Firing_AI() 目标选择、开火判定
  }

  /** 向目标开火 — Task 28。 */
  fireAt(scene: Scene, targetX: number, targetY: number): boolean {
    const weapon = this.primaryWeapon ?? this.inferWeapon();
    if (!weapon) return false;

    if (this.reloadTimer > 0) {
      this.reloadTimer--;
      return false;
    }

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > weapon.range) {
      return false;
    }

    this.reloadTimer = weapon.reloadTime;
    this.isFiring = true;

    BulletManager.getInstance().spawn(scene, weapon, this.x, this.y, targetX, targetY, (_hx, _hy, damage) => {
      // 命中伤害（简化：直接对目标格子上的所有敌方单位造成伤害）
      this.applyDamageToTargetCell(targetX, targetY, damage);
    });

    return true;
  }

  private inferWeapon(): WeaponDef | undefined {
    // 根据单位定义推断武器（硬编码映射，后续从 YAML 加载）
    if (this.definition.locomotion === 0) {
      // Foot = 步兵
      return WEAPON_DEFINITIONS.Rifle;
    }
    if (
      this.definition.id === 'UNIT_LTANK' ||
      this.definition.id === 'UNIT_MTANK2' ||
      this.definition.id === 'UNIT_MTANK'
    ) {
      return WEAPON_DEFINITIONS.Cannon105mm;
    }
    if (this.definition.id === 'UNIT_V2RL') {
      return WEAPON_DEFINITIONS.Rocket;
    }
    return undefined;
  }

  private applyDamageToTargetCell(targetX: number, targetY: number, damage: number): void {
    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getAll()) {
      if (!obj.isAlive()) continue;
      const dx = obj.x - targetX;
      const dy = obj.y - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.5 && obj.id !== this.unitId) {
        // Task 28: 通过 takeDamage 应用伤害（同步 logic + GameObject health）
        if (obj.type === GameObjectType.Unit) {
          (obj as import('../objects/Unit').Unit).logic.takeDamage(damage);
        } else {
          obj.health = Math.max(0, obj.health - damage);
        }
      }
    }
  }

  private tickDying(): void {
    // TODO: Phase 4+ — 死亡动画、爆炸、资源清理
  }

  private tickTurretTracking(deltaTime: number): void {
    UnitRotation.updateTurretFacing(this, deltaTime, this.attackTarget);
  }
}
