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
