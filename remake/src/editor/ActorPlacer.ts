import { Scene } from '@babylonjs/core';
import { GameObjectFactory } from '../game/objects/GameObjectFactory';
import { GameObjectManager } from '../game/objects/GameObjectManager';
import { Unit } from '../game/objects/Unit';
import { Building } from '../game/objects/Building';
import { House } from '../game/house/House';
import { UnitDefinition } from '../game/rules/UnitDefinitions';
import { BuildingDefinition } from '../game/rules/BuildingDefinitions';

export interface PlacedActor {
  id: string;
  type: 'unit' | 'building';
  actorType: string;
  houseId: number;
  x: number;
  y: number;
}

/**
 * ActorPlacer — 在编辑器或沙盒中放置单位与建筑。
 *
 * 替代 C++ 地图初始化时的 `TeamTypeClass` / `TriggerTypeClass` 的 actor 放置逻辑。
 *
 * Source: REDALERT/TEAMTYPE.CPP, REDALERT/TRIGGERTYPE.CPP
 */
export class ActorPlacer {
  private placed: PlacedActor[] = [];

  /**
   * 在指定坐标放置一个单位。
   * @returns 放置的单位实例，或 null（如果坐标无效或 definition 不匹配）
   */
  placeUnit(definition: UnitDefinition, house: House, x: number, y: number, scene: Scene): Unit | null {
    const unit = GameObjectFactory.createUnit({ definition, house, x, y, scene });
    this.placed.push({
      id: unit.id,
      type: 'unit',
      actorType: definition.name,
      houseId: house.id,
      x,
      y,
    });
    return unit;
  }

  /**
   * 在指定坐标放置一个建筑。
   * @returns 放置的建筑实例，或 null
   */
  placeBuilding(definition: BuildingDefinition, house: House, x: number, y: number, scene: Scene): Building | null {
    const building = GameObjectFactory.createBuilding({ definition, house, x, y, scene });
    this.placed.push({
      id: building.id,
      type: 'building',
      actorType: definition.name,
      houseId: house.id,
      x,
      y,
    });
    return building;
  }

  /** 获取所有已放置的 actor 记录。 */
  getPlacedActors(): PlacedActor[] {
    return [...this.placed];
  }

  /** 按阵营过滤已放置的 actor。 */
  getPlacedByHouse(houseId: number): PlacedActor[] {
    return this.placed.filter((a) => a.houseId === houseId);
  }

  /** 清除所有已放置的 actor（同时销毁游戏对象）。 */
  clear(): void {
    for (const actor of this.placed) {
      const obj = GameObjectManager.getInstance().get(actor.id);
      if (obj) {
        obj.takeDamage(obj.health + 1); // overkill to ensure death
      }
    }
    this.placed = [];
  }

  /** 导出为 OpenRA Actors 格式（供 MapEditor 使用）。 */
  exportToOpenRA(): Array<{
    id: string;
    type: string;
    owner: string;
    location: [number, number];
  }> {
    return this.placed.map((a) => ({
      id: a.id,
      type: a.actorType,
      owner: a.houseId === 0 ? 'GDI' : a.houseId === 1 ? 'Nod' : 'Neutral',
      location: [a.x, a.y] as [number, number],
    }));
  }
}
