import { UnitState } from './UnitState';
import type { UnitController } from './Unit';
import type { PathNode, Pathfinder } from '../terrain/Pathfinder';
import { UnitCollision } from './UnitCollision';
import { BlockedByActor } from './BlockedByActor';
import { ActorMap } from '../world/ActorMap';
import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';
import type { LocomotorInfo } from '../rules/Locomotor';
import { makeTerrainCostCallback, getLocomotor } from '../rules/Locomotor';
import { MoveCooldownHelper } from './MoveCooldownHelper';
import { Crushable } from './Crushable';

/**
 * 单位移动控制器 — 沿 A* 路径进行插值移动，支持 OpenRA 风格阻塞 fallback 链（Task 24.3）。
 *
 * Fallback 链：
 *   NotifyBlocker → Wait → CellIsEvacuating → Repath(四级回退) → Nudge → Backup → GiveUp
 *
 * Task 23.7: Locomotor 配置层
 *   - Wait 时间从 Locomotor 读取（不再是全局硬编码）
 *   - A* 边代价按 Locomotor 的 TerrainSpeeds 计算（步兵可穿过岩石，车辆自动绕开）
 */
export class UnitMovement {
  private path: PathNode[] = [];
  private pathIndex = 0;
  private isMoving = false;
  private pathfinder: Pathfinder | null = null;

  // ── 阻塞 fallback 状态 ──
  private hasWaited = false;
  private waitRemainingMs = 0;
  private repathAttempts = 0;
  private removedInfluence: Array<{ x: number; y: number }> = [];

  // ── Locomotor 配置 ──
  private readonly locomotor: LocomotorInfo;
  private readonly speed: number;
  private getTerrainCost?: (x: number, y: number) => number;

  // ── Task 23.15: Repath 冷却 ──
  private readonly cooldownHelper = new MoveCooldownHelper();

  // ── Task 23.17: Crush 警告状态 ──
  private warnedCrushCell: { x: number; y: number } | null = null;

  // OpenRA 没有 repath 次数上限，单位会持续尝试直到到达目标或收到新命令
  private static readonly SPEED_SCALE = 0.0006;

  /** 根据 unitId 生成确定性等待偏移，防止多单位同步死锁。 */
  private getWaitOffset(unitId: string): number {
    const code = unitId.charCodeAt(unitId.length - 1);
    return (code % 3) * (this.locomotor.waitSpread / 2);
  }

  /** 根据 unitId 生成 A* 方向偏好种子，让不同单位绕路时分流。 */
  private getBiasSeed(unitId: string): number {
    let hash = 0;
    for (let i = 0; i < unitId.length; i++) {
      hash = (hash * 31 + unitId.charCodeAt(i)) % 1000000007;
    }
    return hash;
  }

