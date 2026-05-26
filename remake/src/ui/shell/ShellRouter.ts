/**
 * 页面路由管理器 — Task 37
 *
 * 管理应用顶层页面状态：menu → loading → game → settings → pause → campaign → skirmish → lobby
 * 无外部依赖，纯 DOM 显隐控制，零框架开销。
 */

export type AppPage = 'menu' | 'loading' | 'game' | 'settings' | 'pause' | 'campaign' | 'skirmish' | 'lobby';

export class ShellRouter {
  private current: AppPage = 'menu';
  private readonly listeners: Set<(page: AppPage, prev: AppPage) => void> = new Set();
  private containers: Partial<Record<AppPage, HTMLElement>> = {};

  /** 注册页面容器引用 */
  registerContainers(containers: Partial<Record<AppPage, HTMLElement>>): void {
    this.containers = containers;
    this.updateVisibility();
  }

  /** 当前页面 */
  getCurrentPage(): AppPage {
    return this.current;
  }

  /** 切换到指定页面 */
  navigate(to: AppPage): void {
    const prev = this.current;
    if (to === prev) return;
    this.current = to;
    this.updateVisibility();
    for (const cb of this.listeners) {
      cb(to, prev);
    }
  }

  /** 监听页面变化 */
  onNavigate(cb: (page: AppPage, prev: AppPage) => void): () => void {
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

  private updateVisibility(): void {
    for (const el of Object.values(this.containers)) {
      if (el) el.style.display = 'none';
    }
    const target = this.containers[this.current];
    if (target) target.style.display = 'flex';
  }
}
