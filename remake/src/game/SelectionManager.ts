import type { Unit } from './objects/Unit';
import { GameObjectManager } from './objects/GameObjectManager';
import { MeshBuilder, StandardMaterial, Vector3, type Scene } from '@babylonjs/core';
import { HouseType } from './house/House';
import { getRelationshipColorForLocalPlayer, hexToColor3 } from '../renderer/ui/RelationshipColors';

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
  private selectionMaterials = new Map<string, StandardMaterial>();
  private scene: Scene | null = null;
  private viewerHouseType: HouseType | null = null;

  /** 编组存储：0-9 共 10 个编组槽 */
  private squads = new Map<number, Unit[]>();

  private constructor() {}

  static getInstance(): SelectionManager {
    if (!SelectionManager.instance) {
      SelectionManager.instance = new SelectionManager();
    }
    return SelectionManager.instance;
  }

  /** 设置观察者阵营（用于立场着色）。 */
  setViewerHouseType(type: HouseType): void {
    this.viewerHouseType = type;
  }

  /** 获取当前观察者阵营。 */
  getViewerHouseType(): HouseType | null {
    return this.viewerHouseType;
  }

  /** 初始化场景引用（延迟到首次需要时）。 */
  private ensureScene(scene: Scene): void {
    if (this.scene === scene) return;
    this.scene = scene;
  }

  /** 获取或创建指定关系颜色的选择环材质。 */
  private getRingMaterial(colorHex: string, scene: Scene): StandardMaterial {
    let mat = this.selectionMaterials.get(colorHex);
    if (!mat) {
      mat = new StandardMaterial(`selRing_${colorHex.replace('#', '')}`, scene);
      const c = hexToColor3(colorHex);
      mat.diffuseColor = c;
      mat.emissiveColor = c.scale(0.8);
      mat.alpha = 0.6;
      mat.disableLighting = true;
      this.selectionMaterials.set(colorHex, mat);
    }
    return mat;
  }

  /** 选中单个单位（单选模式，清除之前的选择）。 */
  select(unit: Unit, scene: Scene): void {
    this.ensureScene(scene);
    this.clear();
    this.selected.add(unit);
    this.showRings();
    this.notifySelectionChanged();
  }

  /** 多选：设置选中单位列表（框选用）。 */
  selectMultiple(units: Unit[], scene: Scene): void {
    this.ensureScene(scene);
    this.clear();
    for (const unit of units) {
      this.selected.add(unit);
    }
    this.showRings();
    this.notifySelectionChanged();
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
    this.notifySelectionChanged();
  }

  /** 判断单位是否被选中。 */
  isSelected(unit: Unit): boolean {
    return this.selected.has(unit);
  }

  /** 清除当前选择。 */
  clear(): void {
    const hadSelection = this.selected.size > 0;
    this.selected.clear();
    this.hideRings();
    if (hadSelection) {
      this.notifySelectionChanged();
    }
  }

  /** 获取当前选中的单位列表。 */
  getSelected(): readonly Unit[] {
    return [...this.selected];
  }

  /** 是否有选中单位。 */
  hasSelection(): boolean {
    return this.selected.size > 0;
  }

  /** 选中变化回调（HUD 等外部系统订阅）。 */
  onSelectionChanged: ((selected: readonly Unit[]) => void) | null = null;

  private notifySelectionChanged(): void {
    if (this.onSelectionChanged) {
      this.onSelectionChanged(this.getSelected());
    }
  }

  // ── Squad / group management ──

  /** 将当前选中单位保存到指定编组槽（0-9）。 */
  saveSquad(index: number): void {
    if (index < 0 || index > 9) return;
    this.squads.set(index, [...this.selected]);
  }

  /** 从指定编组槽恢复选中。 */
  restoreSquad(index: number, scene: Scene): void {
    if (index < 0 || index > 9) return;
    const squad = this.squads.get(index);
    if (!squad || squad.length === 0) return;
    // 过滤掉已销毁的单位
    const alive = squad.filter((u) => u.isAlive());
    if (alive.length > 0) {
      this.selectMultiple(alive, scene);
    }
  }

  /** 获取指定编组槽的内容（不修改当前选择）。 */
  getSquad(index: number): readonly Unit[] {
    return this.squads.get(index) ?? [];
  }

  /** 选中与给定单位同类型的所有可见单位。 */
  selectSameType(unit: Unit, scene: Scene): void {
    this.ensureScene(scene);
    const targetId = unit.definition.id;
    const sameType: Unit[] = [];
    for (const obj of GameObjectManager.getInstance().getUnits()) {
      const u = obj as Unit;
      if (u.definition.id === targetId && u.isAlive()) {
        sameType.push(u);
      }
    }
    if (sameType.length > 0) {
      this.selectMultiple(sameType, scene);
    }
  }

  private showRings(): void {
    this.hideRings();
    if (!this.scene) return;

    for (const unit of this.selected) {
      if (!unit.mesh) continue;

      const colorHex = getRelationshipColorForLocalPlayer(unit.house.id);
      const mat = this.getRingMaterial(colorHex, this.scene);

      const radius = 0.6;
      const ring = MeshBuilder.CreateTorus(
        `selectionRing_${unit.id}`,
        { diameter: radius * 2, thickness: 0.08, tessellation: 32 },
        this.scene
      );
      ring.material = mat;
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
    for (const mat of this.selectionMaterials.values()) {
      mat.dispose();
    }
    this.selectionMaterials.clear();
    this.scene = null;
    SelectionManager.instance = null;
  }
}
