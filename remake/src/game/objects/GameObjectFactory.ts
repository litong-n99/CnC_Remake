import type { Scene } from '@babylonjs/core';
import { Unit } from './Unit';
import { Building } from './Building';
import { GameObjectManager } from './GameObjectManager';
import { ActorMap } from '../world/ActorMap';
import { Locomotion, type UnitDefinition } from '../rules/UnitDefinitions';
import type { BuildingDefinition } from '../rules/BuildingDefinitions';
import type { House } from '../house/House';

let nextId = 0;
function generateId(): string {
  return `go_${++nextId}`;
}

/** 创建单位的参数。 */
export interface CreateUnitOptions {
  readonly definition: UnitDefinition;
  readonly house: House;
  /** 格子 X 坐标。 */
  readonly x: number;
  /** 格子 Y 坐标。 */
  readonly y: number;
  readonly scene: Scene;
}

/** 创建建筑的参数。 */
export interface CreateBuildingOptions {
  readonly definition: BuildingDefinition;
  readonly house: House;
  /** 格子左下角 X 坐标。 */
  readonly x: number;
  /** 格子左下角 Y 坐标。 */
  readonly y: number;
  readonly scene: Scene;
}

/**
 * 游戏对象工厂 — 将静态 Definition 转化为带有 Mesh 的运行时实例。
 *
 * 对应 C++ 中 `new UnitClass(type, house)` / `new BuildingClass(type, house)`
 * 的构造逻辑，但集中管理 ID 生成、Manager 注册与 House 计数同步。
 */
export class GameObjectFactory {
  /**
   * 创建一个单位并注册到 {@link GameObjectManager} 和 {@link House}。
   *
   * @returns 已初始化 Mesh 的 {@link Unit} 实例。
   */
  static createUnit(options: CreateUnitOptions): Unit {
    const { definition, house, x, y, scene } = options;
    const id = generateId();
    const unit = new Unit(id, definition, house, x, y);
    unit.createMesh(scene);
    GameObjectManager.getInstance().register(unit);
    ActorMap.getInstance().occupy(unit.id, Math.round(x), Math.round(y));
    // 步兵使用 Foot locomotion，注册到 House 的步兵计数器
    if (definition.locomotion === Locomotion.Foot) {
      house.addInfantry(definition.id);
    } else {
      house.addUnit(definition.id);
    }
    return unit;
  }

  /**
   * 创建一个建筑并注册到 {@link GameObjectManager} 和 {@link House}。
   *
   * @returns 已初始化 Mesh 的 {@link Building} 实例。
   */
  static createBuilding(options: CreateBuildingOptions): Building {
    const { definition, house, x, y, scene } = options;
    const id = generateId();
    const building = new Building(id, definition, house, x, y);
    building.createMesh(scene);
    GameObjectManager.getInstance().register(building);
    house.addBuilding(definition.id);
    return building;
  }
}
