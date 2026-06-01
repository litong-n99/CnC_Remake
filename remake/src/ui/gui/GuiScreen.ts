/**
 * Babylon.GUI 页面基类。
 *
 * 每个 Shell 页面（菜单、设置、暂停等）继承此类，
 * 使用 Babylon.GUI 控件替代 HTML DOM。
 */

import * as GUI from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';
import { GuiColors } from './GuiTheme';

/** GUI 页面抽象基类。 */
export abstract class GuiScreen {
  protected readonly scene: Scene;
  protected readonly gui: GUI.AdvancedDynamicTexture;
  /** 页面根容器，控制显隐。 */
  protected readonly root: GUI.Rectangle;
  /** 内容面板，子类在此添加控件。 */
  protected readonly content: GUI.StackPanel;
  /** 是否已初始化。 */
  private initialized = false;

  constructor(scene: Scene, name: string) {
    this.scene = scene;
    // 每个 GuiScreen 拥有独立的 AdvancedDynamicTexture
    this.gui = GUI.AdvancedDynamicTexture.CreateFullscreenUI(`${name}_ui`, true, scene);

    this.root = new GUI.Rectangle(`${name}_root`);
    this.root.width = '100%';
    this.root.height = '100%';
    this.root.background = GuiColors.bgDark;
    this.root.thickness = 0;
    this.root.isVisible = false;
    this.root.isHitTestVisible = false;
    this.root.zIndex = 100;

    // 内容区（垂直居中）
    this.content = new GUI.StackPanel(`${name}_content`);
    this.content.isVertical = true;
    this.content.width = '520px';
    this.content.height = '100%';
    this.content.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    this.content.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.content.paddingTop = '24px';
    this.content.paddingBottom = '24px';
    this.content.spacing = 16;
    this.content.zIndex = 10;
    this.root.addControl(this.content);

    this.gui.addControl(this.root);
  }

  /** 显示页面。 */
  show(): void {
    if (!this.initialized) {
      this.build();
      this.initialized = true;
    }
    this.root.isVisible = true;
    this.root.isHitTestVisible = true;
    this.onShow();
  }

  /** 隐藏页面。 */
  hide(): void {
    this.root.isVisible = false;
    this.root.isHitTestVisible = false;
    this.onHide();
  }

  /** 销毁页面，释放 GUI 资源。 */
  dispose(): void {
    this.root.dispose();
    this.gui.dispose();
  }

  /** 是否可见。 */
  isVisible(): boolean {
    return this.root.isVisible;
  }

  /** 获取页面根容器（供 Router 使用）。 */
  getRoot(): GUI.Rectangle {
    return this.root;
  }

  /** 子类实现：构建页面内容。 */
  protected abstract build(): void;

  /** 子类可选：页面显示时调用。 */
  protected onShow(): void {
    // override in subclass
  }

  /** 子类可选：页面隐藏时调用。 */
  protected onHide(): void {
    // override in subclass
  }
}
