/**
 * 暂停菜单 — 游戏中按 ESC 弹出
 *
 * 提供继续游戏、返回主菜单、设置选项。
 */

import type { ShellRouter } from './ShellRouter';

export class PauseMenu {
  private readonly container: HTMLElement;
  private readonly router: ShellRouter;
  private onResume?: () => void;

  constructor(parent: HTMLElement, router: ShellRouter) {
    this.router = router;
    this.container = document.createElement('div');
    this.container.id = 'pause-menu';
    this.container.className = 'cnc-shell cnc-page';
    this.container.style.display = 'none';
    this.container.innerHTML = `
      <div class="cnc-pause-overlay"></div>
      <div class="cnc-pause-content">
        <h2 class="cnc-pause-title">PAUSED</h2>
        <div class="cnc-menu-buttons">
          <button class="cnc-btn cnc-btn-primary" data-action="resume">继续游戏</button>
          <button class="cnc-btn" data-action="settings">设置</button>
          <button class="cnc-btn" data-action="menu">返回主菜单</button>
        </div>
      </div>
    `;
    parent.appendChild(this.container);
    this.bindEvents();
  }

  getElement(): HTMLElement {
    return this.container;
  }

  setOnResume(cb: () => void): void {
    this.onResume = cb;
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
        case 'resume':
          this.onResume?.();
          break;
        case 'settings':
          this.router.navigate('settings');
          break;
        case 'menu':
          this.router.navigate('menu');
          break;
      }
    });
  }
}
