/**
 * Babylon.GUI 组件工厂 — 快速创建常用 UI 元素。
 *
 * 所有方法返回已配置样式的 GUI 控件，可直接添加到容器。
 */

import * as GUI from '@babylonjs/gui';
import { GuiColors, GuiFonts, GuiLayout } from './GuiTheme';

// ═══════════════════════════════════════════════════════════════
//  容器
// ═══════════════════════════════════════════════════════════════

/** 创建垂直 StackPanel（主内容区）。 */
export function createContentPanel(name: string): GUI.StackPanel {
  const panel = new GUI.StackPanel(name);
  panel.width = GuiLayout.contentMaxWidth;
  panel.height = '100%';
  panel.isVertical = true;
  panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  panel.paddingTop = GuiLayout.gapLarge;
  panel.paddingBottom = GuiLayout.gapLarge;
  panel.spacing = 16;
  return panel;
}

/** 创建全屏半透明背景遮罩。 */
export function createFullscreenBg(name: string): GUI.Rectangle {
  const bg = new GUI.Rectangle(name);
  bg.width = '100%';
  bg.height = '100%';
  bg.background = GuiColors.bgDark;
  bg.thickness = 0;
  return bg;
}

/** 创建半透明叠加层（暂停菜单用）。 */
export function createOverlay(name: string): GUI.Rectangle {
  const overlay = new GUI.Rectangle(name);
  overlay.width = '100%';
  overlay.height = '100%';
  overlay.background = 'rgba(0, 0, 0, 0.7)';
  overlay.thickness = 0;
  return overlay;
}

/** 创建带边框的分组面板。 */
export function createGroupPanel(name: string): GUI.Rectangle {
  const panel = new GUI.Rectangle(name);
  panel.width = '100%';
  panel.height = 'auto';
  panel.background = GuiColors.bgInput;
  panel.color = '#353';
  panel.thickness = 1;
  panel.paddingTop = GuiLayout.gapNormal;
  panel.paddingBottom = GuiLayout.gapNormal;
  panel.paddingLeft = GuiLayout.gapNormal;
  panel.paddingRight = GuiLayout.gapNormal;
  return panel;
}

/** 创建水平排列的行容器。 */
export function createRow(name: string, height = GuiLayout.rowHeight): GUI.Rectangle {
  const row = new GUI.Rectangle(name);
  row.width = '100%';
  row.height = height;
  row.background = GuiColors.bgInput;
  row.color = '#353';
  row.thickness = 1;
  row.paddingLeft = '12px';
  row.paddingRight = '12px';
  return row;
}

// ═══════════════════════════════════════════════════════════════
//  文本
// ═══════════════════════════════════════════════════════════════

/** 创建标题文本。 */
export function createTitle(name: string, text: string): GUI.TextBlock {
  const t = new GUI.TextBlock(name, text);
  t.fontFamily = GuiFonts.family;
  t.fontSize = GuiFonts.titleSize;
  t.fontWeight = GuiFonts.weightBlack;
  t.color = GuiColors.textTitle;
  t.shadowColor = GuiColors.shadow;
  t.shadowBlur = 12;
  t.height = '60px';
  t.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  t.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  return t;
}

/** 创建副标题文本。 */
export function createSubtitle(name: string, text: string): GUI.TextBlock {
  const t = new GUI.TextBlock(name, text);
  t.fontFamily = GuiFonts.family;
  t.fontSize = GuiFonts.subtitleSize;
  t.fontWeight = GuiFonts.weightBold;
  t.color = GuiColors.textSubtitle;
  t.height = '32px';
  t.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  t.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  return t;
}

/** 创建页面标题（SETTINGS / PAUSED 等）。 */
export function createHeading(name: string, text: string): GUI.TextBlock {
  const t = new GUI.TextBlock(name, text);
  t.fontFamily = GuiFonts.family;
  t.fontSize = GuiFonts.headingSize;
  t.fontWeight = GuiFonts.weightBold;
  t.color = GuiColors.textTitle;
  t.height = '50px';
  t.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  t.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  return t;
}

/** 创建正文文本。 */
export function createBodyText(name: string, text: string): GUI.TextBlock {
  const t = new GUI.TextBlock(name, text);
  t.fontFamily = GuiFonts.family;
  t.fontSize = GuiFonts.bodySize;
  t.color = GuiColors.textMain;
  t.height = '28px';
  t.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  t.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  return t;
}

