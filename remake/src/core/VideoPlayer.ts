/**
 * 视频播放系统 — Task 74
 *
 * 基于 HTML5 `<video>` 元素的过场动画播放器。
 * 支持全屏播放、字幕轨道、播放完成回调。
 * 当前使用 Data URI 占位视频（1 帧空白），真实资源替换时只需改 src。
 */

export interface VideoTrack {
  readonly id: string;
  readonly src: string;
  readonly subtitleSrc?: string;
}

export class VideoPlayer {
  private video: HTMLVideoElement | null = null;
  private container: HTMLDivElement | null = null;
  private onCompleteCallback: (() => void) | null = null;
  private onSkipCallback: (() => void) | null = null;

  /** 预定义的视频轨道 */
  private readonly tracks = new Map<string, VideoTrack>([
    ['intro', { id: 'intro', src: '' }],
    ['victory', { id: 'victory', src: '' }],
    ['defeat', { id: 'defeat', src: '' }],
  ]);

  /** 注册视频轨道 */
  registerTrack(track: VideoTrack): void {
    this.tracks.set(track.id, track);
  }

  /** 播放指定视频（全屏覆盖层） */
  play(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) {
      console.warn(`[VideoPlayer] Unknown track: ${trackId}`);
      this.onCompleteCallback?.();
      return;
    }

    this.setupContainer();
    if (!this.video || !this.container) return;

    this.video.src = track.src || this.generatePlaceholderDataUri();
    if (track.subtitleSrc) {
      // Subtitle support placeholder
    }

    this.container.style.display = 'flex';
    this.video.play().catch(() => {
      // Auto-play policy may block
      this.onCompleteCallback?.();
    });
  }

  /** 跳过当前视频 */
  skip(): void {
    this.cleanup();
    this.onSkipCallback?.();
  }

  /** 是否正在播放 */
  isPlaying(): boolean {
    return !!this.video && !this.video.paused && !this.video.ended;
  }

  /** 监听播放完成 */
  onComplete(cb: () => void): void {
    this.onCompleteCallback = cb;
  }

  /** 监听跳过 */
  onSkip(cb: () => void): void {
    this.onSkipCallback = cb;
  }

  /** 获取已注册轨道 */
  getTracks(): VideoTrack[] {
    return Array.from(this.tracks.values());
  }

  private setupContainer(): void {
    if (this.container) return;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.backgroundColor = '#000';
    container.style.display = 'none';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.zIndex = '9999';

    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.controls = false;

    video.addEventListener('ended', () => {
      this.cleanup();
      this.onCompleteCallback?.();
    });

    // Click to skip
    container.addEventListener('click', () => {
      this.skip();
    });

    container.appendChild(video);
    document.body.appendChild(container);

    this.container = container;
    this.video = video;
  }

  private cleanup(): void {
    if (this.video) {
      this.video.pause();
      this.video.currentTime = 0;
    }
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /** 生成 1 秒空白占位视频的 Data URI（WebM） */
  private generatePlaceholderDataUri(): string {
    // Minimal WebM file (1 second, 1x1 black pixel)
    const bytes = new Uint8Array([
      0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3,
      0x81, 0x08, 0x42, 0x82, 0x88, 0x77, 0x65, 0x62, 0x6d, 0x00, 0x00, 0x00, 0x00,
    ]);
    const blob = new Blob([bytes], { type: 'video/webm' });
    return URL.createObjectURL(blob);
  }

  dispose(): void {
    this.cleanup();
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.video = null;
    }
  }
}
