/**
 * 音频分类管理器 — Task 34 / Task 142
 *
 * 使用 Web Audio API OscillatorNode 生成 Dummy 蜂鸣音效，
 * 为后续真实音频资源预留 SoundCategory 通道架构。
 *
 * OpenRA 对标: OpenRA.Game/Sound/Sound.cs
 */

export enum SoundCategory {
  UnitVoice = 'UnitVoice',
  Notification = 'Notification',
  Weapon = 'Weapon',
  Music = 'Music',
  Ambient = 'Ambient',
}

/** 音频事件描述 */
export interface AudioEvent {
  readonly category: SoundCategory;
  readonly frequency: number; // Hz
  readonly duration: number; // ms
  readonly type: OscillatorType;
  readonly volume: number; // 0–1
}

/** 预设音频事件 */
export const AUDIO_EVENTS: Record<string, AudioEvent> = {
  select: { category: SoundCategory.UnitVoice, frequency: 880, duration: 80, type: 'sine', volume: 0.3 },
  move: { category: SoundCategory.UnitVoice, frequency: 660, duration: 120, type: 'sine', volume: 0.25 },
  attack: { category: SoundCategory.UnitVoice, frequency: 440, duration: 150, type: 'square', volume: 0.35 },
  fire: { category: SoundCategory.Weapon, frequency: 220, duration: 200, type: 'sawtooth', volume: 0.4 },
  buildStart: { category: SoundCategory.Notification, frequency: 550, duration: 100, type: 'sine', volume: 0.3 },
  buildComplete: { category: SoundCategory.Notification, frequency: 1100, duration: 200, type: 'sine', volume: 0.4 },
  error: { category: SoundCategory.Notification, frequency: 150, duration: 300, type: 'square', volume: 0.35 },
};

/**
 * 全局音频管理器 — 单例。
 *
 * 所有游戏系统通过 `AudioManager.getInstance().play('select')` 触发音效，
 * 无需关心底层 Web Audio API 细节。
 */
export class AudioManager {
  private static instance: AudioManager | null = null;
  private ctx: AudioContext | null = null;
  private enabled = true;
  private readonly categoryVolumes: Record<SoundCategory, number> = {
    [SoundCategory.UnitVoice]: 0.8,
    [SoundCategory.Notification]: 0.9,
    [SoundCategory.Weapon]: 0.7,
    [SoundCategory.Music]: 0.5,
    [SoundCategory.Ambient]: 0.4,
  };

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /** 初始化 AudioContext（必须在用户交互后调用） */
  init(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // 忽略自动播放策略导致的失败
      });
    }
  }

  /** 播放预设事件 */
  play(eventName: keyof typeof AUDIO_EVENTS): void {
    if (!this.enabled) return;
    const event = AUDIO_EVENTS[eventName];
    if (!event) {
      console.warn(`[AudioManager] Unknown event: ${eventName}`);
      return;
    }
    this.playRaw(event);
  }

  /** 播放原始音频事件 */
  playRaw(event: AudioEvent): void {
    if (!this.enabled) return;
    const ctx = this.ctx ?? new AudioContext();
    if (!this.ctx) this.ctx = ctx;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = event.type;
      osc.frequency.setValueAtTime(event.frequency, ctx.currentTime);

      const vol = event.volume * this.categoryVolumes[event.category];
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + event.duration / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + event.duration / 1000);

      // 自动清理
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      // Web Audio 不可用时的静默降级
    }
  }

  /** 设置某分类音量 */
  setCategoryVolume(category: SoundCategory, volume: number): void {
    this.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
  }

  /** 全局静音开关 */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** 是否已启用 */
  isEnabled(): boolean {
    return this.enabled;
  }

  dispose(): void {
    this.ctx?.close();
    this.ctx = null;
    AudioManager.instance = null;
  }
}
