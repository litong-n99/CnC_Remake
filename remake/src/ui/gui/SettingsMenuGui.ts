/**
 * 设置页面 — Babylon.GUI 实现。
 */

import * as GUI from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';
import { GuiScreen } from './GuiScreen';
import { createHeading, createButton, createGroupPanel, createSlider, createCheckbox, createLabel } from './GuiFactory';
import type { GuiRouter } from './GuiRouter';
import { SoundCategory } from '../../core/AudioManager';

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  showFps: boolean;
  edgeScroll: boolean;
}

const SETTINGS_KEY = 'cnc-remake-settings';

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  showFps: false,
  edgeScroll: true,
};

export class SettingsMenuGui extends GuiScreen {
  private readonly router: GuiRouter;
  private settings: GameSettings;
  private fpsCheckbox!: ReturnType<typeof createCheckbox>;
  private edgeScrollCheckbox!: ReturnType<typeof createCheckbox>;

  constructor(scene: Scene, router: GuiRouter) {
    super(scene, 'settingsMenu');
    this.router = router;
    this.settings = this.loadSettings();
  }

  getSettings(): Readonly<GameSettings> {
    return { ...this.settings };
  }

  /** 应用设置到音频管理器。 */
  applyToAudio(audioManager: { setCategoryVolume: (cat: SoundCategory, vol: number) => void }): void {
    const master = this.settings.masterVolume;
    audioManager.setCategoryVolume(SoundCategory.Music, this.settings.musicVolume * master);
    audioManager.setCategoryVolume(SoundCategory.UnitVoice, this.settings.sfxVolume * master);
    audioManager.setCategoryVolume(SoundCategory.Notification, this.settings.sfxVolume * master);
    audioManager.setCategoryVolume(SoundCategory.Weapon, this.settings.sfxVolume * master);
    audioManager.setCategoryVolume(SoundCategory.Ambient, this.settings.sfxVolume * master);
  }

  protected build(): void {
    const title = createHeading('settings_title', 'SETTINGS');
    this.content.addControl(title);

    // ── 音量组 ──
    const volumePanel = createGroupPanel('settings_volume');
    this.content.addControl(volumePanel);

    // 主音量
    const masterRow = new GUI.Rectangle('settings_masterRow');
    masterRow.width = '100%';
    masterRow.height = '40px';
    masterRow.thickness = 0;
    masterRow.background = 'transparent';
    const masterLabel = createLabel('settings_masterLabel', '主音量');
    masterRow.addControl(masterLabel);
    const masterSlider = createSlider('settings_masterSlider', {
      min: 0,
      max: 1,
      step: 0.05,
      value: this.settings.masterVolume,
    });
    masterSlider.setValue(this.settings.masterVolume);
    masterSlider.onValueChanged((v) => {
      this.settings.masterVolume = v;
    });
    masterRow.addControl(masterSlider.container);
    volumePanel.addControl(masterRow);

    // 音乐
    const musicRow = new GUI.Rectangle('settings_musicRow');
    musicRow.width = '100%';
    musicRow.height = '40px';
    musicRow.thickness = 0;
    musicRow.background = 'transparent';
    const musicLabel = createLabel('settings_musicLabel', '音乐');
    musicRow.addControl(musicLabel);
    const musicSlider = createSlider('settings_musicSlider', {
      min: 0,
      max: 1,
      step: 0.05,
      value: this.settings.musicVolume,
    });
    musicSlider.setValue(this.settings.musicVolume);
    musicSlider.onValueChanged((v) => {
      this.settings.musicVolume = v;
    });
    musicRow.addControl(musicSlider.container);
    volumePanel.addControl(musicRow);

    // 音效
    const sfxRow = new GUI.Rectangle('settings_sfxRow');
    sfxRow.width = '100%';
    sfxRow.height = '40px';
    sfxRow.thickness = 0;
    sfxRow.background = 'transparent';
    const sfxLabel = createLabel('settings_sfxLabel', '音效');
    sfxRow.addControl(sfxLabel);
    const sfxSlider = createSlider('settings_sfxSlider', {
      min: 0,
      max: 1,
      step: 0.05,
      value: this.settings.sfxVolume,
    });
    sfxSlider.setValue(this.settings.sfxVolume);
    sfxSlider.onValueChanged((v) => {
      this.settings.sfxVolume = v;
    });
    sfxRow.addControl(sfxSlider.container);
    volumePanel.addControl(sfxRow);

    // ── 选项组 ──
    const optionPanel = createGroupPanel('settings_options');
    this.content.addControl(optionPanel);

    const fpsRow = new GUI.Rectangle('settings_fpsRow');
    fpsRow.width = '100%';
    fpsRow.height = '40px';
    fpsRow.thickness = 0;
    fpsRow.background = 'transparent';
    const fpsLabel = createLabel('settings_fpsLabel', '显示 FPS');
    fpsRow.addControl(fpsLabel);
    this.fpsCheckbox = createCheckbox('settings_fpsCb', '', this.settings.showFps);
    this.fpsCheckbox.onChanged((v) => {
      this.settings.showFps = v;
    });
    fpsRow.addControl(this.fpsCheckbox.container);
    optionPanel.addControl(fpsRow);

    const edgeRow = new GUI.Rectangle('settings_edgeRow');
    edgeRow.width = '100%';
    edgeRow.height = '40px';
    edgeRow.thickness = 0;
    edgeRow.background = 'transparent';
    const edgeLabel = createLabel('settings_edgeLabel', '边缘滚动');
    edgeRow.addControl(edgeLabel);
    this.edgeScrollCheckbox = createCheckbox('settings_edgeCb', '', this.settings.edgeScroll);
    this.edgeScrollCheckbox.onChanged((v) => {
      this.settings.edgeScroll = v;
    });
    edgeRow.addControl(this.edgeScrollCheckbox.container);
    optionPanel.addControl(edgeRow);

    // ── 按钮 ──
    const btnPanel = new GUI.StackPanel('settings_actions');
    btnPanel.isVertical = true;
    btnPanel.width = '100%';
    btnPanel.height = 'auto';
    btnPanel.spacing = 10;
    this.content.addControl(btnPanel);

    const btnSave = createButton('settings_save', '保存并返回', { primary: true });
    btnSave.onPointerDownObservable.add(() => {
      this.saveSettings();
      this.router.navigate('menu');
    });
    btnPanel.addControl(btnSave);

    const btnCancel = createButton('settings_cancel', '取消');
    btnCancel.onPointerDownObservable.add(() => {
      this.settings = this.loadSettings();
      this.rebuild();
      this.router.navigate('menu');
    });
    btnPanel.addControl(btnCancel);
  }

  private rebuild(): void {
    // 清除 content 中除背景外的所有子控件
    while (this.content.children.length > 0) {
      this.content.children[0].dispose();
    }
    this.build();
  }

  private loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GameSettings>;
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }
}
