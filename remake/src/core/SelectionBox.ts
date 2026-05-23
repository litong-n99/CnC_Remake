import { AdvancedDynamicTexture, Rectangle } from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';

/**
 * 框选矩形 — 使用 Babylon.GUI Rectangle 绘制绿色半透明矩形框。
 *
 * 与 HTML div 方案相比的优势：
 * - 与 Scene 生命周期统一管理，dispose 时自动清理
 * - 不需要手动处理 canvas offset / DPR 转换（GUI 自动适配 render buffer）
 * - 不拦截鼠标事件（isHitTestVisible = false）
 *
 * 坐标约定：所有 public 方法接收 **canvas-local CSS 像素**（相对于 canvas 左上角的 CSS 像素坐标）。
 * 内部自动乘以 DPR 转换为 render-buffer 像素。
 */
export class SelectionBox {
  private gui: AdvancedDynamicTexture;
  private rect: Rectangle;

  constructor(scene: Scene) {
    this.gui = AdvancedDynamicTexture.CreateFullscreenUI('selectionBoxUI', true, scene);

    this.rect = new Rectangle('selectionRect');
    this.rect.widthInPixels = 0;
    this.rect.heightInPixels = 0;
    this.rect.color = '#00ff00';
    this.rect.thickness = 1;
    this.rect.background = 'rgba(0, 255, 0, 0.15)';
    this.rect.isVisible = false;
    this.rect.isHitTestVisible = false; // 不拦截鼠标事件
    // 默认锚点是 CENTER，必须改为 LEFT/TOP，否则 leftInPixels/topInPixels
    // 偏移的是控件中心而非左上角，导致框出现在完全错误的位置。
    this.rect.horizontalAlignment = Rectangle.HORIZONTAL_ALIGNMENT_LEFT;
    this.rect.verticalAlignment = Rectangle.VERTICAL_ALIGNMENT_TOP;

    this.gui.addControl(this.rect);
  }

  /** 显示框选矩形。坐标为 canvas-local CSS 像素。 */
  show(startX: number, startY: number): void {
    const dpr = this.getDpr();
    this.rect.leftInPixels = startX * dpr;
    this.rect.topInPixels = startY * dpr;
    this.rect.widthInPixels = 0;
    this.rect.heightInPixels = 0;
    this.rect.isVisible = true;
  }

  /** 更新矩形大小。坐标为 canvas-local CSS 像素。 */
  update(startX: number, startY: number, currentX: number, currentY: number): void {
    const dpr = this.getDpr();
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    this.rect.leftInPixels = left * dpr;
    this.rect.topInPixels = top * dpr;
    this.rect.widthInPixels = Math.max(1, width * dpr);
    this.rect.heightInPixels = Math.max(1, height * dpr);
  }

  /** 隐藏框选矩形。 */
  hide(): void {
    this.rect.isVisible = false;
  }

  /** 释放 GUI 资源。 */
  dispose(): void {
    this.gui.dispose();
  }

  private getDpr(): number {
    const canvas = this.gui.getScene()?.getEngine()?.getRenderingCanvas();
    if (!canvas) return 1;
    return canvas.width / canvas.getBoundingClientRect().width;
  }
}
