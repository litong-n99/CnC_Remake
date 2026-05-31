/**
 * Babylon.GUI 页面路由管理器。
 *
 * 替代 ShellRouter，管理 GUI 页面的显示/隐藏。
 * 所有页面共享同一个 AdvancedDynamicTexture，通过 isVisible 切换。
 */

import type { GuiScreen } from './GuiScreen';

export type GuiPage = 'menu' | 'loading' | 'game' | 'settings' | 'pause' | 'campaign' | 'skirmish' | 'lobby';

export class GuiRouter {
  /** 初始为 'game'，确保第一次 navigate('menu') 能正确触发 show()。 */
  private current: GuiPage = 'game';
  private readonly screens = new Map<GuiPage, GuiScreen>();
  private readonly listeners = new Set<(page: GuiPage, prev: GuiPage) => void>();
  private gameVisible = false;

  /** 注册页面。 */
  registerPage(page: GuiPage, screen: GuiScreen): void {
    this.screens.set(page, screen);
  }

  /** 当前页面。 */
  getCurrentPage(): GuiPage {
    return this.current;
  }

  /** 切换到指定页面。 */
  navigate(to: GuiPage): void {
    const prev = this.current;
    if (to === prev) return;

    // 隐藏旧页面
    const prevScreen = this.screens.get(prev);
    if (prevScreen) {
      prevScreen.hide();
    }

    // 游戏画布特殊处理
    this.gameVisible = to === 'game';

    // 显示新页面
    const nextScreen = this.screens.get(to);
    if (nextScreen) {
      nextScreen.show();
    }

    this.current = to;

    for (const cb of this.listeners) {
      cb(to, prev);
    }
  }

  /** 监听页面变化。 */
  onNavigate(cb: (page: GuiPage, prev: GuiPage) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** 开始游戏流程：menu → loading → game */
  async startGame(onLoadComplete: () => void, loadDurationMs = 1500): Promise<void> {
    this.navigate('loading');
    await new Promise((resolve) => setTimeout(resolve, loadDurationMs));
    this.navigate('game');
    onLoadComplete();
  }

  /** 判断游戏画布是否应可见（用于外部控制 canvas 的 pointer-events）。 */
  isGameVisible(): boolean {
    return this.gameVisible;
  }

  /** 获取指定页面的屏幕实例。 */
  getScreen(page: GuiPage): GuiScreen | undefined {
    return this.screens.get(page);
  }

  /** 清理所有页面。 */
  dispose(): void {
    for (const screen of this.screens.values()) {
      screen.dispose();
    }
    this.screens.clear();
    this.listeners.clear();
  }
}
