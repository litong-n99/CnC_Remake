/**
 * 建造侧边栏 — 完整实现。
 *
 * Cross-check:
 * - Origin: SIDEBAR.CPP / SIDEBAR.H
 *   - 顶部按钮：Repair, Sell(Upgrade), Zoom
 *   - 双栏建筑列表（Column[0], Column[1]）
 * - OpenRA: ProductionTabsWidget, ResourceBarWidget, ClassicProductionLogic
 *   - 电力竖状条（vertical ResourceBarWidget）
 *   - 生产标签页（Buildings / Infantry / Vehicles / Aircraft / Vessels）
 *   - 顶部命令按钮（RepairOrderButtonLogic, SellOrderButtonLogic）
 *
 * 本实现采用 OpenRA 式的标签页 + Origin 式的顶部命令按钮 + 电力竖状条。
 */

import * as GUI from '@babylonjs/gui';
import { type Scene } from '@babylonjs/core';
import type { BuildingDefinition } from '../../game/rules/BuildingDefinitions';
import { BUILDING_DEFINITIONS } from '../../game/rules/BuildingDefinitions';
import type { House } from '../../game/house/House';
import { ConstructionQueue, QueueStatus } from '../../game/building/ConstructionQueue';
import { UNIT_DEFINITIONS, Locomotion } from '../../game/rules/UnitDefinitions';
import type { UnitDefinition } from '../../game/rules/UnitDefinitions';
import { TechTree } from '../../game/building/TechTree';
import { GameObjectFactory } from '../../game/objects/GameObjectFactory';
import { GameObjectManager } from '../../game/objects/GameObjectManager';
import { GameObjectType } from '../../game/objects/GameObject';
import { Building } from '../../game/objects/Building';
import { getRelationshipColorForLocalPlayer, hexToColor3 } from './RelationshipColors';

/** Sidebar 操作模式。 */
export type SidebarMode = 'normal' | 'repair' | 'sell';

/** 生产标签页。 */
export type ProductionTab = 'buildings' | 'infantry' | 'vehicles';

interface SidebarButton {
  readonly bg: GUI.Rectangle;
  readonly nameText: GUI.TextBlock;
  readonly priceText: GUI.TextBlock;
  readonly progressBar: GUI.Rectangle;
  readonly progressBg: GUI.Rectangle;
  readonly definition: BuildingDefinition;
}

interface UnitSidebarButton {
  readonly bg: GUI.Rectangle;
  readonly nameText: GUI.TextBlock;
  readonly priceText: GUI.TextBlock;
  readonly definition: UnitDefinition;
}

export class Sidebar {
  private readonly gui: GUI.AdvancedDynamicTexture;
  private readonly panel: GUI.Rectangle;
  private readonly queue: ConstructionQueue;
  private readonly house: House;
  private readonly onBuildRequest: (definition: BuildingDefinition) => void;
  private readonly onPlaceRequest: () => void;
  private readonly onModeChange: (mode: SidebarMode) => void;
  private readonly scene: Scene;

  private readonly buildingButtons: SidebarButton[] = [];
  private readonly infantryButtons: UnitSidebarButton[] = [];
  private readonly vehicleButtons: UnitSidebarButton[] = [];

  private readonly creditText: GUI.TextBlock;
  private readonly powerText: GUI.TextBlock;
  private readonly statusText: GUI.TextBlock;
  private readonly powerBg: GUI.Rectangle;
  private readonly powerFill: GUI.Rectangle;
  private readonly drainMarker: GUI.Rectangle;
  private readonly repairBtn: GUI.Rectangle;
  private readonly sellBtn: GUI.Rectangle;
  private readonly repairLabel: GUI.TextBlock;
  private readonly sellLabel: GUI.TextBlock;
  private readonly tabBuildings: GUI.Rectangle;
  private readonly tabInfantry: GUI.Rectangle;
  private readonly tabVehicles: GUI.Rectangle;

  private _mode: SidebarMode = 'normal';
  private _activeTab: ProductionTab = 'buildings';
  private flashTimer = 0;
  private _visible = true;

  /** MiniMap 画布（OpenRA 风格：Radar 位于 Sidebar 顶部）。 */
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;

