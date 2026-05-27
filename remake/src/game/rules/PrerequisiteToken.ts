/**
 * PrerequisiteToken — Task 134
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/Buildable.cs` 中的 `Prerequisites`
 *
 * 前提条件令牌解析器：支持 `~` 前缀（必须拥有）、逗号（AND）、管道符（OR）。
 *
 * 语法：
 * - `~weap`            — 必须拥有 `weap` 令牌
 * - `barracks,weap`    — 必须同时拥有 `barracks` 和 `weap`
 * - `barracks|weap`    — 拥有 `barracks` 或 `weap` 任一即可
 * - `~barracks,~weap`  — 必须同时拥有两者
 */

/** 解析令牌表达式，返回是否满足。 */
export function evaluatePrerequisites(expression: string, ownedTokens: ReadonlySet<string>): boolean {
  if (!expression || expression.trim() === '') return true;

  // 顶层按逗号分割（AND）
  const andGroups = expression.split(',').map((s) => s.trim());

  for (const group of andGroups) {
    if (group === '') continue;

    // 每组按管道符分割（OR）
    const orTokens = group.split('|').map((s) => s.trim());
    let groupSatisfied = false;

    for (const token of orTokens) {
      if (token === '') continue;
      const required = token.startsWith('~') ? token.slice(1) : token;
      if (ownedTokens.has(required)) {
        groupSatisfied = true;
        break;
      }
    }

    if (!groupSatisfied) return false;
  }

  return true;
}

/** 从表达式中提取所有唯一令牌名（不含 ~ 前缀）。 */
export function extractTokens(expression: string): string[] {
  const tokens = new Set<string>();
  const parts = expression.split(/[,|]/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed) {
      tokens.add(trimmed.startsWith('~') ? trimmed.slice(1) : trimmed);
    }
  }
  return Array.from(tokens);
}
