import type { Unit } from './objects/Unit';
import { GameObjectManager } from './objects/GameObjectManager';
import { MeshBuilder, StandardMaterial, Vector3, DynamicTexture, Color3, Mesh, type Scene } from '@babylonjs/core';
import { HouseType } from './house/House';
import { getRelationshipColorForLocalPlayer, hexToColor3 } from '../renderer/ui/RelationshipColors';
import { RenderLayer, setRenderLayer, setDepthWrite } from '../renderer/RenderLayer';

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
  private groupAssignments = new Map<string, number>();
  private groupDecorationPlanes: Mesh[] = [];

  /** 控制组标签材质缓存（groupIndex → StandardMaterial），避免每单位创建独立材质 */
  private groupLabelMaterials = new Map<number, StandardMaterial>();
  /** 控制组标签纹理缓存（groupIndex → DynamicTexture） */
  private groupLabelTextures = new Map<number, DynamicTexture>();

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
    if (this.selected.size === 0) return;

    // OpenRA 风格：当前选择对象只属于一个控制组。
    // 1. 将选中单位从所有其他编组的 squads 中移除（对标 RemoveActorsFromAllControlGroups）
    for (const unit of this.selected) {
      for (const [groupIdx, squad] of [...this.squads]) {
        if (groupIdx === index) continue;
        const filtered = squad.filter((u) => u.id !== unit.id);
        if (filtered.length !== squad.length) {
          this.squads.set(groupIdx, filtered);
        }
      }
    }

    // 2. 清理目标编组的旧记录
    this.squads.set(index, []);
    for (const [unitId, group] of [...this.groupAssignments]) {
      if (group === index) {
        this.groupAssignments.delete(unitId);
      }
    }

    // 3. 设置新的归属关系
    for (const unit of this.selected) {
      this.groupAssignments.set(unit.id, index);
    }
    this.squads.set(index, [...this.selected]);

    // 4. 如果当前有选中单位，刷新选择环以显示新的控制组标签
    if (this.scene && this.selected.size > 0) {
      this.showRings();
    }
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

  /**
   * 将当前选中单位追加到指定编组槽（AddSelectionToControlGroup）。
   * OpenRA 风格：追加前先将这些单位从其他编组中移除（一个单位只属于一个控制组）。
   */
  addToSquad(index: number): void {
    if (index < 0 || index > 9) return;
    if (this.selected.size === 0) return;

    const currentSquad = this.squads.get(index) ?? [];
    const merged = new Map<string, Unit>();

    // 保留原编组中的单位
    for (const u of currentSquad) {
      if (u.isAlive()) merged.set(u.id, u);
    }

    // 将当前选择追加进去（先移除这些单位在其他编组中的归属）
    for (const unit of this.selected) {
      const oldGroup = this.groupAssignments.get(unit.id);
      if (oldGroup !== undefined && oldGroup !== index) {
        const oldSquad = this.squads.get(oldGroup);
        if (oldSquad) {
          this.squads.set(
            oldGroup,
            oldSquad.filter((u) => u.id !== unit.id)
          );
        }
      }
      this.groupAssignments.set(unit.id, index);
      merged.set(unit.id, unit);
    }

    this.squads.set(index, [...merged.values()]);

    // 刷新显示（如果当前有选中单位）
    if (this.scene && this.selected.size > 0) {
      this.showRings();
    }
  }

  /**
   * 将指定编组的内容合并到当前选择（CombineSelectionWithControlGroup）。
   * 不丢失当前已选择的单位。
   */
  combineSquad(index: number, scene: Scene): void {
    if (index < 0 || index > 9) return;
    const squad = this.squads.get(index);
    if (!squad || squad.length === 0) return;

    this.ensureScene(scene);
    const alive = squad.filter((u) => u.isAlive());
    if (alive.length === 0) return;

    // 合并到当前选择（去重）
    for (const u of alive) {
      this.selected.add(u);
    }
    this.showRings();
    this.notifySelectionChanged();
  }

  /**
   * 清理所有编组中的死亡单位。
   * 应在每逻辑帧调用（对齐 OpenRA ITick.Tick 语义）。
   */
  cleanupDeadUnits(): void {
    for (const [index, squad] of this.squads) {
      const alive = squad.filter((u) => u.isAlive());
      if (alive.length !== squad.length) {
        this.squads.set(index, alive);
      }
    }

    // 同步清理 groupAssignments 中已死亡或已移除的单位
    const aliveIds = new Set<string>();
    for (const squad of this.squads.values()) {
      for (const u of squad) {
        aliveIds.add(u.id);
      }
    }
    for (const unitId of this.groupAssignments.keys()) {
      if (!aliveIds.has(unitId)) {
        this.groupAssignments.delete(unitId);
      }
    }
  }

  private getGroupForUnit(unit: Unit): number | null {
    return this.groupAssignments.get(unit.id) ?? null;
  }

  /**
   * 获取或创建控制组标签材质（按 groupIndex 缓存）。
   * 无背景、白色衬线字体。
   */
  private getGroupLabelMaterial(groupIndex: number): StandardMaterial {
    if (!this.scene) {
      throw new Error('Scene is not initialized for SelectionManager');
    }

    let material = this.groupLabelMaterials.get(groupIndex);
    if (material) return material;

    const texture = new DynamicTexture(`groupLabelTex_${groupIndex}`, { width: 128, height: 128 }, this.scene, false);
    texture.hasAlpha = true;

    const ctx = texture.getContext() as CanvasRenderingContext2D | null;
    if (!ctx) {
      throw new Error('Failed to create DynamicTexture context');
    }

    ctx.clearRect(0, 0, 128, 128);
    ctx.font = 'bold 110px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = String(groupIndex);
    const x = 64;
    const y = 64;

    // 描边（底层，黑色轮廓）
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'black';
    ctx.strokeText(text, x, y);

    // 填充（顶层，白色文字）
    ctx.fillStyle = 'white';
    ctx.fillText(text, x, y);
    texture.update();

    material = new StandardMaterial(`groupLabelMat_${groupIndex}`, this.scene);
    material.diffuseTexture = texture;
    material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.backFaceCulling = false;
    material.useAlphaFromDiffuseTexture = true;
    setDepthWrite(material, false);

    this.groupLabelMaterials.set(groupIndex, material);
    this.groupLabelTextures.set(groupIndex, texture);
    return material;
  }

  private createGroupLabel(unit: Unit, groupIndex: number): Mesh {
    if (!this.scene) {
      throw new Error('Scene is not initialized for SelectionManager');
    }

    const size = 0.6;
    const material = this.getGroupLabelMaterial(groupIndex);

    const label = MeshBuilder.CreatePlane(
      `groupLabel_${unit.id}`,
      { width: size, height: size, sideOrientation: Mesh.DOUBLESIDE },
      this.scene
    );
    label.material = material;
    label.billboardMode = Mesh.BILLBOARDMODE_ALL;
    setRenderLayer(label, RenderLayer.Overlay);
    label.isPickable = false;

    return label;
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

      const group = this.getGroupForUnit(unit);
      if (group !== null) {
        const label = this.createGroupLabel(unit, group);
        label.parent = unit.mesh;
        // 左下角：选择框左下外侧
        label.position = new Vector3(-0.48, 0.45, 0.48);
        this.groupDecorationPlanes.push(label);
      }
    }
  }

  private hideRings(): void {
    for (const ring of this.selectionRings) {
      ring.dispose();
    }
    this.selectionRings = [];

    for (const label of this.groupDecorationPlanes) {
      label.dispose();
    }
    this.groupDecorationPlanes = [];
  }

  dispose(): void {
    this.clear();
    for (const mat of this.selectionMaterials.values()) {
      mat.dispose();
    }
    this.selectionMaterials.clear();

    for (const mat of this.groupLabelMaterials.values()) {
      mat.dispose();
    }
    this.groupLabelMaterials.clear();

    for (const tex of this.groupLabelTextures.values()) {
      tex.dispose();
    }
    this.groupLabelTextures.clear();

    this.scene = null;
    SelectionManager.instance = null;
  }
}
