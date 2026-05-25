/**
 * 单位运行时状态 — Task 15 简化版（5 状态）。
 *
 * 对应 C++ `MissionType`（DEFINES.H:1010）的子集：
 * - IDLE    → MISSION_GUARD / MISSION_SLEEP
 * - MOVING  → MISSION_MOVE
 * - ATTACKING → MISSION_ATTACK
 * - DYING   → 死亡处理（C++ 中无独立 Mission，为 ObjectClass 销毁流程）
 * - TURRET_TRACKING → 炮塔独立追踪（C++ 中 TechnoClass::Rotation_AI）
 *
 * 完整 22 状态 MissionType 将在 Phase 4+ 按需扩展。
 */
export enum UnitState {
  Idle = 'IDLE',
  Moving = 'MOVING',
  Attacking = 'ATTACKING',
  Harvesting = 'HARVESTING',
  Dying = 'DYING',
  TurretTracking = 'TURRET_TRACKING',
}

/**
 * 有限状态机 — 管理单位状态转换合法性。
 *
 * 对应 C++ 中 Mission 分配与状态守卫逻辑（UNIT.CPP:1366 Enter_Idle_Mode、
 * UNIT.CPP:421 AI 等）。
 */
export class UnitStateMachine {
  private current: UnitState = UnitState.Idle;
  private previous: UnitState = UnitState.Idle;

  private static readonly transitions: Readonly<Record<UnitState, readonly UnitState[]>> = {
    [UnitState.Idle]: [
      UnitState.Moving,
      UnitState.Attacking,
      UnitState.Harvesting,
      UnitState.Dying,
      UnitState.TurretTracking,
    ],
    [UnitState.Moving]: [UnitState.Idle, UnitState.Attacking, UnitState.Harvesting, UnitState.Dying],
    [UnitState.Attacking]: [
      UnitState.Idle,
      UnitState.Moving,
      UnitState.Harvesting,
      UnitState.Dying,
      UnitState.TurretTracking,
    ],
    [UnitState.Harvesting]: [UnitState.Idle, UnitState.Moving, UnitState.Attacking, UnitState.Dying],
    [UnitState.TurretTracking]: [
      UnitState.Idle,
      UnitState.Attacking,
      UnitState.Moving,
      UnitState.Harvesting,
      UnitState.Dying,
    ],
    [UnitState.Dying]: [],
  };

  get state(): UnitState {
    return this.current;
  }

  get previousState(): UnitState {
    return this.previous;
  }

  /** 检查是否允许转换到目标状态。 */
  canTransition(to: UnitState): boolean {
    if (this.current === to) return true;
    return UnitStateMachine.transitions[this.current]?.includes(to) ?? false;
  }

  /**
   * 执行状态转换。
   * @returns 转换是否成功（非法转换返回 false，状态不变）。
   */
  transition(to: UnitState): boolean {
    if (!this.canTransition(to)) return false;
    this.previous = this.current;
    this.current = to;
    return true;
  }
}
