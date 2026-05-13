/**
 * 建造侧边栏 — Babylon.GUI 实现。
 *
 * 位于屏幕右侧，显示玩家可建造的建筑列表。
 * - 空闲：点击开始建造，扣款并显示进度。
 * - 建造中：进度条填充，不可点击其他建筑。
 * - 就绪：按钮高亮闪烁，点击后进入放置模式。
 */

import * as GUI from '@babylonjs/gui';
import { type Scene } from '@babylonjs/core';
import type { BuildingDefinition } from '../../game/rules/BuildingDefinitions';
import { BUILDING_DEFINITIONS } from '../../game/rules/BuildingDefinitions';
import type { House } from '../../game/house/House';
import { ConstructionQueue, QueueStatus } from '../../game/building/ConstructionQueue';

interface SidebarButton {
  readonly bg: GUI.Rectangle;
  readonly nameText: GUI.TextBlock;
  readonly priceText: GUI.TextBlock;
  readonly progressBar: GUI.Rectangle;
  readonly progressBg: GUI.Rectangle;
  readonly definition: BuildingDefinition;
}

export class Sidebar {
  private readonly gui: GUI.AdvancedDynamicTexture;
  private readonly panel: GUI.Rectangle;
  private readonly queue: ConstructionQueue;
  private readonly house: House;
  private readonly onBuildRequest: (definition: BuildingDefinition) => void;
  private readonly onPlaceRequest: () => void;
  private readonly buttons: SidebarButton[] = [];
  private readonly creditText: GUI.TextBlock;
  private readonly statusText: GUI.TextBlock;
  private flashTimer = 0;

  constructor(
    scene: Scene,
    house: House,
    queue: ConstructionQueue,
    onBuildRequest: (definition: BuildingDefinition) => void,
    onPlaceRequest: () => void
  ) {
    this.house = house;
    this.queue = queue;
    this.onBuildRequest = onBuildRequest;
    this.onPlaceRequest = onPlaceRequest;

    this.gui = GUI.AdvancedDynamicTexture.CreateFullscreenUI('sidebarUI', true, scene);

    // 主面板
    this.panel = new GUI.Rectangle('sidebarPanel');
    this.panel.width = '190px';
    this.panel.height = '100%';
    this.panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.background = '#1a1a1a';
    this.panel.alpha = 0.9;
    this.panel.thickness = 0;
    this.gui.addControl(this.panel);

    // 标题
    const title = new GUI.TextBlock('sidebarTitle', 'CONSTRUCTION');
    title.color = '#FFD700';
    title.fontSize = 14;
    title.fontWeight = 'bold';
    title.height = '28px';
    title.top = '8px';
    title.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.addControl(title);

    // 资金显示
    this.creditText = new GUI.TextBlock('creditText', `Credits: ${house.credits}`);
    this.creditText.color = '#0f0';
    this.creditText.fontSize = 12;
    this.creditText.height = '22px';
    this.creditText.top = '34px';
    this.creditText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.addControl(this.creditText);

    // 状态提示
    this.statusText = new GUI.TextBlock('statusText', '');
    this.statusText.color = '#aaa';
    this.statusText.fontSize = 11;
    this.statusText.height = '20px';
    this.statusText.top = '56px';
    this.statusText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.addControl(this.statusText);

    // 建筑按钮
    const defs = Object.values(BUILDING_DEFINITIONS).filter((d) => d.techLevel >= 0 && d.cost > 0);
    defs.forEach((def, i) => this.createButton(def, i));

    // 防止 GUI 面板本身阻挡场景指针事件（按钮仍接收点击）
    this.panel.isPointerBlocker = false;
  }

  // ──  每帧刷新  ──

