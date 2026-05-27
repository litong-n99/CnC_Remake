/**
 * 外交关系系统 — Task 27.5
 * Source: harness/01_TASK_BREAKDOWN.md — Task 27.5
 * OpenRA 对标: OpenRA.Game/Player.cs 中 AlliedPlayersMask / EnemyPlayersMask / RelationshipWith()
 *
 * 核心设计：
 *   - HouseRelationship 枚举：Ally / Enemy / Neutral
 *   - HouseDiplomacy：维护每个 House 对其他 House 的关系映射
 *   - 初始关系：同 Team = Ally，不同 Team = Enemy，Neutral 需显式设置
 *   - 支持运行时变更（任务中临时结盟/背叛）
 */

import { HouseType } from './House';

/** 阵营间外交关系枚举。 */
export enum HouseRelationship {
  Ally = 'Ally',
  Enemy = 'Enemy',
  Neutral = 'Neutral',
}

/**
 * 单个阵营的外交关系管理器。
 *
 * 每个 House 实例持有一个 HouseDiplomacy，记录该阵营对所有其他阵营的关系。
 */
export class HouseDiplomacy {
  private readonly owner: HouseType;
  private readonly relationships = new Map<HouseType, HouseRelationship>();
  private defaultEnemy = true;

  constructor(owner: HouseType) {
    this.owner = owner;
  }

  /**
   * 设置对指定阵营的关系。
   * @param other — 目标阵营
   * @param rel   — 关系类型
   */
  setRelationship(other: HouseType, rel: HouseRelationship): void {
    if (other === this.owner) return;
    this.relationships.set(other, rel);
  }

  /**
   * 获取对指定阵营的关系。
   * @param other — 目标阵营
   * @returns 关系类型（未设置时返回默认关系）
   */
  getRelationship(other: HouseType): HouseRelationship {
    if (other === this.owner) return HouseRelationship.Ally;
    return this.relationships.get(other) ?? (this.defaultEnemy ? HouseRelationship.Enemy : HouseRelationship.Neutral);
  }

  /**
   * 获取对指定阵营的关系（观战者模式）。
   * 观战者视为所有活跃玩家的盟友。
   */
  getRelationshipForSpectator(_other: HouseType): HouseRelationship {
    return HouseRelationship.Ally;
  }

  /** 是否与指定阵营为盟友。 */
  isAlliedWith(other: HouseType): boolean {
    return this.getRelationship(other) === HouseRelationship.Ally;
  }

  /** 是否与指定阵营为敌人。 */
  isEnemyWith(other: HouseType): boolean {
    return this.getRelationship(other) === HouseRelationship.Enemy;
  }

  /** 是否与指定阵营为中立。 */
  isNeutralWith(other: HouseType): boolean {
    return this.getRelationship(other) === HouseRelationship.Neutral;
  }

  /** 获取所有被显式标记为敌人的阵营类型。 */
  getExplicitEnemies(): HouseType[] {
    return Array.from(this.relationships.entries())
      .filter(([, rel]) => rel === HouseRelationship.Enemy)
      .map(([type]) => type);
  }

  /** 获取所有被显式标记为盟友的阵营类型。 */
  getExplicitAllies(): HouseType[] {
    return Array.from(this.relationships.entries())
      .filter(([, rel]) => rel === HouseRelationship.Ally)
      .map(([type]) => type);
  }

  /** 按 Team 批量初始化关系：同 Team = Ally，不同 Team = Enemy。 */
  initializeByTeam(allHouses: ReadonlyArray<{ type: HouseType; team?: number }>, ownTeam?: number): void {
    for (const h of allHouses) {
      if (h.type === this.owner) continue;
      if (ownTeam !== undefined && h.team !== undefined && ownTeam === h.team) {
        this.relationships.set(h.type, HouseRelationship.Ally);
      } else {
        this.relationships.set(h.type, HouseRelationship.Enemy);
      }
    }
  }

  /** 切换默认未设置关系时的行为（true=默认Enemy，false=默认Neutral）。 */
  setDefaultEnemy(value: boolean): void {
    this.defaultEnemy = value;
  }

  /** 序列化为普通对象（用于存档/网络同步）。 */
  serialize(): Record<string, HouseRelationship> {
    const result: Record<string, HouseRelationship> = {};
    for (const [type, rel] of this.relationships) {
      result[String(type)] = rel;
    }
    return result;
  }

  /** 从普通对象恢复（用于读档/网络同步）。 */
  deserialize(data: Record<string, HouseRelationship>): void {
    this.relationships.clear();
    for (const [key, rel] of Object.entries(data)) {
      const type = Number(key);
      if (!Number.isNaN(type) && key !== String(HouseType.None)) {
        this.relationships.set(type as HouseType, rel);
      }
    }
  }
}

/**
 * 根据外交关系返回立场颜色。
 * @param rel — 外交关系
 * @returns CSS 颜色字符串
 */
export function getRelationshipColor(rel: HouseRelationship): string {
  switch (rel) {
    case HouseRelationship.Ally:
      return '#00FF00'; // 绿色 — 友军
    case HouseRelationship.Enemy:
      return '#FF0000'; // 红色 — 敌军
    case HouseRelationship.Neutral:
      return '#888888'; // 灰色 — 中立
    default:
      return '#FFFFFF';
  }
}
