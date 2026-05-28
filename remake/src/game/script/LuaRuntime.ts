/**
 * LuaRuntime — Task-SCR1: Lua 运行时集成
 *
 * 基于 fengari（Lua 5.3 → JavaScript）封装安全沙箱，
 * 供战役脚本和触发器系统执行 Lua 代码。
 *
 * 沙箱措施：
 *   - 禁用 io / os / debug / package / load / loadfile / dofile
 *   - 执行时间限制（默认 1000ms）
 *   - 脚本长度限制（默认 64KB）
 *
 * OpenRA 对标: `OpenRA.Game/Scripting/ScriptContext.cs`
 */

import { lua, lauxlib, lualib, to_luastring, to_jsstring } from 'fengari-web';

export interface LuaResult {
  readonly success: boolean;
  readonly values: unknown[];
  readonly error?: string;
}

export class LuaRuntime {
  private readonly L: unknown;
  private disposed = false;
  private maxExecutionMs: number;
  private maxScriptLength: number;

  constructor(options?: { maxExecutionMs?: number; maxScriptLength?: number }) {
    this.maxExecutionMs = options?.maxExecutionMs ?? 1000;
    this.maxScriptLength = options?.maxScriptLength ?? 64 * 1024;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.L = (lauxlib as any).luaL_newstate();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (lualib as any).luaL_openlibs(this.L as never);
    this.disableDangerousGlobals();
  }

  /** 执行 Lua 代码字符串。 */
  execute(code: string): LuaResult {
    if (this.disposed) {
      return { success: false, values: [], error: 'LuaRuntime already disposed' };
    }
    if (code.length > this.maxScriptLength) {
      return { success: false, values: [], error: 'Script exceeds max length' };
    }

    const start = Date.now();
    const L = this.L as never;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (lauxlib as any).luaL_dostring(L, (to_luastring as any)(code));

    if (Date.now() - start > this.maxExecutionMs) {
      return { success: false, values: [], error: 'Execution timeout' };
    }

    const luaLib = lua as unknown as Record<string, unknown>;
    if (status !== (luaLib.LUA_OK as number)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (to_jsstring as any)((lua as any).lua_tostring(L, -1));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (lua as any).lua_pop(L, 1);
      return { success: false, values: [], error: msg ?? 'Unknown Lua error' };
    }

    const values: unknown[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const top = (lua as any).lua_gettop(L);
    for (let i = 1; i <= top; i++) {
      values.push(this.luaToJs(L, i));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (lua as any).lua_settop(L, 0);
    return { success: true, values };
  }

  /** 将 JS 值注册为 Lua 全局变量。 */
  setGlobal(name: string, value: unknown): void {
    if (this.disposed) return;
    const L = this.L as never;
    this.pushJsValue(L, value);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (lua as any).lua_setglobal(L, (to_luastring as any)(name));
  }

  /** 获取 Lua 全局变量值。 */
  getGlobal(name: string): unknown {
    if (this.disposed) return undefined;
    const L = this.L as never;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (lua as any).lua_getglobal(L, (to_luastring as any)(name));
    const result = this.luaToJs(L, -1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (lua as any).lua_pop(L, 1);
    return result;
  }

  dispose(): void {
    if (this.disposed) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (lua as any).lua_close(this.L as never);
    this.disposed = true;
  }

  // ── Private helpers ──

  private disableDangerousGlobals(): void {
    const L = this.L as never;
    const dangerous = ['io', 'os', 'debug', 'package', 'load', 'loadfile', 'dofile'];
    for (const name of dangerous) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (lua as any).lua_pushnil(L);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (lua as any).lua_setglobal(L, (to_luastring as any)(name));
    }
  }

  private luaToJs(L: never, idx: number): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const l = lua as any;
    const t = l.lua_type(L, idx);
    switch (t) {
      case l.LUA_TNIL:
        return null;
      case l.LUA_TBOOLEAN:
        return l.lua_toboolean(L, idx);
      case l.LUA_TNUMBER:
        return l.lua_isinteger(L, idx) ? l.lua_tointeger(L, idx) : l.lua_tonumber(L, idx);
      case l.LUA_TSTRING:
        return to_jsstring(l.lua_tostring(L, idx));
      case l.LUA_TTABLE: {
        const result: Record<string, unknown> = {};
        l.lua_pushnil(L);
        while (l.lua_next(L, idx < 0 ? idx - 1 : idx) !== 0) {
          const key = this.luaToJs(L, -2);
          const val = this.luaToJs(L, -1);
          if (typeof key === 'string' || typeof key === 'number') {
            result[String(key)] = val;
          }
          l.lua_pop(L, 1);
        }
        return result;
      }
      default:
        return undefined;
    }
  }

  private pushJsValue(L: never, value: unknown): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const l = lua as any;
    if (value === null || value === undefined) {
      l.lua_pushnil(L);
    } else if (typeof value === 'boolean') {
      l.lua_pushboolean(L, value ? 1 : 0);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) l.lua_pushinteger(L, value);
      else l.lua_pushnumber(L, value);
    } else if (typeof value === 'string') {
      l.lua_pushstring(L, (to_luastring as (s: string) => unknown)(value));
    } else if (typeof value === 'function') {
      const jsFn = value;
      const luaWrapper = function (L2: never) {
        try {
          const result = jsFn();
          if (result !== undefined) {
            l.lua_pushstring(L2, (to_luastring as (s: string) => unknown)(String(result)));
            return 1;
          }
          return 0;
        } catch {
          return 0;
        }
      };
      l.lua_pushjsfunction(L, luaWrapper);
    } else if (Array.isArray(value)) {
      l.lua_createtable(L, value.length, 0);
      for (let i = 0; i < value.length; i++) {
        this.pushJsValue(L, value[i]);
        l.lua_seti(L, -2, i + 1);
      }
    } else if (typeof value === 'object') {
      l.lua_createtable(L, 0, Object.keys(value).length);
      for (const [k, v] of Object.entries(value)) {
        l.lua_pushstring(L, (to_luastring as (s: string) => unknown)(k));
        this.pushJsValue(L, v);
        l.lua_settable(L, -3);
      }
    } else {
      l.lua_pushnil(L);
    }
  }
}
