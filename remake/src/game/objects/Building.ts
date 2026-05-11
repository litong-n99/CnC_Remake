import { MeshBuilder, Scene, Vector3, Color3, StandardMaterial } from '@babylonjs/core';
import { GameObject, GameObjectType } from './GameObject';
import type { BuildingDefinition } from '../rules/BuildingDefinitions';
import type { House } from '../house/House';

/** 运行时建筑实例。
 *
 * 映射 C++ `BuildingClass`，继承链：`ObjectClass` → `TechnoClass` → `BuildingClass`。
 * 当前为占位实现：彩色方块覆盖 footprint，后续接入建造动画、损伤贴图、功能逻辑。 */
export class Building extends GameObject {
  readonly definition: BuildingDefinition;

  constructor(id: string, definition: BuildingDefinition, house: House, x: number, y: number) {
    super(id, GameObjectType.Building, definition.id, house, x, y, definition.strength);
    this.definition = definition;
  }

  createMesh(scene: Scene): void {
    const w = this.definition.width;
    const h = this.definition.height;
    const height = 1.0;

    this.mesh = MeshBuilder.CreateBox(`building_${this.id}`, { width: w, height, depth: h }, scene);

    // 将 Mesh 中心对齐到 footprint 中心（使用与 TerrainGrid 一致的世界坐标）
    const base = this.getPosition();
    const cx = base.x + (w - 1) / 2;
    const cz = base.z + (h - 1) / 2;
    this.mesh.position = new Vector3(cx, height / 2, cz);

    const mat = new StandardMaterial(`buildingMat_${this.id}`, scene);
    mat.diffuseColor = Color3.FromHexString(this.house.color);
    mat.specularColor = Color3.Black();
    this.mesh.material = mat;
  }
}
