import type { Unit } from './objects/Unit';
import { MeshBuilder, StandardMaterial, Color3, Vector3, type Scene } from '@babylonjs/core';

/**
 * 选中单位管理器 — 跟踪当前选中的单位列表，并渲染选择环。
 *
 * 对应 C++ 中的选择状态（`CurrentObject` / `CurrentObjects`）。
 * 支持单选、多选（框选）、Shift 切换选择。
 */
export class SelectionManager {
  private static instance: SelectionManager | null = null;

  private selected = new Set<Unit>();
  private selectionRings: ReturnType<typeof MeshBuilder.CreateTorus>[] = [];
  private selectionMaterial: StandardMaterial | null = null;
  private scene: Scene | null = null;

  private constructor() {}

  static getInstance(): SelectionManager {
    if (!SelectionManager.instance) {
      SelectionManager.instance = new SelectionManager();
    }
    return SelectionManager.instance;
  }

  /** 初始化选择环材质（延迟到首次需要时）。 */
  private ensureScene(scene: Scene): void {
    if (this.scene === scene) return;
    this.scene = scene;

    this.selectionMaterial = new StandardMaterial('selectionRingMat', scene);
    this.selectionMaterial.diffuseColor = new Color3(0, 1, 0);
    this.selectionMaterial.emissiveColor = new Color3(0, 0.8, 0);
    this.selectionMaterial.alpha = 0.6;
    this.selectionMaterial.disableLighting = true;
  }

  /** 选中单个单位（单选模式，清除之前的选择）。 */
  select(unit: Unit, scene: Scene): void {
    this.ensureScene(scene);
    this.clear();
    this.selected.add(unit);
    this.showRings();
  }

  /** 多选：设置选中单位列表（框选用）。 */
  selectMultiple(units: Unit[], scene: Scene): void {
    this.ensureScene(scene);
    this.clear();
    for (const unit of units) {
      this.selected.add(unit);
    }
    this.showRings();
  }

  /** Shift+点击：切换单个单位的选择状态。 */
  toggleSelect(unit: Unit, scene: Scene): void {
    this.ensureScene(scene);
    if (this.selected.has(unit)) {
      this.selected.delete(unit);
    } else {
      this.selected.add(unit);
    }
    this.showRings();
  }

  /** 判断单位是否被选中。 */
  isSelected(unit: Unit): boolean {
    return this.selected.has(unit);
  }

  /** 清除当前选择。 */
  clear(): void {
    this.selected.clear();
    this.hideRings();
  }

  /** 获取当前选中的单位列表。 */
  getSelected(): readonly Unit[] {
    return [...this.selected];
  }

  /** 是否有选中单位。 */
  hasSelection(): boolean {
    return this.selected.size > 0;
  }

  private showRings(): void {
    this.hideRings();
    if (!this.scene || !this.selectionMaterial) return;

    for (const unit of this.selected) {
      if (!unit.mesh) continue;

      const radius = 0.6;
      const ring = MeshBuilder.CreateTorus(
        `selectionRing_${unit.id}`,
        { diameter: radius * 2, thickness: 0.08, tessellation: 32 },
        this.scene
      );
      ring.material = this.selectionMaterial;
      ring.parent = unit.mesh;
      ring.position = new Vector3(0, 0.05, 0);
      this.selectionRings.push(ring);
    }
  }

  private hideRings(): void {
    for (const ring of this.selectionRings) {
      ring.dispose();
    }
    this.selectionRings = [];
  }

  dispose(): void {
    this.clear();
    this.selectionMaterial?.dispose();
    this.selectionMaterial = null;
    this.scene = null;
    SelectionManager.instance = null;
  }
}
