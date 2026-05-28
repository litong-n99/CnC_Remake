/**
 * 单位3D血条 — Task 51.5 立场着色的一部分
 * 在选中单位上方显示血条，颜色根据外交关系确定。
 *
 * 友方/Self = 绿色，敌方 = 红色，中立 = 灰色。
 */

import { MeshBuilder, StandardMaterial, Color3, Vector3, type Scene, type Mesh } from '@babylonjs/core';
import type { Unit } from '../../game/objects/Unit';
import { RenderLayer, setRenderLayer, setDepthWrite } from '../RenderLayer';

import { getRelationshipColorForLocalPlayer, hexToColor3 } from './RelationshipColors';

interface HealthBarEntry {
  readonly bg: Mesh;
  readonly fg: Mesh;
  readonly matFg: StandardMaterial;
}

export class UnitHealthBarManager {
  private scene: Scene | null = null;
  private bars = new Map<string, HealthBarEntry>();

  private bgMaterial: StandardMaterial | null = null;

  /** 为指定单位创建或更新血条。 */
  show(unit: Unit): void {
    if (!unit.mesh) return;
    if (!this.scene) {
      this.scene = unit.mesh.getScene();
      this.ensureBgMaterial();
    }

    let entry = this.bars.get(unit.id);
    if (!entry) {
      entry = this.createBar(unit);
      this.bars.set(unit.id, entry);
    }

    this.updateBar(entry, unit);
    entry.bg.setEnabled(true);
    entry.fg.setEnabled(true);
  }

  /** 隐藏指定单位的血条。 */
  hide(unitId: string): void {
    const entry = this.bars.get(unitId);
    if (entry) {
      entry.bg.setEnabled(false);
      entry.fg.setEnabled(false);
    }
  }

  /** 更新所有可见血条的宽度和颜色。 */
  updateAll(units: readonly Unit[]): void {
    for (const unit of units) {
      const entry = this.bars.get(unit.id);
      if (entry && entry.fg.isEnabled()) {
        this.updateBar(entry, unit);
      }
    }
  }

  /** 移除并销毁指定单位的血条。 */
  remove(unitId: string): void {
    const entry = this.bars.get(unitId);
    if (entry) {
      entry.bg.dispose();
      entry.fg.dispose();
      entry.matFg.dispose();
      this.bars.delete(unitId);
    }
  }

  /** 清理所有血条。 */
  clear(): void {
    for (const entry of this.bars.values()) {
      entry.bg.dispose();
      entry.fg.dispose();
      entry.matFg.dispose();
    }
    this.bars.clear();
    this.bgMaterial?.dispose();
    this.bgMaterial = null;
    this.scene = null;
  }

  private ensureBgMaterial(): void {
    if (this.bgMaterial || !this.scene) return;
    this.bgMaterial = new StandardMaterial('healthBarBg', this.scene);
    this.bgMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
    this.bgMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);
    this.bgMaterial.disableLighting = true;
  }

  private createBar(unit: Unit): HealthBarEntry {
    const scene = this.scene!;
    const parent = unit.mesh!;

    const width = 0.8;
    const height = 0.12;
    const yOffset = 1.1;

    const bg = MeshBuilder.CreateBox('hb_bg_' + unit.id, { width, height, depth: 0.02 }, scene);
    bg.material = this.bgMaterial;
    bg.parent = parent;
    bg.position = new Vector3(0, yOffset, 0);
    setRenderLayer(bg, RenderLayer.Overlay);
    if (this.bgMaterial) setDepthWrite(this.bgMaterial, false);

    const matFg = new StandardMaterial('hb_fg_' + unit.id, scene);
    matFg.disableLighting = true;

    const fg = MeshBuilder.CreateBox(
      'hb_fg_' + unit.id,
      { width: width - 0.04, height: height - 0.04, depth: 0.025 },
      scene
    );
    fg.material = matFg;
    fg.parent = parent;
    fg.position = new Vector3(0, yOffset, 0);
    setRenderLayer(fg, RenderLayer.Overlay);
    setDepthWrite(matFg, false);

    return { bg, fg, matFg };
  }

  private updateBar(entry: HealthBarEntry, unit: Unit): void {
    const ratio = unit.maxHealth > 0 ? unit.health / unit.maxHealth : 0;
    const fullWidth = 0.8 - 0.04;
    const newWidth = Math.max(0.01, fullWidth * ratio);

    // 缩放前景宽度（保持左侧对齐）
    entry.fg.scaling.x = ratio;
    entry.fg.position.x = -(fullWidth - newWidth) / 2;

    // 更新颜色
    const colorHex = getRelationshipColorForLocalPlayer(unit.house.id);
    const c = hexToColor3(colorHex);
    entry.matFg.diffuseColor = c;
    entry.matFg.emissiveColor = c.scale(0.7);
  }
}
