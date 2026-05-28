/**
 * AircraftTrait — Task-VEH1: Aircraft 集成到 Actor/Trait 架构
 *
 * 将 Aircraft 飞行逻辑封装为 Trait，挂载到 Actor 上。
 * 支持巡航高度、着陆高度、悬停模式。
 * OpenRA 对标: `Aircraft` trait
 */

import type { Actor } from '../actors/Actor';
import { Trait } from '../traits/Trait';

export interface AircraftTraitOptions {
  /** 巡航高度（世界单位）。 */
  cruiseAltitude: number;
  /** 着陆高度（世界单位）。 */
  landAltitude: number;
  /** 是否可悬停（直升机）。 */
  canHover: boolean;
  /** 飞行速度（世界单位/秒）。 */
  speed: number;
  /** 转弯半径（世界单位）。 */
  turnRadius: number;
}

/** Aircraft 状态机。 */
export enum AircraftState {
  Idle = 'Idle',
  TakeOff = 'TakeOff',
  Cruise = 'Cruise',
  Landing = 'Landing',
  Hover = 'Hover',
  Docked = 'Docked',
}

/**
 * AircraftTrait — 挂载到 Actor 上，管理空中单位的飞行状态。
 */
export class AircraftTrait extends Trait {
  private options: AircraftTraitOptions;
  private state = AircraftState.Idle;
  private altitude = 0;
  private targetX = 0;
  private targetY = 0;
  private facing = 0;

  constructor(options: AircraftTraitOptions) {
    super();
    this.options = options;
    this.altitude = options.landAltitude;
  }

  getState(): AircraftState {
    return this.state;
  }

  getAltitude(): number {
    return this.altitude;
  }

  getFacing(): number {
    return this.facing;
  }

  /** 命令飞机起飞并飞往目标。 */
  flyTo(_actor: Actor, x: number, y: number): void {
    if (this.state === AircraftState.Docked) {
      this.state = AircraftState.TakeOff;
    } else {
      this.state = AircraftState.Cruise;
    }
    this.targetX = x;
    this.targetY = y;
  }

  /** 命令飞机返回并着陆。 */
  land(_actor: Actor): void {
    this.state = AircraftState.Landing;
  }

  /** 命令飞机悬停（仅 canHover=true）。 */
  hover(_actor: Actor): void {
    if (this.options.canHover) {
      this.state = AircraftState.Hover;
    }
  }

  override tick(actor: Actor, deltaTime: number): void {
    const dt = deltaTime / 1000; // ms → s

    switch (this.state) {
      case AircraftState.TakeOff: {
        // 爬升到巡航高度
        this.altitude += this.options.speed * dt * 0.5;
        if (this.altitude >= this.options.cruiseAltitude) {
          this.altitude = this.options.cruiseAltitude;
          this.state = AircraftState.Cruise;
        }
        break;
      }
      case AircraftState.Cruise: {
        this.altitude = this.options.cruiseAltitude;
        this.moveTowardsTarget(actor, dt);
        break;
      }
      case AircraftState.Landing: {
        // 下降并移动到着陆点
        this.moveTowardsTarget(actor, dt);
        this.altitude -= this.options.speed * dt * 0.3;
        if (this.altitude <= this.options.landAltitude) {
          this.altitude = this.options.landAltitude;
          this.state = AircraftState.Docked;
        }
        break;
      }
      case AircraftState.Hover: {
        this.altitude = this.options.cruiseAltitude;
        break;
      }
      case AircraftState.Idle:
      case AircraftState.Docked:
        break;
    }

    // 同步 Actor 的世界坐标（Z = 高度）
    actor.x = this.targetX;
    actor.y = this.targetY;
  }

  private moveTowardsTarget(_actor: Actor, _dt: number): void {
    // 简化的方向更新
    const dx = this.targetX - _actor.x;
    const dy = this.targetY - _actor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.1) {
      this.facing = Math.atan2(dy, dx);
      // 只更新 facing，不实际移动 Actor（由路径系统处理）
    }
  }
}

/**
 * Reservable — 机场/停机坪的停机位 Trait。
 * 管理有限的停机位槽位，供 Aircraft 降落占用。
 */
export class Reservable extends Trait {
  private maxSlots: number;
  private occupiedSlots = 0;
  private reservations = new Map<string, { x: number; y: number }>();

  constructor(maxSlots: number) {
    super();
    this.maxSlots = maxSlots;
  }

  /** 尝试预留一个停机位。 */
  reserve(id: string, x: number, y: number): boolean {
    if (this.occupiedSlots >= this.maxSlots) return false;
    if (this.reservations.has(id)) return true;
    this.reservations.set(id, { x, y });
    this.occupiedSlots++;
    return true;
  }

  /** 释放停机位。 */
  release(id: string): boolean {
    if (!this.reservations.has(id)) return false;
    this.reservations.delete(id);
    this.occupiedSlots--;
    return true;
  }

  /** 获取指定预留的着陆坐标。 */
  getReservation(id: string): { x: number; y: number } | undefined {
    return this.reservations.get(id);
  }

  getOccupiedCount(): number {
    return this.occupiedSlots;
  }

  getMaxSlots(): number {
    return this.maxSlots;
  }

  hasReservation(id: string): boolean {
    return this.reservations.has(id);
  }
}
