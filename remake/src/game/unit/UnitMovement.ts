import { UnitState } from './UnitState';
import type { UnitController } from './Unit';
import type { PathNode, Pathfinder } from '../terrain/Pathfinder';
import { UnitCollision } from './UnitCollision';
import { BlockedByActor } from './BlockedByActor';

/**
 * 单位移动控制器 — 沿 A* 路径进行插值移动，支持阻塞自驱 fallback 链（Task 23.3）。
 *
 * 对应 C++ `FootClass::AI()` / `DriveClass::AI()` 中的路径步进逻辑。
 * 速度直接取自 `UnitDefinition.speed`，经 `SPEED_SCALE` 转换为世界坐标/秒。
 *
 * 阻塞处理（OpenRA 简化版）：
 *   检测到下一步被占 → Wait(800ms) → Repath(原始目标) → Nudge(相邻空闲格) → GiveUp
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

  private static readonly WAIT_DURATION_MS = 800;
  private static readonly MAX_REPATH_ATTEMPTS = 3;
  private static readonly SPEED_SCALE = 0.0006;

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

    const blockedCells = UnitCollision.getBlockedCells(controller.unitId, BlockedByActor.All);
    const path = pathfinder.findPath(
      Math.round(controller.x),
      Math.round(controller.y),
      targetX,
      targetY,
      blockedCells,
      BlockedByActor.All
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
      // 到达当前路径点，进入下一格
      controller.x = target.x;
      controller.y = target.y;

      // ── 更新双格占用状态 ──
      controller.fromCellX = controller.toCellX;
      controller.fromCellY = controller.toCellY;
      this.pathIndex++;

      if (this.pathIndex < this.path.length) {
        const nextTarget = this.path[this.pathIndex];
        controller.toCellX = nextTarget.x;
        controller.toCellY = nextTarget.y;
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

    // ── Task 23.3: 阻塞检测与自驱 fallback ──
    if (UnitCollision.isPositionBlocked(nextX, nextY, controller.unitId)) {
      this.handleBlocked(controller, deltaTime);
      return;
    }

    controller.x = nextX;
    controller.y = nextY;
    controller.targetBodyFacing = this.dirToFacing(dx, dy);
  }

  /**
   * 阻塞自驱 fallback 链：Wait → Repath → Nudge → GiveUp
   */
  private handleBlocked(controller: UnitController, deltaTime: number): void {
    const dest = controller.moveTarget;
    if (!dest) {
      this.stop(controller);
      return;
    }

    // Step 1: Wait
    if (!this.hasWaited) {
      this.hasWaited = true;
      this.waitRemainingMs = UnitMovement.WAIT_DURATION_MS;
    }
    this.waitRemainingMs -= deltaTime;

    if (this.waitRemainingMs > 0) {
      // 等待期间面朝目标
      const dx = dest.x - controller.x;
      const dy = dest.y - controller.y;
      controller.targetBodyFacing = this.dirToFacing(dx, dy);
      return;
    }

    // Step 2: Repath（到原始目标，起点=当前 round 位置）
    if (this.repathAttempts < UnitMovement.MAX_REPATH_ATTEMPTS) {
      this.repathAttempts++;
      const blockedCells = UnitCollision.getBlockedCells(controller.unitId, BlockedByActor.All);
      const startX = Math.round(controller.x);
      const startY = Math.round(controller.y);
      const newPath = this.pathfinder?.findPath(startX, startY, dest.x, dest.y, blockedCells, BlockedByActor.All);
      if (newPath && newPath.length > 1) {
        this.path = newPath;
        this.pathIndex = 1;
        this.hasWaited = false;
        this.waitRemainingMs = 0;
        this.repathAttempts = 0;
        return;
      }
      // 重寻路失败，短暂等待后再试
      this.waitRemainingMs = UnitMovement.WAIT_DURATION_MS * 0.5;
      return;
    }

    // Step 3: Nudge — 找相邻空闲格
    const nudgeCell = this.findNudgeCell(controller);
    if (nudgeCell) {
      this.path = [nudgeCell];
      this.pathIndex = 0;
      this.hasWaited = false;
      this.waitRemainingMs = 0;
      this.repathAttempts = 0;
      return;
    }

    // Step 4: GiveUp
    this.stop(controller);
  }

  /** 在 8 方向中找第一个地形可通行且无其他单位占用的相邻格。 */
  private findNudgeCell(controller: UnitController): PathNode | null {
    const cx = Math.round(controller.x);
    const cy = Math.round(controller.y);
    for (const dir of UnitMovement.NUDGE_DIRS) {
      const nx = cx + dir.x;
      const ny = cy + dir.y;
      if (this.pathfinder?.isCellPassable(nx, ny) === false) continue;
      if (UnitCollision.isPositionBlocked(nx, ny, controller.unitId)) continue;
      return { x: nx, y: ny };
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
