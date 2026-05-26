/**
 * 任务目标系统 — Task 58
 *
 * 追踪战役中各项目标的完成状态，支持多种目标类型。
 * 与 Task 59（胜利/失败条件）联动。
 */

export type ObjectiveStatus = 'incomplete' | 'complete' | 'failed';

export type ObjectiveType =
  | 'destroyAllEnemies'
  | 'buildUnits'
  | 'captureBuilding'
  | 'surviveTime'
  | 'destroyBuilding'
  | 'escortUnit'
  | 'custom';

export interface Objective {
  readonly id: string;
  readonly description: string;
  readonly type: ObjectiveType;
  status: ObjectiveStatus;
  /** 当前进度 */
  progress: number;
  /** 达到完成所需进度 */
  targetProgress: number;
  /** 是否为主要目标（失败则任务失败） */
  readonly isPrimary: boolean;
  /** 可选：额外数据（如建筑类型、单位数量等） */
  data?: Record<string, unknown>;
}

export type ObjectiveEvent =
  | { type: 'added'; objectiveId: string }
  | { type: 'completed'; objectiveId: string }
  | { type: 'failed'; objectiveId: string }
  | { type: 'progress'; objectiveId: string; progress: number };

export class ObjectiveManager {
  private objectives = new Map<string, Objective>();
  private listeners: ((event: ObjectiveEvent) => void)[] = [];

  /** 添加目标 */
  addObjective(obj: Objective): void {
    this.objectives.set(obj.id, obj);
    this.emit({ type: 'added', objectiveId: obj.id });
  }

  /** 获取目标 */
  getObjective(id: string): Objective | undefined {
    return this.objectives.get(id);
  }

  /** 所有目标 */
  getAllObjectives(): Objective[] {
    return Array.from(this.objectives.values());
  }

  /** 获取未完成的主要目标 */
  getIncompletePrimaries(): Objective[] {
    return this.getAllObjectives().filter((o) => o.isPrimary && o.status !== 'complete');
  }

  /** 获取已完成的目标 */
  getCompleted(): Objective[] {
    return this.getAllObjectives().filter((o) => o.status === 'complete');
  }

  /** 获取失败的目标 */
  getFailed(): Objective[] {
    return this.getAllObjectives().filter((o) => o.status === 'failed');
  }

  /** 更新进度 */
  setProgress(id: string, progress: number): void {
    const obj = this.objectives.get(id);
    if (!obj) return;
    obj.progress = Math.max(0, Math.min(obj.targetProgress, progress));
    this.emit({ type: 'progress', objectiveId: id, progress: obj.progress });
    if (obj.progress >= obj.targetProgress && obj.status === 'incomplete') {
      this.completeObjective(id);
    }
  }

  /** 增加进度 */
  incrementProgress(id: string, delta: number): void {
    const obj = this.objectives.get(id);
    if (!obj) return;
    this.setProgress(id, obj.progress + delta);
  }

  /** 标记完成 */
  completeObjective(id: string): void {
    const obj = this.objectives.get(id);
    if (!obj || obj.status === 'complete') return;
    obj.status = 'complete';
    obj.progress = obj.targetProgress;
    this.emit({ type: 'completed', objectiveId: id });
  }

  /** 标记失败 */
  failObjective(id: string): void {
    const obj = this.objectives.get(id);
    if (!obj || obj.status === 'failed') return;
    obj.status = 'failed';
    this.emit({ type: 'failed', objectiveId: id });
  }

  /** 是否所有主要目标都已完成 */
  allPrimariesComplete(): boolean {
    const primaries = this.getAllObjectives().filter((o) => o.isPrimary);
    return primaries.length > 0 && primaries.every((o) => o.status === 'complete');
  }

  /** 是否有主要目标失败 */
  anyPrimaryFailed(): boolean {
    return this.getAllObjectives().some((o) => o.isPrimary && o.status === 'failed');
  }

  /** 监听目标事件 */
  onEvent(listener: (event: ObjectiveEvent) => void): void {
    this.listeners.push(listener);
  }

  /** 移除监听 */
  offEvent(listener: (event: ObjectiveEvent) => void): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private emit(event: ObjectiveEvent): void {
    for (const l of this.listeners) {
      l(event);
    }
  }

  /** 清空 */
  clear(): void {
    this.objectives.clear();
    this.listeners = [];
  }
}
