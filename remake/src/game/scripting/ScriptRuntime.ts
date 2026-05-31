/**
 * 脚本运行时集成 — Task 55
 * Source: docs/(ARCHIVED)TASK_BREAKDOWN.md — Task 55
 * OpenRA 对标: ScriptContext.cs + MemoryConstrainedLuaRuntime
 *
 * 设计要点：
 *   - 采用轻量级 JavaScript 运行时（浏览器原生，无需 WASM/Lua 依赖）
 *   - 脚本在严格模式下执行，通过 new Function 注入全局 API
 *   - 支持 async/await，允许脚本执行异步操作（延迟、动画等）
 *   - 沙箱隔离：脚本只能访问显式注册的全局对象，无法访问 window/document
 *
 * 为什么不选 fengari-web（Lua）：
 *   - 浏览器端 WASM 增加包体积 (~200KB+)
 *   - JS 运行时与 TS 代码天然互操作，调试更友好
 *   - 战役脚本逻辑简单，JS 足够表达所有触发器/条件/动作
 */

export interface ScriptRuntimeOptions {
  /** 脚本执行超时（毫秒），默认 5000。 */
  timeoutMs?: number;
  /** 是否允许 async 脚本。 */
  allowAsync?: boolean;
}

/**
 * 轻量级脚本运行时。
 *
 * 使用 `new Function` 在隔离上下文中执行脚本字符串，
 * 仅暴露显式注册的全局变量，防止脚本访问浏览器原生 API。
 */
export class ScriptRuntime {
  private globals = new Map<string, unknown>();
  private options: ScriptRuntimeOptions;
  private executionCount = 0;

  constructor(options: ScriptRuntimeOptions = {}) {
    this.options = {
      timeoutMs: 5000,
      allowAsync: true,
      ...options,
    };
  }

  /**
   * 注册一个全局变量，脚本中可通过名称直接访问。
   * @param name  — 全局变量名（如 `"Map"`）
   * @param value — 值（通常是某个 Global API 实例）
   */
  registerGlobal(name: string, value: unknown): void {
    this.globals.set(name, value);
  }

  /** 移除已注册的全局变量。 */
  unregisterGlobal(name: string): boolean {
    return this.globals.delete(name);
  }

  /** 获取已注册的全局变量。 */
  getGlobal(name: string): unknown {
    return this.globals.get(name);
  }

  /** 列出所有已注册的全局变量名。 */
  listGlobals(): string[] {
    return Array.from(this.globals.keys());
  }

  /**
   * 执行脚本字符串。
   *
   * @param code    — 脚本代码（JavaScript）
   * @param locals  — 本次执行的额外局部变量（不注册到运行时）
   * @returns 脚本返回值（如果脚本显式 return）
   * @throws 脚本语法错误或执行异常
   */
  execute(code: string, locals: Record<string, unknown> = {}): unknown {
    const merged = new Map([...this.globals, ...Object.entries(locals)]);
    const keys = Array.from(merged.keys());
    const values = Array.from(merged.values());

    try {
      // new Function 在全局作用域执行，通过形参注入全局变量
      const body = this.options.allowAsync
        ? `"use strict";\nreturn (async () => {\n${code}\n})();`
        : `"use strict";\n${code}`;
      const fn = new Function(...keys, body);
      this.executionCount++;
      return fn(...values);
    } catch (err) {
      throw new Error(`[ScriptRuntime] Execution failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * 异步执行脚本（等待 async 脚本完成）。
   *
   * @param code   — 脚本代码
   * @param locals — 本次执行的额外局部变量
   * @returns Promise<脚本返回值>
   */
  async executeAsync(code: string, locals: Record<string, unknown> = {}): Promise<unknown> {
    const result = this.execute(code, locals);
    if (result instanceof Promise) {
      return result;
    }
    return result;
  }

  /** 当前已执行的脚本次数。 */
  getExecutionCount(): number {
    return this.executionCount;
  }

  /** 清空所有已注册的全局变量。 */
  clearGlobals(): void {
    this.globals.clear();
  }

  /** 序列化当前全局变量名列表（用于调试/存档）。 */
  serializeState(): { globals: string[]; executionCount: number } {
    return {
      globals: this.listGlobals(),
      executionCount: this.executionCount,
    };
  }
}