  /** Nudge 方向：正交优先，对角线次之。 */
  private static readonly NUDGE_DIRS: readonly { readonly x: number; readonly y: number }[] = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: 1 },
  ];

  /** 根据 unitId 对 Nudge 方向做 Fisher-Yates 洗牌，让不同单位优先尝试不同方向。 */
  private getShuffledNudgeDirs(unitId: string): Array<{ x: number; y: number }> {
    const dirs = [...UnitMovement.NUDGE_DIRS];
    let s = this.getBiasSeed(unitId);
    for (let i = dirs.length - 1; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    return dirs;
  }

  constructor(locomotor: LocomotorInfo, speed: number) {
    this.locomotor = locomotor;
    this.speed = speed;
  }

  /**
   * 请求移动到目标格子。
   * @returns 是否成功找到路径并开始移动。
   */
  moveTo(controller: UnitController, targetX: number, targetY: number, pathfinder: Pathfinder): boolean {
    // 重置所有阻塞 fallback 状态
    this.hasWaited = false;
    this.waitRemainingMs = 0;
    this.repathAttempts = 0;
    controller.isBlocking = false;
    this.cooldownHelper.reset();
    this.warnedCrushCell = null;

    // 缓存 Locomotor 的地形代价回调（首次使用时创建）
    if (!this.getTerrainCost && pathfinder.getTerrainType) {
      this.getTerrainCost = makeTerrainCostCallback(this.locomotor, pathfinder.getTerrainType);
    }

    // ── OpenRA evaluateNearestMovableCell：为每个单位找到最近可用目标格子 ──
    // 防止多单位被命令到同一格子时全部挤在一起。先到达的单位占住目标格后，
    // 后续单位会在目标周围半径 1-10 的环形区域搜索第一个可用格子。
    const dest = this.findNearestMovableCell(controller, targetX, targetY, pathfinder);
    if (!dest) return false;

    const blockedCells = UnitCollision.getBlockedCells(controller.unitId, BlockedByActor.All);
    const biasSeed = this.getBiasSeed(controller.unitId);
    const path = pathfinder.findPath(
      Math.round(controller.x),
      Math.round(controller.y),
      dest.x,
      dest.y,
      blockedCells,
      BlockedByActor.All,
      biasSeed, // 不同单位使用不同的邻居扩展顺序，避免全部挤在同一条路径上
      true, // allowBlockedEnd: 终点可能被移动中的单位暂时占用
      this.getTerrainCost
    );
    if (!path || path.length <= 1) return false;

    this.path = path;
    this.pathIndex = 1; // 跳过起点
    this.isMoving = true;
    this.pathfinder = pathfinder;

    // ── 设置双格占用状态（OpenRA FromCell → ToCell）──
    controller.fromCellX = Math.round(controller.x);
    controller.fromCellY = Math.round(controller.y);
    controller.toCellX = path[1].x;
    controller.toCellY = path[1].y;
    controller.isMovingBetweenCells = true;

    controller.stateMachine.transition(UnitState.Moving);
    controller.isDriving = true;
    controller.moveTarget = { x: dest.x, y: dest.y };
    return true;
  }

  /**
   * 在目标周围搜索最近的可进入格子（OpenRA NearestMoveableCell）。
   *
   * - 若目标本身可用（地形可通行 + 未被不可移动对象阻塞），直接返回目标。
   * - 否则在半径 1-10 的环形区域搜索，每个单位基于 unitId 有独立的搜索起点偏移，
   *   让多个单位自然分散到不同方向。
   *
   * 注意：与 OpenRA 一致，此处使用 BlockedByActor.Immovable 级别，
   * 忽略所有可移动单位（静止 + 移动中）。可移动单位间的冲突由
   * handleBlocked 的 NotifyBlocker / Nudge / close-enough 机制处理。
   */
  private findNearestMovableCell(
    controller: UnitController,
    targetX: number,
    targetY: number,
    pathfinder: Pathfinder
  ): { x: number; y: number } | null {
    // 1. 目标格子本身可用？（Immovable 级别：只检查不可移动对象）
    if (this.canEnterCell(controller, targetX, targetY, pathfinder)) {
      return { x: targetX, y: targetY };
    }

    // 2. 环形区域搜索（半径 1-10）
    // 用 unitId hash 做搜索起点偏移，让不同单位优先尝试不同方向
    const hash = this.getBiasSeed(controller.unitId);
    for (let r = 1; r <= 10; r++) {
      const ringCells = this.getRingCells(targetX, targetY, r);
      if (ringCells.length === 0) continue;
      const offset = hash % ringCells.length;
      for (let i = 0; i < ringCells.length; i++) {
        const idx = (offset + i) % ringCells.length;
        const cell = ringCells[idx];
        if (this.canEnterCell(controller, cell.x, cell.y, pathfinder)) {
          return cell;
        }
      }
    }

    return null;
  }

  /** 检查指定格子是否可进入（地形可通行 + 未被不可移动对象阻塞）。 */
  private canEnterCell(controller: UnitController, x: number, y: number, pathfinder: Pathfinder): boolean {
    if (!pathfinder.isCellPassable(x, y)) return false;
    if (this.getTerrainCost && this.getTerrainCost(x, y) <= 0) return false;
    // 使用 Immovable 级别：只被不可移动对象阻塞，忽略所有可移动单位
    if (UnitCollision.isPositionBlocked(x, y, controller.unitId, BlockedByActor.Immovable)) return false;
    return true;
  }

  /** 检查指定格子是否可停留（地形可通行 + 未被静止单位阻塞）。 */
  private canStayInCell(controller: UnitController, x: number, y: number, pathfinder: Pathfinder): boolean {
    if (!pathfinder.isCellPassable(x, y)) return false;
    if (this.getTerrainCost && this.getTerrainCost(x, y) <= 0) return false;
    // 使用 Stationary 级别：只被静止单位阻塞，忽略移动中的单位
    // （移动中的单位可能正在离开，不需要因此排除该格子）
    if (UnitCollision.isPositionBlocked(x, y, controller.unitId, BlockedByActor.Stationary)) return false;
    return true;
  }

  /**
   * 检查指定格子中的阻塞者是否包含至少一个**静止的**"不可共享格子"的单位（车辆）。
   * - 如果阻塞者全部是步兵（sharesCell=true），返回 false —— 这些步兵可以通过 Nudge 散开。
   * - 如果车辆阻塞者全部是移动中的，返回 false —— 给它们时间离开（CellIsEvacuating）。
   * - 只有存在静止的车辆阻塞者时才返回 true。
   */
  private hasStationaryVehicleBlocker(cellX: number, cellY: number, excludeId: string): boolean {
    const occupants = ActorMap.getInstance().getOccupants(cellX, cellY);
    const manager = GameObjectManager.getInstance();
    for (const id of occupants) {
      if (id === excludeId) continue;
      const obj = manager.get(id);
      if (!obj || obj.type !== GameObjectType.Unit || !obj.isAlive()) return true; // 非单位视为车辆级阻塞
      const unit = obj as import('../objects/Unit').Unit;
      const locomotor = getLocomotor(unit.definition.locomotion);
      if (!locomotor.sharesCell && !unit.logic.isMovingBetweenCells) {
        return true; // 静止的车辆阻塞者
      }
    }
    return false;
  }

  /** 获取指定半径的环形格子列表（切比雪夫距离 = r 的所有格子）。 */
  private getRingCells(cx: number, cy: number, r: number): Array<{ x: number; y: number }> {
    if (r <= 0) return [{ x: cx, y: cy }];
    const cells: Array<{ x: number; y: number }> = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r) {
          cells.push({ x: cx + dx, y: cy + dy });
        }
      }
    }
    return cells;
  }

  /** 每 Tick 更新 — 由 UnitController.tickMoving() 调用。 */
  update(controller: UnitController, deltaTime: number): void {
    if (!this.isMoving) return;

    // ── Task 23.15: 每帧 tick 冷却 ──
    this.cooldownHelper.tick(deltaTime);

    // ── isWaiting 守卫：被阻塞后必须等 handleBlocked 解除等待才能继续移动 ──
    // 否则单位会在 fromCell 边缘 ↔ toCell 边界之间来回抖动。
    // 注意：必须检查 toCell（被阻塞的下一格），而不是 path[pathIndex]（当前已到达的格子）！
    if (controller.isWaiting) {
      const stillBlocked = UnitCollision.isPositionBlocked(
        controller.toCellX,
        controller.toCellY,
        controller.unitId,
        BlockedByActor.All
      );
      if (!stillBlocked) {
        // 阻塞已解除：重置等待状态，继续正常移动
        controller.isWaiting = false;
        this.hasWaited = false;
        this.waitRemainingMs = 0;
      } else {
        // 仍然阻塞：交给 handleBlocked 处理等待倒计时 / repath / Nudge
        this.handleBlocked(controller, deltaTime, { x: controller.toCellX, y: controller.toCellY });
        return;
      }
    }

    if (this.pathIndex >= this.path.length) {
      this.stop(controller);
      return;
    }

    const target = this.path[this.pathIndex];
    const dx = target.x - controller.x;
    const dy = target.y - controller.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.05) {
      // 到达当前路径点，准备进入下一格

      // ── Task 23.17: WarnCrush — 即使大步长跳过了 dist<0.5 的阈值，
      //   到达前也必须给 crushable 单位一次躲避机会 ──
      if (!this.warnedCrushCell || this.warnedCrushCell.x !== target.x || this.warnedCrushCell.y !== target.y) {
        this.warnedCrushCell = { x: target.x, y: target.y };
        Crushable.warnCrush(target.x, target.y, controller.unitId);
      }

      // ── Task 23.17: OnCrush — 到达格子后击杀未被躲开的 crushable 单位 ──
      Crushable.onCrush(Math.round(target.x), Math.round(target.y), controller.unitId);

      controller.x = target.x;
      controller.y = target.y;

      // ── 更新双格占用状态 ──
      controller.fromCellX = controller.toCellX;
      controller.fromCellY = controller.toCellY;
      this.pathIndex++;

      // ── 提前阻塞检测：在进入下一格前检查 ──
      // 这样可以避免单位已经走到半格位置才急停
      if (this.pathIndex < this.path.length) {
        const nextTarget = this.path[this.pathIndex];
        controller.toCellX = nextTarget.x;
        controller.toCellY = nextTarget.y;
        controller.isMovingBetweenCells = true;
        if (UnitCollision.isPositionBlocked(nextTarget.x, nextTarget.y, controller.unitId, BlockedByActor.All)) {
          // 下一格被阻塞：直接触发 fallback 链
          this.handleBlocked(controller, deltaTime, nextTarget);
          return;
        }
      } else {
        controller.isMovingBetweenCells = false;
      }
      return;
    }

    // 插值移动
    const moveSpeed = this.speed * UnitMovement.SPEED_SCALE;
    const step = moveSpeed * deltaTime;
    const ratio = Math.min(1, step / dist);

    const nextX = controller.x + dx * ratio;
    const nextY = controller.y + dy * ratio;

    // ── Task 24.3: 阻塞检测与 OpenRA fallback 链 ──
    // 如果 round(nextX,nextY) 仍然是 fromCell，说明单位还在离开原格子的过程中，
    // 不应该因为 fromCell 被其他单位占用而阻塞自己（fromCell 自锁 bug）。
    const nextCX = Math.round(nextX);
    const nextCY = Math.round(nextY);
    if (nextCX !== controller.fromCellX || nextCY !== controller.fromCellY) {
      if (UnitCollision.isPositionBlocked(nextX, nextY, controller.unitId, BlockedByActor.All)) {
        this.handleBlocked(controller, deltaTime);
        // 不再弹回 fromCell + 0.1（会导致明显抖动），
        // 而是将车辆限制在 fromCell 的边界内（maxOffset=0.499 确保 round() 仍在 fromCell），
        // 这样车辆只回退极短距离，视觉上像是"停在边界"而非"弹回格子"。
        const maxOffset = 0.499;
        controller.x =
          controller.fromCellX + Math.max(-maxOffset, Math.min(maxOffset, controller.x - controller.fromCellX));
        controller.y =
          controller.fromCellY + Math.max(-maxOffset, Math.min(maxOffset, controller.y - controller.fromCellY));
        return;
      }
    } else {
      // 仍在 fromCell 内：如果 toCell 已被阻塞，提前停止，
      // 避免车辆偷偷接近 toCell 后在边界来回抖动。
      if (
        UnitCollision.isPositionBlocked(controller.toCellX, controller.toCellY, controller.unitId, BlockedByActor.All)
      ) {
        this.handleBlocked(controller, deltaTime);
        return;
      }
    }

    // ── Task 23.16: Stop-and-turn for units that cannot turn while moving ──
    controller.targetBodyFacing = this.dirToFacing(dx, dy);

    if (!this.locomotor.turnsWhileMoving) {
      const diff = this.facingDiff(controller.bodyFacing, controller.targetBodyFacing);
      if (diff > 64) {
        controller.isTurningInPlace = true;
      }
    }

    if (controller.isTurningInPlace) {
      const diff = this.facingDiff(controller.bodyFacing, controller.targetBodyFacing);
      if (diff <= 8) {
        controller.isTurningInPlace = false;
      } else {
        // 仍在原地转向中，不移动位置
        return;
      }
    }

    // ── Task 23.17: WarnCrush — 接近目标格时通知 crushable 单位躲避 ──
    if (dist < 0.5) {
      if (!this.warnedCrushCell || this.warnedCrushCell.x !== target.x || this.warnedCrushCell.y !== target.y) {
        this.warnedCrushCell = { x: target.x, y: target.y };
        Crushable.warnCrush(target.x, target.y, controller.unitId);
      }
    }

    controller.x = nextX;
    controller.y = nextY;
    controller.isWaiting = false;
  }

  /**
   * OpenRA 风格阻塞自驱 fallback 链：
   * NotifyBlocker → Wait → CellIsEvacuating → Repath(四级回退) → Nudge → Backup → GiveUp
   */
  private handleBlocked(controller: UnitController, deltaTime: number, blockedCell?: { x: number; y: number }): void {
    controller.isWaiting = true;

    const dest = controller.moveTarget;
    if (!dest) {
      this.stop(controller);
      return;
    }

    const nextCell = blockedCell ?? this.path[this.pathIndex];

    // ── OpenRA "close enough" 到达容忍度 ──
    // 如果被阻塞的是最终目标格子，且阻塞者包含至少一个**静止的**车辆，
    // 且当前所在格子距离目标足够近（<= 2 格），且当前格子可以停留，
    // 则直接停止。避免多个车辆被命令到同一格子时，后到达的单位在目标前
    // 无限重试/抖动。
    // 不触发的情况：
    //   - 阻塞者全部是步兵（sharesCell=true）→ 让 Nudge 处理
    //   - 阻塞者全部是移动中的车辆 → 给它们时间离开（CellIsEvacuating）
    const isFinalDestination = this.pathIndex >= this.path.length - 1;
    if (
      isFinalDestination &&
      this.pathfinder &&
      this.hasStationaryVehicleBlocker(nextCell.x, nextCell.y, controller.unitId)
    ) {
      const chebDist = Math.max(
        Math.abs(Math.round(controller.x) - dest.x),
        Math.abs(Math.round(controller.y) - dest.y)
      );
      if (
        chebDist <= 2 &&
        this.canStayInCell(controller, Math.round(controller.x), Math.round(controller.y), this.pathfinder)
      ) {
        this.stop(controller);
        return;
      }
    }

    // 1. NotifyBlocker — 通知阻塞者（Task 24.4 实现响应）
    this.notifyBlockers(controller, nextCell.x, nextCell.y);

    // 2. Wait（带基于 unitId 的偏移，防止同步死锁）
    if (!this.hasWaited) {
      this.hasWaited = true;
      this.waitRemainingMs = this.locomotor.waitAverage + this.getWaitOffset(controller.unitId);
    }
    this.waitRemainingMs -= deltaTime;

    if (this.waitRemainingMs > 0) {
      // 等待期间面朝目标
      const dx = dest.x - controller.x;
      const dy = dest.y - controller.y;
      controller.targetBodyFacing = this.dirToFacing(dx, dy);
      return;
    }

    // 3. CellIsEvacuating — 如果阻塞者都在离开，继续等待
    if (this.cellIsEvacuating(nextCell.x, nextCell.y, controller.unitId)) {
      this.waitRemainingMs = this.locomotor.waitAverage * 0.5;
      return;
    }

    // 4. Repath（四级回退：All → Stationary → Immovable → None）
    // ── Task 23.15: 冷却检查 — 未冷却时继续等待而非立即重寻路 ──
    if (!this.cooldownHelper.canRepath()) {
      this.waitRemainingMs = Math.max(this.waitRemainingMs, 50);
      return;
    }

    // 设置冷却：根据到目标的距离动态调整
    const distanceToDest = Math.sqrt((controller.x - dest.x) ** 2 + (controller.y - dest.y) ** 2);
    this.cooldownHelper.setCooldown(distanceToDest, 200, 50);

    this.hasWaited = false;

    // 临时移除自己的 ActorMap 占用（repath 起点不能被自己阻塞）
    this.removeInfluence(controller);

    const checks = [BlockedByActor.All, BlockedByActor.Stationary, BlockedByActor.Immovable, BlockedByActor.None];
    let newPath: PathNode[] | null = null;
    const biasSeed = this.getBiasSeed(controller.unitId);
    for (const check of checks) {
      const blockedCells = UnitCollision.getBlockedCells(controller.unitId, check);
      const startX = controller.fromCellX;
      const startY = controller.fromCellY;
      newPath =
        this.pathfinder?.findPath(
          startX,
          startY,
          dest.x,
          dest.y,
          blockedCells,
          check,
          biasSeed,
          true,
          this.getTerrainCost
        ) ?? null;
      if (newPath && newPath.length > 1) break;
    }

    // 恢复 ActorMap 占用
    this.addInfluence(controller);

    if (newPath && newPath.length > 1) {
      const samePath =
        newPath.length === this.path.length &&
        newPath.every((n, i) => n.x === this.path[i].x && n.y === this.path[i].y);
      if (!samePath) {
        this.path = newPath;
        this.pathIndex = 1;
        this.hasWaited = false;
        this.waitRemainingMs = 0;
        this.repathAttempts = 0;
        controller.isWaiting = false;

        controller.fromCellX = Math.round(controller.x);
        controller.fromCellY = Math.round(controller.y);
        controller.toCellX = this.path[1].x;
        controller.toCellY = this.path[1].y;
        controller.isMovingBetweenCells = true;
        return;
      }

      // samePath：强制将被阻塞的格子视为不可通行，逼 A* 找替代路线
      const blockedKey = `${nextCell.x},${nextCell.y}`;
      for (const check of checks) {
        const blockedCells = UnitCollision.getBlockedCells(controller.unitId, check);
        blockedCells.add(blockedKey);
        const forcedPath =
          this.pathfinder?.findPath(
            controller.fromCellX,
            controller.fromCellY,
            dest.x,
            dest.y,
            blockedCells,
            check,
            biasSeed,
            true,
            this.getTerrainCost
          ) ?? null;
        if (forcedPath && forcedPath.length > 1) {
          const forcedSame =
            forcedPath.length === this.path.length &&
            forcedPath.every((n, i) => n.x === this.path[i].x && n.y === this.path[i].y);
          if (!forcedSame) {
            this.path = forcedPath;
            this.pathIndex = 1;
            this.hasWaited = false;
            this.waitRemainingMs = 0;
            this.repathAttempts = 0;
            controller.isWaiting = false;
            controller.fromCellX = Math.round(controller.x);
            controller.fromCellY = Math.round(controller.y);
            controller.toCellX = this.path[1].x;
            controller.toCellY = this.path[1].y;
            controller.isMovingBetweenCells = true;
            return;
          }
        }
      }

      // 仍然 samePath：显式尝试 8 邻居方向作为第一步，找一条不同的路
      for (const dir of this.getShuffledNudgeDirs(controller.unitId)) {
        const nx = controller.fromCellX + dir.x;
        const ny = controller.fromCellY + dir.y;
        if (this.pathfinder?.isCellPassable(nx, ny) === false) continue;
        if (this.getTerrainCost && this.getTerrainCost(nx, ny) <= 0) continue;
        // 对角线剪枝
        if (Math.abs(dir.x) === 1 && Math.abs(dir.y) === 1) {
          if (this.getTerrainCost && this.getTerrainCost(controller.fromCellX + dir.x, controller.fromCellY) <= 0)
            continue;
          if (this.getTerrainCost && this.getTerrainCost(controller.fromCellX, controller.fromCellY + dir.y) <= 0)
            continue;
        }
        // 使用 Stationary 级别：给正在移动中的单位让路的机会
        if (UnitCollision.isPositionBlocked(nx, ny, controller.unitId, BlockedByActor.Stationary)) continue;
        const subPath =
          this.pathfinder?.findPath(
            nx,
            ny,
            dest.x,
            dest.y,
            undefined,
            BlockedByActor.All,
            biasSeed,
            true,
            this.getTerrainCost
          ) ?? null;
        if (subPath && subPath.length > 0) {
          const tryPath = [{ x: controller.fromCellX, y: controller.fromCellY }, { x: nx, y: ny }, ...subPath.slice(1)];
          const trySame =
            tryPath.length === this.path.length &&
            tryPath.every((n, i) => n.x === this.path[i].x && n.y === this.path[i].y);
          if (!trySame) {
            this.path = tryPath;
            this.pathIndex = 1;
            this.hasWaited = false;
            this.waitRemainingMs = 0;
            this.repathAttempts = 0;
            controller.isWaiting = false;
            controller.fromCellX = Math.round(controller.x);
            controller.fromCellY = Math.round(controller.y);
            controller.toCellX = this.path[1].x;
            controller.toCellY = this.path[1].y;
            controller.isMovingBetweenCells = true;
            return;
          }
        }
      }
    }

    // 5. Nudge — 找相邻空闲格
    const nudgeCell = this.findNudgeCell(controller);
    if (nudgeCell) {
      this.path = [nudgeCell];
      this.pathIndex = 0;
      this.hasWaited = false;
      this.waitRemainingMs = 0;
      this.repathAttempts = 0;
      controller.isWaiting = false;
      // 必须同步 toCell，否则 getOccupiedCells() 报告旧格子，
      // 其他单位看不到真实的 Nudge 目标，导致竞态 overlap。
      controller.toCellX = nudgeCell.x;
      controller.toCellY = nudgeCell.y;
      controller.isMovingBetweenCells = true;
      return;
    }

    // 6. Backup — 如果自己在阻塞别人，后退一格让路
    if (controller.isBlocking) {
      const backupCell = this.findBackupCell(controller);
      if (backupCell) {
        this.path = [backupCell];
        this.pathIndex = 0;
        this.hasWaited = false;
        this.waitRemainingMs = 0;
        this.repathAttempts = 0;
        controller.isWaiting = false;
        // 同上：同步 toCell 防止 ActorMap 漂移
        controller.toCellX = backupCell.x;
        controller.toCellY = backupCell.y;
        controller.isMovingBetweenCells = true;
        return;
      }
    }

    // 7. 永不 GiveUp — OpenRA 风格持续等待+重试
    // 当桥梁被敌方完全占据时，单位应持续等待直到通道腾开
    this.repathAttempts = Math.min(this.repathAttempts + 1, 10); // 上限 10，防止等待时间无限膨胀
    this.waitRemainingMs = this.locomotor.waitAverage * (1 + this.repathAttempts * 0.5);
    controller.isWaiting = true;
  }

  /** 通知目标格子中的所有其他单位（OpenRA NotifyBlocker）。 */
  private notifyBlockers(controller: UnitController, cellX: number, cellY: number): void {
    const occupants = ActorMap.getInstance().getOccupants(cellX, cellY);
    for (const id of occupants) {
      if (id === controller.unitId) continue;
      const obj = GameObjectManager.getInstance().get(id);
      if (obj && obj.type === GameObjectType.Unit) {
        const unit = obj as import('../objects/Unit').Unit;
        unit.logic.onNotifyBlockingMove(controller.unitId, this.pathfinder ?? undefined);
      }
    }
  }

  /**
   * 检查指定格子中的阻塞者是否正在离开。
   * 只有当 occupant 的 toCell ≠ 当前格子时，才认为它正在穿过/离开。
   * 若 toCell == 当前格子，说明它要进入或停留，不是在离开。
   * 若格子已空，返回 false（不需要再等待）。
   */
  private cellIsEvacuating(x: number, y: number, excludeId: string): boolean {
    const occupants = ActorMap.getInstance()
      .getOccupants(x, y)
      .filter((id) => id !== excludeId);
    if (occupants.length === 0) return false; // 已空，不需要等待

    const manager = GameObjectManager.getInstance();
    for (const id of occupants) {
      const obj = manager.get(id);
      if (!obj || obj.type !== GameObjectType.Unit) return false;
      const unit = obj as import('../objects/Unit').Unit;
      if (!unit.logic.isMovingBetweenCells) return false;
      // 如果对方也在 handleBlocked 中等待，说明它也被阻塞了，不算正在离开
      if (unit.logic.isWaiting) return false;
      // 关键：如果该单位的 toCell 就是当前格子，说明它要进入/停留，不是在离开
      if (unit.logic.toCellX === x && unit.logic.toCellY === y) return false;
    }
    return true;
  }

  /** 临时移除自己在 ActorMap 中的占用（用于 repath 前）。 */
  private removeInfluence(controller: UnitController): void {
    const cells = controller.getOccupiedCells();
    for (const cell of cells) {
      ActorMap.getInstance().vacate(controller.unitId, cell.x, cell.y);
    }
    this.removedInfluence = cells.map((c) => ({ x: c.x, y: c.y }));
  }

  /** 恢复自己在 ActorMap 中的占用（repath 后）。 */
  private addInfluence(controller: UnitController): void {
    for (const cell of this.removedInfluence) {
      ActorMap.getInstance().occupy(controller.unitId, cell.x, cell.y);
    }
    this.removedInfluence = [];
  }

  /** 在 8 方向中找第一个地形可通行且无其他单位占用的相邻格。 */
  private findNudgeCell(controller: UnitController): PathNode | null {
    const cx = Math.round(controller.x);
    const cy = Math.round(controller.y);
    for (const dir of this.getShuffledNudgeDirs(controller.unitId)) {
      const nx = cx + dir.x;
      const ny = cy + dir.y;
      if (this.pathfinder?.isCellPassable(nx, ny) === false) continue;
      // Locomotor 地形代价检查（Rock 对 Track=0，不可通行）
      if (this.getTerrainCost && this.getTerrainCost(nx, ny) <= 0) continue;
      // 对角线剪枝（Corner Cutting）：斜向移动时必须确保两个正交邻居也可通行
      if (Math.abs(dir.x) === 1 && Math.abs(dir.y) === 1) {
        if (this.getTerrainCost && this.getTerrainCost(cx + dir.x, cy) <= 0) continue;
        if (this.getTerrainCost && this.getTerrainCost(cx, cy + dir.y) <= 0) continue;
      }
      if (UnitCollision.isPositionBlocked(nx, ny, controller.unitId, BlockedByActor.All)) continue;
      return { x: nx, y: ny };
    }
    return null;
  }

  /** 后退一格：从 fromCell 向反方向移动（OpenRA Backup）。
   * 当 fromCell == toCell（车辆已停下）时，尝试 8 方向找空闲格。 */
  private findBackupCell(controller: UnitController): PathNode | null {
    let dx = controller.fromCellX - controller.toCellX;
    let dy = controller.fromCellY - controller.toCellY;

    // fromCell == toCell：车辆已停下，从 path 中找上一个运动方向
    if (dx === 0 && dy === 0 && this.pathIndex > 0 && this.pathIndex < this.path.length) {
      const prev = this.path[this.pathIndex - 1];
      dx = controller.fromCellX - prev.x;
      dy = controller.fromCellY - prev.y;
    }

    // 仍然没有方向：尝试 8 方向中的任意空闲格
    if (dx === 0 && dy === 0) {
      for (const dir of this.getShuffledNudgeDirs(controller.unitId)) {
        const bx = controller.fromCellX + dir.x;
        const by = controller.fromCellY + dir.y;
        if (this.pathfinder?.isCellPassable(bx, by) !== true) continue;
        if (this.getTerrainCost && this.getTerrainCost(bx, by) <= 0) continue;
        // 对角线剪枝
        if (Math.abs(dir.x) === 1 && Math.abs(dir.y) === 1) {
          if (this.getTerrainCost && this.getTerrainCost(controller.fromCellX + dir.x, controller.fromCellY) <= 0)
            continue;
          if (this.getTerrainCost && this.getTerrainCost(controller.fromCellX, controller.fromCellY + dir.y) <= 0)
            continue;
        }
        if (UnitCollision.isPositionBlocked(bx, by, controller.unitId, BlockedByActor.All)) continue;
        return { x: bx, y: by };
      }
      return null;
    }

    const bx = controller.fromCellX + dx;
    const by = controller.fromCellY + dy;
    if (
      this.pathfinder?.isCellPassable(bx, by) === true &&
      (!this.getTerrainCost || this.getTerrainCost(bx, by) > 0) &&
      !UnitCollision.isPositionBlocked(bx, by, controller.unitId, BlockedByActor.All)
    ) {
      // 对角线剪枝（dx,dy 是 -1/0/1 的组合，对角线时 |dx|=|dy|=1）
      if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
        if (this.getTerrainCost && this.getTerrainCost(controller.fromCellX + dx, controller.fromCellY) <= 0)
          return null;
        if (this.getTerrainCost && this.getTerrainCost(controller.fromCellX, controller.fromCellY + dy) <= 0)
          return null;
      }
      return { x: bx, y: by };
    }
    return null;
  }

  private stop(controller: UnitController): void {
    this.isMoving = false;
    this.pathfinder = null;
    this.hasWaited = false;
    this.waitRemainingMs = 0;
    this.repathAttempts = 0;
    controller.stateMachine.transition(UnitState.Idle);
    controller.isDriving = false;
    controller.moveTarget = undefined;
    controller.isMovingBetweenCells = false;
    controller.isBlocking = false;
    controller.isWaiting = false;
    controller.toCellX = controller.fromCellX;
    controller.toCellY = controller.fromCellY;
  }

  /**
   * 将移动方向向量转换为 C++ 风格的 DirType（0–255）。
   * 0 = 北, 64 = 东, 128 = 南, 192 = 西。
   */
  /** 计算两个 DirType 朝向之间的最小差值（0–128）。 */
  private facingDiff(a: number, b: number): number {
    let diff = b - a;
    if (diff > 128) diff -= 256;
    if (diff < -128) diff += 256;
    return Math.abs(diff);
  }

  private dirToFacing(dx: number, dy: number): number {
    const angle = Math.atan2(dy, dx); // -π..π, 0 = 东
    let normalized = ((angle + Math.PI / 2) / (2 * Math.PI)) * 256;
    normalized = ((normalized % 256) + 256) % 256;
    return Math.floor(normalized);
  }
}