/** 创建小号文本。 */
export function createSmallText(name: string, text: string): GUI.TextBlock {
  const t = new GUI.TextBlock(name, text);
  t.fontFamily = GuiFonts.family;
  t.fontSize = GuiFonts.smallSize;
  t.color = GuiColors.textMuted;
  t.height = '20px';
  t.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  t.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  return t;
}

/** 创建标签（左对齐，用于行内）。 */
export function createLabel(name: string, text: string): GUI.TextBlock {
  const t = new GUI.TextBlock(name, text);
  t.fontFamily = GuiFonts.family;
  t.fontSize = GuiFonts.bodySize;
  t.color = GuiColors.textMain;
  t.width = '120px';
  t.height = '100%';
  t.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  t.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  return t;
}

// ═══════════════════════════════════════════════════════════════
//  按钮
// ═══════════════════════════════════════════════════════════════

export interface ButtonOptions {
  readonly primary?: boolean;
  readonly width?: string;
  readonly height?: string;
}

/** 创建标准按钮。 */
export function createButton(name: string, text: string, options: ButtonOptions = {}): GUI.Button {
  const btn = GUI.Button.CreateSimpleButton(name, text);
  btn.fontFamily = GuiFonts.family;
  btn.fontSize = GuiFonts.bodySize;
  btn.fontWeight = GuiFonts.weightBold;
  btn.color = GuiColors.textMain;
  btn.background = options.primary ? GuiColors.bgButtonPrimary : GuiColors.bgButton;
  btn.width = options.width ?? '100%';
  btn.height = options.height ?? GuiLayout.buttonHeight;
  btn.thickness = GuiLayout.borderThickness;
  btn.cornerRadius = 0;

  const isPrimary = options.primary ?? false;
  const normalBorder = isPrimary ? GuiColors.borderPrimary : GuiColors.border;
  const hoverBorder = isPrimary ? GuiColors.borderPrimaryHover : GuiColors.borderHover;
  const normalBg = isPrimary ? GuiColors.bgButtonPrimary : GuiColors.bgButton;
  const hoverBg = isPrimary ? GuiColors.bgButtonPrimaryHover : GuiColors.bgButtonHover;

  btn.color = normalBorder;

  btn.onPointerEnterObservable.add(() => {
    btn.background = hoverBg;
    btn.color = hoverBorder;
  });
  btn.onPointerOutObservable.add(() => {
    btn.background = normalBg;
    btn.color = normalBorder;
  });

  return btn;
}

/** 创建小型按钮（用于列表项等）。 */
export function createSmallButton(name: string, text: string): GUI.Button {
  const btn = createButton(name, text, { width: 'auto', height: '32px' });
  btn.fontSize = GuiFonts.smallSize;
  btn.paddingLeft = '12px';
  btn.paddingRight = '12px';
  return btn;
}

// ═══════════════════════════════════════════════════════════════
//  进度条
// ═══════════════════════════════════════════════════════════════

/** 创建进度条（返回轨道和填充，方便外部控制）。 */
export function createProgressBar(name: string): { track: GUI.Rectangle; fill: GUI.Rectangle } {
  const track = new GUI.Rectangle(`${name}_track`);
  track.width = '100%';
  track.height = '12px';
  track.background = GuiColors.bgProgressTrack;
  track.color = GuiColors.border;
  track.thickness = 1;

  const fill = new GUI.Rectangle(`${name}_fill`);
  fill.width = '0%';
  fill.height = '100%';
  fill.background = GuiColors.bgProgressFill;
  fill.thickness = 0;
  fill.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

  track.addControl(fill);
  return { track, fill };
}

// ═══════════════════════════════════════════════════════════════
//  滑块（自定义实现，Babylon.GUI 无原生滑块）
// ═══════════════════════════════════════════════════════════════

export interface SliderOptions {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
}

