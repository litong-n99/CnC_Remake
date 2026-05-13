/**
 * 建筑运行时状态 — 映射 C++ `BStateType`（DEFINES.H:1047）。
 *
 * 对应 C++ 建筑动画序列状态：
 * - CONSTRUCTION → BSTATE_CONSTRUCTION（建造动画）
 * - IDLE         → BSTATE_IDLE（空闲）
 * - ACTIVE       → BSTATE_ACTIVE（工作中，如矿厂运作）
 * - FULL         → BSTATE_FULL（满载/特殊状态）
 * - DAMAGED      → 新增：受损状态（50% 以下血量，冒烟/火花）
 * - DYING        → 死亡处理（C++ 中为 Strength==0 + CountDown）
 */
export enum BuildingState {
  None = 'NONE',
  Construction = 'CONSTRUCTION',
  Idle = 'IDLE',
  Active = 'ACTIVE',
  Full = 'FULL',
  Damaged = 'DAMAGED',
  Dying = 'DYING',
}

/**
 * 有限状态机 — 管理建筑状态转换合法性。
 *
 * 对应 C++ 中 `BuildingClass::Begin_Mode()` 与 `QueueBState` 守卫逻辑。
 */
export class BuildingStateMachine {
  private current: BuildingState = BuildingState.Construction;
  private previous: BuildingState = BuildingState.None;

  private static readonly transitions: Readonly<Record<BuildingState, readonly BuildingState[]>> = {
    [BuildingState.None]: [BuildingState.Construction],
    [BuildingState.Construction]: [BuildingState.Idle, BuildingState.Dying],
    [BuildingState.Idle]: [BuildingState.Active, BuildingState.Damaged, BuildingState.Dying],
    [BuildingState.Active]: [BuildingState.Idle, BuildingState.Full, BuildingState.Damaged, BuildingState.Dying],
    [BuildingState.Full]: [BuildingState.Active, BuildingState.Idle, BuildingState.Damaged, BuildingState.Dying],
    [BuildingState.Damaged]: [BuildingState.Idle, BuildingState.Active, BuildingState.Dying],
    [BuildingState.Dying]: [],
  };

  get state(): BuildingState {
    return this.current;
  }

  get previousState(): BuildingState {
    return this.previous;
  }

  /** 检查是否允许转换到目标状态。 */
  canTransition(to: BuildingState): boolean {
    if (this.current === to) return true;
    return BuildingStateMachine.transitions[this.current]?.includes(to) ?? false;
  }

  /**
   * 执行状态转换。
   * @returns 转换是否成功（非法转换返回 false，状态不变）。
   */
  transition(to: BuildingState): boolean {
    if (!this.canTransition(to)) return false;
    this.previous = this.current;
    this.current = to;
    return true;
  }
}