  constructor(
    scene: Scene,
    house: House,
    queue: ConstructionQueue,
    onBuildRequest: (definition: BuildingDefinition) => void,
    onPlaceRequest: () => void,
    onModeChange: (mode: SidebarMode) => void
  ) {
    this.scene = scene;
    this.house = house;
    this.queue = queue;
    this.onBuildRequest = onBuildRequest;
    this.onPlaceRequest = onPlaceRequest;
    this.onModeChange = onModeChange;

    this.gui = GUI.AdvancedDynamicTexture.CreateFullscreenUI('sidebarUI', true, scene);

    // ── 主面板 ──
    this.panel = new GUI.Rectangle('sidebarPanel');
    this.panel.width = '190px';
    this.panel.height = '100%';
    this.panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.background = '#1a1a1a';
    this.panel.alpha = 0.92;
    this.panel.thickness = 0;
    this.gui.addControl(this.panel);

    // ── 电力竖状条（OpenRA ResourceBarWidget 风格）──
    // 作为 gui 根层级控件，紧贴 panel 左侧外部，避免被 panel 裁剪
    const powerContainer = new GUI.Rectangle('powerContainer');
    powerContainer.width = '16px';
    powerContainer.height = '100%';
    powerContainer.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    powerContainer.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    powerContainer.top = '0px';
    powerContainer.left = '-190px'; // 紧贴 panel 左侧，零间隙
    powerContainer.background = '#111';
    powerContainer.thickness = 1;
    powerContainer.color = '#444';
    powerContainer.isPointerBlocker = true;
    this.gui.addControl(powerContainer);

    // 背景
    this.powerBg = new GUI.Rectangle('powerBg');
    this.powerBg.width = '100%';
    this.powerBg.height = '100%';
    this.powerBg.background = '#111';
    this.powerBg.thickness = 0;
    powerContainer.addControl(this.powerBg);

    // 填充条（从底到顶，表示发电量）
    this.powerFill = new GUI.Rectangle('powerFill');
    this.powerFill.width = '100%';
    this.powerFill.height = '0%';
    this.powerFill.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.powerFill.background = '#0f0';
    this.powerFill.thickness = 0;
    powerContainer.addControl(this.powerFill);

    // 刻度线（每 25% 一条，增强柱状图观感）
    for (let i = 1; i < 4; i++) {
      const tick = new GUI.Rectangle(`powerTick_${i}`);
      tick.width = '100%';
      tick.height = '1px';
      tick.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
      tick.top = `${i * 25}%`;
      tick.background = '#333';
      tick.thickness = 0;
      powerContainer.addControl(tick);
    }

    // drain 标记线（OpenRA indicator 风格）
    this.drainMarker = new GUI.Rectangle('drainMarker');
    this.drainMarker.width = '22px'; // 比电力条宽，突出显示
    this.drainMarker.height = '3px';
    this.drainMarker.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.drainMarker.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.drainMarker.top = '0%';
    this.drainMarker.background = '#fff';
    this.drainMarker.thickness = 0;
    this.drainMarker.isVisible = false;
    powerContainer.addControl(this.drainMarker);

    // 点击电力条输出详细电力明细
    powerContainer.onPointerClickObservable.add(() => {
      const buildings = GameObjectManager.getInstance()
        .getBuildings()
        .filter((obj) => obj.type === GameObjectType.Building && obj.isAlive())
        .map((obj) => obj as Building)
        .filter((b) => b.house.id === this.house.id);

      const producers = buildings.filter((b) => b.definition.power > 0);
      const consumers = buildings.filter((b) => b.definition.power < 0);

      let totalProduction = 0;
      let totalConsumption = 0;

      // eslint-disable-next-line no-console
      console.info(`\n╔══════════════════════════════════════════════════════════════╗`);
      // eslint-disable-next-line no-console
      console.info(`║           Power Report — ${this.house.name}`);
      // eslint-disable-next-line no-console
      console.info(`╠══════════════════════════════════════════════════════════════╣`);

      // eslint-disable-next-line no-console
      console.info(`║  PRODUCTION (${producers.length} buildings):`);
      for (const b of producers) {
        totalProduction += b.definition.power;
        // eslint-disable-next-line no-console
        console.info(`║    +${b.definition.power.toString().padStart(4)}  ${b.definition.name} at (${b.x}, ${b.y})`);
      }

      // eslint-disable-next-line no-console
      console.info(`║  CONSUMPTION (${consumers.length} buildings):`);
      for (const b of consumers) {
        totalConsumption += Math.abs(b.definition.power);
        // eslint-disable-next-line no-console
        console.info(
          `║    -${Math.abs(b.definition.power).toString().padStart(4)}  ${b.definition.name} at (${b.x}, ${b.y})`
        );
      }

      const balance = totalProduction - totalConsumption;
      // eslint-disable-next-line no-console
      console.info(`╠══════════════════════════════════════════════════════════════╣`);
      // eslint-disable-next-line no-console
      console.info(`║  TOTAL: +${totalProduction} / -${totalConsumption}  →  ${balance >= 0 ? '+' : ''}${balance}`);
      // eslint-disable-next-line no-console
      console.info(`╚══════════════════════════════════════════════════════════════╝\n`);
    });

    // ── MiniMap（OpenRA 风格：Radar 位于 Sidebar 顶部）──
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.id = 'cnc-sidebar-minimap';
    this.minimapCanvas.width = 170;
    this.minimapCanvas.height = 170;
    this.minimapCanvas.style.position = 'fixed';
    this.minimapCanvas.style.top = '10px';
    this.minimapCanvas.style.right = '10px';
    this.minimapCanvas.style.width = '170px';
    this.minimapCanvas.style.height = '170px';
    this.minimapCanvas.style.background = 'rgba(0,32,0,0.85)';
    this.minimapCanvas.style.border = '2px solid rgba(255,255,255,0.4)';
    this.minimapCanvas.style.zIndex = '1001';
    document.body.appendChild(this.minimapCanvas);
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;

    // ── 顶部命令按钮（Origin SIDEBAR.CPP 风格）──
    // 下移以给 MiniMap 留出空间
    this.repairBtn = this.createTopButton('repairBtn', 'REPAIR', 0, '190px');
    this.repairLabel = this.repairBtn.getChildByName('repairBtn_label') as GUI.TextBlock;
    this.repairBtn.onPointerClickObservable.add(() => this.toggleMode('repair'));

    this.sellBtn = this.createTopButton('sellBtn', 'SELL', 1, '190px');
    this.sellLabel = this.sellBtn.getChildByName('sellBtn_label') as GUI.TextBlock;
    this.sellBtn.onPointerClickObservable.add(() => this.toggleMode('sell'));

    // ── 生产标签页（OpenRA ProductionTabsWidget 风格）──
    this.tabBuildings = this.createTabButton('tabBuildings', 'B', 0, 'buildings', '222px');
    this.tabInfantry = this.createTabButton('tabInfantry', 'I', 1, 'infantry', '222px');
    this.tabVehicles = this.createTabButton('tabVehicles', 'V', 2, 'vehicles', '222px');

    // ── 电力状态 ──
    this.powerText = new GUI.TextBlock('powerText', '');
    this.powerText.color = '#0f0';
    this.powerText.fontSize = 11;
    this.powerText.height = '18px';
    this.powerText.top = '258px';
    this.powerText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.addControl(this.powerText);

    // ── 资金 ──
    this.creditText = new GUI.TextBlock('creditText', `Credits: ${house.credits}`);
    this.creditText.color = '#0f0';
    this.creditText.fontSize = 12;
    this.creditText.height = '20px';
    this.creditText.top = '278px';
    this.creditText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.addControl(this.creditText);

    // ── 建造状态 ──
    this.statusText = new GUI.TextBlock('statusText', '');
    this.statusText.color = '#aaa';
    this.statusText.fontSize = 11;
    this.statusText.height = '18px';
    this.statusText.top = '298px';
    this.statusText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.addControl(this.statusText);

    // ── 建筑按钮 ──
    const buildingDefs = Object.values(BUILDING_DEFINITIONS).filter((d) => d.techLevel >= 0 && d.cost > 0);
    buildingDefs.forEach((def, i) => this.createBuildingButton(def, i, '324px'));

    // ── 步兵按钮 ──
    const infantryDefs = Object.values(UNIT_DEFINITIONS).filter((d) => d.locomotion === Locomotion.Foot);
    infantryDefs.forEach((def, i) => this.createUnitButton(def, i, 'infantry', '324px'));

    // ── 车辆按钮 ──
    const vehicleDefs = Object.values(UNIT_DEFINITIONS).filter((d) => d.locomotion !== Locomotion.Foot);
    vehicleDefs.forEach((def, i) => this.createUnitButton(def, i, 'vehicles', '324px'));

    // 默认显示建筑标签
    this.switchTab('buildings');

    // 初始隐藏：等待 ConstructionYard 建造完成（红警原作行为）
    this.setVisible(false);

    // 防止 GUI 面板本身阻挡场景指针事件
    this.panel.isPointerBlocker = false;
  }

