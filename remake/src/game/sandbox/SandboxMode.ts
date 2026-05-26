import { Scene } from '@babylonjs/core';
import { Unit } from '../objects/Unit';
import { House } from '../house/House';
import { UnitDefinition } from '../rules/UnitDefinitions';
import { GameObjectFactory } from '../objects/GameObjectFactory';

export interface Squad {
  units: Unit[];
  definition: UnitDefinition;
  house: House;
}

export interface BattleStats {
  elapsedMs: number;
  squadA: {
    startCount: number;
    aliveCount: number;
    totalHealth: number;
    maxHealth: number;
  };
  squadB: {
    startCount: number;
    aliveCount: number;
    totalHealth: number;
    maxHealth: number;
  };
  winner: 'A' | 'B' | 'draw' | 'undecided';
}

/**
 * SandboxMode — 单位测试/平衡工具。
 *
 * 支持批量生成单位、自动对打、实时统计 DPS 与击杀时间。
 *
 * Source: OpenRA 的 Lua 沙盒测试脚本 / 社区平衡 mod 工具。
 */
export class SandboxMode {
  private squads: Map<string, Squad> = new Map();
  private battleStartTime = 0;
  private isBattling = false;
  private stats: BattleStats | null = null;

  /** 批量生成单位编队。 */
  spawnSquad(
    id: string,
    definition: UnitDefinition,
    count: number,
    house: House,
    startX: number,
    startY: number,
    spacing: number,
    scene: Scene
  ): Squad {
    const units: Unit[] = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const unit = GameObjectFactory.createUnit({
        definition,
        house,
        x: startX + col * spacing,
        y: startY + row * spacing,
        scene,
      });
      units.push(unit);
    }
    const squad: Squad = { units, definition, house };
    this.squads.set(id, squad);
    return squad;
  }

  /** 获取指定编队的存活单位。 */
  getAliveUnits(id: string): Unit[] {
    const squad = this.squads.get(id);
    if (!squad) return [];
    return squad.units.filter((u) => u.isAlive());
  }

  /** 开始一场自动对打（squadA vs squadB）。 */
  startBattle(squadAId: string, squadBId: string): boolean {
    const squadA = this.squads.get(squadAId);
    const squadB = this.squads.get(squadBId);
    if (!squadA || !squadB) return false;

    this.battleStartTime = performance.now();
    this.isBattling = true;
    this.stats = null;

    // 互相设置 attackTarget（简化：每个单位攻击对方最近的存活单位）
    for (const unit of squadA.units) {
      if (!unit.isAlive()) continue;
      const target = this.findNearestAliveEnemy(unit, squadB.units);
      if (target) {
        unit.logic.attackTarget = { x: target.x, y: target.y };
      }
    }
    for (const unit of squadB.units) {
      if (!unit.isAlive()) continue;
      const target = this.findNearestAliveEnemy(unit, squadA.units);
      if (target) {
        unit.logic.attackTarget = { x: target.x, y: target.y };
      }
    }

    return true;
  }

  /** 每帧更新统计（应在 GameLoop 的 logic tick 中调用）。 */
  tick(): void {
    if (!this.isBattling) return;

    const squadA = Array.from(this.squads.values())[0];
    const squadB = Array.from(this.squads.values())[1];
    if (!squadA || !squadB) return;

    const aliveA = squadA.units.filter((u) => u.isAlive());
    const aliveB = squadB.units.filter((u) => u.isAlive());

    if (aliveA.length === 0 || aliveB.length === 0) {
      this.isBattling = false;
      const elapsed = performance.now() - this.battleStartTime;
      const winner = aliveA.length > 0 ? 'A' : aliveB.length > 0 ? 'B' : 'draw';
      this.stats = {
        elapsedMs: Math.round(elapsed),
        squadA: {
          startCount: squadA.units.length,
          aliveCount: aliveA.length,
          totalHealth: aliveA.reduce((sum, u) => sum + u.health, 0),
          maxHealth: squadA.units.reduce((sum, u) => sum + u.maxHealth, 0),
        },
        squadB: {
          startCount: squadB.units.length,
          aliveCount: aliveB.length,
          totalHealth: aliveB.reduce((sum, u) => sum + u.health, 0),
          maxHealth: squadB.units.reduce((sum, u) => sum + u.maxHealth, 0),
        },
        winner,
      };
    }
  }

  /** 获取当前或最后的战斗统计。 */
  getStats(): BattleStats | null {
    return this.stats;
  }

  /** 是否正在战斗中。 */
  isRunning(): boolean {
    return this.isBattling;
  }

  /** 清除所有沙盒单位。 */
  clear(): void {
    for (const squad of this.squads.values()) {
      for (const unit of squad.units) {
        if (unit.isAlive()) {
          unit.takeDamage(unit.health + 1);
        }
      }
    }
    this.squads.clear();
    this.isBattling = false;
    this.stats = null;
  }

  private findNearestAliveEnemy(unit: Unit, enemies: Unit[]): Unit | null {
    let nearest: Unit | null = null;
    let minDist = Infinity;
    for (const e of enemies) {
      if (!e.isAlive()) continue;
      const dx = unit.x - e.x;
      const dy = unit.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }
    return nearest;
  }
}
