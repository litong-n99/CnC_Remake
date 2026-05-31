/**
 * 遭遇战设置 — Babylon.GUI 实现。
 */

import * as GUI from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';
import { GuiScreen } from './GuiScreen';
import { createHeading, createButton, createSelect, createLabel, createRow } from './GuiFactory';
import type { GuiRouter } from './GuiRouter';

export interface SkirmishConfig {
  map: string;
  startingCash: number;
  gameSpeed: string;
  aiDifficulty: string;
}

const MAPS = [
  { value: 'temperat-64', label: 'Temperate 64×64' },
  { value: 'desert-64', label: 'Desert 64×64' },
  { value: 'winter-96', label: 'Winter 96×96' },
];

const STARTING_CASH = [
  { value: '5000', label: '$5000' },
  { value: '10000', label: '$10000' },
  { value: '20000', label: '$20000' },
];

const GAME_SPEEDS = [
  { value: 'slow', label: '慢速' },
  { value: 'normal', label: '正常' },
  { value: 'fast', label: '快速' },
];

const AI_DIFFICULTIES = [
  { value: 'easy', label: '简单' },
  { value: 'normal', label: '普通' },
  { value: 'hard', label: '困难' },
];

export class SkirmishSetupGui extends GuiScreen {
  private readonly router: GuiRouter;
  private config: SkirmishConfig;

  constructor(scene: Scene, router: GuiRouter) {
    super(scene, 'skirmishSetup');
    this.router = router;
    this.config = { map: MAPS[0].value, startingCash: 10000, gameSpeed: 'normal', aiDifficulty: 'normal' };
  }

  getConfig(): Readonly<SkirmishConfig> {
    return { ...this.config };
  }

  protected build(): void {
    const title = createHeading('skirmish_title', 'SKIRMISH');
    this.content.addControl(title);

    // 表单面板
    const formPanel = new GUI.StackPanel('skirmish_form');
    formPanel.isVertical = true;
    formPanel.width = '100%';
    formPanel.height = 'auto';
    formPanel.spacing = 10;
    this.content.addControl(formPanel);

    // 地图
    const mapRow = this.createFormRow('地图', MAPS, this.config.map, (v) => {
      this.config.map = v;
    });
    formPanel.addControl(mapRow);

    // 起始资金
    const cashRow = this.createFormRow('起始资金', STARTING_CASH, String(this.config.startingCash), (v) => {
      this.config.startingCash = parseInt(v, 10);
    });
    formPanel.addControl(cashRow);

    // 游戏速度
    const speedRow = this.createFormRow('游戏速度', GAME_SPEEDS, this.config.gameSpeed, (v) => {
      this.config.gameSpeed = v;
    });
    formPanel.addControl(speedRow);

    // AI 难度
    const aiRow = this.createFormRow('AI 难度', AI_DIFFICULTIES, this.config.aiDifficulty, (v) => {
      this.config.aiDifficulty = v;
    });
    formPanel.addControl(aiRow);

    // 按钮
    const btnPanel = new GUI.StackPanel('skirmish_actions');
    btnPanel.isVertical = true;
    btnPanel.width = '100%';
    btnPanel.height = 'auto';
    btnPanel.spacing = 10;
    this.content.addControl(btnPanel);

    const btnStart = createButton('skirmish_start', '开始游戏', { primary: true });
    btnStart.onPointerDownObservable.add(() => {
      this.router.navigate('loading');
      setTimeout(() => {
        this.router.navigate('game');
      }, 1500);
    });
    btnPanel.addControl(btnStart);

    const btnBack = createButton('skirmish_back', '返回主菜单');
    btnBack.onPointerDownObservable.add(() => this.router.navigate('menu'));
    btnPanel.addControl(btnBack);
  }

  private createFormRow(
    label: string,
    options: Array<{ value: string; label: string }>,
    selectedValue: string,
    onChange: (v: string) => void
  ): GUI.Rectangle {
    const row = createRow(`skirmish_row_${label}`);
    row.height = '44px';

    const labelText = createLabel(`skirmish_label_${label}`, label);
    row.addControl(labelText);

    const select = createSelect(`skirmish_select_${label}`, options, selectedValue);
    select.onChanged(onChange);
    // 调整选择框位置到右侧
    select.container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    select.container.width = '60%';
    row.addControl(select.container);

    return row;
  }
}
