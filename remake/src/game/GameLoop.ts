/**
 * 游戏主循环 —— 逻辑帧与渲染帧分离
 * Source: docs/DEPTH0_OPENRA_GAP_ANALYSIS.md — Task 141
 * OpenRA 对标: OpenRA.Game/Game.cs（LogicTick vs RenderTick）
 *
 * 设计要点：
 *   - 固定 25 FPS 逻辑帧（每 40ms 推进一帧）
 *   - 渲染帧独立运行（通常 60 FPS），通过 logicTickProgress 插值单位位置
 *   - 所有游戏逻辑（移动、攻击、建造）只在逻辑帧中执行
 *   - 为 Task 65（Lockstep）预留确定性模拟基础
 */

import type { Scene, Engine } from '@babylonjs/core';

/** Task-R2: ITickRender 接口 — 逻辑帧后更新渲染状态（动画帧、屏幕位置）。 */
export interface ITickRender {
  tickRender(progress: number): void;
}

type TickCallback = (dt: number) => void;

export interface GameLoopOptions {
  readonly logicFps?: number; // 默认 25
  readonly logicIntervalMs?: number; // 替代 logicFps，直接指定间隔
}

export class GameLoop {
  private logicIntervalMs: number;
  private logicAccumulator = 0;
  private logicTickCount = 0;
  private logicTickProgress = 0; // 0.0–1.0，用于渲染插值
  private running = false;
  private renderCallbacks: TickCallback[] = [];
  private logicCallbacks: TickCallback[] = [];
  private tickRenderCallbacks: ITickRender[] = [];
  private lastTimestamp = 0;
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private boundRenderLoop: (() => void) | null = null;
  private lockstepMode = false;
  private pendingLogicSteps = 0;

  constructor(options: GameLoopOptions = {}) {
    if (options.logicIntervalMs !== undefined) {
      this.logicIntervalMs = options.logicIntervalMs;
    } else {
      const fps = options.logicFps ?? 25;
      this.logicIntervalMs = 1000 / fps;
    }
  }

  /** 运行时修改逻辑帧间隔（Task 136: 游戏速度切换）。 */
  setLogicIntervalMs(ms: number): void {
    this.logicIntervalMs = ms;
  }

  /** 获取当前逻辑帧间隔（毫秒）。 */
  getLogicIntervalMs(): number {
    return this.logicIntervalMs;
  }

  /** 启动游戏循环 */
  start(engine: Engine, scene: Scene): void {
    if (this.running) return;
    this.running = true;
    this.engine = engine;
    this.scene = scene;
    this.lastTimestamp = performance.now();
    this.logicAccumulator = 0;

    // 注册 Babylon.js 渲染循环
    this.boundRenderLoop = () => this.renderFrame();
    this.engine.runRenderLoop(this.boundRenderLoop);
  }

  /** 停止游戏循环 */
  stop(): void {
    this.running = false;
    if (this.engine && this.boundRenderLoop) {
      this.engine.stopRenderLoop(this.boundRenderLoop);
    }
    this.boundRenderLoop = null;
  }

  /** 注册逻辑帧回调 */
  onLogicTick(cb: TickCallback): void {
    this.logicCallbacks.push(cb);
  }

  /** 注册渲染帧回调 */
  onRenderTick(cb: TickCallback): void {
    this.renderCallbacks.push(cb);
  }

  /** Task-R2: 注册 ITickRender（逻辑帧后更新渲染状态）。 */
  onTickRender(cb: ITickRender): void {
    this.tickRenderCallbacks.push(cb);
  }

  /** 移除逻辑帧回调 */
  offLogicTick(cb: TickCallback): void {
    this.logicCallbacks = this.logicCallbacks.filter((c) => c !== cb);
  }

  /** 移除渲染帧回调 */
  offRenderTick(cb: TickCallback): void {
    this.renderCallbacks = this.renderCallbacks.filter((c) => c !== cb);
  }

  /** Task-R2: 移除 ITickRender。 */
  offTickRender(cb: ITickRender): void {
    this.tickRenderCallbacks = this.tickRenderCallbacks.filter((c) => c !== cb);
  }

  /** 当前逻辑帧计数 */
  getLogicTickCount(): number {
    return this.logicTickCount;
  }

  /** 当前逻辑帧进度（0.0–1.0），用于渲染插值 */
  getLogicTickProgress(): number {
    return this.logicTickProgress;
  }

  /** 是否正在运行 */
  isRunning(): boolean {
    return this.running;
  }

  /** 启用/禁用 Lockstep 模式（Task 65） */
  setLockstepMode(enabled: boolean): void {
    this.lockstepMode = enabled;
  }

  /** Lockstep: 允许推进一帧逻辑（外部在收到服务器 OrderFrame 后调用） */
  approveLogicStep(): void {
    this.pendingLogicSteps++;
  }

  /** 当前待执行的逻辑帧数（Lockstep 模式下） */
  getPendingLogicSteps(): number {
    return this.pendingLogicSteps;
  }

  /** 手动推进一帧逻辑（用于测试或回放） */
  stepLogic(dt = this.logicIntervalMs): void {
    this.logicTickCount++;
    for (const cb of this.logicCallbacks) {
      cb(dt);
    }
    // Task-R2: 逻辑帧后调用 ITickRender
    for (const cb of this.tickRenderCallbacks) {
      cb.tickRender(this.logicTickProgress);
    }
  }

  private renderFrame(): void {
    if (!this.running || !this.engine || !this.scene) return;

    const now = performance.now();
    const rawDt = now - this.lastTimestamp;
    this.lastTimestamp = now;

    // 防止后台标签页导致的 dt 爆炸
    const dt = Math.min(rawDt, 100);

    // 累加逻辑时间
    this.logicAccumulator += dt;

    // 执行所有到期的逻辑帧（Lockstep 模式下需外部 approve）
    while (this.logicAccumulator >= this.logicIntervalMs) {
      this.logicAccumulator -= this.logicIntervalMs;
      if (this.lockstepMode) {
        if (this.pendingLogicSteps > 0) {
          this.pendingLogicSteps--;
          this.stepLogic(this.logicIntervalMs);
        }
        // else: wait for server OrderFrame, logic stalls but render continues
      } else {
        this.stepLogic(this.logicIntervalMs);
      }
    }

    // 计算当前逻辑帧进度（0.0–1.0）
    this.logicTickProgress = this.logicAccumulator / this.logicIntervalMs;

    // 渲染帧回调（接收原始 dt，用于动画/插值）
    for (const cb of this.renderCallbacks) {
      cb(dt);
    }

    // Babylon.js 渲染
    this.scene.render();
  }
}
