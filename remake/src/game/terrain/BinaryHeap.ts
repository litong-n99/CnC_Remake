/**
 * 二叉最小堆 — Task 121
 *
 * A* 寻路 Open 集合优化：将线性数组 O(n) 扫描替换为 O(log n) 堆操作。
 * 支持 decrease-key（通过 indexMap 实现），满足 A* 中“发现更优路径时更新节点优先级”的需求。
 *
 * OpenRA 对标: `PathSearch.cs` 中的 `PriorityQueue` + `GraphConnection.CostComparer`
 */
export class BinaryHeap<T> {
  private heap: Array<{ item: T; priority: number }> = [];
  /** item key → heap 索引，支持 O(1) 定位用于 decrease-key / remove */
  private indexMap = new Map<string, number>();

  /**
   * @param compare 优先级比较器；返回负数表示 a 优先级更高（更靠近堆顶）
   * @param getKey  从 item 提取唯一 key，用于 indexMap 定位
   */
  constructor(
    private readonly compare: (a: number, b: number) => number,
    private readonly getKey: (item: T) => string
  ) {}

  /** 插入或更新优先级（若 key 已存在则自动 decrease-key / increase-key） */
  push(item: T, priority: number): void {
    const key = this.getKey(item);
    const idx = this.indexMap.get(key);
    if (idx !== undefined) {
      // key 已存在：更新优先级
      const old = this.heap[idx].priority;
      this.heap[idx].item = item;
      this.heap[idx].priority = priority;
      if (this.compare(priority, old) < 0) {
        this.bubbleUp(idx);
      } else {
        this.bubbleDown(idx);
      }
      return;
    }
    // 新节点
    const newIdx = this.heap.length;
    this.heap.push({ item, priority });
    this.indexMap.set(key, newIdx);
    this.bubbleUp(newIdx);
  }

  /** 弹出优先级最高的节点（堆顶） */
  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const root = this.heap[0];
    this.removeAt(0);
    return root.item;
  }

  /** 查看堆顶节点，不弹出 */
  peek(): T | undefined {
    return this.heap.length > 0 ? this.heap[0].item : undefined;
  }

  /** 查看堆顶优先级 */
  peekPriority(): number | undefined {
    return this.heap.length > 0 ? this.heap[0].priority : undefined;
  }

  /** 按 item 引用移除（通过 getKey 定位） */
  remove(item: T): boolean {
    const key = this.getKey(item);
    const idx = this.indexMap.get(key);
    if (idx === undefined) return false;
    this.removeAt(idx);
    return true;
  }

  /** 更新指定 item 的优先级 */
  updatePriority(item: T, newPriority: number): boolean {
    const key = this.getKey(item);
    const idx = this.indexMap.get(key);
    if (idx === undefined) return false;
    const old = this.heap[idx].priority;
    this.heap[idx].priority = newPriority;
    if (this.compare(newPriority, old) < 0) {
      this.bubbleUp(idx);
    } else {
      this.bubbleDown(idx);
    }
    return true;
  }

  /** 堆中节点数量 */
  get size(): number {
    return this.heap.length;
  }

  /** 是否为空 */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /** 是否包含指定 key */
  has(item: T): boolean {
    return this.indexMap.has(this.getKey(item));
  }

  private removeAt(idx: number): void {
    const key = this.getKey(this.heap[idx].item);
    this.indexMap.delete(key);
    const last = this.heap.pop();
    if (idx < this.heap.length && last) {
      this.heap[idx] = last;
      this.indexMap.set(this.getKey(last.item), idx);
      this.bubbleDown(idx);
      this.bubbleUp(idx);
    }
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.compare(this.heap[idx].priority, this.heap[parent].priority) >= 0) break;
      this.swap(idx, parent);
      idx = parent;
    }
  }

  private bubbleDown(idx: number): void {
    const n = this.heap.length;
    while (true) {
      let best = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < n && this.compare(this.heap[left].priority, this.heap[best].priority) < 0) best = left;
      if (right < n && this.compare(this.heap[right].priority, this.heap[best].priority) < 0) best = right;
      if (best === idx) break;
      this.swap(idx, best);
      idx = best;
    }
  }

  private swap(i: number, j: number): void {
    const a = this.heap[i];
    const b = this.heap[j];
    this.heap[i] = b;
    this.heap[j] = a;
    this.indexMap.set(this.getKey(a.item), j);
    this.indexMap.set(this.getKey(b.item), i);
  }
}
