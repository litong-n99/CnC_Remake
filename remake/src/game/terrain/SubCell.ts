/**
 * SubCell 精确位置 — Task 124
 * OpenRA 对标: `MapGrid.cs` 中 `SubCell` 枚举 + `Mobile.cs` 中 `GetAvailableSubCell`
 *
 * 步兵可在同一格子内占据不同子位置，解决多步兵同格视觉重叠问题。
 */

export enum SubCell {
  Invalid = 255,
  Any = 254,
  FullCell = 0,
  TopLeft = 1,
  TopRight = 2,
  Center = 3,
  BottomLeft = 4,
  BottomRight = 5,
}

/** SubCell 到世界坐标偏移的映射（用于视觉微调）。 */
export const SUBCELL_OFFSETS: Record<SubCell, { dx: number; dy: number }> = {
  [SubCell.FullCell]: { dx: 0, dy: 0 },
  [SubCell.TopLeft]: { dx: -0.3, dy: -0.3 },
  [SubCell.TopRight]: { dx: 0.3, dy: -0.3 },
  [SubCell.Center]: { dx: 0, dy: 0 },
  [SubCell.BottomLeft]: { dx: -0.3, dy: 0.3 },
  [SubCell.BottomRight]: { dx: 0.3, dy: 0.3 },
  [SubCell.Invalid]: { dx: 0, dy: 0 },
  [SubCell.Any]: { dx: 0, dy: 0 },
};

/** 可用于步兵分配的 SubCell 列表（按分配优先级）。 */
export const INFANTRY_SUBCELLS = [
  SubCell.TopLeft,
  SubCell.TopRight,
  SubCell.Center,
  SubCell.BottomLeft,
  SubCell.BottomRight,
];

/** 获取指定 SubCell 的世界坐标偏移。 */
export function getSubCellOffset(subCell: SubCell): { dx: number; dy: number } {
  return SUBCELL_OFFSETS[subCell] ?? { dx: 0, dy: 0 };
}