  // ── 模式与标签页 ──

  get mode(): SidebarMode {
    return this._mode;
  }

  get activeTab(): ProductionTab {
    return this._activeTab;
  }

  private toggleMode(mode: SidebarMode): void {
    if (this._mode === mode) {
      this._mode = 'normal';
    } else {
      this._mode = mode;
    }
    this.updateTopButtonStyles();
    this.onModeChange(this._mode);
  }

  private switchTab(tab: ProductionTab): void {
    this._activeTab = tab;
    // 切回正常模式（避免 Repair/Sell 干扰生产）
    if (this._mode !== 'normal') {
      this._mode = 'normal';
      this.updateTopButtonStyles();
      this.onModeChange('normal');
    }
    this.updateTabStyles();
    this.updateContentVisibility();
  }

  private updateTopButtonStyles(): void {
    const repairActive = this._mode === 'repair';
    const sellActive = this._mode === 'sell';

    this.repairBtn.background = repairActive ? '#0a4a0a' : '#2a2a2a';
    this.repairBtn.color = repairActive ? '#0f0' : '#555';
    this.repairLabel.color = repairActive ? '#0f0' : '#aaa';

    this.sellBtn.background = sellActive ? '#4a2a0a' : '#2a2a2a';
    this.sellBtn.color = sellActive ? '#f90' : '#555';
    this.sellLabel.color = sellActive ? '#f90' : '#aaa';
  }

