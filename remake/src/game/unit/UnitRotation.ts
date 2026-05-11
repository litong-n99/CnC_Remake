import type { UnitController } from './Unit';
import type { UnitTarget } from './Unit';

/**
 * 单位转向与炮塔追踪系统 — Task 18。
 *
 * 对应 C++ `TechnoClass::Rotation_AI()` 与 `DriveClass::AI()` 中的转向逻辑。
 * - 车身朝向（bodyFacing）平滑插值到 targetBodyFacing，使用最短路径。
 * - 炮塔朝向（turretFacing）相对于车身独立旋转，追踪 attackTarget 或回正。
 */
export class UnitRotation {
  /** 炮塔转速倍率：炮塔通常比车身转动更快。 */
  private static readonly TURRET_SPEED_MULTIPLIER = 2.0;

  /**
   * 将方向向量转换为 C++ 风格的 DirType（0–255）。
   * 0 = 北, 64 = 东, 128 = 南, 192 = 西。
   */
  static dirToFacing(dx: number, dy: number): number {
    const angle = Math.atan2(dy, dx); // -π..π, 0 = 东
    let normalized = ((angle + Math.PI / 2) / (2 * Math.PI)) * 256;
    normalized = ((normalized % 256) + 256) % 256;
    return Math.floor(normalized);
  }

  /**
   * 带最短路径的 DirType 插值。
   * @param current  当前朝向（0–255）
   * @param target   目标朝向（0–255）
   * @param maxDelta 本次更新允许的最大变化量（正数）
   * @returns 插值后的新朝向（0–255）
   */
  static lerpFacing(current: number, target: number, maxDelta: number): number {
    let diff = target - current;
    // 选择最短路径（绕回处理）
    if (diff > 128) diff -= 256;
    if (diff < -128) diff += 256;

    if (Math.abs(diff) <= maxDelta) {
      return ((target % 256) + 256) % 256;
    }

    const sign = diff > 0 ? 1 : -1;
    let result = current + sign * maxDelta;
    result = ((result % 256) + 256) % 256;
    return result;
  }

  /**
   * 更新车身朝向 — 每 Tick 调用一次（通常在 Moving 状态中）。
   * 将 `bodyFacing` 平滑插值到 `targetBodyFacing`。
   */
  static updateBodyFacing(controller: UnitController, deltaTime: number): void {
    const maxDelta = controller.definition.rotationSpeed * deltaTime;
    const next = this.lerpFacing(controller.bodyFacing, controller.targetBodyFacing, maxDelta);
    controller.isRotating = Math.abs(next - controller.bodyFacing) > 0.01;
    controller.bodyFacing = next;
  }

  /**
   * 更新炮塔朝向 — 每 Tick 调用一次（通常在 TurretTracking 状态中，也可在 Idle/Moving 中调用）。
   * 炮塔相对于车身的朝向 `turretFacing` 会追踪目标或回正。
   * @param target 可选的绝对世界坐标目标；若提供，炮塔转向该目标。
   */
  static updateTurretFacing(controller: UnitController, deltaTime: number, target?: UnitTarget): void {
    let targetWorldFacing: number;

    if (target) {
      const dx = target.x - controller.x;
      const dy = target.y - controller.y;
      targetWorldFacing = this.dirToFacing(dx, dy);
    } else {
      // 无目标时回正：炮塔世界朝向 = 车身世界朝向
      targetWorldFacing = controller.bodyFacing;
    }

    // 计算炮塔相对目标 = 目标世界朝向 - 车身世界朝向
    let relativeTarget = targetWorldFacing - controller.bodyFacing;
    if (relativeTarget > 128) relativeTarget -= 256;
    if (relativeTarget < -128) relativeTarget += 256;

    const turretSpeed = controller.definition.rotationSpeed * UnitRotation.TURRET_SPEED_MULTIPLIER;
    const maxDelta = turretSpeed * deltaTime;
    controller.turretFacing = this.lerpFacing(controller.turretFacing, relativeTarget, maxDelta);
  }
}
