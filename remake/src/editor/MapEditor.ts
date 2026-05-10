/**
 * CnCTDRAMapEditor Web 版入口
 *
 * Source: origin/CnCTDRAMapEditor/ (C# Map Editor)
 * Status: WIP (Work In Progress) — Phase 8 后开发
 *
 * 设计目标：
 * 1. 将 C# 地图编辑器的核心功能（地形绘制、单位/建筑放置、触发器编辑）迁移至 Web。
 * 2. 地图数据导出为 JSON 格式，供 GameMap / TerrainGrid 直接加载。
 * 3. 保留与原始编辑器一致的格子坐标系 (Cell X, Y) 和地形类型枚举。
 *
 * JSON 导出格式预留：
 * {
 *   "version": "1.0",
 *   "width": 64,
 *   "height": 64,
 *   "theater": "TEMPERATE",
 *   "cells": [
 *     { "x": 0, "y": 0, "template": 0, "icon": 0, "overlay": null },
 *     ...
 *   ],
 *   "units": [
 *     { "type": "MTANK", "house": "GDI", "x": 10, "y": 20, "facing": 0 },
 *     ...
 *   ],
 *   "buildings": [
 *     { "type": "FACTORY", "house": "GDI", "x": 15, "y": 15, "health": 100 },
 *     ...
 *   ],
 *   "infantry": [...],
 *   "terrain": [...],
 *   "waypoints": [...],
 *   "triggers": [...]
 * }
 */

export interface MapEditorJsonExport {
  version: string;
  width: number;
  height: number;
  theater: string;
  cells: CellData[];
  units: UnitPlacement[];
  buildings: BuildingPlacement[];
  infantry: InfantryPlacement[];
  terrain: TerrainPlacement[];
  waypoints: WaypointData[];
  triggers: TriggerData[];
}

export interface CellData {
  x: number;
  y: number;
  template: number;
  icon: number;
  overlay: string | null;
}

export interface UnitPlacement {
  type: string;
  house: string;
  x: number;
  y: number;
  facing: number;
}

export interface BuildingPlacement {
  type: string;
  house: string;
  x: number;
  y: number;
  health: number;
}

export interface InfantryPlacement {
  type: string;
  house: string;
  x: number;
  y: number;
  subCell: number;
}

export interface TerrainPlacement {
  type: string;
  x: number;
  y: number;
}

export interface WaypointData {
  id: number;
  x: number;
  y: number;
}

export interface TriggerData {
  name: string;
  event: string;
  action: string;
}

/**
 * 地图编辑器主类（WIP 占位）
 */
export class MapEditor {
  private readonly _wipMessage = '[CnCTDRAMapEditor] Work In Progress — 地图编辑器将在 Phase 8 后开发';

  constructor() {
    console.warn(this._wipMessage);
  }

  /**
   * 导出当前地图为 JSON 格式
   * TODO: Phase 8 实现完整导出逻辑
   */
  public exportToJson(): MapEditorJsonExport {
    // WIP: 返回空地图结构占位
    return {
      version: '1.0-wip',
      width: 64,
      height: 64,
      theater: 'TEMPERATE',
      cells: [],
      units: [],
      buildings: [],
      infantry: [],
      terrain: [],
      waypoints: [],
      triggers: [],
    };
  }

  /**
   * 从 JSON 导入地图
   * TODO: Phase 8 实现完整导入逻辑
   */
  public importFromJson(_data: MapEditorJsonExport): void {
    // WIP: 仅打印提示
    console.warn('[CnCTDRAMapEditor] importFromJson() is not implemented yet.');
  }

  /**
   * 获取 WIP 提示文案
   */
  public getWipNotice(): string {
    return this._wipMessage;
  }
}
