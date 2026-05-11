import { type GameMap, type MapCellData } from './GameMap';
import { LandType, TerrainGrid } from './TerrainGrid';

/**
 * 外部 JSON 地图的原始格式。
 *
 * `cells` 是一个二维数字数组，每个数字对应 {@link LandType} 枚举值。
 * 这种格式紧凑、易读、易手工编辑。
 */
export interface MapJson {
  version: string;
  width: number;
  height: number;
  cells: number[][];
}

/**
 * 地图加载器 — 负责将外部 JSON（或 URL）反序列化为 {@link GameMap}，
 * 并可将其同步到 {@link TerrainGrid} 进行渲染。
 */
export class MapLoader {
  /**
   * 从网络 URL 加载地图 JSON。
   *
   * @param url — 地图文件地址（如 `"/maps/dummy_map.json"`）。
   * @returns 解析后的 {@link GameMap}。
   * @throws 当网络错误或 JSON 格式非法时抛出。
   */
  static async loadFromUrl(url: string): Promise<GameMap> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`[MapLoader] Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as MapJson;
    return MapLoader.parseJson(json);
  }

  /**
   * 从已解析的 JS 对象直接构建 {@link GameMap}。
   *
   * @param json — 符合 {@link MapJson} 格式的纯对象。
   * @returns 解析后的 {@link GameMap}。
   * @throws 当地形类型越界或尺寸不匹配时抛出。
   */
  static parseJson(json: MapJson): GameMap {
    const { width, height, cells } = json;

    if (!Array.isArray(cells) || cells.length !== height) {
      throw new Error(`[MapLoader] Cell row count ${cells.length} does not match height ${height}`);
    }

    const mapCells: MapCellData[][] = [];

    for (let y = 0; y < height; y++) {
      const row = cells[y];
      if (!Array.isArray(row) || row.length !== width) {
        throw new Error(`[MapLoader] Row ${y} length ${row.length} does not match width ${width}`);
      }

      const mapRow: MapCellData[] = [];
      for (let x = 0; x < width; x++) {
        const raw = row[x];
        if (typeof raw !== 'number' || raw < -1 || raw >= LandType.River + 1) {
          throw new Error(`[MapLoader] Invalid landType ${raw} at (${x}, ${y})`);
        }
        mapRow.push({ landType: raw as LandType });
      }
      mapCells.push(mapRow);
    }

    return {
      version: json.version ?? '1.0',
      width,
      height,
      cells: mapCells,
    };
  }

  /**
   * 将 {@link GameMap} 中的地形数据写入已存在的 {@link TerrainGrid}。
   *
   * 要求 `terrain` 的宽高与 `map` 一致；不一致时会抛出错误。
   */
  static applyToTerrainGrid(map: GameMap, terrain: TerrainGrid): void {
    if (map.width !== terrain.getWidth() || map.height !== terrain.getHeight()) {
      throw new Error(
        `[MapLoader] Map size ${map.width}x${map.height} does not match ` +
          `TerrainGrid ${terrain.getWidth()}x${terrain.getHeight()}`
      );
    }

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        terrain.setCellLandType(x, y, map.cells[y][x].landType);
      }
    }
  }
}