  private updateTabStyles(): void {
    const setTabStyle = (tab: GUI.Rectangle, active: boolean) => {
      tab.background = active ? '#3a3a3a' : '#1a1a1a';
      tab.color = active ? '#FFD700' : '#555';
      (tab.getChildByName(tab.name + '_label') as GUI.TextBlock).color = active ? '#FFD700' : '#888';
    };
    setTabStyle(this.tabBuildings, this._activeTab === 'buildings');
    setTabStyle(this.tabInfantry, this._activeTab === 'infantry');
    setTabStyle(this.tabVehicles, this._activeTab === 'vehicles');
  }

  private updateContentVisibility(): void {
    for (const btn of this.buildingButtons) {
      btn.bg.isVisible = this._activeTab === 'buildings';
    }
    for (const btn of this.infantryButtons) {
      btn.bg.isVisible = this._activeTab === 'infantry';
    }
    for (const btn of this.vehicleButtons) {
      btn.bg.isVisible = this._activeTab === 'vehicles';
    }
  }

  // ── 显示控制 ──

  /** 检查玩家是否拥有存活且已放置的 ConstructionYard。 */
  private hasConstructionYard(): boolean {
    return GameObjectManager.getInstance()
      .getBuildings()
      .some(
        (b) =>
          b.type === GameObjectType.Building &&
          b.isAlive() &&
          b.house.id === this.house.id &&
          b.definition.id === 'ConstructionYard'
      );
  }

  private setVisible(visible: boolean): void {
    if (this._visible === visible) return;
    this._visible = visible;
    this.panel.isVisible = visible;
    this.minimapCanvas.style.display = visible ? 'block' : 'none';
    // 电力条容器是 gui 根层级，需要单独处理
    const powerContainer = this.gui.getControlByName('powerContainer');
    if (powerContainer) {
      powerContainer.isVisible = visible;
    }
  }

