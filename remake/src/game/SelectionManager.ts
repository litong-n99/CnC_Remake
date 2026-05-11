import type { Unit } from './objects/Unit';
import { MeshBuilder, StandardMaterial, Color3, Vector3, type Scene } from '@babylonjs/core';

/**
 * 选中单位管理器 — 跟踪当前选中的单位列表，并渲染选择环。
 *
 * 对应 C++ 中的选择状态（`CurrentObject` / `CurrentObjects`）。
 * 当前仅支持单选；多选/框选（Task 25）后续扩展。
 */
export class SelectionManager {
  private static instance: SelectionManager | null = null;

  private selected = new Set<Unit>();
  private selectionRing: ReturnType<typeof MeshBuilder.CreateTorus> | null = null;
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

  /** 选中一个单位（单选模式会清除之前的选择）。 */
  select(unit: Unit, scene: Scene): void {
    this.ensureScene(scene);
    this.clear();
    this.selected.add(unit);
    this.showRing(unit);
  }

  /** 清除当前选择。 */
  clear(): void {
    this.selected.clear();
    this.hideRing();
  }

  /** 获取当前选中的单位列表。 */
  getSelected(): readonly Unit[] {
    return [...this.selected];
  }

  /** 是否有选中单位。 */
  hasSelection(): boolean {
    return this.selected.size > 0;
  }

  private showRing(unit: Unit): void {
    if (!unit.mesh || !this.scene || !this.selectionMaterial) return;

    this.hideRing();

    // 选择环大小根据单位尺寸调整（简单估算）
    const radius = 0.6;
    this.selectionRing = MeshBuilder.CreateTorus(
      'selectionRing',
      { diameter: radius * 2, thickness: 0.08, tessellation: 32 },
      this.scene
    );
    this.selectionRing.material = this.selectionMaterial;
    // 先挂接父节点，再设局部坐标，避免世界坐标被误读为局部坐标
    this.selectionRing.parent = unit.mesh;
    this.selectionRing.position = new Vector3(0, 0.05, 0);
  }

  private hideRing(): void {
    if (this.selectionRing) {
      this.selectionRing.dispose();
      this.selectionRing = null;
    }
  }

  dispose(): void {
    this.clear();
    this.selectionMaterial?.dispose();
    this.selectionMaterial = null;
    this.scene = null;
    SelectionManager.instance = null;
  }
}
