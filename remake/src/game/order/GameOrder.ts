/**
 * 统一的命令抽象层
 * Source: docs/DEPTH0_OPENRA_GAP_ANALYSIS.md — Task 140
 * OpenRA 对标: OpenRA.Game/Network/Order.cs
 *
 * 所有玩家输入（移动、攻击、建造、出售等）都封装为 GameOrder，
 * 支持本地执行、网络序列化（Task 62）和回放录制（Task 68）。
 */

/** 命令目标类型：可以是地面位置、单位或建筑 */
export interface OrderTarget {
  readonly type: 'ground' | 'actor' | 'none';
  /** 地面目标的世界/格子坐标（type='ground' 时有效） */
  readonly x?: number;
  readonly y?: number;
  /** 目标 Actor ID（type='actor' 时有效） */
  readonly actorId?: string;
}

/** 命令类型枚举（与 OpenRA OrderString 对齐） */
export type OrderString =
  | 'Move'
  | 'Attack'
  | 'AttackMove'
  | 'Guard'
  | 'Stop'
  | 'Build'
  | 'Sell'
  | 'Repair'
  | 'Deploy'
  | 'Follow'
  | 'Patrol';

/** 命令对象 —— 每个玩家输入产生一个 GameOrder */
export interface GameOrder {
  readonly orderString: OrderString;
  /** 发出命令的玩家 ID（如 'gdi', 'nod'）或单位 ID */
  readonly subjectId: string;
  /** 命令目标 */
  readonly target: OrderTarget;
  /** Shift 队列：true 表示追加到队列末尾 */
  readonly queued: boolean;
  /** 可选额外数据（如建筑类型名称、武器配置等） */
  readonly extraData?: Record<string, unknown>;
}

/** 命令处理结果 */
export interface OrderResult {
  readonly success: boolean;
  readonly message?: string;
}

/** 命令处理器接口 —— 每个 OrderString 对应一个处理器 */
export interface OrderHandler {
  readonly orderString: OrderString;
  execute(order: GameOrder): OrderResult;
}

/** 工厂函数：创建地面目标命令 */
export function groundOrder(
  orderString: OrderString,
  subjectId: string,
  x: number,
  y: number,
  queued = false,
  extraData?: Record<string, unknown>
): GameOrder {
  return {
    orderString,
    subjectId,
    target: { type: 'ground', x, y },
    queued,
    extraData,
  };
}

/** 工厂函数：创建 Actor 目标命令 */
export function actorOrder(
  orderString: OrderString,
  subjectId: string,
  actorId: string,
  queued = false,
  extraData?: Record<string, unknown>
): GameOrder {
  return {
    orderString,
    subjectId,
    target: { type: 'actor', actorId },
    queued,
    extraData,
  };
}

/** 工厂函数：创建无目标命令（Stop / Deploy） */
export function selfOrder(orderString: OrderString, subjectId: string, extraData?: Record<string, unknown>): GameOrder {
  return {
    orderString,
    subjectId,
    target: { type: 'none' },
    queued: false,
    extraData,
  };
}
