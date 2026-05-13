import { MeshBuilder, Scene, Vector3, Color3, StandardMaterial } from '@babylonjs/core';
import { GameObject, GameObjectType } from './GameObject';
import type { BuildingDefinition } from '../rules/BuildingDefinitions';
import type { House } from '../house/House';
import { BuildingController } from '../building/BuildingController';
import { BuildingState } from '../building/BuildingState';

/** 运行时建筑实例。
 *
 * 映射 C++ `BuildingClass`，继承链：`ObjectClass` → `TechnoClass` → `BuildingClass`。
 * 逻辑层由 {@link BuildingController} 托管，每帧通过 `update()` 同步状态到 Mesh。
 *
 * Task 20 完成：核心属性、状态机（Construction/Idle/Active/Damaged/Dying）、
 * 电力、维修、出售逻辑已接入。建造动画与损伤表现在 Task 21 实现。 */
export class Building extends GameObject {
  readonly definition: BuildingDefinition;
  readonly logic: BuildingController;

  /** 当前建造进度（0–1），用于表现层缩放/透明度动画。 */
  constructionProgress = 0;
  /** 是否正在工作中（表现层同步）。 */
  isActive = false;
  /** 是否处于受损状态（表现层同步）。 */
  isDamaged = false;

  constructor(id: string, definition: BuildingDefinition, house: House, x: number, y: number) {
    super(id, GameObjectType.Building, definition.id, house, x, y, definition.strength);
    this.definition = definition;
    this.logic = new BuildingController(definition, house, x, y);
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

    // Task 20: 建造初始状态 — 如果处于 Construction，缩放为 0
    if (this.logic.stateMachine.state === BuildingState.Construction) {
      this.mesh.scaling = Vector3.Zero();
    }
  }

  /** 每帧同步 logic 状态到视觉表现。 */
  override update(deltaTime: number): void {
    this.logic.tick(deltaTime);

    // 同步进度与状态标志
    this.constructionProgress = this.logic.constructionProgress;
    this.isActive = this.logic.stateMachine.state === BuildingState.Active;
    this.isDamaged = this.logic.stateMachine.state === BuildingState.Damaged;

    // 将 logic 坐标同步回 GameObject
    this.x = this.logic.x;
    this.y = this.logic.y;

    if (this.mesh) {
      // Task 20: 建造动画 — 从地面"生长"上来
      if (this.logic.stateMachine.state === BuildingState.Construction) {
        const progress = this.logic.constructionProgress;
        this.mesh.scaling.x = progress;
        this.mesh.scaling.y = progress;
        this.mesh.scaling.z = progress;
        // 同时调整 Y 位置，让底部始终贴地
        const h = this.definition.height;
        this.mesh.position.y = (h * progress) / 2;
      } else if (this.logic.stateMachine.previousState === BuildingState.Construction) {
        // 建造完成后恢复正常缩放
        this.mesh.scaling = Vector3.One();
        const h = this.definition.height;
        this.mesh.position.y = h / 2;
      }

      // Task 20: 受损状态 — 变暗/发红（Task 21 可替换为损伤贴图）
      const mat = this.mesh.material as StandardMaterial;
      if (this.isDamaged) {
        mat.emissiveColor = new Color3(0.3, 0.05, 0.05);
      } else {
        mat.emissiveColor = Color3.Black();
      }
    }
  }
}
