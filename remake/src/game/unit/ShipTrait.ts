/**
 * ShipTrait — Task-VEH2: 海军单位集成到 Actor/Trait 架构
 *
 * 将舰船移动逻辑封装为 Trait，挂载到 Actor 上。
 * 核心特性：
 *   - 转向慢（turnSpeed 低）
 *   - 惯性大（速度不会立即变化，需要加速/减速）
 *   - 必须在水面移动（依赖 WaterPathGraph 确保路径有效性）
 *
 * OpenRA 对标: `Mobile` trait + `Locomotion.Float`
 */

import type { Actor } from '../actors/Actor';
import { Trait } from '../traits/Trait';

export interface ShipTraitOptions {
  /** 最大速度（世界单位/秒）。 */
  readonly speed: number;
  /** 转向速度（度/秒）。舰船转向远慢于车辆。 */
  readonly turnSpeed: number;
  /** 惯性系数 0~1；越接近 1 加速/减速越慢。 */
  readonly inertia: number;
}

/** Ship 移动状态机。 */
export enum ShipState {
  Idle = 'Idle',
  Turning = 'Turning',
  Moving = 'Moving',
}

/**
 * ShipTrait — 挂载到 Actor 上，管理海军单位的移动状态。
 *
 * 与 AircraftTrait 不同，Ship 无法瞬移转向：
 *   1. 必须先缓慢转向目标方向（Turning 状态）
 *   2. 转向完成后才加速前进（Moving 状态）
 *   3. 惯性使速度变化平滑，不会急停急起
 */
export class ShipTrait extends Trait {
  private readonly options: ShipTraitOptions;
  private state = ShipState.Idle;
  private currentSpeed = 0;
  private facing = 0;
  private targetX = 0;
  private targetY = 0;

  constructor(options: ShipTraitOptions) {
    super();
    this.options = options;
  }

  getState(): ShipState {
    return this.state;
  }

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  getFacing(): number {
    return this.facing;
  }

  getTarget(): { x: number; y: number } {
    return { x: this.targetX, y: this.targetY };
  }

  /** 命令舰船驶向目标坐标。 */
  sailTo(_actor: Actor, x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    if (this.state === ShipState.Idle) {
      this.state = ShipState.Turning;
    }
  }

  /** 命令舰船停止。 */
  stop(): void {
    this.state = ShipState.Idle;
    // 惯性滑行 — 不立即清零速度，由 tick 中的自然衰减处理
  }

  override tick(actor: Actor, deltaTime: number): void {
    const dt = deltaTime / 1000; // ms → s

    if (this.state === ShipState.Idle) {
      // 惯性滑行减速
      this.currentSpeed *= 1 - (1 - this.options.inertia) * dt * 2;
      if (this.currentSpeed < 0.01) this.currentSpeed = 0;
      this.moveByFacing(actor, dt);
      return;
    }

    const dx = this.targetX - actor.x;
    const dy = this.targetY - actor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) {
      this.currentSpeed *= 1 - (1 - this.options.inertia) * dt * 3;
      if (this.currentSpeed < 0.01) {
        this.currentSpeed = 0;
        this.state = ShipState.Idle;
      }
      this.moveByFacing(actor, dt);
      return;
    }

    const targetFacing = Math.atan2(dy, dx);
    const angleDiff = this.normalizeAngle(targetFacing - this.facing);
    const maxTurnRad = ((this.options.turnSpeed * Math.PI) / 180) * dt;

    if (Math.abs(angleDiff) > maxTurnRad) {
      // ── Turning 状态：缓慢转向，同时减速 ──
      this.state = ShipState.Turning;
      this.facing += Math.sign(angleDiff) * maxTurnRad;
      // 转向时保持部分动力，但不如全速前进时快
      this.currentSpeed *= 0.95;
    } else {
      // ── Moving 状态：方向已对准，按惯性加速 ──
      this.facing = targetFacing;
      this.state = ShipState.Moving;
      // 指数平滑：inertia 越接近 1，加速越慢
      const factor = 1 - Math.pow(this.options.inertia, dt * 10);
      this.currentSpeed += (this.options.speed - this.currentSpeed) * factor;
    }

    this.moveByFacing(actor, dt);
  }

  private moveByFacing(actor: Actor, dt: number): void {
    if (this.currentSpeed <= 0) return;
    actor.x += Math.cos(this.facing) * this.currentSpeed * dt;
    actor.y += Math.sin(this.facing) * this.currentSpeed * dt;
  }

  /** 将角度差归一化到 [-π, π]。 */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
}