  /** 绘制 MiniMap：地形底色 + 单位点（按关系着色）。 */
  private drawMinimap(mapWidth = 64, mapHeight = 64): void {
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

    // 绘制建筑点（稍大一点）
    const buildings = GameObjectManager.getInstance().getBuildings();
    for (const b of buildings) {
      if (!b.isAlive()) continue;
      const mx = ((b.x + 32) / mapWidth) * w;
      const my = ((b.y + 32) / mapHeight) * h;
      const colorHex = getRelationshipColorForLocalPlayer(b.house.id);
      const c3 = hexToColor3(colorHex);
      const rgb = `rgb(${Math.round(c3.r * 255)},${Math.round(c3.g * 255)},${Math.round(c3.b * 255)})`;

      ctx.fillStyle = rgb;
      ctx.fillRect(mx - 2, my - 2, 4, 4);
    }
  }

  // ── 每帧刷新 ──

  refresh(deltaTime: number): void {
    // 红警原作行为：只有拥有 ConstructionYard 时才显示 Sidebar（含 MiniMap）
    const shouldShow = this.hasConstructionYard();
    this.setVisible(shouldShow);
    if (!shouldShow) return;

    this.flashTimer += deltaTime;

    // 资金
    this.creditText.text = `Credits: ${this.house.credits}`;

    // 电力状态文本
    const powerBal = this.house.getPowerBalance();
    if (powerBal < 0) {
      this.powerText.text = `LOW POWER: ${this.house.power} / ${this.house.drain}`;
      this.powerText.color = '#f00';
    } else {
      this.powerText.text = `Power: ${this.house.power} / ${this.house.drain}`;
      this.powerText.color = '#0f0';
    }

    // 电力竖状条（OpenRA 行为：从底到顶，填充高度 = power / max）
    const power = this.house.power;
    const drain = this.house.drain;
    const maxPower = Math.max(power, drain, 1);
    const powerFrac = Math.min(1, power / maxPower);
    const drainFrac = Math.min(1, drain / maxPower);
    this.powerFill.height = `${powerFrac * 100}%`;
    if (drain > power) {
      this.powerFill.background = '#f00';
    } else if (drain > power * 0.8) {
      this.powerFill.background = '#f90';
    } else {
      this.powerFill.background = '#0f0';
    }

    // 更新 drain 标记线位置（OpenRA indicator 风格）
    if (drain > 0) {
      this.drainMarker.isVisible = true;
      this.drainMarker.top = `${(1 - drainFrac) * 100}%`;
      this.drainMarker.background = drain > power ? '#f88' : '#fff';
    } else {
      this.drainMarker.isVisible = false;
    }

    // 状态提示
    this.updateStatusText();

    // 建筑按钮刷新
    const qStatus = this.queue.status;
    const qDef = this.queue.currentDefinition;

    for (const btn of this.buildingButtons) {
      const def = btn.definition;
      const isCurrent = qDef?.id === def.id;
      const canAfford = this.house.credits >= def.cost;
      const canBuild = this.queue.hasPrerequisites(def);

      if (qStatus === QueueStatus.Building && isCurrent) {
        this.setBuildingButtonState(btn, 'building');
        btn.progressBar.width = `${this.queue.progress * 100}%`;
        btn.progressBg.isVisible = true;
        btn.progressBar.isVisible = true;
      } else if (qStatus === QueueStatus.Ready && isCurrent) {
        this.setBuildingButtonState(btn, 'ready');
        const flash = Math.sin(this.flashTimer * 0.008) > 0;
        btn.bg.color = flash ? '#0f0' : '#FFD700';
        btn.progressBg.isVisible = false;
        btn.progressBar.isVisible = false;
      } else if (qStatus !== QueueStatus.Idle) {
        this.setBuildingButtonState(btn, 'disabled');
        btn.progressBg.isVisible = false;
        btn.progressBar.isVisible = false;
      } else if (!canBuild) {
        this.setBuildingButtonState(btn, 'locked');
        btn.progressBg.isVisible = false;
        btn.progressBar.isVisible = false;
      } else if (!canAfford) {
        this.setBuildingButtonState(btn, 'noFunds');
        btn.progressBg.isVisible = false;
        btn.progressBar.isVisible = false;
      } else {
        this.setBuildingButtonState(btn, 'available');
        btn.progressBg.isVisible = false;
        btn.progressBar.isVisible = false;
      }
    }

    // 步兵按钮刷新
    for (const btn of this.infantryButtons) {
      const canBuild = TechTree.canBuildUnit(btn.definition, this.house);
      this.setUnitButtonState(btn, canBuild);
    }

    // 车辆按钮刷新
    for (const btn of this.vehicleButtons) {
      const canBuild = TechTree.canBuildUnit(btn.definition, this.house);
      this.setUnitButtonState(btn, canBuild);
    }

    // MiniMap 绘制（每渲染帧更新）
    this.drawMinimap();
  }

