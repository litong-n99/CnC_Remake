/**
 * 测试用命令生成器 —— 验证 OrderGenerator 框架生命周期
 * Source: docs/DEPTH0_OPENRA_GAP_ANALYSIS.md — Task 139
 */

import { OrderGenerator, type OrderGeneratorInput, type OrderGeneratorResult } from '../OrderGenerator';
import { groundOrder } from '../GameOrder';

export class TestOrderGenerator extends OrderGenerator {
  private moveCount = 0;

  onPointerMove(input: OrderGeneratorInput): OrderGeneratorResult {
    // 简单规则：x > 100 视为合法区域
    const valid = input.screenX > 100;
    return {
      generated: false,
      feedback: valid ? 'valid' : 'invalid',
      message: `TestGenerator move: (${input.screenX}, ${input.screenY})`,
    };
  }

  onPointerDown(input: OrderGeneratorInput): OrderGeneratorResult {
    if (!this.active) {
      return { generated: false, feedback: 'none', message: 'Not active' };
    }
    this.moveCount++;
    // 生成一个 Move 命令到固定测试坐标
    const order = groundOrder('Move', 'test-subject', input.screenX, input.screenY, input.shift);
    return {
      generated: true,
      order,
      feedback: 'valid',
      message: `TestGenerator click #${this.moveCount}`,
    };
  }

  getMoveCount(): number {
    return this.moveCount;
  }
}
