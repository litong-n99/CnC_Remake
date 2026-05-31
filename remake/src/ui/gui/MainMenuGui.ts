/**
 * 主菜单 — Babylon.GUI 实现。
 */

import * as GUI from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';
import { GuiScreen } from './GuiScreen';
import { createTitle, createSubtitle, createButton, createSmallText } from './GuiFactory';
import type { GuiRouter } from './GuiRouter';

export class MainMenuGui extends GuiScreen {
  private readonly router: GuiRouter;
  private onStartGame?: () => void;

  constructor(scene: Scene, router: GuiRouter) {
    super(scene, 'mainMenu');
    this.router = router;
  }

  setOnStartGame(cb: () => void): void {
    this.onStartGame = cb;
  }

  protected build(): void {
    // 标题
    const title = createTitle('mainMenu_title', 'COMMAND & CONQUER');
    this.content.addControl(title);

    const subtitle = createSubtitle('mainMenu_subtitle', 'REMAKE');
    this.content.addControl(subtitle);

    // 按钮组
    const buttonPanel = new GUI.StackPanel('mainMenu_buttons');
    buttonPanel.isVertical = true;
    buttonPanel.width = '100%';
    buttonPanel.height = 'auto';
    buttonPanel.spacing = 10;
    this.content.addControl(buttonPanel);

    const btnStart = createButton('mainMenu_start', '开始游戏', { primary: true });
    btnStart.onPointerDownObservable.add(() => this.onStartGame?.());
    buttonPanel.addControl(btnStart);

    const btnCampaign = createButton('mainMenu_campaign', '战役模式');
    btnCampaign.onPointerDownObservable.add(() => this.router.navigate('campaign'));
    buttonPanel.addControl(btnCampaign);

    const btnSkirmish = createButton('mainMenu_skirmish', '遭遇战');
    btnSkirmish.onPointerDownObservable.add(() => this.router.navigate('skirmish'));
    buttonPanel.addControl(btnSkirmish);

    const btnMultiplayer = createButton('mainMenu_multiplayer', '多人游戏');
    btnMultiplayer.onPointerDownObservable.add(() => this.router.navigate('lobby'));
    buttonPanel.addControl(btnMultiplayer);

    const btnSettings = createButton('mainMenu_settings', '设置');
    btnSettings.onPointerDownObservable.add(() => this.router.navigate('settings'));
    buttonPanel.addControl(btnSettings);

    const btnExit = createButton('mainMenu_exit', '退出');
    btnExit.onPointerDownObservable.add(() => window.location.reload());
    buttonPanel.addControl(btnExit);

    // 底部信息
    const footer = new GUI.Rectangle('mainMenu_footer');
    footer.width = '100%';
    footer.height = '30px';
    footer.thickness = 0;
    footer.background = 'transparent';

    const versionText = createSmallText('mainMenu_version', 'v0.1.0-dev');
    versionText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    footer.addControl(versionText);

    const hintText = createSmallText('mainMenu_hint', '按 ESC 暂停');
    hintText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    footer.addControl(hintText);

    this.content.addControl(footer);
  }
}