/** 创建自定义滑块。返回控件和值引用。 */
export function createSlider(
  name: string,
  options: SliderOptions
): {
  container: GUI.Rectangle;
  valueText: GUI.TextBlock;
  setValue: (v: number) => void;
  onValueChanged: (cb: (v: number) => void) => void;
} {
  const container = new GUI.Rectangle(name);
  container.width = '100%';
  container.height = GuiLayout.rowHeight;
  container.thickness = 0;
  container.background = 'transparent';

  // 轨道
  const track = new GUI.Rectangle(`${name}_track`);
  track.width = '60%';
  track.height = '6px';
  track.left = '40px';
  track.background = GuiColors.bgProgressTrack;
  track.color = GuiColors.border;
  track.thickness = 1;
  track.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  track.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;

  // 填充
  const fill = new GUI.Rectangle(`${name}_fill`);
  fill.height = '100%';
  fill.background = GuiColors.bgProgressFill;
  fill.thickness = 0;
  fill.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  track.addControl(fill);

  // 滑块拇指
  const thumb = new GUI.Rectangle(`${name}_thumb`);
  thumb.width = '12px';
  thumb.height = '18px';
  thumb.background = GuiColors.bgButtonPrimary;
  thumb.color = GuiColors.borderPrimary;
  thumb.thickness = 1;
  thumb.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  thumb.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  track.addControl(thumb);

  // 值文本
  const valueText = new GUI.TextBlock(`${name}_value`, String(options.value));
  valueText.fontFamily = GuiFonts.family;
  valueText.fontSize = GuiFonts.smallSize;
  valueText.color = GuiColors.textMuted;
  valueText.width = '50px';
  valueText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  valueText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;

  container.addControl(track);
  container.addControl(valueText);

  let currentValue = options.value;
  const callbacks: Array<(v: number) => void> = [];

  const updateVisuals = (): void => {
    const ratio = (currentValue - options.min) / (options.max - options.min);
    fill.width = `${ratio * 100}%`;
    thumb.left = `${ratio * 100}%`;
    valueText.text = String(Math.round(currentValue * 100) / 100);
  };

  const setValue = (v: number): void => {
    currentValue = Math.max(options.min, Math.min(options.max, v));
    // 对齐到 step
    const steps = Math.round((currentValue - options.min) / options.step);
    currentValue = options.min + steps * options.step;
    updateVisuals();
    callbacks.forEach((cb) => cb(currentValue));
  };

  const onValueChanged = (cb: (v: number) => void): void => {
    callbacks.push(cb);
  };

  // 拖动逻辑
  let dragging = false;
  thumb.onPointerDownObservable.add(() => {
    dragging = true;
  });
  container.onPointerDownObservable.add((evt) => {
    if (!evt) return;
    const ratio = Math.max(0, Math.min(1, evt.x / container.widthInPixels));
    setValue(options.min + ratio * (options.max - options.min));
    dragging = true;
  });

  // 使用 scene 级别的 pointer move 来跟踪拖动
  // 外部需要在 scene.onPointerObservable 中调用 processDrag
  const processDrag = (x: number, containerWidth: number): void => {
    if (!dragging) return;
    const ratio = Math.max(0, Math.min(1, x / containerWidth));
    setValue(options.min + ratio * (options.max - options.min));
  };

  // 暴露 processDrag 给外部 scene 事件
  (container as unknown as Record<string, unknown>)._sliderProcessDrag = processDrag;
  (container as unknown as Record<string, unknown>)._sliderSetDragging = (v: boolean) => {
    dragging = v;
  };

  updateVisuals();

  return { container, valueText, setValue, onValueChanged };
}

// ═══════════════════════════════════════════════════════════════
//  复选框（自定义实现）
// ═══════════════════════════════════════════════════════════════

/** 创建自定义复选框。 */
export function createCheckbox(
  name: string,
  label: string,
  checked: boolean
): {
  container: GUI.Rectangle;
  isChecked: () => boolean;
  setChecked: (v: boolean) => void;
  onChanged: (cb: (v: boolean) => void) => void;
} {
  const container = new GUI.Rectangle(name);
  container.width = '100%';
  container.height = GuiLayout.rowHeight;
  container.thickness = 0;
  container.background = 'transparent';

  // 勾选框
  const box = new GUI.Rectangle(`${name}_box`);
  box.width = '18px';
  box.height = '18px';
  box.background = checked ? GuiColors.bgButtonPrimary : 'transparent';
  box.color = GuiColors.border;
  box.thickness = 2;
  box.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  box.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;

  // 勾选标记
  const check = new GUI.TextBlock(`${name}_check`, '✓');
  check.fontSize = '14px';
  check.color = GuiColors.textHighlight;
  check.isVisible = checked;
  check.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  check.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  box.addControl(check);

  // 标签
  const labelText = new GUI.TextBlock(`${name}_label`, label);
  labelText.fontFamily = GuiFonts.family;
  labelText.fontSize = GuiFonts.bodySize;
  labelText.color = GuiColors.textMain;
  labelText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  labelText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;

  container.addControl(labelText);
  container.addControl(box);

  let isChecked = checked;
  const callbacks: Array<(v: boolean) => void> = [];

  const setChecked = (v: boolean): void => {
    isChecked = v;
    box.background = isChecked ? GuiColors.bgButtonPrimary : 'transparent';
    check.isVisible = isChecked;
    callbacks.forEach((cb) => cb(isChecked));
  };

  const onChanged = (cb: (v: boolean) => void): void => {
    callbacks.push(cb);
  };

  container.onPointerDownObservable.add(() => {
    setChecked(!isChecked);
  });
  container.isHitTestVisible = true;

  return { container, isChecked: () => isChecked, setChecked, onChanged };
}

