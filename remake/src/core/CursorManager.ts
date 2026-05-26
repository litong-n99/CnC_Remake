/**
 * 鼠标光标管理系统 — Task 43
 *
 * 根据游戏上下文动态切换光标样式：
 *   - default: 默认指针
 *   - select: 悬停友方单位
 *   - move: 悬停可通行地面
 *   - attack: 悬停敌方单位
 *   - build: 建筑放置模式
 *   - sell: 出售模式
 *   - repair: 修理模式
 *
 * 使用 CSS `cursor` 属性实现，避免 Babylon.js GUI 光标与系统光标冲突。
 */

export type CursorType = 'default' | 'select' | 'move' | 'attack' | 'build' | 'sell' | 'repair' | 'guard';

export class CursorManager {
  private static instance: CursorManager | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private current: CursorType = 'default';

  static getInstance(): CursorManager {
    if (!CursorManager.instance) {
      CursorManager.instance = new CursorManager();
    }
    return CursorManager.instance;
  }

  /** 绑定目标 canvas */
  bind(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.set('default');
  }

  /** 设置当前光标 */
  set(type: CursorType): void {
    this.current = type;
    if (!this.canvas) return;

    // 使用 CSS 内置光标 + 颜色提示（通过 canvas 边框或光标样式）
    const cursorMap: Record<CursorType, string> = {
      default: 'default',
      select: 'pointer',
      move: 'move',
      attack: 'crosshair',
      build: 'cell',
      sell: 'not-allowed',
      repair: 'help',
      guard: 'copy',
    };

    this.canvas.style.cursor = cursorMap[type];
  }

  /** 获取当前光标类型 */
  get(): CursorType {
    return this.current;
  }

  /** 重置为默认 */
  reset(): void {
    this.set('default');
  }

  dispose(): void {
    if (this.canvas) {
      this.canvas.style.cursor = 'default';
    }
    this.canvas = null;
    CursorManager.instance = null;
  }
}
