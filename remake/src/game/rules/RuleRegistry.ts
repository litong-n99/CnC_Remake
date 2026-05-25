/**
 * 规则注册表 — Task 95
 *
 * OpenRA 对标: `Ruleset.cs` + `FieldLoader.cs`
 *
 * 显式注册表模式替代 C# 反射：
 *   - register(name, converter) 注册规则类型
 *   - load(name, records) 批量加载并转换 YAML 记录
 *   - get(name, id) / getAll(name) 查询运行时规则
 */

export type RuleConverter<T> = (raw: Record<string, unknown>, key: string) => T;

export class RuleRegistry {
  private static instance: RuleRegistry | null = null;
  private converters = new Map<string, RuleConverter<unknown>>();
  private rules = new Map<string, Map<string, unknown>>();

  static getInstance(): RuleRegistry {
    if (!RuleRegistry.instance) {
      RuleRegistry.instance = new RuleRegistry();
    }
    return RuleRegistry.instance;
  }

  /** 注册一种规则类型及其 YAML → TS 转换器。 */
  register<T>(name: string, converter: RuleConverter<T>): void {
    this.converters.set(name, converter as RuleConverter<unknown>);
    if (!this.rules.has(name)) {
      this.rules.set(name, new Map());
    }
  }

  /**
   * 批量加载 YAML 解析后的原始记录。
   * @param name   规则类型名（如 'Unit', 'Building'）
   * @param records  key → rawRecord，已处理完 Inherits/删除语法
   */
  load(name: string, records: Record<string, Record<string, unknown>>): void {
    const converter = this.converters.get(name);
    if (!converter) {
      console.warn(`[RuleRegistry] No converter registered for "${name}"`);
      return;
    }
    const store = this.rules.get(name)!;
    for (const [key, raw] of Object.entries(records)) {
      // 跳过以 ^ 开头的抽象模板
      if (key.startsWith('^')) continue;
      try {
        store.set(key, converter(raw, key));
      } catch (err) {
        console.warn(`[RuleRegistry] Failed to convert ${name}.${key}:`, err);
      }
    }
  }

  /** 获取单条规则。 */
  get<T>(name: string, id: string): T | undefined {
    return this.rules.get(name)?.get(id) as T | undefined;
  }

  /** 获取某类型的全部规则。 */
  getAll<T>(name: string): Record<string, T> {
    const store = this.rules.get(name);
    if (!store) return {};
    const result: Record<string, T> = {};
    for (const [k, v] of store) {
      result[k] = v as T;
    }
    return result;
  }

  /** 清空某类型的全部规则（测试/热重载用）。 */
  clear(name: string): void {
    this.rules.get(name)?.clear();
  }

  /** 释放单例（测试用）。 */
  dispose(): void {
    this.converters.clear();
    this.rules.clear();
    RuleRegistry.instance = null;
  }
}
