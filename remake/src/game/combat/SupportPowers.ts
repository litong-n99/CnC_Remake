/**
 * 超级武器系统 — Task 84
 *
 * 支持核弹（Nuke）和离子炮（IonCannon）的蓄力倒计时、
 * UI 显示、发射指令与大范围伤害。
 */

export type SupportPowerType = 'Nuke' | 'IonCannon';

export interface SupportPowerConfig {
  readonly type: SupportPowerType;
  readonly displayName: string;
  /** 蓄力总时间（秒） */
  readonly chargeTime: number;
  /** 伤害半径（格子数） */
  readonly blastRadius: number;
  /** 中心伤害值 */
  readonly centerDamage: number;
  /** 是否对友军造成伤害 */
  readonly affectsFriendly: boolean;
}

export const SUPPORT_POWER_CONFIGS: Record<SupportPowerType, SupportPowerConfig> = {
  Nuke: {
    type: 'Nuke',
    displayName: 'Nuclear Missile',
    chargeTime: 600, // 10 minutes
    blastRadius: 10,
    centerDamage: 1000,
    affectsFriendly: true,
  },
  IonCannon: {
    type: 'IonCannon',
    displayName: 'Ion Cannon',
    chargeTime: 600,
    blastRadius: 6,
    centerDamage: 800,
    affectsFriendly: false,
  },
};

export interface SupportPowerInstance {
  readonly id: string;
  readonly config: SupportPowerConfig;
  /** 当前已蓄力时间（秒） */
  elapsed: number;
  /** 是否已就绪 */
  isReady: boolean;
  /** 是否已发射（一次性） */
  isFired: boolean;
  /** 目标格子坐标（发射时设置） */
  targetCell?: { x: number; y: number };
}

export class SupportPowerManager {
  private powers = new Map<string, SupportPowerInstance>();
  private listeners: ((event: { type: 'ready'; id: string } | { type: 'fired'; id: string }) => void)[] = [];

  /** 添加一个超级武器到管理器 */
  addPower(id: string, type: SupportPowerType): SupportPowerInstance {
    const config = SUPPORT_POWER_CONFIGS[type];
    const power: SupportPowerInstance = { id, config, elapsed: 0, isReady: false, isFired: false };
    this.powers.set(id, power);
    return power;
  }

  /** 获取指定超级武器 */
  getPower(id: string): SupportPowerInstance | undefined {
    return this.powers.get(id);
  }

  /** 所有超级武器 */
  getAllPowers(): SupportPowerInstance[] {
    return Array.from(this.powers.values());
  }

  /** 获取已就绪的武器 */
  getReadyPowers(): SupportPowerInstance[] {
    return this.getAllPowers().filter((p) => p.isReady && !p.isFired);
  }

  /** 每逻辑帧调用（deltaSeconds） */
  tick(deltaSeconds: number): void {
    for (const power of this.powers.values()) {
      if (power.isReady || power.isFired) continue;
      power.elapsed += deltaSeconds;
      if (power.elapsed >= power.config.chargeTime) {
        power.isReady = true;
        this.emit({ type: 'ready', id: power.id });
      }
    }
  }

  /** 发射超级武器（需要指定目标格子） */
  firePower(id: string, targetX: number, targetY: number): boolean {
    const power = this.powers.get(id);
    if (!power || !power.isReady || power.isFired) return false;
    power.isFired = true;
    power.targetCell = { x: targetX, y: targetY };
    this.emit({ type: 'fired', id: power.id });
    return true;
  }

  /** 重置指定武器（重新蓄力） */
  resetPower(id: string): void {
    const power = this.powers.get(id);
    if (!power) return;
    power.elapsed = 0;
    power.isReady = false;
    power.isFired = false;
    power.targetCell = undefined;
  }

  /** 监听事件 */
  onEvent(listener: (event: { type: 'ready'; id: string } | { type: 'fired'; id: string }) => void): void {
    this.listeners.push(listener);
  }

  private emit(event: { type: 'ready'; id: string } | { type: 'fired'; id: string }): void {
    for (const l of this.listeners) {
      l(event);
    }
  }
}