  // ── 创建控件 helpers ──

  private createTopButton(name: string, label: string, index: number, topOffset = '4px'): GUI.Rectangle {
    const btn = new GUI.Rectangle(name);
    btn.width = '88px';
    btn.height = '26px';
    btn.top = topOffset;
    btn.left = index === 0 ? '-46px' : '46px';
    btn.background = '#2a2a2a';
    btn.thickness = 2;
    btn.color = '#555';
    btn.cornerRadius = 3;
    btn.isPointerBlocker = true;
    btn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    btn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.addControl(btn);

    const text = new GUI.TextBlock(name + '_label', label);
    text.color = '#aaa';
    text.fontSize = 10;
    text.fontWeight = 'bold';
    text.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    btn.addControl(text);

    return btn;
  }

  private createTabButton(
    name: string,
    label: string,
    index: number,
    tab: ProductionTab,
    topOffset = '36px'
  ): GUI.Rectangle {
    const btn = new GUI.Rectangle(name);
    btn.width = '58px';
    btn.height = '24px';
    btn.top = topOffset;
    btn.left = `${-60 + index * 62}px`;
    btn.background = '#1a1a1a';
    btn.thickness = 1;
    btn.color = '#555';
    btn.isPointerBlocker = true;
    btn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    btn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.addControl(btn);

    const text = new GUI.TextBlock(name + '_label', label);
    text.color = '#888';
    text.fontSize = 10;
    text.fontWeight = 'bold';
    text.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    btn.addControl(text);

    btn.onPointerClickObservable.add(() => this.switchTab(tab));
    return btn;
  }

  private createBuildingButton(def: BuildingDefinition, index: number, topOffset = '138px'): void {
    const baseY = parseInt(topOffset, 10);
    const btnY = baseY + index * 52;

    const bg = new GUI.Rectangle(`btn_${def.id}`);
    bg.width = '170px';
    bg.height = '44px';
    bg.top = `${btnY}px`;
    bg.background = '#2a2a2a';
    bg.thickness = 2;
    bg.color = '#555';
    bg.cornerRadius = 4;
    bg.isPointerBlocker = true;
    bg.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.addControl(bg);

    const nameText = new GUI.TextBlock(`name_${def.id}`, def.name);
    nameText.color = '#fff';
    nameText.fontSize = 11;
    nameText.height = '18px';
    nameText.top = '-8px';
    nameText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    bg.addControl(nameText);

    const priceText = new GUI.TextBlock(`price_${def.id}`, `$${def.cost}`);
    priceText.color = '#0f0';
    priceText.fontSize = 10;
    priceText.height = '14px';
    priceText.top = '8px';
    priceText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    bg.addControl(priceText);

    const progressBg = new GUI.Rectangle(`progBg_${def.id}`);
    progressBg.width = '156px';
    progressBg.height = '3px';
    progressBg.top = '16px';
    progressBg.background = '#333';
    progressBg.thickness = 0;
    progressBg.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    progressBg.isVisible = false;
    bg.addControl(progressBg);

    const progressBar = new GUI.Rectangle(`prog_${def.id}`);
    progressBar.width = '0%';
    progressBar.height = '3px';
    progressBar.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    progressBar.background = '#0f0';
    progressBar.thickness = 0;
    progressBar.isVisible = false;
    progressBg.addControl(progressBar);

    bg.onPointerClickObservable.add(() => {
      const qStatus = this.queue.status;
      const qDef = this.queue.currentDefinition;

      if (qStatus === QueueStatus.Building && qDef?.id === def.id) {
        this.queue.cancel();
      } else if (qStatus === QueueStatus.Ready && qDef?.id === def.id) {
        this.onPlaceRequest();
      } else if (qStatus === QueueStatus.Idle) {
        this.onBuildRequest(def);
      }
    });

    this.buildingButtons.push({ bg, nameText, priceText, progressBar, progressBg, definition: def });
  }

