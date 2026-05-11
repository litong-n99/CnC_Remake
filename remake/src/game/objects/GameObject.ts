import { Mesh, Vector3 } from '@babylonjs/core';
import type { House } from '../house/House';

/** 运行时游戏对象类型 — 映射 C++ `RTTIType`。 */
export enum GameObjectType {
  Unit = 'UNIT',
  Building = 'BUILDING',
  Infantry = 'INFANTRY',
  Aircraft = 'AIRCRAFT',
  Vessel = 'VESSEL',
}

/** 所有游戏对象共享的抽象基类。
 *
 * 对应 C++ `ObjectClass` → `TechnoClass` 层次结构。
 * 目前仅包含数据层与最简单的占位 Mesh；后续扩展
 * 动画、寻路、武器等逻辑时在此基类上叠加。 */
export abstract class GameObject {
  readonly id: string;
  readonly type: GameObjectType;
  readonly definitionId: string;
  readonly house: House;

  /** 地图格子坐标（左下角为 0,0）。 */
  x: number;
  y: number;

  /** 当前生命值。 */
  health: number;
  /** 最大生命值（来自 Definition 的 strength）。 */
  readonly maxHealth: number;

  /** Babylon.js 占位 Mesh（子类在 `createMesh` 中初始化）。 */
  mesh: Mesh | null = null;

  protected constructor(
    id: string,
    type: GameObjectType,
    definitionId: string,
    house: House,
    x: number,
    y: number,
    maxHealth: number
  ) {
    this.id = id;
    this.type = type;
    this.definitionId = definitionId;
    this.house = house;
    this.x = x;
    this.y = y;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
  }

  /** 子类必须实现：在 Scene 中创建占位几何体。 */
  abstract createMesh(scene: import('@babylonjs/core').Scene): void;

  /** 获取世界空间坐标（格子中心）。 */
  getPosition(): Vector3 {
    return new Vector3(this.x + 0.5, 0, this.y + 0.5);
  }

  /** 移动到新的格子坐标并同步 Mesh 位置。 */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    if (this.mesh) {
      this.mesh.position.x = x + 0.5;
      this.mesh.position.z = y + 0.5;
    }
  }

  /** 受到伤害。 */
  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  /** 是否存活。 */
  isAlive(): boolean {
    return this.health > 0;
  }

  /** 每帧更新钩子（子类可覆盖）。 */
  update(_deltaTime: number): void {
    // no-op base
  }

  /** 释放 Mesh 资源。 */
  dispose(): void {
    this.mesh?.dispose();
    this.mesh = null;
  }
}
