/**
 * World — 游戏世界根容器
 * OpenRA 对标: `OpenRA.Game/World.cs`
 *
 * Task-A1: Actor 主循环化
 * 职责：
 *   1. 持有所有 Actor 实例，提供统一的 tick/render 入口
 *   2. 管理 Frame-End 任务队列（Task-F1）
 *   3. 未来替代 GameObjectManager 成为唯一对象管理器
 *
 * 设计原则：
 *   - 与现有 GameObjectManager 并行运行，逐步迁移
 *   - Actor tick 顺序按 ActorID 字符串排序（确定性）
 *   - 支持 Frame-End 延迟任务，防止 tick 中途增删导致的迭代器问题
 */

import type { Actor } from '../actors/Actor';

type FrameEndTask = (world: World) => void;

export class World {
  private static instance: World | null = null;
  private actors = new Map<string, Actor>();
  private frameEndTasks: FrameEndTask[] = [];
  private worldTick = 0;
  private destroyed = false;

  private constructor() {}

  /** 获取 World 单例（懒加载）。 */
  static getInstance(): World {
    if (!World.instance) {
      World.instance = new World();
    }
    return World.instance;
  }

  /** 重置单例（测试用）。 */
  static resetInstance(): void {
    if (World.instance) {
      World.instance.clear();
      World.instance = null;
    }
  }

  /** 注册一个 Actor 到世界。
   * 触发 Actor.addedToWorld(this)。 */
  addActor(actor: Actor): void {
    if (this.destroyed) return;
    this.actors.set(actor.id, actor);
    actor.addedToWorld(this);
  }

  /** 从世界移除指定 ID 的 Actor（不会自动销毁 Actor）。
   * 触发 Actor.removedFromWorld(this)。 */
  removeActor(id: string): boolean {
    const actor = this.actors.get(id);
    if (actor) {
      actor.removedFromWorld(this);
    }
    return this.actors.delete(id);
  }

  /** 按 ID 查找 Actor。 */
  getActor(id: string): Actor | undefined {
    return this.actors.get(id);
  }

  /** 获取所有存活 Actor（排除已销毁的）。 */
  getAllActors(): Actor[] {
    return Array.from(this.actors.values()).filter((a) => !a.isDestroyed());
  }

  /** 获取所有 Actor（包含已销毁的，用于调试）。 */
  getAllActorsRaw(): Actor[] {
    return Array.from(this.actors.values());
  }

  /** 当前世界 tick 计数（逻辑帧）。 */
  getWorldTick(): number {
    return this.worldTick;
  }

  /** Actor 数量。 */
  getActorCount(): number {
    return this.actors.size;
  }

  /**
   * 推进一帧逻辑。
   * 按 ActorID 排序遍历所有 Actor，调用 tick()，然后执行 frame-end 任务。
   */
  tick(deltaTime: number): void {
    if (this.destroyed) return;
    this.worldTick++;

    // 按 ID 排序遍历，保证确定性（Lockstep 需要）
    const sortedIds = Array.from(this.actors.keys()).sort();
    for (const id of sortedIds) {
      const actor = this.actors.get(id);
      if (actor && !actor.isDestroyed()) {
        actor.tick(deltaTime);
      }
    }

    // 执行 frame-end 任务（Task-F1）
    this.flushFrameEndTasks();
  }

  /** 注册一个 frame-end 延迟任务（Task-F1）。 */
  addFrameEndTask(task: FrameEndTask): void {
    this.frameEndTasks.push(task);
  }

  /** 立即执行所有待处理的 frame-end 任务。 */
  flushFrameEndTasks(): void {
    while (this.frameEndTasks.length > 0) {
      const tasks = this.frameEndTasks.splice(0);
      for (const task of tasks) {
        task(this);
      }
    }
  }

  /** 清除所有 Actor 和任务。 */
  clear(): void {
    for (const actor of this.actors.values()) {
      if (!actor.isDestroyed()) {
        actor.destroy();
      }
    }
    this.actors.clear();
    this.frameEndTasks.length = 0;
    this.worldTick = 0;
  }

  /** 销毁世界，释放所有资源。 */
  dispose(): void {
    this.clear();
    this.destroyed = true;
    World.instance = null;
  }
}
