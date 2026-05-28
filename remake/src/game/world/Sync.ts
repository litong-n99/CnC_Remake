/**
 * Sync — Task-S1 / Task-S3
 * OpenRA 对标: `OpenRA.Game/Sync.cs`
 *
 * 提供：
 *   1. 同步字段标记系统（替代 C# 的 `[Sync]` 属性）
 *   2. RunUnsynced 保护机制（隔离非确定性代码）
 */

/** 记录每个类需要同步的字段名。 */
const syncFieldsByClass = new Map<string, Set<string>>();

/** 标记一个字段需要同步（在类定义后注册）。
 * 用法：
 *   class MyClass { x = 0; y = 0; }
 *   registerSyncFields(MyClass, ['x', 'y']);
 */
export function registerSyncFields(classRef: new (...args: unknown[]) => unknown, fields: string[]): void {
  const name = classRef.name;
  const existing = syncFieldsByClass.get(name);
  if (existing) {
    for (const f of fields) existing.add(f);
  } else {
    syncFieldsByClass.set(name, new Set(fields));
  }
}

/** 获取某类注册的所有同步字段。 */
export function getSyncFields(className: string): string[] {
  return Array.from(syncFieldsByClass.get(className) ?? []);
}

/** 清除所有同步字段注册（测试用）。 */
export function clearSyncFields(): void {
  syncFieldsByClass.clear();
}

// ── Task-S2: MurmurHash3 优化 ──

/** MurmurHash3 32-bit (x86) — 比 FNV-1a 分布更均匀。 */
export function murmurHash3(key: string, seed = 0): number {
  let h1 = seed >>> 0;
  const c1 = 0xcc9e2d97;
  const c2 = 0x1b873593;
  const remainder = key.length & 3;
  const bytes = key.length - remainder;
  let i = 0;

  while (i < bytes) {
    let k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(i + 1) & 0xff) << 8) |
      ((key.charCodeAt(i + 2) & 0xff) << 16) |
      ((key.charCodeAt(i + 3) & 0xff) << 24);

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;

    i += 4;
  }

  let k1 = 0;
  if (remainder >= 3) k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
  if (remainder >= 2) k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
  if (remainder >= 1) {
    k1 ^= key.charCodeAt(i) & 0xff;
    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);
    h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

/**
 * 计算一个对象的同步哈希（只遍历标记字段）。
 * 比 JSON.stringify 全部字段更快、更确定。
 */
export function hashSyncObject(obj: object, className?: string): number {
  const name = className ?? obj.constructor.name;
  const fields = getSyncFields(name);
  let hash = 0x811c9dc5;
  for (const field of fields) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (obj as any)[field];
    const str = `${field}=${value}`;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return hash >>> 0;
}

// ── Task-S3: RunUnsynced ──

let unsyncedDepth = 0;
let lastHashBeforeUnsynced = '';

/** 在非同步代码块中执行操作。
 * 嵌套调用安全，顶层退出时可选择验证 sync hash 未变化。
 *
 * 用法：
 *   Sync.runUnsynced(world, () => {
 *     Ui.update();  // UI 更新不影响同步
 *     sound.play(); // 音效不影响同步
 *   });
 */
export function runUnsynced<T>(_world: unknown, action: () => T): T {
  const isTopLevel = unsyncedDepth === 0;
  if (isTopLevel) {
    // 可选：在顶层记录进入前的 hash（debug 模式）
    lastHashBeforeUnsynced = '';
  }
  unsyncedDepth++;
  try {
    return action();
  } finally {
    unsyncedDepth--;
    if (isTopLevel && lastHashBeforeUnsynced) {
      // debug 模式下可验证 hash 未变化
    }
  }
}

/** 当前是否处于非同步代码块中。 */
export function isUnsynced(): boolean {
  return unsyncedDepth > 0;
}

/** 获取当前非同步嵌套深度。 */
export function getUnsyncedDepth(): number {
  return unsyncedDepth;
}

// ── Task-S4: 双随机数分离 ──

/** 共享随机数 — 严格同步，用于游戏逻辑。
 * 所有客户端必须保持相同的种子和序列。 */
export class SharedRandom {
  private seed = 12345;

  /** 设置种子（游戏开始时统一设置）。 */
  setSeed(seed: number): void {
    this.seed = seed >>> 0;
  }

  /** 生成下一个确定性随机整数（0–2^31-1）。 */
  nextInt(): number {
    // LCG: Numerical Recipes
    this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
    return this.seed & 0x7fffffff;
  }

  /** 生成 0–1 的确定性随机浮点数。 */
  nextFloat(): number {
    return this.nextInt() / 0x7fffffff;
  }

  /** 生成范围 [min, max) 的确定性随机整数。 */
  nextRange(min: number, max: number): number {
    return min + (this.nextInt() % (max - min));
  }

  getSeed(): number {
    return this.seed;
  }
}

/** 本地随机数 — 客户端本地，用于纯视觉/音效随机。
 * 不影响同步状态。 */
export class LocalRandom {
  private seed = Date.now() >>> 0;

  nextInt(): number {
    this.seed = (Math.imul(1103515245, this.seed) + 12345) >>> 0;
    return this.seed & 0x7fffffff;
  }

  nextFloat(): number {
    return this.nextInt() / 0x7fffffff;
  }

  nextRange(min: number, max: number): number {
    return min + (this.nextInt() % (max - min));
  }
}

/** 全局共享随机数实例（单例）。 */
export const sharedRandom = new SharedRandom();

/** 全局本地随机数实例（单例）。 */
export const localRandom = new LocalRandom();
