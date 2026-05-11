import { MeshBuilder, Scene, Color3, StandardMaterial } from '@babylonjs/core';
import { GameObject, GameObjectType } from './GameObject';
import type { UnitDefinition } from '../rules/UnitDefinitions';
import type { House } from '../house/House';

/** 运行时单位实例。
 *
 * 映射 C++ `UnitClass`，继承链：`ObjectClass` → `TechnoClass` → `FootClass` → `DriveClass` → `UnitClass`。
 * 当前为占位实现：带颜色方块 + 朝向属性，后续接入移动/寻路/炮塔系统。 */
export class Unit extends GameObject {
  readonly definition: UnitDefinition;

  /** 当前朝向（弧度，0 = 正 X）。 */
  direction = 0;
  /** 是否处于移动状态。 */
  isMoving = false;

  constructor(id: string, definition: UnitDefinition, house: House, x: number, y: number) {
    super(id, GameObjectType.Unit, definition.id, house, x, y, definition.strength);
    this.definition = definition;
  }

  createMesh(scene: Scene): void {
    const size = 0.6;
    this.mesh = MeshBuilder.CreateBox(`unit_${this.id}`, { size, height: size * 0.5 }, scene);

    const pos = this.getPosition();
    pos.y = size * 0.25;
    this.mesh.position = pos;

    const mat = new StandardMaterial(`unitMat_${this.id}`, scene);
    mat.diffuseColor = Color3.FromHexString(this.house.color);
    mat.specularColor = Color3.Black();
    this.mesh.material = mat;
  }
}
