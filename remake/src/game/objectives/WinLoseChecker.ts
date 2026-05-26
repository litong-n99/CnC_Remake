/**
 * 胜利/失败条件检测器 — Task 59
 *
 * 每逻辑帧检查游戏是否应进入胜利或失败状态。
 * 与 Task 58（ObjectiveManager）联动：所有主要目标完成 → 胜利；
 * 任意主要目标失败 或 玩家所有建筑被毁 → 失败。
 */

import { ObjectiveManager } from './ObjectiveManager';

export type GameResult = 'playing' | 'victory' | 'defeat';

export interface WinLoseCheckerOptions {
  /** 是否启用目标驱动胜利（所有主要目标完成 = 胜利） */
  objectivesWin?: boolean;
  /** 是否启用目标驱动失败（任意主要目标失败 = 失败） */
  objectivesLose?: boolean;
  /** 是否启用歼灭模式（消灭所有敌方单位和建筑 = 胜利） */
  annihilationWin?: boolean;
  /** 玩家被全歼时是否失败（所有单位和建筑被毁 = 失败） */
  annihilationLose?: boolean;
  /** 可选：限时模式（秒），到达后若无主要目标失败则胜利 */
  timeLimitSeconds?: number;
}

export class WinLoseChecker {
  private result: GameResult = 'playing';
  private elapsedSeconds = 0;
  private readonly options: Required<WinLoseCheckerOptions>;

  constructor(
    private readonly objectiveManager: ObjectiveManager,
    options: WinLoseCheckerOptions = {}
  ) {
    this.options = {
      objectivesWin: options.objectivesWin ?? true,
      objectivesLose: options.objectivesLose ?? true,
      annihilationWin: options.annihilationWin ?? false,
      annihilationLose: options.annihilationLose ?? true,
      timeLimitSeconds: options.timeLimitSeconds ?? 0,
    };
  }

  /** 每逻辑帧调用（传入 deltaSeconds） */
  tick(deltaSeconds: number): void {
    if (this.result !== 'playing') return;

    this.elapsedSeconds += deltaSeconds;

    // 目标驱动
    if (this.options.objectivesWin && this.objectiveManager.allPrimariesComplete()) {
      this.result = 'victory';
      return;
    }
    if (this.options.objectivesLose && this.objectiveManager.anyPrimaryFailed()) {
      this.result = 'defeat';
      return;
    }

    // 限时模式
    if (this.options.timeLimitSeconds > 0 && this.elapsedSeconds >= this.options.timeLimitSeconds) {
      this.result = 'victory';
      return;
    }
  }

  /** 手动标记胜利（如触发器触发） */
  forceVictory(): void {
    this.result = 'victory';
  }

  /** 手动标记失败（如触发器触发） */
  forceDefeat(): void {
    this.result = 'defeat';
  }

  /** 当前结果 */
  getResult(): GameResult {
    return this.result;
  }

  /** 是否仍在进行中 */
  isPlaying(): boolean {
    return this.result === 'playing';
  }

  /** 已进行时间（秒） */
  getElapsedSeconds(): number {
    return this.elapsedSeconds;
  }

  /** 重置 */
  reset(): void {
    this.result = 'playing';
    this.elapsedSeconds = 0;
  }
}
