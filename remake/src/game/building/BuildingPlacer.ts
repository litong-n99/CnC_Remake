/**
 * 建筑放置预览器 — 半透明 Ghost Mesh 跟随鼠标，逐 cell 验证合法性。
 *
 * Cross-check: OpenRA 的 `FootprintPlaceBuildingPreviewPreview.RenderFootprint()`
 * 为每个 footprint cell 独立着色：合法格子绿色，被阻挡格子红色。
 * 只有全部 cell 合法时才允许确认放置。
 */

import { type Scene, type Camera, Mesh, MeshBuilder, StandardMaterial, Color3, Matrix, Vector3 } from '@babylonjs/core';
import type { BuildingDefinition } from '../rules/BuildingDefinitions';
import type { TerrainGrid } from '../terrain/TerrainGrid';
import { LandType } from '../terrain/TerrainGrid';
import { UnitCollision } from '../unit/UnitCollision';
import { getBuildingFootprint } from '../rules/BuildingDefinitions';

interface GhostCell {
  readonly mesh: Mesh;
  readonly mat: StandardMaterial;
  readonly dx: number;
  readonly dy: number;
}

export class BuildingPlacer {
  private readonly scene: Scene;
  private readonly camera: Camera;
  private readonly terrain: TerrainGrid;

  private ghost: Mesh | null = null;
  private ghostCells: GhostCell[] = [];
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
    for (const gc of this.ghostCells) {
      gc.mat.dispose();
    }
    this.ghostCells = [];
    this.definition = null;
    this.targetCell = null;
  }

  dispose(): void {
    this.stopPlacement();
  }

  // ──  每帧更新  ──

  /**
   * 根据当前鼠标屏幕坐标更新 Ghost 位置和颜色。
   * 每个 footprint cell 独立检查合法性并着色（绿色=可用，红色=被阻挡）。
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

    // 逐 cell 独立检查合法性并着色（OpenRA 行为）
    for (const { mat, dx, dy } of this.ghostCells) {
      const valid = this.isFootprintCellValid(cell.x + dx, cell.y + dy);
      if (valid) {
        mat.diffuseColor = new Color3(0, 1, 0);
        mat.emissiveColor = new Color3(0, 0.6, 0);
      } else {
        mat.diffuseColor = new Color3(1, 0, 0);
        mat.emissiveColor = new Color3(0.6, 0, 0);
      }
    }
    this.ghost.setEnabled(true);

    // Ghost 原点对齐建筑左下角（子 mesh 局部坐标已包含 footprint 偏移）
    this.ghost.position.x = cell.x - 32;
    this.ghost.position.z = cell.y - 32;
    this.ghost.position.y = 0;
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

    // 地图边界（以 bounding box 为准）
    if (cellX < 0 || cellY < 0 || cellX + def.width > 64 || cellY + def.height > 64) {
      return false;
    }

    for (const cell of getBuildingFootprint(def)) {
      if (!this.isFootprintCellValid(cellX + cell.dx, cellY + cell.dy)) {
        return false;
      }
    }
    return true;
  }

  /** 检查单个 footprint cell 是否合法（地形 + 碰撞）。 */
  private isFootprintCellValid(cx: number, cy: number): boolean {
    if (cx < 0 || cy < 0 || cx >= 64 || cy >= 64) return false;
    const type = this.terrain.getCellLandType(cx, cy);
    if (type === LandType.Water || type === LandType.Rock || type === LandType.Wall || type === LandType.River) {
      return false;
    }
    return !UnitCollision.isPositionBlocked(cx, cy, '');
  }

  // ──  helpers  ──

  private createGhost(def: BuildingDefinition): void {
    const root = new Mesh('placementGhost', this.scene);
    this.ghostCells = [];

    for (const { dx, dy } of getBuildingFootprint(def)) {
      const mat = new StandardMaterial(`ghostMat_${dx}_${dy}`, this.scene);
      mat.alpha = 0.35;
      mat.disableLighting = true;

      const box = MeshBuilder.CreateBox(`ghostCell_${dx}_${dy}`, { width: 0.95, depth: 0.95, height: 0.1 }, this.scene);
      box.position.x = dx + 0.5;
      box.position.z = dy + 0.5;
      box.position.y = 0.05;
      box.material = mat;
      box.parent = root;

      this.ghostCells.push({ mesh: box, mat, dx, dy });
    }

    this.ghost = root;
    this.ghost.setEnabled(false);
  }

  private worldToCell(worldPos: Vector3): { x: number; y: number } {
    return {
      x: Math.floor(worldPos.x + 32),
      y: Math.floor(worldPos.z + 32),
    };
  }
}
