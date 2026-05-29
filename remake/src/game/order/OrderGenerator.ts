/**
 * 命令生成器框架
 * Source: harness/DEPTH0_OPENRA_GAP_ANALYSIS.md — Task 139
 * OpenRA 对标: OpenRA.Mods.Common/Orders/OrderGenerator.cs
 *
 * 将建筑放置、攻击移动、Sell/Repair/Power 工具等交互模式统一为 OrderGenerator：
 * 每个生成器处理鼠标移动/点击/取消，输出 GameOrder（Task 140）。
 */

import type { GameOrder } from './GameOrder';

export interface OrderGeneratorInput {
  readonly screenX: number;
  readonly screenY: number;
  readonly shift: boolean;
}

/** 命令生成器结果 */
export interface OrderGeneratorResult {
  /** 是否生成命令 */
  readonly generated: boolean;
  /** 生成的命令（generated=true 时有效） */
  readonly order?: GameOrder;
  /** 视觉反馈：合法/非法/无 */
  readonly feedback: 'valid' | 'invalid' | 'none';
  /** 可选提示信息 */
  readonly message?: string;
}

/**
 * 抽象命令生成器
 *
 * 生命周期：
 *   1. activate()   — 进入生成器模式（如点击 Sidebar 建筑按钮）
 *   2. onPointerMove — 鼠标移动时更新预览/合法性
 *   3. onPointerDown — 左键点击生成命令
 *   4. onPointerUp   — 释放（大部分生成器忽略）
 *   5. cancel()      — 右键或 Esc 取消
 */
export abstract class OrderGenerator {
  protected active = false;

  /** 激活生成器 */
  activate(): void {
    this.active = true;
  }

  /** 是否处于激活状态 */
  isActive(): boolean {
    return this.active;
  }

  /** 鼠标移动时调用，返回视觉反馈 */
  abstract onPointerMove(input: OrderGeneratorInput): OrderGeneratorResult;

  /** 鼠标按下时调用，可能生成命令 */
  abstract onPointerDown(input: OrderGeneratorInput): OrderGeneratorResult;

  /** 鼠标释放时调用 */
  onPointerUp(_input: OrderGeneratorInput): OrderGeneratorResult {
    return { generated: false, feedback: 'none' };
  }

  /** 取消生成器 */
  cancel(): void {
    this.active = false;
  }
}

/** 当前激活的生成器管理器 */
export class OrderGeneratorManager {
  private current: OrderGenerator | null = null;
  private static instance: OrderGeneratorManager | null = null;

  static getInstance(): OrderGeneratorManager {
    if (!OrderGeneratorManager.instance) {
      OrderGeneratorManager.instance = new OrderGeneratorManager();
    }
    return OrderGeneratorManager.instance;
  }

  static reset(): void {
    OrderGeneratorManager.instance = null;
  }

  /** 切换生成器（先 cancel 当前，再激活新的） */
  set(generator: OrderGenerator | null): void {
    if (this.current) {
      this.current.cancel();
    }
    this.current = generator;
    if (this.current) {
      this.current.activate();
    }
  }

  /** 获取当前生成器 */
  get(): OrderGenerator | null {
    return this.current;
  }

  /** 转发鼠标移动到当前生成器 */
  handleMove(input: OrderGeneratorInput): OrderGeneratorResult {
    if (!this.current) return { generated: false, feedback: 'none' };
    return this.current.onPointerMove(input);
  }

  /** 转发鼠标点击到当前生成器 */
  handleDown(input: OrderGeneratorInput): OrderGeneratorResult {
    if (!this.current) return { generated: false, feedback: 'none' };
    return this.current.onPointerDown(input);
  }

  /** 取消当前生成器 */
  cancel(): void {
    if (this.current) {
      this.current.cancel();
      this.current = null;
    }
  }
}
