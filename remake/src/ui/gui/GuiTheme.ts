/**
 * Babylon.GUI 主题常量 — C&C 军事风格。
 *
 * 所有尺寸使用百分比或像素，适配多分辨率桌面浏览器。
 */

/** 颜色主题。 */
export const GuiColors = {
  // 背景
  bgDark: '#0a0f0a',
  bgPanel: 'rgba(26, 36, 26, 0.95)',
  bgPanelTransparent: 'rgba(0, 0, 0, 0.7)',
  bgInput: 'rgba(0, 0, 0, 0.3)',
  bgButton: 'rgba(40, 60, 40, 0.8)',
  bgButtonHover: 'rgba(60, 100, 60, 0.9)',
  bgButtonPrimary: 'rgba(50, 120, 70, 0.8)',
  bgButtonPrimaryHover: 'rgba(70, 160, 100, 0.9)',
  bgProgressTrack: 'rgba(0, 0, 0, 0.5)',
  bgProgressFill: '#2a6',

  // 边框
  border: '#3a5',
  borderHover: '#5c7',
  borderPrimary: '#4a9',
  borderPrimaryHover: '#6cb',

  // 文字
  textMain: '#c8d6af',
  textTitle: '#4a9',
  textSubtitle: '#6b8',
  textMuted: '#586',
  textHighlight: '#fff',
  textSuccess: '#5c7',
  textWarning: '#ff6',

  // 特殊
  scanline: 'rgba(0, 255, 0, 0.03)',
  shadow: 'rgba(68, 170, 153, 0.4)',
} as const;

/** 字体主题。 */
export const GuiFonts = {
  family: "'Courier New', Courier, monospace",
  titleSize: '36px',
  subtitleSize: '18px',
  headingSize: '28px',
  bodySize: '16px',
  smallSize: '14px',
  tinySize: '12px',
  weightNormal: '400',
  weightBold: '700',
  weightBlack: '900',
} as const;

/** 布局尺寸（基于 1920×1080 参考分辨率，使用百分比适配）。 */
export const GuiLayout = {
  // 内容区域
  contentMaxWidth: '520px',
  contentMaxWidthLarge: '640px',
  contentPadding: '24px',

  // 按钮
  buttonHeight: '44px',
  buttonPaddingH: '20px',

  // 间距
  gapSmall: '8px',
  gapNormal: '16px',
  gapLarge: '24px',

  // 行高
  rowHeight: '40px',

  // 边框厚度
  borderThickness: 2,
} as const;

/** 动画常量。 */
export const GuiAnimation = {
  hoverDuration: 150,
  transitionSpeed: 0.15,
} as const;
