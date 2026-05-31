/**
 * 单位3D血条 — Task 51.5 立场着色的一部分
 * 在选中单位上方显示血条，颜色根据外交关系确定。
 *
 * 友方/Self = 绿色，敌方 = 红色，中立 = 灰色。
 */

import { StandardMaterial, Color3, Vector3, type Scene } from '@babylonjs/core';
import type { Unit } from '../../game/objects/Unit';
import { setDepthWrite } from '../RenderLayer';
import { SpriteRenderable } from '../sprites/SpriteRenderable';

import { getRelationshipColorForLocalPlayer, hexToColor3 } from './RelationshipColors';

interface HealthBarEntry {
  readonly bg: SpriteRenderable;
  readonly fg: SpriteRenderable;
  readonly matFg: StandardMaterial;
}

export class UnitHealthBarManager {
  private scene: Scene | null = null;
  private bars = new Map<string, HealthBarEntry>();

  /** 为指定单位创建或更新血条。 */
  show(unit: Unit): void {
    if (!unit.mesh) return;
    if (!this.scene) {
      this.scene = unit.mesh.getScene();
    }

    let entry = this.bars.get(unit.id);
    if (!entry) {
      entry = this.createBar(unit);
      this.bars.set(unit.id, entry);
    }

    this.updateBar(entry, unit);
    entry.bg.setVisible(true);
    entry.fg.setVisible(true);
  }

  /** 隐藏指定单位的血条。 */
  hide(unitId: string): void {
    const entry = this.bars.get(unitId);
    if (entry) {
      entry.bg.setVisible(false);
      entry.fg.setVisible(false);
    }
  }

  /** 更新所有可见血条的宽度和颜色。 */
  updateAll(units: readonly Unit[]): void {
    for (const unit of units) {
      const entry = this.bars.get(unit.id);
      if (entry && entry.fg.mesh.isVisible) {
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
    this.scene = null;
  }

  private createBar(unit: Unit): HealthBarEntry {
    const scene = this.scene!;
    const width = 0.8;
    const height = 0.12;
    const yOffset = 1.1;

    const bg = new SpriteRenderable(scene, 'hb_bg_' + unit.id, {
      width,
      height,
      color: new Color3(0.2, 0.2, 0.2),
    });
    (bg.mesh.material as StandardMaterial).disableLighting = true;
    setDepthWrite(bg.mesh.material as StandardMaterial, false);
    bg.setVisible(false);

    const matFg = new StandardMaterial('hb_fg_' + unit.id, scene);
    matFg.disableLighting = true;
    setDepthWrite(matFg, false);
    matFg.diffuseColor = Color3.Green();
    matFg.emissiveColor = Color3.Green();

    const fg = new SpriteRenderable(scene, 'hb_fg_' + unit.id, {
      width: width - 0.04,
      height: height - 0.04,
      color: Color3.Green(),
    });
    fg.setVisible(false);
    fg.mesh.material = matFg;

    const worldPos = unit.mesh?.getAbsolutePosition() ?? new Vector3(0, 0, 0);
    bg.setPosition(worldPos.x, worldPos.y + yOffset, worldPos.z);
    fg.setPosition(worldPos.x, worldPos.y + yOffset, worldPos.z);

    return { bg, fg, matFg };
  }

  private updateBar(entry: HealthBarEntry, unit: Unit): void {
    if (!unit.mesh) return;
    const ratio = unit.maxHealth > 0 ? Math.max(0, Math.min(1, unit.health / unit.maxHealth)) : 0;

    const worldPos = unit.mesh.getAbsolutePosition();
    const yOffset = 1.1;
    entry.bg.setPosition(worldPos.x, worldPos.y + yOffset, worldPos.z);
    entry.fg.setPosition(worldPos.x, worldPos.y + yOffset, worldPos.z);

    entry.fg.mesh.scaling.x = ratio;

    const colorHex = getRelationshipColorForLocalPlayer(unit.house.id);
    const c = hexToColor3(colorHex);
    entry.matFg.diffuseColor = c;
    entry.matFg.emissiveColor = c.scale(0.7);
  }
}
