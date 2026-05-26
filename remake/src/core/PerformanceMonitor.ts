/**
 * 性能监控器 — Task 35
 *
 * 追踪 FPS、帧时间、内存使用（如可用），提供运行时性能洞察。
 * 仅在开发/调试构建中启用，生产构建可通过 tree-shaking 移除。
 */

export interface PerformanceSnapshot {
  readonly fps: number;
  readonly frameTimeMs: number;
  readonly logicTickCount: number;
  readonly memoryMB?: number;
  readonly timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private running = false;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 0;
  private currentFrameTime = 0;
  private logicTickCount = 0;
  private rafId = 0;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /** 开始监控 */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFpsUpdate = performance.now();
    this.frameCount = 0;
    this.tick();
  }

  /** 停止监控 */
  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  /** 通知一次逻辑帧已执行 */
  notifyLogicTick(): void {
    this.logicTickCount++;
  }

  /** 获取当前快照 */
  getSnapshot(): PerformanceSnapshot {
    const memInfo = (performance as unknown as Record<string, { usedJSHeapSize?: number } | undefined>).memory;
    const memoryMB = memInfo?.usedJSHeapSize
      ? Math.round((memInfo.usedJSHeapSize / 1024 / 1024) * 100) / 100
      : undefined;
    return {
      fps: this.currentFps,
      frameTimeMs: this.currentFrameTime,
      logicTickCount: this.logicTickCount,
      memoryMB,
      timestamp: Date.now(),
    };
  }

  /** 获取当前 FPS */
  getFps(): number {
    return this.currentFps;
  }

  private tick = (): void => {
    if (!this.running) return;
    const now = performance.now();
    this.frameCount++;

    // 每秒更新一次 FPS
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.currentFrameTime = Math.round(((now - this.lastFpsUpdate) / this.frameCount) * 100) / 100;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  dispose(): void {
    this.stop();
    PerformanceMonitor.instance = null;
  }
}
