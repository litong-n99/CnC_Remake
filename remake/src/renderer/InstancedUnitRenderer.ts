import { Mesh, Scene, Matrix, Color3, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import type { UnitDefinition } from '../game/rules/UnitDefinitions';
import { Locomotion } from '../game/rules/UnitDefinitions';
import type { House } from '../game/house/House';
import { RenderLayer, setRenderLayer } from './RenderLayer';

/**
 * InstancedUnitRenderer — 批量实例化渲染相同类型的单位（Task 77）。
 *
 * 使用 Babylon.js Thin Instances 减少 draw call：
 * - 每组 (definitionId × houseColor × meshType) 共享一个模板 Mesh
 * - 每个单位对应一个 thin instance，通过矩阵更新位置/旋转
 * - 当前简化版仅实例化 body mesh；炮塔保持独立 Mesh（因需独立旋转）
 *
 * OpenRA 对标：`OpenRA.Game/Graphics/UnitRenderer.cs` + `SpriteRenderer`
 *
 * 验收目标：200 辆相同坦克的 draw call 从 200 降至 1，帧率提升 >30%。
 */
export class InstancedUnitRenderer {
  private static instance: InstancedUnitRenderer | null = null;
  static getInstance(): InstancedUnitRenderer {
    if (!this.instance) this.instance = new InstancedUnitRenderer();
    return this.instance;
  }
  static reset(): void {
    this.instance?.dispose();
    this.instance = null;
  }

  private scene: Scene | null = null;

  /** 模板 Mesh 缓存。Key = groupKey。 */
  private templates = new Map<string, Mesh>();

  /** 实例注册表。Key = unitId。 */
  private instances = new Map<
    string,
    {
      readonly groupKey: string;
      readonly index: number;
    }
  >();

  /** 已释放的实例索引池（按 groupKey 分组）。 */
  private freeIndices = new Map<string, number[]>();

  /** 标记是否启用（可通过 GameRules 或 Settings 控制）。 */
  enabled = true;

  initScene(scene: Scene): void {
    this.scene = scene;
  }

  /**
   * 注册一个单位到实例渲染系统。
   * @returns 是否成功注册。失败时调用方可回退到独立 Mesh。
   */
  registerUnit(
    unitId: string,
    definition: UnitDefinition,
    house: House,
    worldX: number,
    worldZ: number,
    rotationY: number
  ): boolean {
    if (!this.enabled || !this.scene) return false;

    const groupKey = this.makeGroupKey(definition, house);
    let template = this.templates.get(groupKey);
    if (!template) {
      template = this.createTemplate(definition, house, groupKey);
      if (!template) return false;
      this.templates.set(groupKey, template);
    }

    const index = this.allocIndex(groupKey, template);
    if (index < 0) return false;

    this.instances.set(unitId, { groupKey, index });
    this.updateUnit(unitId, worldX, worldZ, rotationY);
    return true;
  }

  /** 更新单位实例的变换矩阵。 */
  updateUnit(unitId: string, worldX: number, worldZ: number, rotationY: number): void {
    const info = this.instances.get(unitId);
    if (!info) return;
    const template = this.templates.get(info.groupKey);
    if (!template) return;

    const matrix = Matrix.RotationYawPitchRoll(rotationY, 0, 0).multiply(Matrix.Translation(worldX, 0, worldZ));
    template.thinInstanceSetMatrixAt(info.index, matrix, true);
  }

  /** 注销单位实例（索引回收）。 */
  unregisterUnit(unitId: string): void {
    const info = this.instances.get(unitId);
    if (!info) return;

    const template = this.templates.get(info.groupKey);
    if (template) {
      // 缩放到 0 隐藏（thin instance 不支持删除单个）
      template.thinInstanceSetMatrixAt(info.index, Matrix.Scaling(0, 0, 0), true);
      this.freeIndex(info.groupKey, info.index);
    }
    this.instances.delete(unitId);
  }

  /** 查询实例信息。 */
  getInstanceInfo(unitId: string): { groupKey: string; index: number } | undefined {
    return this.instances.get(unitId);
  }

  /** 活跃实例数。 */
  getActiveCount(): number {
    return this.instances.size;
  }

  /** 模板组数。 */
  getGroupCount(): number {
    return this.templates.size;
  }

  /** 所有模板上的总 thin instance 槽位数。 */
  getTotalInstanceSlots(): number {
    let total = 0;
    for (const mesh of this.templates.values()) {
      total += mesh.thinInstanceCount ?? 0;
    }
    return total;
  }

  /** 获取某模板当前管理的实例数。 */
  getInstanceCountForGroup(groupKey: string): number {
    let count = 0;
    for (const info of this.instances.values()) {
      if (info.groupKey === groupKey) count++;
    }
    return count;
  }

  /** 释放所有资源。 */
  dispose(): void {
    for (const mesh of this.templates.values()) {
      mesh.dispose();
    }
    this.templates.clear();
    this.instances.clear();
    this.freeIndices.clear();
    this.scene = null;
    InstancedUnitRenderer.instance = null;
  }

  // ── Private ──

  private makeGroupKey(definition: UnitDefinition, house: House): string {
    // 步兵按 locomotion=Foot 分组；载具按 (locomotion, hasTurret) 分组
    return `${definition.id}#${house.color}`;
  }

  private createTemplate(definition: UnitDefinition, house: House, groupKey: string): Mesh | undefined {
    if (!this.scene) return undefined;

    const color = Color3.FromHexString(house.color);
    const mat = new StandardMaterial(`instMat_${groupKey}`, this.scene);
    mat.diffuseColor = color;
    mat.specularColor = Color3.Black();

    let template: Mesh;

    // 根据单位类型创建简化几何体（与 UnitMeshFactory 保持一致）
    if (definition.id === 'INFANTRY_DOG') {
      template = MeshBuilder.CreateBox(`tpl_${groupKey}`, { width: 0.3, height: 0.25, depth: 0.5 }, this.scene);
      template.position.y = 0.2;
    } else if (definition.locomotion === Locomotion.Foot) {
      template = MeshBuilder.CreateCylinder(`tpl_${groupKey}`, { diameter: 0.35, height: 0.6 }, this.scene);
      template.position.y = 0.4;
    } else if (definition.locomotion === Locomotion.Track && definition.hasTurret) {
      template = MeshBuilder.CreateBox(`tpl_${groupKey}`, { width: 0.6, height: 0.3, depth: 0.8 }, this.scene);
      template.position.y = 0.25;
    } else if (definition.locomotion === Locomotion.Track) {
      template = MeshBuilder.CreateBox(`tpl_${groupKey}`, { width: 0.55, height: 0.3, depth: 0.9 }, this.scene);
      template.position.y = 0.25;
    } else if (definition.locomotion === Locomotion.Wheel && definition.hasTurret) {
      template = MeshBuilder.CreateBox(`tpl_${groupKey}`, { width: 0.5, height: 0.2, depth: 0.7 }, this.scene);
      template.position.y = 0.2;
    } else {
      template = MeshBuilder.CreateBox(`tpl_${groupKey}`, { width: 0.5, height: 0.2, depth: 0.7 }, this.scene);
      template.position.y = 0.2;
    }

    template.material = mat;
    template.setEnabled(false); // 模板本身不渲染
    setRenderLayer(template, RenderLayer.Opaque);

    // 初始化 thin instance 缓冲区（预分配 4 个槽位）
    template.thinInstanceSetBuffer('matrix', new Float32Array(16 * 4), 16, true);

    return template;
  }

  private allocIndex(groupKey: string, template: Mesh): number {
    const freeList = this.freeIndices.get(groupKey);
    if (freeList && freeList.length > 0) {
      return freeList.pop()!;
    }
    return template.thinInstanceAdd(Matrix.Scaling(0, 0, 0));
  }

  private freeIndex(groupKey: string, index: number): void {
    let list = this.freeIndices.get(groupKey);
    if (!list) {
      list = [];
      this.freeIndices.set(groupKey, list);
    }
    list.push(index);
  }
}
