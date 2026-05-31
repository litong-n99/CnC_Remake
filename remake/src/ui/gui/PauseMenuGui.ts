/**
 * 暂停菜单 — Babylon.GUI 实现。
 */

import * as GUI from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';
import { GuiScreen } from './GuiScreen';
import { createHeading, createButton, createOverlay } from './GuiFactory';
import type { GuiRouter } from './GuiRouter';

export class PauseMenuGui extends GuiScreen {
  private readonly router: GuiRouter;
  private onResume?: () => void;

  constructor(scene: Scene, router: GuiRouter) {
    super(scene, 'pauseMenu');
    this.router = router;
  }

  setOnResume(cb: () => void): void {
    this.onResume = cb;
  }

  protected build(): void {
    // 半透明覆盖层
    const overlay = createOverlay('pause_overlay');
    overlay.zIndex = 5;
    this.root.addControl(overlay);

    const title = createHeading('pause_title', 'PAUSED');
    this.content.addControl(title);

    const buttonPanel = new GUI.StackPanel('pause_buttons');
    buttonPanel.isVertical = true;
    buttonPanel.width = '100%';
    buttonPanel.height = 'auto';
    buttonPanel.spacing = 10;
    this.content.addControl(buttonPanel);

    const btnResume = createButton('pause_resume', '继续游戏', { primary: true });
    btnResume.onPointerDownObservable.add(() => this.onResume?.());
    buttonPanel.addControl(btnResume);

    const btnSettings = createButton('pause_settings', '设置');
    btnSettings.onPointerDownObservable.add(() => this.router.navigate('settings'));
    buttonPanel.addControl(btnSettings);

    const btnMenu = createButton('pause_menu', '返回主菜单');
    btnMenu.onPointerDownObservable.add(() => this.router.navigate('menu'));
    buttonPanel.addControl(btnMenu);
  }
}
