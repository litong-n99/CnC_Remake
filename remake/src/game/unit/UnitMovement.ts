import { UnitState } from './UnitState';
import type { UnitController } from './Unit';
import type { PathNode, Pathfinder } from '../terrain/Pathfinder';
import { UnitCollision } from './UnitCollision';

/**
 * 单位移动控制器 — 沿 A* 路径进行插值移动，支持简单碰撞避障（Task 19）。
 *
 * 对应 C++ `FootClass::AI()` / `DriveClass::AI()` 中的路径步进逻辑。
 * 速度直接取自 `UnitDefinition.speed`，经 `SPEED_SCALE` 转换为世界坐标/秒。
 */
export class UnitMovement {
  private path: PathNode[] = [];
  private pathIndex = 0;
  private isMoving = false;
  private waitTimer = 0;
  private cachedPathfinder?: Pathfinder;
  private cachedTargetX = 0;
  private cachedTargetY = 0;

  /** 速度缩放因子：将 C++ 内部 speed 转换为 格/毫秒。 */
  private static readonly SPEED_SCALE = 0.0006;

  constructor(private readonly speed: number) {}

  /**
   * 请求移动到目标格子。
   * @param blockedCells 可选的临时阻塞格子集合，用于绕过其他单位。
   * @returns 是否成功找到路径并开始移动。
   */
  moveTo(
    controller: UnitController,
    targetX: number,
    targetY: number,
    pathfinder: Pathfinder,
    blockedCells?: ReadonlySet<string>
  ): boolean {
    const path = pathfinder.findPath(
      Math.round(controller.x),
      Math.round(controller.y),
      targetX,
      targetY,
      blockedCells
    );
    if (!path || path.length <= 1) return false;

    this.path = path;
    this.pathIndex = 1; // 跳过起点
    this.isMoving = true;
    this.waitTimer = 0;
    this.cachedPathfinder = pathfinder;
    this.cachedTargetX = targetX;
    this.cachedTargetY = targetY;
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
      this.pathIndex++;
      return;
    }

    // 插值移动
    const moveSpeed = this.speed * UnitMovement.SPEED_SCALE;
    const step = moveSpeed * deltaTime;
    const ratio = Math.min(1, step / dist);

    const nextX = controller.x + dx * ratio;
    const nextY = controller.y + dy * ratio;

    // ── Task 19: 碰撞避障 — 检查下一步位置是否被其他单位阻挡 ──
    if (UnitCollision.isPositionBlocked(nextX, nextY, controller.unitId)) {
      this.waitTimer += deltaTime;
      // 等待超时后重新寻路，将其他单位所在格子标记为阻塞以绕过
      if (this.waitTimer > UnitCollision.MAX_WAIT_TIME && this.cachedPathfinder) {
        const blockedCells = UnitCollision.getBlockedCells(controller.unitId);
        const success = this.moveTo(
          controller,
          this.cachedTargetX,
          this.cachedTargetY,
          this.cachedPathfinder,
          blockedCells
        );
        if (!success) {
          // 无法绕过，原地等待
          this.waitTimer = 0;
        }
      }
      return;
    }
    this.waitTimer = 0;

    controller.x = nextX;
    controller.y = nextY;
    controller.targetBodyFacing = this.dirToFacing(dx, dy);
  }

  private stop(controller: UnitController): void {
    this.isMoving = false;
    this.waitTimer = 0;
    controller.stateMachine.transition(UnitState.Idle);
    controller.isDriving = false;
    controller.moveTarget = undefined;
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
