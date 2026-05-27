/**
 * HUD / UI 覆盖层 — Task 27
 * 顶部资源栏、底部选中单位信息面板、右下角小地图（占位）
 */

import type { House } from '../../game/house/House';
import type { Unit } from '../../game/objects/Unit';
import { ArmorType } from '../../game/rules/UnitDefinitions';
import { GameObjectManager } from '../../game/objects/GameObjectManager';
import { getRelationshipColorForLocalPlayer, hexToColor3 } from './RelationshipColors';

export class HUD {
  private container: HTMLDivElement;
  private resourceBar: HTMLDivElement;
  private unitInfoPanel: HTMLDivElement;
  private minimap: HTMLDivElement;
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapCtx: CanvasRenderingContext2D | null = null;

  private creditsEl!: HTMLSpanElement;
  private powerEl!: HTMLSpanElement;
  private unitNameEl!: HTMLDivElement;
  private unitHpEl!: HTMLDivElement;
  private unitStatsEl!: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'cnc-hud';
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '1000';
    this.container.style.fontFamily = 'monospace';
    this.container.style.fontSize = '14px';
    this.container.style.color = '#ffffff';
    document.body.appendChild(this.container);

    this.resourceBar = this.createResourceBar();
    this.unitInfoPanel = this.createUnitInfoPanel();
    this.minimap = this.createMinimap();

    this.container.appendChild(this.resourceBar);
    this.container.appendChild(this.unitInfoPanel);
    this.container.appendChild(this.minimap);
  }

  private createResourceBar(): HTMLDivElement {
    const bar = document.createElement('div');
    bar.id = 'cnc-resource-bar';
    bar.style.position = 'absolute';
    bar.style.top = '0';
    bar.style.left = '0';
    bar.style.width = '100%';
    bar.style.height = '32px';
    bar.style.background = 'rgba(0,0,0,0.6)';
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.padding = '0 16px';
    bar.style.gap = '24px';
    bar.style.boxSizing = 'border-box';

    this.creditsEl = document.createElement('span');
    this.creditsEl.id = 'cnc-credits';
    this.creditsEl.textContent = 'Credits: 0';

    this.powerEl = document.createElement('span');
    this.powerEl.id = 'cnc-power';
    this.powerEl.textContent = 'Power: 0/0';

    bar.appendChild(this.creditsEl);
    bar.appendChild(this.powerEl);
    return bar;
  }

  private createUnitInfoPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'cnc-unit-info';
    panel.style.position = 'absolute';
    panel.style.bottom = '0';
    panel.style.left = '0';
    panel.style.width = '100%';
    panel.style.height = '80px';
    panel.style.background = 'rgba(0,0,0,0.7)';
    panel.style.display = 'none';
    panel.style.alignItems = 'center';
    panel.style.padding = '0 16px';
    panel.style.gap = '16px';
    panel.style.boxSizing = 'border-box';

    this.unitNameEl = document.createElement('div');
    this.unitNameEl.style.fontWeight = 'bold';
    this.unitNameEl.style.minWidth = '120px';

    this.unitHpEl = document.createElement('div');
    this.unitHpEl.style.minWidth = '120px';

    this.unitStatsEl = document.createElement('div');
    this.unitStatsEl.style.minWidth = '200px';

    panel.appendChild(this.unitNameEl);
    panel.appendChild(this.unitHpEl);
    panel.appendChild(this.unitStatsEl);
    return panel;
  }

  private createMinimap(): HTMLDivElement {
    const map = document.createElement('div');
    map.id = 'cnc-minimap';
    map.style.position = 'absolute';
    map.style.bottom = '90px';
    map.style.right = '10px';
    map.style.width = '160px';
    map.style.height = '160px';
    map.style.background = 'rgba(0,32,0,0.85)';
    map.style.border = '2px solid rgba(255,255,255,0.4)';
    map.style.overflow = 'hidden';

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.minimapCanvas = canvas;
    this.minimapCtx = canvas.getContext('2d');
    map.appendChild(canvas);

    return map;
  }

  /** 绘制小地图：地形底色 + 单位点（按关系着色）。 */
  drawMinimap(mapWidth = 64, mapHeight = 64): void {
    const ctx = this.minimapCtx;
    const canvas = this.minimapCanvas;
    if (!ctx || !canvas) return;

    const w = canvas.width;
    const h = canvas.height;

    // 清空
    ctx.fillStyle = '#001a00';
    ctx.fillRect(0, 0, w, h);

    // 绘制网格线（每8格一条）
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const cellW = w / mapWidth;
    const cellH = h / mapHeight;
    for (let x = 0; x <= mapWidth; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x * cellW, 0);
      ctx.lineTo(x * cellW, h);
      ctx.stroke();
    }
    for (let y = 0; y <= mapHeight; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellH);
      ctx.lineTo(w, y * cellH);
      ctx.stroke();
    }

    // 绘制单位点
    const units = GameObjectManager.getInstance().getUnits();
    for (const unit of units) {
      if (!unit.isAlive()) continue;
      const mx = ((unit.x + 32) / mapWidth) * w;
      const my = ((unit.y + 32) / mapHeight) * h;
      const colorHex = getRelationshipColorForLocalPlayer(unit.house.id);
      const c3 = hexToColor3(colorHex);
      const rgb = `rgb(${Math.round(c3.r * 255)},${Math.round(c3.g * 255)},${Math.round(c3.b * 255)})`;

      ctx.fillStyle = rgb;
      ctx.beginPath();
      ctx.arc(mx, my, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 更新顶部资源栏（每帧或事件驱动调用）。 */
  updateResourceBar(house: House): void {
    this.creditsEl.textContent = `Credits: ${house.credits}`;
    this.powerEl.textContent = `Power: ${house.power}/${house.drain}`;
  }

  /** 选中单位变化时更新底部面板。 */
  showUnitInfo(units: readonly Unit[]): void {
    if (units.length === 0) {
      this.unitInfoPanel.style.display = 'none';
      return;
    }

    this.unitInfoPanel.style.display = 'flex';

    if (units.length === 1) {
      const u = units[0];
      this.unitNameEl.textContent = u.definition.name;
      this.unitHpEl.textContent = `HP: ${u.health}/${u.maxHealth}`;
      this.unitStatsEl.textContent = `Speed: ${u.definition.speed} | Armor: ${armorName(u.definition.armor)}`;
    } else {
      this.unitNameEl.textContent = `${units.length} units selected`;
      const totalHp = units.reduce((sum, u) => sum + u.health, 0);
      const maxHp = units.reduce((sum, u) => sum + u.maxHealth, 0);
      this.unitHpEl.textContent = `Total HP: ${totalHp}/${maxHp}`;
      this.unitStatsEl.textContent = '';
    }
  }

  dispose(): void {
    this.container.remove();
    this.minimapCanvas = null;
    this.minimapCtx = null;
  }
}

function armorName(armor: ArmorType): string {
  switch (armor) {
    case ArmorType.None:
      return 'None';
    case ArmorType.Wood:
      return 'Wood';
    case ArmorType.Aluminum:
      return 'Aluminum';
    case ArmorType.Steel:
      return 'Steel';
    case ArmorType.Concrete:
      return 'Concrete';
    default:
      return 'Unknown';
  }
}
