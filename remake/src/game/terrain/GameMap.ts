import { LandType } from './TerrainGrid';

/**
 * 序列化后的单格数据。目前仅保存地形类型；未来扩展字段（overlay、
 * smudge、海拔高度等）直接加在此处即可保持向后兼容。
 */
export interface MapCellData {
  landType: LandType;
}

/**
 * 内存中的地图数据结构。
 *
 * 对应 C++ 中 `CellClass Map[MAP_CELL_W * MAP_CELL_H]` 的二维展开，
 * 但使用 `cells[y][x]` 的行优先二维数组以便直观索引。
 */
export interface GameMap {
  readonly version: string;
  readonly width: number;
  readonly height: number;
  readonly cells: MapCellData[][];
}

/**
 * 创建一个空白地图，所有格子初始化为同一地形类型。
 */
export function createEmptyMap(width: number, height: number, defaultLandType: LandType = LandType.Clear): GameMap {
  const cells: MapCellData[][] = [];
  for (let y = 0; y < height; y++) {
    const row: MapCellData[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ landType: defaultLandType });
    }
    cells.push(row);
  }
  return {
    version: '1.0',
    width,
    height,
    cells,
  };
}
