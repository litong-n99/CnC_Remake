import { UnitState } from './UnitState';
import type { UnitController } from './Unit';
import type { PathNode, Pathfinder } from '../terrain/Pathfinder';
import { UnitCollision } from './UnitCollision';
import { BlockedByActor } from './BlockedByActor';
import { ActorMap } from '../world/ActorMap';
import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';

/**
 * 单位移动控制器 — 沿 A* 路径进行插值移动，支持 OpenRA 风格阻塞 fallback 链（Task 24.3）。
 *
 * Fallback 链：
 *   NotifyBlocker → Wait → CellIsEvacuating → Repath(四级回退) → Nudge → Backup → GiveUp
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

  private static readonly WAIT_DURATION_MS = 400;
  private static readonly WAIT_SPREAD_MS = 300; // unitId 决定 0/150/300ms 额外等待
  private static readonly MAX_REPATH_ATTEMPTS = 3;
  private static readonly SPEED_SCALE = 0.0006;

  /** 根据 unitId 生成确定性等待偏移，防止多单位同步死锁。 */
  private getWaitOffset(unitId: string): number {
    const code = unitId.charCodeAt(unitId.length - 1);
    return (code % 3) * (UnitMovement.WAIT_SPREAD_MS / 2);
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

  constructor(private readonly speed: number) {}

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

    const blockedCells = UnitCollision.getBlockedCells(controller.unitId, BlockedByActor.All);
    const path = pathfinder.findPath(
      Math.round(controller.x),
      Math.round(controller.y),
      targetX,
      targetY,
      blockedCells,
      BlockedByActor.All,
      0,
      true // allowBlockedEnd: 终点可能被移动中的单位暂时占用
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
    controller.moveTarget = { x: targetX, y: targetY };
    return true;
  }

  /** 每 Tick 更新 — 由 UnitController.tickMoving() 调用。 */
  update(controller: UnitController, deltaTime: number): void {
    if (!this.isMoving) return;

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
      controller.x = target.x;
      controller.y = target.y;

      // ── 更新双格占用状态 ──
      controller.fromCellX = controller.toCellX;
      controller.fromCellY = controller.toCellY;

      // ── 提前阻塞检测：在进入下一格前检查 ──
      // 这样可以避免单位已经走到半格位置才急停
      const nextIdx = this.pathIndex + 1;
      if (nextIdx < this.path.length) {
        const nextTarget = this.path[nextIdx];
        if (UnitCollision.isPositionBlocked(nextTarget.x, nextTarget.y, controller.unitId, BlockedByActor.All)) {
          // 下一格被阻塞：不进入，直接触发 fallback 链
          this.handleBlocked(controller, deltaTime, nextTarget);
          return;
        }
      }

      this.pathIndex++;

      if (this.pathIndex < this.path.length) {
        const nextTarget = this.path[this.pathIndex];
        controller.toCellX = nextTarget.x;
        controller.toCellY = nextTarget.y;
        controller.isMovingBetweenCells = true;
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
        return;
      }
    }

    controller.x = nextX;
    controller.y = nextY;
    controller.isWaiting = false;
    controller.targetBodyFacing = this.dirToFacing(dx, dy);
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

    // 1. NotifyBlocker — 通知阻塞者（Task 24.4 实现响应）
    this.notifyBlockers(controller, nextCell.x, nextCell.y);

    // 2. Wait（带基于 unitId 的偏移，防止同步死锁）
    if (!this.hasWaited) {
      this.hasWaited = true;
      this.waitRemainingMs = UnitMovement.WAIT_DURATION_MS + this.getWaitOffset(controller.unitId);
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
      this.waitRemainingMs = UnitMovement.WAIT_DURATION_MS * 0.5;
      return;
    }

    // 4. Repath（四级回退：All → Stationary → Immovable → None）
    this.hasWaited = false;
    if (this.repathAttempts < UnitMovement.MAX_REPATH_ATTEMPTS) {
      this.repathAttempts++;

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
          this.pathfinder?.findPath(startX, startY, dest.x, dest.y, blockedCells, check, biasSeed, true) ?? null;
        if (newPath && newPath.length > 1) break;
      }

      // 恢复 ActorMap 占用
      this.addInfluence(controller);

      if (newPath && newPath.length > 1) {
        // 如果新路径和当前路径完全相同，说明阻塞状态没变，继续等待而不是重走老路
        const samePath =
          newPath.length === this.path.length &&
          newPath.every((n, i) => n.x === this.path[i].x && n.y === this.path[i].y);
        if (samePath) {
          this.waitRemainingMs = UnitMovement.WAIT_DURATION_MS * 0.5;
          return;
        }

        this.path = newPath;
        this.pathIndex = 1;
        this.hasWaited = false;
        this.waitRemainingMs = 0;
        this.repathAttempts = 0;
        controller.isWaiting = false;

        // 更新双格状态为新的路径起点
        controller.fromCellX = Math.round(controller.x);
        controller.fromCellY = Math.round(controller.y);
        controller.toCellX = this.path[1].x;
        controller.toCellY = this.path[1].y;
        controller.isMovingBetweenCells = true;
        return;
      }

      // 重寻路失败，短暂等待后再试
      this.waitRemainingMs = UnitMovement.WAIT_DURATION_MS * 0.5;
      return;
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
        return;
      }
    }

    // 7. GiveUp
    this.stop(controller);
  }

  /** 通知目标格子中的所有其他单位（OpenRA NotifyBlocker）。 */
  private notifyBlockers(controller: UnitController, cellX: number, cellY: number): void {
    const occupants = ActorMap.getInstance().getOccupants(cellX, cellY);
    for (const id of occupants) {
      if (id === controller.unitId) continue;
      const obj = GameObjectManager.getInstance().get(id);
      if (obj && obj.type === GameObjectType.Unit) {
        const unit = obj as import('../objects/Unit').Unit;
        unit.logic.onNotifyBlockingMove(controller.unitId);
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
    for (const dir of UnitMovement.NUDGE_DIRS) {
      const nx = cx + dir.x;
      const ny = cy + dir.y;
      if (this.pathfinder?.isCellPassable(nx, ny) === false) continue;
      if (UnitCollision.isPositionBlocked(nx, ny, controller.unitId, BlockedByActor.All)) continue;
      return { x: nx, y: ny };
    }
    return null;
  }

  /** 后退一格：从 fromCell 向反方向移动（OpenRA Backup）。 */
  private findBackupCell(controller: UnitController): PathNode | null {
    const dx = controller.fromCellX - controller.toCellX;
    const dy = controller.fromCellY - controller.toCellY;
    const bx = controller.fromCellX + dx;
    const by = controller.fromCellY + dy;
    if (
      this.pathfinder?.isCellPassable(bx, by) === true &&
      !UnitCollision.isPositionBlocked(bx, by, controller.unitId, BlockedByActor.All)
    ) {
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
  private dirToFacing(dx: number, dy: number): number {
    const angle = Math.atan2(dy, dx); // -π..π, 0 = 东
    let normalized = ((angle + Math.PI / 2) / (2 * Math.PI)) * 256;
    normalized = ((normalized % 256) + 256) % 256;
    return Math.floor(normalized);
  }
}
