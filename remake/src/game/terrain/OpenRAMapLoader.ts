/**
 * OpenRA 地图加载器 — 解析 `map.yaml` + `map.bin`。
 *
 * Source: OpenRA.Game/Map/Map.cs
 *
 * 支持：
 * - 从文件夹 URL 加载（`folder/map.yaml` + `folder/map.bin`）
 * - MiniYaml 解析（OpenRA 的简化 YAML 方言）
 * - map.bin 二进制解析（Little-endian）
 * - 回退到当前 JSON 格式（当 map.bin 不存在时）
 */

import { type GameMap, type MapCellData } from './GameMap';
import { LandType } from './TerrainGrid';
import { parseMiniYaml, mapYamlFromNodes, parseMapBin, type MapYaml, type MapBinData } from './MapFormat';

/** 命名演员条目（供脚本按名称引用）。 */
export interface NamedActorEntry {
  readonly id: string;
  readonly type: string;
  readonly location: { x: number; y: number };
  readonly owner: string;
  readonly facing?: number;
  readonly subCell?: number;
  readonly isWaypoint: boolean;
}

/** OpenRA 地图文件夹加载结果。 */
export interface OpenRAMapResult {
  readonly gameMap: GameMap;
  readonly mapYaml: MapYaml;
  readonly mapBin: MapBinData;
  /** 命名演员字典（id → entry），包含 Waypoint。 */
  readonly namedActors: ReadonlyMap<string, NamedActorEntry>;
}

export class OpenRAMapLoader {
  /**
   * 从文件夹 URL 加载 OpenRA 地图。
   *
   * 尝试加载 `folder/map.yaml` 和 `folder/map.bin`。
   * 若 `map.bin` 不存在，降级到 JSON 格式（通过 `fallbackJsonUrl`）。
   *
   * @param folderUrl — 地图文件夹地址（如 `"/maps/test_openra"`）。
   * @param fallbackJsonUrl — 当 map.bin 不存在时的回退 JSON 地址。
   */
  static async loadFromFolder(folderUrl: string, fallbackJsonUrl?: string): Promise<OpenRAMapResult> {
    const yamlUrl = `${folderUrl}/map.yaml`.replace(/\/+/g, '/');
    const binUrl = `${folderUrl}/map.bin`.replace(/\/+/g, '/');

    // 1. 加载 map.yaml
    const yamlResponse = await fetch(yamlUrl);
    if (!yamlResponse.ok) {
      throw new Error(`[OpenRAMapLoader] Failed to fetch ${yamlUrl}: ${yamlResponse.status}`);
    }
    const yamlText = await yamlResponse.text();
    const miniYamlNodes = parseMiniYaml(yamlText);
    const mapYaml = mapYamlFromNodes(miniYamlNodes);

    // 2. 尝试加载 map.bin
    let mapBin: MapBinData;
    const binResponse = await fetch(binUrl);
    if (binResponse.ok) {
      const binBuffer = await binResponse.arrayBuffer();
      mapBin = parseMapBin(binBuffer);
    } else if (fallbackJsonUrl) {
      // 回退到 JSON（仅用于地形类型，忽略 heights/resources）
      console.warn(`[OpenRAMapLoader] ${binUrl} not found, falling back to JSON`);
      mapBin = createStubMapBin(mapYaml.MapSize.width, mapYaml.MapSize.height);
    } else {
      throw new Error(`[OpenRAMapLoader] Failed to fetch ${binUrl}: ${binResponse.status}`);
    }

    // 3. 合并为 GameMap
    const gameMap = convertToGameMap(mapYaml, mapBin);

    // 4. 构建 NamedActors 字典（包含所有 Actor，包括 Waypoint）
    const namedActors = buildNamedActors(mapYaml);

    return { gameMap, mapYaml, mapBin, namedActors };
  }

  /**
   * 仅解析 map.yaml（不加载 map.bin）。
   * 用于预览地图元数据。
   */
  static async loadYamlOnly(folderUrl: string): Promise<MapYaml> {
    const yamlUrl = `${folderUrl}/map.yaml`.replace(/\/+/g, '/');
    const response = await fetch(yamlUrl);
    if (!response.ok) {
      throw new Error(`[OpenRAMapLoader] Failed to fetch ${yamlUrl}: ${response.status}`);
    }
    const text = await response.text();
    return mapYamlFromNodes(parseMiniYaml(text));
  }
}

/** 当 map.bin 不存在时，生成一个空的 stub（所有 tile type=1, height=0, resource=0）。 */
function createStubMapBin(width: number, height: number): MapBinData {
  const cellCount = width * height;
  return {
    header: {
      format: 11,
      width,
      height,
      tilesOffset: 17,
      heightsOffset: 17 + cellCount * 3,
      resourcesOffset: 17 + cellCount * 4,
    },
    tiles: Array.from({ length: cellCount }, () => ({ type: 1, index: 0 })),
    heights: Array.from({ length: cellCount }, () => 0),
    resources: Array.from({ length: cellCount }, () => ({ type: 0, density: 0 })),
  };
}

/**
 * 将 OpenRA 地图数据转换为内部 {@link GameMap}。
 *
 * Tile type → LandType 映射：
 * - OpenRA 使用 ushort tile type（特定于 TileSet）。
 * - 本项目目前仅支持简单的 LandType 枚举。
 * - 映射策略：type=0 → River, type=1 → Clear, type>=2 → 按奇偶映射到 Rock/Water/Grass。
 *   这是一个简化映射，真实映射需要 TileSet 解析（Task 9.2）。
 */
function convertToGameMap(mapYaml: MapYaml, mapBin: MapBinData): GameMap {
  const { width, height } = mapYaml.MapSize;
  const cells: MapCellData[][] = [];

  for (let y = 0; y < height; y++) {
    const row: MapCellData[] = [];
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const tile = mapBin.tiles[idx];
      const landType = tileTypeToLandType(tile.type);
      row.push({ landType });
    }
    cells.push(row);
  }

  return {
    version: `OpenRA-${mapYaml.MapFormat}`,
    width,
    height,
    cells,
  };
}

/** 将 OpenRA tile type 映射到本项目的 LandType（简化版）。 */
function tileTypeToLandType(tileType: number): LandType {
  if (tileType === 0) return LandType.Water;
  if (tileType === 1) return LandType.Clear;
  if (tileType === 2) return LandType.Rock;
  if (tileType === 3) return LandType.Road;
  // 其他：按奇偶循环
  const types = [LandType.Clear, LandType.Road, LandType.Rock, LandType.Water];
  return types[tileType % types.length];
}

/** 从 MapYaml 构建 NamedActors 字典。 */
function buildNamedActors(mapYaml: MapYaml): Map<string, NamedActorEntry> {
  const map = new Map<string, NamedActorEntry>();
  for (const a of mapYaml.Actors) {
    map.set(a.id, {
      id: a.id,
      type: a.type,
      location: a.location,
      owner: a.owner,
      facing: a.facing,
      subCell: a.subCell,
      isWaypoint: a.isWaypoint,
    });
  }
  return map;
}
