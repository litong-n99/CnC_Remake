/**
 * 通用对象池 — Task 79
 *
 * 用于复用高频创建/销毁的对象（子弹、爆炸粒子、伤害数字等），
 * 避免 GC 抖动。对象必须实现 `reset()` 方法以便归还时清理状态。
 */

export interface Poolable {
  /** 归还池前调用，重置对象状态 */
  reset(): void;
}

export class ObjectPool<T extends Poolable> {
  private readonly factory: () => T;
  private readonly maxSize: number;
  private pool: T[] = [];
  private activeCount = 0;
  private totalCreated = 0;
  private totalReused = 0;

  /**
   * @param factory 创建新对象的工厂函数
   * @param initialSize 池初始容量（预创建）
   * @param maxSize 池最大容量，超过后多余对象直接丢弃
   */
  constructor(factory: () => T, initialSize = 0, maxSize = 1000) {
    this.factory = factory;
    this.maxSize = maxSize;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
      this.totalCreated++;
    }
  }

  /** 从池中获取一个对象（复用或新建） */
  acquire(): T {
    if (this.pool.length > 0) {
      this.totalReused++;
      this.activeCount++;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.pool.pop()!;
    }
    this.totalCreated++;
    this.activeCount++;
    return this.factory();
  }

  /** 将对象归还池中（自动调用 reset） */
  release(obj: T): void {
    obj.reset();
    this.activeCount--;
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  /** 当前池中空闲对象数 */
  getFreeCount(): number {
    return this.pool.length;
  }

  /** 当前活跃（已借出）对象数 */
  getActiveCount(): number {
    return this.activeCount;
  }

  /** 总创建次数 */
  getTotalCreated(): number {
    return this.totalCreated;
  }

  /** 总复用次数 */
  getTotalReused(): number {
    return this.totalReused;
  }

  /** 清空池 */
  clear(): void {
    this.pool = [];
    this.activeCount = 0;
  }
}
