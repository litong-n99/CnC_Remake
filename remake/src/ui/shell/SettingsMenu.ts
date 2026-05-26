/**
 * 设置页面 — Task 41
 *
 * 音量控制、画质选项、键位提示。
 * 设置自动持久化到 localStorage。
 */

import type { ShellRouter } from './ShellRouter';
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

export class SettingsMenu {
  private readonly container: HTMLElement;
  private readonly router: ShellRouter;
  private settings: GameSettings;

  constructor(parent: HTMLElement, router: ShellRouter) {
    this.router = router;
    this.settings = this.loadSettings();
    this.container = document.createElement('div');
    this.container.id = 'settings-menu';
    this.container.className = 'cnc-shell cnc-page';
    this.render();
    parent.appendChild(this.container);
    this.bindEvents();
  }

  getElement(): HTMLElement {
    return this.container;
  }

  getSettings(): Readonly<GameSettings> {
    return { ...this.settings };
  }

  /** 应用设置到音频管理器 */
  applyToAudio(audioManager: { setCategoryVolume: (cat: SoundCategory, vol: number) => void }): void {
    const master = this.settings.masterVolume;
    audioManager.setCategoryVolume(SoundCategory.Music, this.settings.musicVolume * master);
    audioManager.setCategoryVolume(SoundCategory.UnitVoice, this.settings.sfxVolume * master);
    audioManager.setCategoryVolume(SoundCategory.Notification, this.settings.sfxVolume * master);
    audioManager.setCategoryVolume(SoundCategory.Weapon, this.settings.sfxVolume * master);
    audioManager.setCategoryVolume(SoundCategory.Ambient, this.settings.sfxVolume * master);
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="cnc-settings-bg"></div>
      <div class="cnc-settings-content">
        <h2 class="cnc-settings-title">SETTINGS</h2>
        <div class="cnc-settings-group">
          <label class="cnc-setting-row">
            <span>主音量</span>
            <input type="range" data-key="masterVolume" min="0" max="1" step="0.05" value="${this.settings.masterVolume}">
          </label>
          <label class="cnc-setting-row">
            <span>音乐</span>
            <input type="range" data-key="musicVolume" min="0" max="1" step="0.05" value="${this.settings.musicVolume}">
          </label>
          <label class="cnc-setting-row">
            <span>音效</span>
            <input type="range" data-key="sfxVolume" min="0" max="1" step="0.05" value="${this.settings.sfxVolume}">
          </label>
        </div>
        <div class="cnc-settings-group">
          <label class="cnc-setting-row cnc-setting-toggle">
            <span>显示 FPS</span>
            <input type="checkbox" data-key="showFps" ${this.settings.showFps ? 'checked' : ''}>
          </label>
          <label class="cnc-setting-row cnc-setting-toggle">
            <span>边缘滚动</span>
            <input type="checkbox" data-key="edgeScroll" ${this.settings.edgeScroll ? 'checked' : ''}>
          </label>
        </div>
        <div class="cnc-settings-actions">
          <button class="cnc-btn cnc-btn-primary" data-action="save">保存并返回</button>
          <button class="cnc-btn" data-action="cancel">取消</button>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.closest('[data-action]')?.getAttribute('data-action');
      if (action === 'save') {
        this.saveSettings();
        this.router.navigate('menu');
      } else if (action === 'cancel') {
        this.settings = this.loadSettings();
        this.render();
        this.bindEvents();
        this.router.navigate('menu');
      }
    });

    this.container.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const key = target.getAttribute('data-key');
      if (!key) return;
      if (target.type === 'checkbox') {
        (this.settings as unknown as Record<string, boolean>)[key] = target.checked;
      } else {
        (this.settings as unknown as Record<string, number>)[key] = parseFloat(target.value);
      }
    });
  }

  private loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GameSettings>;
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // ignore parse error
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }

  dispose(): void {
    this.container.remove();
  }
}
