/**
 * 背景音乐系统 — Task 73
 *
 * 基于 Web Audio API 的 BGM 播放器，支持播放列表、循环、淡入淡出。
 * 当前使用程序化生成的 AudioBuffer 作为 Dummy 资源占位。
 */

export interface MusicTrack {
  readonly id: string;
  readonly displayName: string;
  /** 循环播放（默认 true） */
  readonly loop: boolean;
}

const DUMMY_TRACKS: MusicTrack[] = [
  { id: 'menu', displayName: 'Main Menu', loop: true },
  { id: 'battle', displayName: 'Battle Theme', loop: true },
  { id: 'victory', displayName: 'Victory Stinger', loop: false },
];

export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private currentTrack: MusicTrack | null = null;
  private volume = 0.5;
  private isPlaying = false;
  private readonly trackMap = new Map<string, MusicTrack>();

  constructor() {
    for (const t of DUMMY_TRACKS) {
      this.trackMap.set(t.id, t);
    }
  }

  /** 初始化 AudioContext */
  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        /* ignore */
      });
    }
    return this.ctx;
  }

  /** 生成 Dummy 音频缓冲（简单的持续低音） */
  private createDummyBuffer(durationSec: number): AudioBuffer {
    const ctx = this.getContext();
    const sampleRate = ctx.sampleRate;
    const frames = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(2, frames, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < frames; i++) {
        // Simple low-frequency drone
        data[i] = Math.sin((i / sampleRate) * 110 * Math.PI * 2) * 0.05;
      }
    }
    return buffer;
  }

  /** 播放指定曲目 */
  play(trackId: string): void {
    const track = this.trackMap.get(trackId);
    if (!track) {
      console.warn(`[MusicPlayer] Unknown track: ${trackId}`);
      return;
    }
    this.stop();
    this.currentTrack = track;
    this.isPlaying = true;

    const ctx = this.getContext();
    const buffer = this.createDummyBuffer(track.loop ? 2 : 5);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = track.loop;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.volume, ctx.currentTime + 1);

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    this.currentSource = source;
    this.gainNode = gain;

    source.onended = () => {
      if (!track.loop) {
        this.isPlaying = false;
        this.currentTrack = null;
      }
    };
  }

  /** 停止播放（带淡出） */
  stop(): void {
    if (!this.gainNode || !this.ctx) return;
    const ctx = this.ctx;
    this.gainNode.gain.cancelScheduledValues(ctx.currentTime);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

    setTimeout(() => {
      this.currentSource?.stop();
      this.currentSource?.disconnect();
      this.gainNode?.disconnect();
      this.currentSource = null;
      this.gainNode = null;
      this.isPlaying = false;
    }, 500);
  }

  /** 暂停（简化实现：直接停止，后续可从同一位置恢复） */
  pause(): void {
    this.stop();
  }

  /** 设置音量 0–1 */
  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
  }

  /** 获取音量 */
  getVolume(): number {
    return this.volume;
  }

  /** 是否正在播放 */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /** 当前曲目 */
  getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  /** 获取所有曲目 */
  getTracks(): MusicTrack[] {
    return Array.from(this.trackMap.values());
  }

  dispose(): void {
    this.stop();
    this.ctx?.close();
    this.ctx = null;
  }
}
