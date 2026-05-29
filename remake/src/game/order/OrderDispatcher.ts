/**
 * 命令分发器 —— 接收 GameOrder 并路由到对应处理器
 * Source: harness/DEPTH0_OPENRA_GAP_ANALYSIS.md — Task 140
 * OpenRA 对标: OpenRA.Mods.Common/Orders/
 *
 * 与 Task 26（命令分发器）的关系：
 *   Task 26 负责将鼠标/键盘输入翻译为 GameOrder，
 *   OrderDispatcher 负责将 GameOrder 路由到具体执行逻辑。
 */

import type { GameOrder, OrderHandler, OrderResult } from './GameOrder';

export class OrderDispatcher {
  private readonly handlers = new Map<string, OrderHandler>();
  private static instance: OrderDispatcher | null = null;

  static getInstance(): OrderDispatcher {
    if (!OrderDispatcher.instance) {
      OrderDispatcher.instance = new OrderDispatcher();
    }
    return OrderDispatcher.instance;
  }

  static reset(): void {
    OrderDispatcher.instance = null;
  }

  /** 注册命令处理器 */
  register(handler: OrderHandler): void {
    if (this.handlers.has(handler.orderString)) {
      console.warn(`[OrderDispatcher] Handler for "${handler.orderString}" already registered, overwriting`);
    }
    this.handlers.set(handler.orderString, handler);
  }

  /** 分发命令到对应处理器 */
  dispatch(order: GameOrder): OrderResult {
    const handler = this.handlers.get(order.orderString);
    if (!handler) {
      return {
        success: false,
        message: `No handler registered for order "${order.orderString}"`,
      };
    }
    try {
      return handler.execute(order);
    } catch (err) {
      return {
        success: false,
        message: `Handler for "${order.orderString}" threw: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /** 批量分发（用于回放或网络同步） */
  dispatchBatch(orders: readonly GameOrder[]): OrderResult[] {
    return orders.map((o) => this.dispatch(o));
  }

  /** 查询已注册的命令类型 */
  getRegisteredOrderStrings(): string[] {
    return Array.from(this.handlers.keys());
  }

  /** 是否已注册某命令 */
  hasHandler(orderString: string): boolean {
    return this.handlers.has(orderString);
  }
}