// ═══════════════════════════════════════════════════════════════
//  下拉选择（自定义实现）
// ═══════════════════════════════════════════════════════════════

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

/** 创建自定义下拉选择框。 */
export function createSelect(
  name: string,
  options: SelectOption[],
  selectedValue: string
): {
  container: GUI.Rectangle;
  button: GUI.Button;
  dropdown: GUI.Rectangle;
  getValue: () => string;
  setValue: (v: string) => void;
  onChanged: (cb: (v: string) => void) => void;
} {
  const container = new GUI.Rectangle(name);
  container.width = '100%';
  container.height = GuiLayout.rowHeight;
  container.thickness = 0;
  container.background = 'transparent';

  // 显示按钮
  const selectedLabel = options.find((o) => o.value === selectedValue)?.label ?? options[0]?.label ?? '';
  const button = createButton(`${name}_btn`, selectedLabel, { width: '60%', height: '34px' });
  button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;

  // 下拉列表（初始隐藏）
  const dropdown = new GUI.Rectangle(`${name}_dropdown`);
  dropdown.width = '60%';
  dropdown.height = `${options.length * 34}px`;
  dropdown.background = GuiColors.bgPanel;
  dropdown.color = GuiColors.border;
  dropdown.thickness = 1;
  dropdown.isVisible = false;
  dropdown.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  dropdown.top = `${GuiLayout.rowHeight}`;
  dropdown.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  dropdown.zIndex = 10;

  const dropdownStack = new GUI.StackPanel(`${name}_dropdownStack`);
  dropdownStack.isVertical = true;
  dropdownStack.width = '100%';
  dropdownStack.height = '100%';
  dropdown.addControl(dropdownStack);

  let currentValue = selectedValue;
  const callbacks: Array<(v: string) => void> = [];

  const setValue = (v: string): void => {
    currentValue = v;
    const label = options.find((o) => o.value === v)?.label ?? v;
    button.textBlock!.text = label;
    dropdown.isVisible = false;
    callbacks.forEach((cb) => cb(currentValue));
  };

  const onChanged = (cb: (v: string) => void): void => {
    callbacks.push(cb);
  };

  // 填充选项
  for (const opt of options) {
    const optBtn = createButton(`${name}_opt_${opt.value}`, opt.label, { width: '100%', height: '34px' });
    optBtn.fontSize = GuiFonts.smallSize;
    optBtn.onPointerDownObservable.add(() => {
      setValue(opt.value);
    });
    dropdownStack.addControl(optBtn);
  }

  // 切换下拉
  button.onPointerDownObservable.add(() => {
    dropdown.isVisible = !dropdown.isVisible;
  });

  container.addControl(button);
  container.addControl(dropdown);

  return { container, button, dropdown, getValue: () => currentValue, setValue, onChanged };
}

// ═══════════════════════════════════════════════════════════════
//  扫描线效果
// ═══════════════════════════════════════════════════════════════

/** 为指定容器添加扫描线纹理效果。 */
export function addScanlineEffect(parent: GUI.Container): void {
  const scanline = new GUI.Rectangle('scanline');
  scanline.width = '100%';
  scanline.height = '100%';
  scanline.background = 'transparent';
  scanline.thickness = 0;
  scanline.isHitTestVisible = false;

  // 使用 CSS 渐变模拟扫描线（通过 Babylon.GUI 无此能力，改用纯色条纹）
  // 简化为一个极细的不透明覆盖层
  const line = new GUI.Rectangle('scanlinePattern');
  line.width = '100%';
  line.height = '100%';
  line.background = 'transparent';
  line.thickness = 0;
  line.isHitTestVisible = false;

  parent.addControl(line);
}
