/**
 * 加载画面 — Task 42
 *
 * 显示加载进度条和提示文本，覆盖全屏。
 */

export class LoadScreen {
  private readonly container: HTMLElement;
  private progressEl: HTMLElement;
  private tipEl: HTMLElement;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.id = 'load-screen';
    this.container.className = 'cnc-shell cnc-page';
    this.container.innerHTML = `
      <div class="cnc-load-bg"></div>
      <div class="cnc-load-content">
        <h2 class="cnc-load-title">LOADING</h2>
        <div class="cnc-load-bar-track">
          <div class="cnc-load-bar-fill"></div>
        </div>
        <p class="cnc-load-tip">正在初始化战场...</p>
      </div>
    `;
    parent.appendChild(this.container);
    this.progressEl = this.container.querySelector('.cnc-load-bar-fill') as HTMLElement;
    this.tipEl = this.container.querySelector('.cnc-load-tip') as HTMLElement;
  }

  getElement(): HTMLElement {
    return this.container;
  }

  /** 设置进度 0–100 */
  setProgress(percent: number): void {
    this.progressEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  /** 设置提示文本 */
  setTip(text: string): void {
    this.tipEl.textContent = text;
  }

  dispose(): void {
    this.container.remove();
  }
}
