/**
 * Tiberian Dawn（泰伯利亚黎明）游戏模式入口
 *
 * Source: origin/TIBERIANDAWN/ (Original C++ DLL)
 * Status: WIP (Work In Progress) — Phase 8 后开发
 *
 * 设计目标：
 * 1. 与 REDALERT/ 平行的第二个游戏模式，复用核心引擎层（EngineManager、SceneManager、
 *    RTSCamera、InputManager 等）。
 * 2. 游戏逻辑层独立：TiberianDawn 拥有独立的 Rules、UnitDefinitions、BuildingDefinitions、
 *    House 设定（GDI vs Nod），与 RedAlert 的盟军/苏联体系区分开。
 * 3. 3D 表现层复用：单位/建筑的 Dummy 几何体工厂共用 renderer/ 层，仅通过定义数据驱动外观差异。
 * 4. 地图格式兼容：加载 TiberianDawn 专用地图（TEMPERATE / DESERT 剧场），Cell 结构与 RedAlert
 *    一致，仅地形模板和可用单位不同。
 *
 * 关键差异（与 RedAlert 对比）：
 * - 无海军单位（Tiberian Dawn 原版无舰船）。
 * - 无工程师占领建筑（Tiberian Dawn 使用 C4/其他机制）。
 * - 支援建筑（SAM Site、Obelisk of Light 等）为 Nod 独有；Advanced Guard Tower 为 GDI 独有。
 * - 泰伯利亚矿（Tiberium）替代矿石（Ore），矿场生长逻辑不同。
 */

import type { GameRules } from '../rules/GameRules';

/**
 * Tiberian Dawn 全局配置接口预留
 * TODO: Phase 8 从 origin/TIBERIANDAWN/RULES.CPP 提取完整常量
 */
export interface TiberianDawnRules extends GameRules {
  readonly theater: 'TEMPERATE' | 'DESERT' | 'WINTER';
  readonly tiberiumGrowthRate: number;
  readonly tiberiumSpreadRate: number;
}

/**
 * Tiberian Dawn 阵营枚举
 * Source: origin/TIBERIANDAWN/HOUSE.CPP
 */
export enum TiberianDawnHouse {
  GDI = 'GDI',
  NOD = 'NOD',
  NEUTRAL = 'NEUTRAL',
  SPECIAL = 'SPECIAL',
  MULTI1 = 'MULTI1',
  MULTI2 = 'MULTI2',
  MULTI3 = 'MULTI3',
  MULTI4 = 'MULTI4',
  MULTI5 = 'MULTI5',
  MULTI6 = 'MULTI6',
}

/**
 * Tiberian Dawn 游戏模式主类（WIP 占位）
 */
export class TiberianDawnGame {
  private readonly _wipMessage = '[TiberianDawn] Work In Progress — 泰伯利亚黎明模式将在 Phase 8 后开发';

  constructor() {
    console.warn(this._wipMessage);
  }

  /**
   * 初始化 Tiberian Dawn 专属 Rules
   * TODO: Phase 8 实现完整 Rules 加载
   */
  public initializeRules(): Partial<TiberianDawnRules> {
    // WIP: 返回最小占位结构
    return {
      theater: 'TEMPERATE',
      tiberiumGrowthRate: 0.02,
      tiberiumSpreadRate: 0.01,
    };
  }

  /**
   * 加载 Tiberian Dawn 地图
   * TODO: Phase 8 实现地图加载与地形生成
   */
  public loadMap(_mapPath: string): void {
    console.warn('[TiberianDawn] loadMap() is not implemented yet.');
  }

  /**
   * 启动 Tiberian Dawn 游戏循环
   * TODO: Phase 8 接入 GameLoop
   */
  public startGameLoop(): void {
    console.warn('[TiberianDawn] startGameLoop() is not implemented yet.');
  }

  /**
   * 获取 WIP 提示文案
   */
  public getWipNotice(): string {
    return this._wipMessage;
  }
}
