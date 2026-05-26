/**
 * DesktopAdapter — 检测并适配桌面应用环境（Electron / Tauri）。
 *
 * 提供平台检测、全屏控制、本地文件读取（预留）等桌面专属能力。
 */
export class DesktopAdapter {
  private static instance: DesktopAdapter | null = null;

  static getInstance(): DesktopAdapter {
    if (!this.instance) this.instance = new DesktopAdapter();
    return this.instance;
  }

  /** 检测是否运行在 Electron 环境中。 */
  isElectron(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof window !== 'undefined' && !!(window as any).process?.versions?.electron;
  }

  /** 检测是否运行在 Tauri 环境中。 */
  isTauri(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof window !== 'undefined' && !!(window as any).__TAURI__;
  }

  /** 检测是否运行在任意桌面包装器中。 */
  isDesktop(): boolean {
    return this.isElectron() || this.isTauri();
  }

  /** 请求全屏（优先使用包装器 API，回退到浏览器 Fullscreen API）。 */
  async requestFullscreen(): Promise<void> {
    if (this.isElectron()) {
      // 预留：通过 IPC 调用主进程全屏
      console.info('[DesktopAdapter] Electron fullscreen requested (stub)');
      return;
    }
    if (this.isTauri()) {
      console.info('[DesktopAdapter] Tauri fullscreen requested (stub)');
      return;
    }
    const el = document.documentElement;
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    }
  }

  /** 退出全屏。 */
  async exitFullscreen(): Promise<void> {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }

  /** 当前是否处于全屏状态。 */
  isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  /** 获取平台标识字符串。 */
  getPlatform(): 'electron' | 'tauri' | 'browser' {
    if (this.isElectron()) return 'electron';
    if (this.isTauri()) return 'tauri';
    return 'browser';
  }

  /** 读取本地文件路径（预留，桌面端通过 IPC / Tauri API 实现）。 */
  async readLocalFile(_path: string): Promise<Uint8Array | null> {
    console.warn('[DesktopAdapter] readLocalFile not implemented for', this.getPlatform());
    return null;
  }
}
