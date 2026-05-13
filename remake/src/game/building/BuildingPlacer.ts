/**
 * 建筑放置预览器 — 半透明 Ghost Mesh 跟随鼠标，验证位置合法性。
 *
 * 合法位置显示绿色，非法位置显示红色（地形不可建造、与其他物体重叠、超出地图）。
 */

import { type Scene, type Camera, MeshBuilder, StandardMaterial, Color3, Matrix, Vector3 } from '@babylonjs/core';
import type { BuildingDefinition } from '../rules/BuildingDefinitions';
import type { TerrainGrid } from '../terrain/TerrainGrid';
import { LandType } from '../terrain/TerrainGrid';
import { UnitCollision } from '../unit/UnitCollision';

export class BuildingPlacer {
  private readonly scene: Scene;
  private readonly camera: Camera;
  private readonly terrain: TerrainGrid;

  private ghost: ReturnType<typeof MeshBuilder.CreateBox> | null = null;
  private ghostMat: StandardMaterial | null = null;
  private definition: BuildingDefinition | null = null;
  private targetCell: { x: number; y: number } | null = null;

  constructor(scene: Scene, camera: Camera, terrain: TerrainGrid) {
    this.scene = scene;
    this.camera = camera;
    this.terrain = terrain;
  }

  // ──  生命周期  ──

  /** 开始对指定建筑进行放置预览。 */
  startPlacement(definition: BuildingDefinition): void {
    this.stopPlacement();
    this.definition = definition;
    this.createGhost(definition);
  }

  /** 结束放置预览并清理资源。 */
  stopPlacement(): void {
    this.ghost?.dispose();
    this.ghost = null;
    this.ghostMat = null;
    this.definition = null;
    this.targetCell = null;
  }

  dispose(): void {
    this.stopPlacement();
  }

  // ──  每帧更新  ──

  /**
   * 根据当前鼠标屏幕坐标更新 Ghost 位置和颜色。
   * 应在 render loop 中每帧调用（当 isPlacing() 为 true 时）。
   */
  updateFromScreen(screenX: number, screenY: number): void {
    if (!this.ghost || !this.definition) return;

    const ray = this.scene.createPickingRay(screenX, screenY, Matrix.Identity(), this.camera);

    // 射线与 y=0 地面相交
    if (Math.abs(ray.direction.y) < 0.0001) {
      this.ghost.setEnabled(false);
      return;
    }
    const t = -ray.origin.y / ray.direction.y;
    if (t < 0) {
      this.ghost.setEnabled(false);
      return;
    }

    const worldPos = ray.origin.add(ray.direction.scale(t));
    const cell = this.worldToCell(worldPos);
    this.targetCell = cell;

    const valid = this.isValid(cell.x, cell.y);
    this.ghostMat!.diffuseColor = valid ? new Color3(0, 1, 0) : new Color3(1, 0, 0);
    this.ghostMat!.emissiveColor = valid ? new Color3(0, 0.6, 0) : new Color3(0.6, 0, 0);
    this.ghost.setEnabled(true);

    // Ghost 中心对齐 footprint 中心
    const def = this.definition;
    this.ghost.position.x = cell.x + def.width / 2 - 32;
    this.ghost.position.z = cell.y + def.height / 2 - 32;
    this.ghost.position.y = 0.05;
  }

  // ──  操作  ──

  /** 确认放置当前目标格子。返回放置成功的格子坐标，或 null（位置不合法或未在放置）。 */
  confirmPlacement(): { x: number; y: number } | null {
    if (!this.targetCell || !this.definition) return null;
    if (!this.isValid(this.targetCell.x, this.targetCell.y)) return null;
    const cell = { ...this.targetCell };
    this.stopPlacement();
    return cell;
  }

  /** 取消放置（不建造任何建筑）。 */
  cancelPlacement(): void {
    this.stopPlacement();
  }

  /** 是否处于放置模式。 */
  isPlacing(): boolean {
    return this.ghost !== null;
  }

  /** 获取当前目标格子（可能为 null）。 */
  getTargetCell(): { x: number; y: number } | null {
    return this.targetCell;
  }

  // ──  验证  ──

  /** 检查指定格子是否可放置当前建筑。 */
  isValid(cellX: number, cellY: number): boolean {
    const def = this.definition;
    if (!def) return false;

    // 地图边界
    if (cellX < 0 || cellY < 0 || cellX + def.width > 64 || cellY + def.height > 64) {
      return false;
    }

    for (let dx = 0; dx < def.width; dx++) {
      for (let dy = 0; dy < def.height; dy++) {
        const cx = cellX + dx;
        const cy = cellY + dy;

        // 地形检查
        const type = this.terrain.getCellLandType(cx, cy);
        if (type === LandType.Water || type === LandType.Rock || type === LandType.Wall || type === LandType.River) {
          return false;
        }

        // 与其他建筑/单位重叠检查（空字符串 excludeId 表示不排除任何对象）
        if (UnitCollision.isPositionBlocked(cx, cy, '')) {
          return false;
        }
      }
    }
    return true;
  }

  // ──  helpers  ──

  private createGhost(def: BuildingDefinition): void {
    this.ghost = MeshBuilder.CreateBox(
      'placementGhost',
      { width: def.width, depth: def.height, height: 0.1 },
      this.scene
    );
    this.ghostMat = new StandardMaterial('ghostMat', this.scene);
    this.ghostMat.alpha = 0.35;
    this.ghostMat.disableLighting = true;
    this.ghost.material = this.ghostMat;
    this.ghost.setEnabled(false);
  }

  private worldToCell(worldPos: Vector3): { x: number; y: number } {
    return {
      x: Math.floor(worldPos.x + 32),
      y: Math.floor(worldPos.z + 32),
    };
  }
}