  refresh(deltaTime: number): void {
    this.flashTimer += deltaTime;

    // 刷新资金
    this.creditText.text = `Credits: ${this.house.credits}`;

    // 刷新状态提示
    this.updateStatusText();

    const qStatus = this.queue.status;
    const qDef = this.queue.currentDefinition;

    for (const btn of this.buttons) {
      const def = btn.definition;
      const isCurrent = qDef?.id === def.id;
      const canAfford = this.house.credits >= def.cost;
      const canBuild = this.queue.hasPrerequisites(def);

      if (qStatus === QueueStatus.Building && isCurrent) {
        // 当前正在建造：显示进度条
        this.setButtonState(btn, 'building');
        const progress = this.queue.progress;
        btn.progressBar.width = `${progress * 100}%`;
        btn.progressBg.isVisible = true;
        btn.progressBar.isVisible = true;
      } else if (qStatus === QueueStatus.Ready && isCurrent) {
        // 就绪：闪烁高亮
        this.setButtonState(btn, 'ready');
        const flash = Math.sin(this.flashTimer * 0.008) > 0;
        btn.bg.color = flash ? '#0f0' : '#FFD700';
        btn.progressBg.isVisible = false;
        btn.progressBar.isVisible = false;
      } else if (qStatus !== QueueStatus.Idle) {
        // 队列被占用（建造其他建筑）：全部变灰不可点
        this.setButtonState(btn, 'disabled');
        btn.progressBg.isVisible = false;
        btn.progressBar.isVisible = false;
      } else if (!canBuild) {
        // 科技未解锁
        this.setButtonState(btn, 'locked');
        btn.progressBg.isVisible = false;
        btn.progressBar.isVisible = false;
      } else if (!canAfford) {
        // 资金不足
        this.setButtonState(btn, 'noFunds');
        btn.progressBg.isVisible = false;
        btn.progressBar.isVisible = false;
      } else {
        // 可建造
        this.setButtonState(btn, 'available');
        btn.progressBg.isVisible = false;
        btn.progressBar.isVisible = false;
      }
    }
  }

  // ──  创建按钮  ──

  private createButton(def: BuildingDefinition, index: number): void {
    const btnY = 82 + index * 56;

    const bg = new GUI.Rectangle(`btn_${def.id}`);
    bg.width = '170px';
    bg.height = '48px';
    bg.top = `${btnY}px`;
    bg.background = '#2a2a2a';
    bg.thickness = 2;
    bg.color = '#555';
    bg.cornerRadius = 4;
    bg.isPointerBlocker = true;
    bg.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.panel.addControl(bg);

    // 建筑名称
    const nameText = new GUI.TextBlock(`name_${def.id}`, def.name);
    nameText.color = '#fff';
    nameText.fontSize = 12;
    nameText.height = '20px';
    nameText.top = '-10px';
    nameText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    bg.addControl(nameText);

    // 价格
    const priceText = new GUI.TextBlock(`price_${def.id}`, `$${def.cost}`);
    priceText.color = '#0f0';
    priceText.fontSize = 11;
    priceText.height = '16px';
    priceText.top = '10px';
    priceText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    bg.addControl(priceText);

    // 进度条背景
    const progressBg = new GUI.Rectangle(`progBg_${def.id}`);
    progressBg.width = '160px';
    progressBg.height = '4px';
    progressBg.top = '20px';
    progressBg.background = '#333';
    progressBg.thickness = 0;
    progressBg.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    progressBg.isVisible = false;
    bg.addControl(progressBg);

    // 进度条填充
    const progressBar = new GUI.Rectangle(`prog_${def.id}`);
    progressBar.width = '0%';
    progressBar.height = '4px';
    progressBar.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    progressBar.background = '#0f0';
    progressBar.thickness = 0;
    progressBar.isVisible = false;
    progressBg.addControl(progressBar);

    // 点击事件
    bg.onPointerClickObservable.add(() => {
      const qStatus = this.queue.status;
      const qDef = this.queue.currentDefinition;

      if (qStatus === QueueStatus.Ready && qDef?.id === def.id) {
        // 就绪 → 进入放置模式
        this.onPlaceRequest();
      } else if (qStatus === QueueStatus.Idle) {
        // 空闲 → 开始建造
        this.onBuildRequest(def);
      }
    });

    this.buttons.push({ bg, nameText, priceText, progressBar, progressBg, definition: def });
  }

  // ──  状态样式  ──

  private setButtonState(
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

  private updateStatusText(): void {
    const status = this.queue.status;
    const def = this.queue.currentDefinition;
    if (status === QueueStatus.Building && def) {
      const pct = Math.floor(this.queue.progress * 100);
      this.statusText.text = `Building: ${def.name} (${pct}%)`;
      this.statusText.color = '#0f0';
    } else if (status === QueueStatus.Ready && def) {
      this.statusText.text = `Ready: ${def.name} — Click to place`;
      this.statusText.color = '#FFD700';
    } else {
      this.statusText.text = 'Select a building to construct';
      this.statusText.color = '#888';
    }
  }

  dispose(): void {
    this.gui.dispose();
  }
}
