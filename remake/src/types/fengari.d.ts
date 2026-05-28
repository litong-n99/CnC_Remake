declare module 'fengari-web' {
  export const lua: Record<string, unknown>;
  export const lauxlib: Record<string, unknown>;
  export const lualib: Record<string, unknown>;
  export function to_luastring(s: string): unknown;
  export function to_jsstring(s: unknown): string;
}
