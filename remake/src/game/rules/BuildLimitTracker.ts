/**
 * BuildLimitTracker — Task 135
 * OpenRA 对标: `Buildable` Trait 中的 `BuildLimit`
 *
 * 跟踪每个阵营的单位/建筑建造数量，与 TechTree 联合判定可用性。
 */

/** 建造限制追踪器 — 每个 House 一个实例。 */
export class BuildLimitTracker {
  private readonly counts = new Map<string, number>();

  /** 注册新建的单位/建筑（建造完成时调用）。 */
  add(typeId: string): void {
    this.counts.set(typeId, (this.counts.get(typeId) ?? 0) + 1);
  }

  /** 注销销毁的单位/建筑（死亡/出售时调用）。 */
  remove(typeId: string): void {
    const current = this.counts.get(typeId);
    if (current === undefined) return;
    const count = current - 1;
    if (count <= 0) {
      this.counts.delete(typeId);
    } else {
      this.counts.set(typeId, count);
    }
  }

  /** 获取当前已建造数量。 */
  getCount(typeId: string): number {
    return this.counts.get(typeId) ?? 0;
  }

  /** 检查是否已达到建造上限。 */
  isAtLimit(typeId: string, limit: number): boolean {
    return this.getCount(typeId) >= limit;
  }

  /** 清空计数（新游戏/重置用）。 */
  clear(): void {
    this.counts.clear();
  }

  /** 获取所有被追踪的类型及数量。 */
  getAll(): ReadonlyMap<string, number> {
    return this.counts;
  }
}

/** 全局建造限制查询（便捷函数）。 */
export function checkBuildLimit(tracker: BuildLimitTracker, typeId: string, limit?: number): boolean {
  if (limit === undefined || limit <= 0) return true;
  return !tracker.isAtLimit(typeId, limit);
}
