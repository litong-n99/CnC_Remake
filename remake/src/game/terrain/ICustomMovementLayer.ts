import type { LocomotorInfo } from '../rules/Locomotor';
import type { PathNode } from './IPathGraph';

/**
 * 移动层类型枚举。
 *
 * 预留未来扩展：隧道、地下、跳跃喷气、高架桥、空军/海军。
 * Ground = 0 为默认层，所有现有单位均在此层移动。
 */
export enum MovementLayer {
  Ground = 0,
  Tunnel = 1,
  Subterranean = 2,
  Jumpjet = 3,
  ElevatedBridge = 4,
}

/**
 * ICustomMovementLayer — 自定义移动层接口。
 *
 * 为多层移动架构预留的骨架接口。每个层定义自己的：
 * - 适用 Locomotor（哪些单位可以进入此层）
 * - 进入/离开代价（Entry/Exit Cost）
 * - 格子中心坐标（用于多层切换时的距离计算）
 *
 * OpenRA 对标：
 *   - `OpenRA.Mods.Common/Traits/World/CustomMovementLayer.cs`
 *
 * 当前状态：仅定义接口，所有实现均为 WIP（Task 23.19 后逐步填充）。
 */
export interface ICustomMovementLayer {
  /** 层唯一索引。 */
  readonly index: MovementLayer;

  /** 该 Locomotor 是否可以在此层移动。 */
  enabledForLocomotor(locomotor: LocomotorInfo): boolean;

  /** 从相邻层进入此格子的代价。 */
  entryCost(node: PathNode): number;

  /** 从此格子离开到相邻层的代价。 */
  exitCost(node: PathNode): number;

  /** 该层格子的中心世界坐标。 */
  centerOfCell(node: PathNode): { readonly x: number; readonly y: number };
}
