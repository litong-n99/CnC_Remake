/**
 * 游戏状态序列化器 — Task 33
 *
 * 将当前游戏状态（地图、单位、建筑、资金）序列化为 JSON，
 * 支持下载与上传恢复。
 */

import { GameObjectManager } from '../game/objects/GameObjectManager';

import { Unit } from '../game/objects/Unit';
import { Building } from '../game/objects/Building';
import { HouseManager } from '../game/house/HouseManager';
import { HouseType } from '../game/house/House';
import type { TerrainGrid } from '../game/terrain/TerrainGrid';

/** 序列化后的游戏状态 */
export interface GameSaveData {
  readonly version: '1.0';
  readonly timestamp: number;
  readonly map: {
    readonly width: number;
    readonly height: number;
    readonly cells: number[]; // landType 扁平数组
  };
  readonly houses: Array<{
    readonly type: HouseType;
    readonly credits: number;
    readonly power: number;
    readonly drain: number;
  }>;
  readonly units: Array<{
    readonly id: string;
    readonly definitionId: string;
    readonly houseType: HouseType;
    readonly x: number;
    readonly y: number;
    readonly health: number;
  }>;
  readonly buildings: Array<{
    readonly id: string;
    readonly definitionId: string;
    readonly houseType: HouseType;
    readonly x: number;
    readonly y: number;
    readonly health: number;
    readonly constructionProgress: number;
  }>;
}

export class GameSerializer {
  /** 将当前游戏状态序列化为 GameSaveData。 */
  static serialize(terrain: TerrainGrid): GameSaveData {
    const goManager = GameObjectManager.getInstance();
    const houseManager = HouseManager.getInstance();

    // 序列化地图
    const w = terrain.getWidth();
    const h = terrain.getHeight();
    const cells: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        cells.push(terrain.getCellLandType(x, y));
      }
    }

    // 序列化阵营
    const houses = houseManager.getAllHouses().map((h) => ({
      type: h.id,
      credits: h.credits,
      power: h.power,
      drain: h.drain,
    }));

    // 序列化单位
    const units = goManager
      .getUnits()
      .filter((u) => u.isAlive())
      .map((obj) => {
        const unit = obj as Unit;
        return {
          id: unit.id,
          definitionId: unit.definition.id,
          houseType: unit.house.id,
          x: unit.x,
          y: unit.y,
          health: unit.logic.currentHealth,
        };
      });

    // 序列化建筑
    const buildings = goManager
      .getBuildings()
      .filter((b) => b.isAlive())
      .map((obj) => {
        const building = obj as Building;
        return {
          id: building.id,
          definitionId: building.definition.id,
          houseType: building.house.id,
          x: building.x,
          y: building.y,
          health: building.logic.currentHealth,
          constructionProgress: building.constructionProgress,
        };
      });

    return {
      version: '1.0',
      timestamp: Date.now(),
      map: { width: w, height: h, cells },
      houses,
      units,
      buildings,
    };
  }

  /** 将 GameSaveData 反序列化并应用到游戏中。 */
  static deserialize(data: GameSaveData, terrain: TerrainGrid, _scene: import('@babylonjs/core').Scene): void {
    if (data.version !== '1.0') {
      console.warn(`[GameSerializer] Unsupported save version: ${data.version}`);
      return;
    }

    // 清除现有对象
    GameObjectManager.getInstance().clear();

    // 恢复地图
    const { width, height, cells } = data.map;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        terrain.setCellLandType(x, y, cells[y * width + x]);
      }
    }

    // 恢复阵营资金
    const houseManager = HouseManager.getInstance();
    for (const h of data.houses) {
      const house = houseManager.getHouse(h.type);
      if (house) {
        house.credits = h.credits;
        house.power = h.power;
        house.drain = h.drain;
      }
    }

    // 恢复单位需要 GameObjectFactory，但这里只做数据层恢复
    // 实际恢复由 SaveManager 调用 GameObjectFactory 完成
    console.info(`[GameSerializer] Deserialized: ${data.units.length} units, ${data.buildings.length} buildings`);
  }

  /** 将 GameSaveData 导出为 JSON Blob URL（用于下载）。 */
  static exportToBlob(data: GameSaveData): string {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    return URL.createObjectURL(blob);
  }

  /** 从文件读取 GameSaveData。 */
  static async importFromFile(file: File): Promise<GameSaveData | null> {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as GameSaveData;
      if (data.version !== '1.0') {
        console.warn(`[GameSerializer] Unsupported save version: ${data.version}`);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[GameSerializer] Failed to parse save file:', err);
      return null;
    }
  }
}
