/**
 * SequenceProvider — Task 138
 * OpenRA 对标: `OpenRA.Game/Graphics/SequenceProvider.cs`
 *
 * 为每个 Actor 定义精灵图序列（idle、move、attack、die、prone 等）。
 * 从 YAML/JSON 加载序列定义，支持多 variant、多朝向、循环控制。
 *
 * Dummy 阶段：使用硬编码 JSON 数据，保持框架可运行。
 */

/** 单个序列定义（对应 OpenRA `Sequence` 的一帧区块）。 */
export interface SequenceDefinition {
  /** 起始帧索引（在 sprite sheet 中的偏移）。 */
  start: number;
  /** 帧数（长度）。 */
  length: number;
  /** 每帧时长（毫秒）。 */
  tick: number;
  /** 朝向数（8 = 8方向单位，1 = 建筑/无朝向）。 */
  facings?: number;
  /** 每个朝向的帧偏移量（transpose）。 */
  transpose?: number;
  /** 是否循环播放（默认 true）。 */
  loop?: boolean;
  /** 变体名称（如不同阵营的配色变体）。 */
  variant?: string;
}

/** 一个 Actor 的所有序列定义。 */
export interface ActorSequences {
  [sequenceName: string]: SequenceDefinition;
}

/**
 * 序列提供器 — 管理所有 Actor 的序列定义。
 */
export class SequenceProvider {
  private readonly sequences = new Map<string, ActorSequences>();

  /** 注册一个 Actor 的序列定义。 */
  register(actorType: string, sequences: ActorSequences): void {
    this.sequences.set(actorType, sequences);
  }

  /** 获取指定 Actor 的指定序列定义。 */
  getSequence(actorType: string, sequenceName: string): SequenceDefinition | undefined {
    const actorSeqs = this.sequences.get(actorType);
    if (!actorSeqs) return undefined;

    // 直接匹配或回退到默认变体
    const def = actorSeqs[sequenceName];
    if (def) return def;

    // 尝试去掉变体后缀匹配（如 "die-fire" → "die"）
    const baseName = sequenceName.split('-')[0];
    if (baseName && baseName !== sequenceName) {
      return actorSeqs[baseName];
    }

    return undefined;
  }

  /** 检查 Actor 是否有指定序列。 */
  hasSequence(actorType: string, sequenceName: string): boolean {
    return this.getSequence(actorType, sequenceName) !== undefined;
  }

  /** 获取 Actor 的所有序列名称。 */
  getSequenceNames(actorType: string): string[] {
    const actorSeqs = this.sequences.get(actorType);
    return actorSeqs ? Object.keys(actorSeqs) : [];
  }

  /** 从简化 JSON 批量加载（Dummy 阶段替代 YAML 解析）。 */
  loadFromJson(json: Record<string, ActorSequences>): void {
    for (const [actorType, sequences] of Object.entries(json)) {
      this.register(actorType, sequences);
    }
  }

  /** 获取已注册的所有 Actor 类型。 */
  getActorTypes(): string[] {
    return Array.from(this.sequences.keys());
  }
}

/** 全局单例（与 OpenRA `SequenceProvider` 全局实例对齐）。 */
let globalProvider: SequenceProvider | null = null;

export function getSequenceProvider(): SequenceProvider {
  if (!globalProvider) {
    globalProvider = new SequenceProvider();
  }
  return globalProvider;
}

export function resetSequenceProvider(): void {
  globalProvider = null;
}

// ── Dummy 阶段默认序列数据 ──

/** 步枪兵的默认序列定义（Dummy 阶段：纯色方块序列）。 */
export const DEFAULT_RIFLE_INFANTRY_SEQUENCES: ActorSequences = {
  idle: { start: 0, length: 1, tick: 100, facings: 8, transpose: 1 },
  move: { start: 8, length: 6, tick: 80, facings: 8, transpose: 6, loop: true },
  attack: { start: 56, length: 4, tick: 60, facings: 8, transpose: 4 },
  die: { start: 88, length: 8, tick: 100, facings: 1, loop: false },
  'die-fire': { start: 96, length: 8, tick: 100, facings: 1, loop: false },
  prone: { start: 104, length: 1, tick: 100, facings: 8, transpose: 1 },
};

/** 中型坦克的默认序列定义。 */
export const DEFAULT_MEDIUM_TANK_SEQUENCES: ActorSequences = {
  idle: { start: 0, length: 1, tick: 100, facings: 32, transpose: 1 },
  move: { start: 32, length: 4, tick: 80, facings: 32, transpose: 4, loop: true },
  attack: { start: 160, length: 3, tick: 60, facings: 32, transpose: 3 },
  die: { start: 256, length: 8, tick: 100, facings: 1, loop: false },
};

/** 初始化默认序列数据到全局 Provider。 */
export function loadDefaultSequences(): void {
  const provider = getSequenceProvider();
  provider.register('RifleInfantry', DEFAULT_RIFLE_INFANTRY_SEQUENCES);
  provider.register('MediumTank', DEFAULT_MEDIUM_TANK_SEQUENCES);
}
