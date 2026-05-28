/**
 * MoveActivity — Task 125 + Task 129
 * OpenRA 对标: `OpenRA.Mods.Common/Activities/Move/Move.cs`
 *
 * 移动活动：驱动单位从当前位置移动到目标格子。
 * Task 129 扩展：MoveFirstHalf / MoveSecondHalf 支持弧线轨迹、倒车、carryoverProgress。
 */

import { Activity, ActivityStatus } from './Activity';

export interface MoveActivityOptions {
  readonly targetX: number;
  readonly targetY: number;
}

/** 移动活动 — 驱动单位沿路径移动。 */
export class MoveActivity extends Activity {
  readonly targetX: number;
  readonly targetY: number;
  private stepsRemaining = 2; // 模拟 MoveFirstHalf + MoveSecondHalf

  constructor(options: MoveActivityOptions) {
    super();
    this.targetX = options.targetX;
    this.targetY = options.targetY;
    this.isInterruptible = true;
  }

  override onFirstRun(): void {
    this.stepsRemaining = 2;
  }

  tick(): ActivityStatus {
    this.stepsRemaining--;
    if (this.stepsRemaining <= 0) {
      return ActivityStatus.Done;
    }
    return ActivityStatus.Running;
  }

  override getChainDescription(): string {
    return `Move(${this.targetX},${this.targetY})`;
  }
}

// ── Task 129: 移动辅助类型与函数 ──

/** 移动段结果：包含新位置、朝向、是否完成、剩余进度。 */
export interface MovePartResult {
  /** 新的 X 坐标。 */
  x: number;
  /** 新的 Y 坐标。 */
  y: number;
  /** 新的朝向（0–255）。 */
  facing: number;
  /** 是否已完成本段移动。 */
  done: boolean;
  /** 未用完的进度（0–1），可带入下一段。 */
  carryover: number;
  /** 是否正在倒车。 */
  isBackwards: boolean;
}

/**
 * 计算两个 DirType 朝向之间的最小差值（0–128）。
 * 0 = 同向，128 = 反向。
 */
export function facingDiff(a: number, b: number): number {
  let diff = b - a;
  if (diff > 128) diff -= 256;
  if (diff < -128) diff += 256;
  return Math.abs(diff);
}

/**
 * 将方向向量转换为 DirType（0–255）。
 * 0 = 北, 64 = 东, 128 = 南, 192 = 西。
 */
export function dirToFacing(dx: number, dy: number): number {
  const angle = Math.atan2(dy, dx); // -π..π, 0 = 东
  let normalized = ((angle + Math.PI / 2) / (2 * Math.PI)) * 256;
  normalized = ((normalized % 256) + 256) % 256;
  return Math.floor(normalized);
}

/**
 * 判断是否应该倒车移动。
 * 当角度差 > 128（约 180°）且距离较短（<= 2 格）时，倒车更高效。
 */
export function shouldMoveBackwards(
  currentFacing: number,
  targetDx: number,
  targetDy: number,
  distanceCells: number
): boolean {
  const targetFacing = dirToFacing(targetDx, targetDy);
  const diff = facingDiff(currentFacing, targetFacing);
  return diff >= 120 && distanceCells <= 2;
}

/**
 * 计算椭圆弧上的插值点。
 * @param from 起点
 * @param to 终点
 * @param progress 0–1
 * @param arcIntensity 弧线强度（0 = 直线，1 = 最大弧度）
 */
export function arcLerp(
  from: { x: number; y: number },
  to: { x: number; y: number },
  progress: number,
  arcIntensity: number
): { x: number; y: number } {
  if (arcIntensity <= 0) {
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    };
  }

  // 椭圆弧：在直线中点处向垂直方向偏移
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // 垂直方向（逆时针 90°）
  const perpX = -dy / (dist || 1);
  const perpY = dx / (dist || 1);

  // 正弦波偏移：在 progress=0.5 时达到最大
  const offset = Math.sin(progress * Math.PI) * arcIntensity * (dist * 0.3);

  const baseX = from.x + dx * progress;
  const baseY = from.y + dy * progress;

  return {
    x: baseX + perpX * offset,
    y: baseY + perpY * offset,
  };
}

// ── MoveFirstHalf ──

export interface MoveFirstHalfOptions {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly speed: number; // cells per tick
  readonly currentFacing: number;
  readonly turnsWhileMoving: boolean;
}

/** 移动前半段 — 从当前格子中心移动到 fromCell→toCell 中点。 */
export class MoveFirstHalf extends Activity {
  private readonly midX: number;
  private readonly midY: number;
  private readonly fromX: number;
  private readonly fromY: number;
  private readonly speed: number;
  private readonly targetFacing: number;
  private readonly useArc: boolean;
  private readonly isBackwards: boolean;
  private progress = 0;

