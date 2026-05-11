import { Scene } from '@babylonjs/core';
import { GameObject, GameObjectType } from './GameObject';
import type { UnitDefinition } from '../rules/UnitDefinitions';
import type { House } from '../house/House';
import { UnitController } from '../unit/Unit';
import { UnitState } from '../unit/UnitState';
import { UnitMeshFactory } from '../../renderer/meshes/UnitMeshFactory';

/** 运行时单位实例。
 *
 * 映射 C++ `UnitClass`，继承链：`ObjectClass` → `TechnoClass` → `FootClass` → `DriveClass` → `UnitClass`。
 * 当前为占位实现：带颜色方块 + 朝向属性；逻辑层由 {@link UnitController} 托管，
 * 每帧通过 `update()` 同步状态到 Mesh。 */
export class Unit extends GameObject {
  readonly definition: UnitDefinition;
  readonly logic: UnitController;

  /** 当前朝向（弧度，0 = 正 X）。由 logic.bodyFacing 同步。 */
  direction = 0;
  /** 是否处于移动状态。由 logic.stateMachine 同步。 */
  isMoving = false;

  constructor(id: string, definition: UnitDefinition, house: House, x: number, y: number) {
    super(id, GameObjectType.Unit, definition.id, house, x, y, definition.strength);
    this.definition = definition;
    this.logic = new UnitController(definition, house, x, y);
  }

  createMesh(scene: Scene): void {
    this.mesh = UnitMeshFactory.create(this.definition, this.house, scene, `unit_${this.id}`);
    const pos = this.getPosition();
    this.mesh.position = pos;
  }

  /** 每帧同步 logic 状态到视觉表现。 */
  override update(deltaTime: number): void {
    this.logic.tick(deltaTime);
    this.isMoving = this.logic.stateMachine.state === UnitState.Moving;
    this.direction = (this.logic.bodyFacing / 256) * Math.PI * 2;

    // 将 logic 坐标同步回 GameObject（寻路/移动器只操作 logic.x/y）
    this.x = this.logic.x;
    this.y = this.logic.y;

    if (this.mesh) {
      // 同步位置
      this.mesh.position.x = this.logic.x - this.worldOffsetX + 0.5;
      this.mesh.position.z = this.logic.y - this.worldOffsetZ + 0.5;
      // 同步朝向（C++ DirType 0=北 → Babylon rotation.y=π）
      this.mesh.rotation.y = Math.PI - this.direction;
    }
  }
}
