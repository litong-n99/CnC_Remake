import yaml from 'js-yaml';
import { RuleRegistry } from './RuleRegistry';
import { registerUnitRuleConverter, loadYamlUnitDefinitions } from './UnitDefinitions';
import { registerBuildingRuleConverter, loadYamlBuildingDefinitions } from './BuildingDefinitions';
import { loadYamlGameRules } from './GameRules';

/**
 * YAML 规则加载管道 — Task 95
 *
 * OpenRA 对标: `MiniYaml.cs` + `FieldLoader.cs`
 *
 * 功能：
 *   - fetch YAML 文件（支持多文件合并）
 *   - 解析标准 YAML（通过 js-yaml）
 *   - 处理 MiniYaml 风格继承（`Inherits:`）与删除（`-Key:`）
 *   - 注册到 RuleRegistry
 *
 * 回退：fetch 失败时自动回退到内置 TS 常量，不抛错。
 */

export interface YamlLoaderOptions {
  /** YAML 文件基础路径（默认 `/rules/`） */
  readonly basePath?: string;
  /** 是否启用详细日志 */
  readonly verbose?: boolean;
}

/**
 * 加载所有规则 YAML 文件并注册到 RuleRegistry。
 * @returns 是否成功加载（false = 回退到内置常量）
 */
export async function loadYamlRules(options: YamlLoaderOptions = {}): Promise<boolean> {
  const base = options.basePath ?? `${import.meta.env.BASE_URL}rules/`.replace(/\/+/g, '/');
  const files = ['defaults.yaml', 'units.yaml', 'buildings.yaml', 'rules.yaml'];

  const rawDocs: Array<Record<string, unknown>> = [];

  for (const file of files) {
    const url = `${base}${file}`.replace(/\/+/g, '/');
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (options.verbose) console.warn(`[YamlLoader] ${url} → ${res.status}`);
        continue;
      }
      const text = await res.text();
      if (!text.trim()) continue;
      const doc = yaml.load(text) as Record<string, unknown> | null;
      if (doc) rawDocs.push(doc);
    } catch (err) {
      if (options.verbose) console.warn(`[YamlLoader] Failed to load ${url}:`, err);
    }
  }

  if (rawDocs.length === 0) {
    console.warn('[YamlLoader] No YAML rules loaded; using built-in TS constants.');
    return false;
  }

  // 合并所有文档
  const merged = mergeDocs(rawDocs);

  // 处理继承与删除
  const resolved = resolveInherits(merged);

  // 按类型分发给 RuleRegistry
  const registry = RuleRegistry.getInstance();

  const units: Record<string, Record<string, unknown>> = {};
  const buildings: Record<string, Record<string, unknown>> = {};

  for (const [key, value] of Object.entries(resolved)) {
    if (key.startsWith('^')) continue;
    if (typeof value !== 'object' || value === null) continue;

    const record = value as Record<string, unknown>;
    // 简单启发式：含 strength + locomotion 的是单位；含 width + height + power 的是建筑
    if (key === 'gameRules' || key === 'GameRules') {
      loadYamlGameRules(record);
      if (options.verbose) console.info('[YamlLoader] Loaded gameRules from YAML');
    } else if ('strength' in record && 'locomotion' in record) {
      units[key] = record;
    } else if ('strength' in record && 'width' in record) {
      buildings[key] = record;
    }
  }

  if (Object.keys(units).length > 0) {
    registry.load('Unit', units);
    if (options.verbose) console.info(`[YamlLoader] Loaded ${Object.keys(units).length} units from YAML`);
  }
  if (Object.keys(buildings).length > 0) {
    registry.load('Building', buildings);
    if (options.verbose) console.info(`[YamlLoader] Loaded ${Object.keys(buildings).length} buildings from YAML`);
  }

  return true;
}

/**
 * 一键加载 YAML 规则：注册转换器 → fetch YAML → 覆盖运行时定义。
 * 失败时自动回退到内置 TS 常量，不抛错。
 * @returns 是否成功从 YAML 加载
 */
export async function loadYamlRulesWithFallback(): Promise<boolean> {
  registerUnitRuleConverter();
  registerBuildingRuleConverter();

  const ok = await loadYamlRules({ verbose: true });
  if (ok) {
    loadYamlUnitDefinitions();
    loadYamlBuildingDefinitions();
  }
  return ok;
}

/** 合并多个 YAML 文档（后加载的覆盖先加载的）。 */
function mergeDocs(docs: Array<Record<string, unknown>>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc)) {
      const existing = result[key];
      if (
        existing &&
        typeof existing === 'object' &&
        typeof value === 'object' &&
        existing !== null &&
        value !== null
      ) {
        result[key] = { ...existing, ...value };
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * 处理 MiniYaml 风格继承与删除。
 *
 * - `Inherits: ParentName` → 递归合并父节点字段
 * - `-KeyName:` → 从结果中删除该字段
 *
 * 抽象模板以 `^` 开头（如 `^Tank`），不对外暴露。
 */
function resolveInherits(doc: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const resolved = new Map<string, Record<string, unknown>>();

  function resolve(key: string): Record<string, unknown> {
    if (resolved.has(key)) return resolved.get(key)!;

    const raw = doc[key];
    if (!raw || typeof raw !== 'object') {
      resolved.set(key, {});
      return {};
    }

    let record = { ...(raw as Record<string, unknown>) };

    // 处理继承
    const inherits = record.Inherits;
    if (typeof inherits === 'string') {
      const parent = resolve(inherits);
      record = { ...parent, ...record };
      delete record.Inherits;
    } else if (Array.isArray(inherits)) {
      // 多继承：从左到右依次合并
      for (const parentName of inherits) {
        if (typeof parentName === 'string') {
          const parent = resolve(parentName);
          record = { ...parent, ...record };
        }
      }
      delete record.Inherits;
    }

    // 处理删除语法：以 "-" 开头的键
    const keysToDelete: string[] = [];
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      if (k.startsWith('-')) {
        keysToDelete.push(k.slice(1));
      } else {
        cleaned[k] = v;
      }
    }
    for (const dk of keysToDelete) {
      delete cleaned[dk];
    }

    resolved.set(key, cleaned);
    return cleaned;
  }

  const result: Record<string, Record<string, unknown>> = {};
  for (const key of Object.keys(doc)) {
    result[key] = resolve(key);
  }
  return result;
}
