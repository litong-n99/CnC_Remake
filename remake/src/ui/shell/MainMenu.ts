/**
 * 主菜单页面 — Task 36
 *
 * C&C 风格主菜单：深色背景 + 军事绿高亮 + 大标题。
 * 纯 DOM + CSS，不依赖任何 UI 框架。
 */

import type { ShellRouter } from './ShellRouter';

export class MainMenu {
  private readonly container: HTMLElement;
  private readonly router: ShellRouter;
  private onStartGame?: () => void;

  constructor(parent: HTMLElement, router: ShellRouter) {
    this.router = router;
    this.container = document.createElement('div');
    this.container.id = 'main-menu';
    this.container.className = 'cnc-shell cnc-page';
    this.container.innerHTML = `
      <div class="cnc-menu-bg"></div>
      <div class="cnc-menu-content">
        <h1 class="cnc-title">COMMAND &amp; CONQUER</h1>
        <h2 class="cnc-subtitle">REMAKE</h2>
        <div class="cnc-menu-buttons">
          <button class="cnc-btn cnc-btn-primary" data-action="start">开始游戏</button>
          <button class="cnc-btn" data-action="settings">设置</button>
          <button class="cnc-btn" data-action="exit">退出</button>
        </div>
        <div class="cnc-menu-footer">
          <span>v0.1.0-dev</span>
          <span>按 ESC 暂停</span>
        </div>
      </div>
    `;
    parent.appendChild(this.container);
    this.bindEvents();
  }

  /** 设置开始游戏回调 */
  setOnStartGame(cb: () => void): void {
    this.onStartGame = cb;
  }

  getElement(): HTMLElement {
    return this.container;
  }

  dispose(): void {
    this.container.remove();
  }

  private bindEvents(): void {
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.closest('[data-action]')?.getAttribute('data-action');
      if (!action) return;

      switch (action) {
        case 'start':
          this.onStartGame?.();
          break;
        case 'settings':
          this.router.navigate('settings');
          break;
        case 'exit':
          // 在浏览器环境中无实际退出，刷新页面回到初始状态
          window.location.reload();
          break;
      }
    });
  }
}
