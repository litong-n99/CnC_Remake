/**
 * 加载画面 — Babylon.GUI 实现。
 */

import type { Scene } from '@babylonjs/core';
import { GuiScreen } from './GuiScreen';
import { createHeading, createProgressBar, createSmallText } from './GuiFactory';
import * as GUI from '@babylonjs/gui';

export class LoadScreenGui extends GuiScreen {
  private fill!: GUI.Rectangle;
  private tipText!: GUI.TextBlock;

  constructor(scene: Scene) {
    super(scene, 'loadScreen');
  }

  /** 设置进度 0–100。 */
  setProgress(percent: number): void {
    if (this.fill) {
      this.fill.width = `${Math.max(0, Math.min(100, percent))}%`;
    }
  }

  /** 设置提示文本。 */
  setTip(text: string): void {
    if (this.tipText) {
      this.tipText.text = text;
    }
  }

  protected build(): void {
    const title = createHeading('load_title', 'LOADING');
    this.content.addControl(title);

    // 进度条
    const { track, fill } = createProgressBar('load_progress');
    this.fill = fill;
    this.content.addControl(track);

    // 提示文本
    this.tipText = createSmallText('load_tip', '正在初始化战场...');
    this.tipText.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.content.addControl(this.tipText);
  }
}