  private createUnitButton(def: UnitDefinition, index: number, tab: ProductionTab, topOffset = '138px'): void {
    const baseY = parseInt(topOffset, 10);
    const btnY = baseY + index * 40;

    const bg = new GUI.Rectangle(`unitBtn_${def.id}`);
    bg.width = '170px';
    bg.height = '32px';
    bg.top = `${btnY}px`;
    bg.background = '#2a2a2a';
    bg.thickness = 2;
    bg.color = '#555';
    bg.cornerRadius = 3;
    bg.isPointerBlocker = true;
    bg.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.addControl(bg);

    const nameText = new GUI.TextBlock(`unitName_${def.id}`, `${def.name}  $${def.cost}`);
    nameText.color = '#fff';
    nameText.fontSize = 10;
    nameText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    bg.addControl(nameText);

    bg.onPointerClickObservable.add(() => {
      if (!TechTree.canBuildUnit(def, this.house)) {
        console.warn(
          `Locked: ${def.name} — requires ${TechTree.getMissingUnitPrerequisites(def, this.house).join(', ')}`
        );
        return;
      }
      // 在玩家基地附近生成（简化版，后续替换为正式生产队列）
      const playerBaseX = 42;
      const playerBaseY = 14;
      const offsetX = Math.floor(Math.random() * 4) - 2;
      const offsetY = Math.floor(Math.random() * 4) - 2;
      const unit = GameObjectFactory.createUnit({
        definition: def,
        house: this.house,
        x: playerBaseX + offsetX,
        y: playerBaseY + offsetY,
        scene: this.scene,
      });
      // eslint-disable-next-line no-console
      console.info(`Spawned ${def.name} at (${unit.x}, ${unit.y})`);
    });

    const btn: UnitSidebarButton = { bg, nameText, priceText: nameText, definition: def };
    if (tab === 'infantry') {
      this.infantryButtons.push(btn);
    } else {
      this.vehicleButtons.push(btn);
    }
  }

  // ── 状态样式 ──

  private setBuildingButtonState(
    btn: SidebarButton,
    state: 'available' | 'noFunds' | 'locked' | 'building' | 'ready' | 'disabled'
  ): void {
    switch (state) {
      case 'available':
        btn.bg.background = '#2a2a2a';
        btn.bg.color = '#666';
        btn.nameText.color = '#fff';
        btn.priceText.color = '#0f0';
        break;
      case 'noFunds':
        btn.bg.background = '#2a2a2a';
        btn.bg.color = '#553333';
        btn.nameText.color = '#aaa';
        btn.priceText.color = '#f44';
        break;
      case 'locked':
        btn.bg.background = '#222';
        btn.bg.color = '#444';
        btn.nameText.color = '#666';
        btn.priceText.color = '#666';
        break;
      case 'building':
        btn.bg.background = '#1a331a';
        btn.bg.color = '#0a0';
        btn.nameText.color = '#afa';
        btn.priceText.color = '#afa';
        break;
      case 'ready':
        btn.bg.background = '#2a2a1a';
        btn.nameText.color = '#FFD700';
        btn.priceText.color = '#FFD700';
        break;
      case 'disabled':
        btn.bg.background = '#222';
        btn.bg.color = '#444';
        btn.nameText.color = '#666';
        btn.priceText.color = '#666';
        break;
    }
  }

  private setUnitButtonState(btn: UnitSidebarButton, canBuild: boolean): void {
    if (canBuild) {
      btn.bg.background = '#2a2a2a';
      btn.bg.color = '#666';
      btn.nameText.color = '#fff';
    } else {
      btn.bg.background = '#222';
      btn.bg.color = '#444';
      btn.nameText.color = '#666';
    }
  }

  private updateStatusText(): void {
    const status = this.queue.status;
    const def = this.queue.currentDefinition;
    if (status === QueueStatus.Building && def) {
      const pct = Math.floor(this.queue.progress * 100);
      this.statusText.text = `Building: ${def.name} (${pct}%) — Click to cancel`;
      this.statusText.color = '#0f0';
    } else if (status === QueueStatus.Ready && def) {
      this.statusText.text = `Ready: ${def.name} — Click to place`;
      this.statusText.color = '#FFD700';
    } else {
      this.statusText.text = 'Select a unit or building';
      this.statusText.color = '#888';
    }
  }

  dispose(): void {
    this.gui.dispose();
    this.minimapCanvas.remove();
  }
}
