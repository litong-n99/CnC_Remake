/**
 * 阻塞检测级别 — 映射 OpenRA BlockedByActor。
 *
 * 寻路与移动阻塞检测时按此级别决定是否将其他单位视为障碍：
 * - `All`: 最严格，所有单位（静止 + 移动中）都阻塞
 * - `Stationary`: 只被静止单位阻塞，忽略移动中的单位
 * - `Immovable`: 只被不可移动单位阻塞（忽略所有可移动单位）
 * - `None`: 最宽松，不被任何单位阻塞
 */
export enum BlockedByActor {
  None = 0,
  Immovable = 1,
  Stationary = 2,
  All = 3,
}
