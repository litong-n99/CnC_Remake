/**
 * 语音与通知系统 — Task 72
 *
 * 基于 AudioManager 的通知队列，支持按优先级排队播放，
 * 避免多个通知同时叠加。为 Task 73（背景音乐）预留独立通道。
 */

import { AudioManager } from './AudioManager';

export interface NotificationEvent {
  readonly id: string;
  readonly text: string;
  /** 优先级：0 = 最高（如基地被攻击），数字越大越不重要 */
  readonly priority: number;
  /** 是否可打断低优先级通知 */
  readonly canInterrupt: boolean;
  /** 对应的音频事件名（AudioManager.play 的 key） */
  readonly audioEvent?: string;
}

export class NotificationManager {
  private readonly queue: NotificationEvent[] = [];
  private isPlaying = false;
  private readonly audioManager: AudioManager;

  constructor() {
    this.audioManager = AudioManager.getInstance();
  }

  /** 添加通知到队列（按优先级排序），不自动播放 */
  enqueue(event: NotificationEvent): void {
    this.queue.push(event);
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  /** 立即播放高优先级通知（可打断当前） */
  playImmediate(event: NotificationEvent): void {
    if (event.canInterrupt && this.isPlaying) {
      this.isPlaying = false;
    }
    this.queue.unshift(event);
    this.processQueue();
  }

  /** 由游戏循环调用，处理队列中的下一个通知 */
  tick(): void {
    this.processQueue();
  }

  /** 当前队列长度 */
  getQueueLength(): number {
    return this.queue.length;
  }

  /** 清空队列 */
  clearQueue(): void {
    this.queue.length = 0;
    this.isPlaying = false;
  }

  /** 是否正在播放 */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private processQueue(): void {
    if (this.isPlaying || this.queue.length === 0) return;

    const event = this.queue.shift()!;
    this.isPlaying = true;

    if (event.audioEvent) {
      this.audioManager.play(
        event.audioEvent as 'select' | 'move' | 'attack' | 'fire' | 'buildStart' | 'buildComplete' | 'error'
      );
    }

    // 模拟通知持续时间（真实实现中应与音频时长对齐）
    const duration = 800;
    setTimeout(() => {
      this.isPlaying = false;
      this.processQueue();
    }, duration);
  }
}
