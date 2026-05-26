import { RTSCamera } from './RTSCamera';

export interface TouchInputCallbacks {
  onPan?: (dx: number, dy: number) => void;
  onZoom?: (scale: number) => void;
  onTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
}

/**
 * TouchInputManager — 移动端触控输入适配。
 *
 * 支持单指拖拽平移、双指缩放、点击选择、长按弹出命令菜单。
 *
 * Source: OpenRA.Platforms.Default/Sdl2Input.cs (touch handling)
 */
export class TouchInputManager {
  private bound = false;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly longPressThresholdMs = 500;
  private readonly tapMoveThresholdPx = 10;
  private startPoint = { x: 0, y: 0 };
  private lastTouchDistance = 0;
  private isDragging = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly rtsCamera: RTSCamera,
    private readonly callbacks: TouchInputCallbacks = {}
  ) {}

  /** 绑定触控事件。 */
  bind(): void {
    if (this.bound) return;
    this.bound = true;
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  /** 解绑触控事件。 */
  unbind(): void {
    if (!this.bound) return;
    this.bound = false;
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
  }

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();

    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.startPoint = { x: t.clientX, y: t.clientY };
      this.isDragging = false;

      // 长按检测
      this.longPressTimer = setTimeout(() => {
        if (!this.isDragging) {
          this.callbacks.onLongPress?.(t.clientX, t.clientY);
        }
      }, this.longPressThresholdMs);
    } else if (e.touches.length === 2) {
      this.clearLongPress();
      this.lastTouchDistance = this.getTouchDistance(e.touches);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - this.startPoint.x;
      const dy = t.clientY - this.startPoint.y;

      if (Math.abs(dx) > this.tapMoveThresholdPx || Math.abs(dy) > this.tapMoveThresholdPx) {
        this.isDragging = true;
        this.clearLongPress();
      }

      if (this.isDragging) {
        // 单指拖拽 → 相机平移（反向移动，模拟拖动地图）
        const panSpeed = 0.15;
        this.rtsCamera.pan(-dx * panSpeed, dy * panSpeed);
        this.callbacks.onPan?.(dx, dy);
        this.startPoint = { x: t.clientX, y: t.clientY };
      }
    } else if (e.touches.length === 2) {
      const dist = this.getTouchDistance(e.touches);
      const scale = dist / this.lastTouchDistance;
      if (scale > 0.95 && scale < 1.05) return; // 忽略微小变化

      // 双指缩放 → 调整相机半径
      const zoomSensitivity = 5;
      const delta = (scale - 1) * zoomSensitivity;
      this.rtsCamera.zoom(delta);
      this.callbacks.onZoom?.(scale);
      this.lastTouchDistance = dist;
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    this.clearLongPress();

    if (e.changedTouches.length === 1 && !this.isDragging) {
      const t = e.changedTouches[0];
      this.callbacks.onTap?.(t.clientX, t.clientY);
    }

    if (e.touches.length === 0) {
      this.isDragging = false;
    }
  };

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private clearLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /** 检测当前设备是否支持触控。 */
  static isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}