  constructor(options: MoveFirstHalfOptions) {
    super();
    this.fromX = options.fromX;
    this.fromY = options.fromY;
    this.midX = (options.fromX + options.toX) / 2;
    this.midY = (options.fromY + options.toY) / 2;
    this.speed = options.speed;
    this.targetFacing = dirToFacing(options.toX - options.fromX, options.toY - options.fromY);

    const dist = Math.sqrt((options.toX - options.fromX) ** 2 + (options.toY - options.fromY) ** 2);
    this.isBackwards = shouldMoveBackwards(
      options.currentFacing,
      options.toX - options.fromX,
      options.toY - options.fromY,
      dist
    );
    const facingDiffValue = facingDiff(options.currentFacing, this.targetFacing);
    this.useArc = !this.isBackwards && facingDiffValue > 64 && !options.turnsWhileMoving;
  }

  tick(): ActivityStatus {
    const step = this.speed;
    const totalDist = Math.sqrt((this.midX - this.fromX) ** 2 + (this.midY - this.fromY) ** 2);
    const progressStep = totalDist > 0 ? step / totalDist : 1;

    this.progress += progressStep;

    if (this.progress >= 1) {
      return ActivityStatus.Done;
    }
    return ActivityStatus.Running;
  }

  /** 获取当前插值位置。 */
  getPosition(): { x: number; y: number } {
    if (this.useArc) {
      return arcLerp({ x: this.fromX, y: this.fromY }, { x: this.midX, y: this.midY }, Math.min(1, this.progress), 0.5);
    }
    return {
      x: this.fromX + (this.midX - this.fromX) * Math.min(1, this.progress),
      y: this.fromY + (this.midY - this.fromY) * Math.min(1, this.progress),
    };
  }

  /** 获取移动结果（用于外部控制器）。 */
  getResult(currentFacing: number): MovePartResult {
    const pos = this.getPosition();
    const done = this.progress >= 1;
    const totalDist = Math.sqrt((this.midX - this.fromX) ** 2 + (this.midY - this.fromY) ** 2);
    const carryover = done ? ((this.progress - 1) * totalDist) / this.speed : 0;

    return {
      x: pos.x,
      y: pos.y,
      facing: this.isBackwards ? currentFacing : this.targetFacing,
      done,
      carryover,
      isBackwards: this.isBackwards,
    };
  }

  override getChainDescription(): string {
    return `MoveFirstHalf(${this.fromX},${this.fromY}→${this.midX.toFixed(1)},${this.midY.toFixed(1)})`;
  }
}

// ── MoveSecondHalf ──

export interface MoveSecondHalfOptions {
  readonly midX: number;
  readonly midY: number;
  readonly toX: number;
  readonly toY: number;
  readonly speed: number;
  readonly facing: number;
  readonly carryover?: number; // 0–1
}

/** 移动后半段 — 从中点移动到目标格子中心。 */
export class MoveSecondHalf extends Activity {
  private readonly midX: number;
  private readonly midY: number;
  private readonly toX: number;
  private readonly toY: number;
  private readonly speed: number;
  private readonly facing: number;
  private progress: number;

  constructor(options: MoveSecondHalfOptions) {
    super();
    this.midX = options.midX;
    this.midY = options.midY;
    this.toX = options.toX;
    this.toY = options.toY;
    this.speed = options.speed;
    this.facing = options.facing;
    this.progress = options.carryover ?? 0;
  }

  tick(): ActivityStatus {
    const step = this.speed;
    const totalDist = Math.sqrt((this.toX - this.midX) ** 2 + (this.toY - this.midY) ** 2);
    const progressStep = totalDist > 0 ? step / totalDist : 1;

    this.progress += progressStep;

    if (this.progress >= 1) {
      return ActivityStatus.Done;
    }
    return ActivityStatus.Running;
  }

  /** 获取当前插值位置。 */
  getPosition(): { x: number; y: number } {
    return {
      x: this.midX + (this.toX - this.midX) * Math.min(1, this.progress),
      y: this.midY + (this.toY - this.midY) * Math.min(1, this.progress),
    };
  }

  /** 获取移动结果。 */
  getResult(): MovePartResult {
    const pos = this.getPosition();
    const done = this.progress >= 1;

    return {
      x: pos.x,
      y: pos.y,
      facing: this.facing,
      done,
      carryover: 0,
      isBackwards: false,
    };
  }

  override getChainDescription(): string {
    return `MoveSecondHalf(${this.midX.toFixed(1)},${this.midY.toFixed(1)}→${this.toX},${this.toY})`;
  }
}
