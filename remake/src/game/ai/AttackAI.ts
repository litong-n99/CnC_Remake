import type { House } from '../house/House';
import { HouseManager } from '../house/HouseManager';
import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObjectType } from '../objects/GameObject';
import type { Unit } from '../objects/Unit';
import type { Pathfinder } from '../terrain/Pathfinder';

/**
 * AI Attack Controller — Task 82
 *
 * Gathers idle combat units into squads and sends them to attack
 * the nearest enemy base. Also dispatches scouts to reveal fog.
 *
 * Source: OpenRA.Mods.Common/Traits/BotModules/SquadManagerBotModule.cs
 */
export class AttackAI {
  /** Minimum units before launching an attack. */
  private readonly attackThreshold: number;
  /** Current attack squad (unit IDs). */
  private squad: string[] = [];
  /** Scout unit ID (single unit for recon). */
  private scoutId: string | null = null;
  /** Whether an attack is currently underway. */
  private attacking = false;
  /** Cooldown between attacks (ms). */
  private attackCooldown = 0;
  private readonly attackCooldownDuration = 30000; // 30s

  constructor(
    private house: House,
    private pathfinder: Pathfinder,
    options: { attackThreshold?: number } = {}
  ) {
    this.attackThreshold = options.attackThreshold ?? 5;
  }

  /** Called every logic tick. */
  tick(_deltaTime: number): void {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= _deltaTime;
    }

    // Maintain scout
    this.updateScout();

    // If attacking, prune dead units and reset when squad is depleted
    if (this.attacking) {
      this.gatherSquad(); // refresh squad to remove dead units
      if (this.squad.length === 0) {
        this.attacking = false;
      }
      return;
    }

    // Gather units and launch attack when threshold is met
    this.gatherSquad();
    if (this.squad.length >= this.attackThreshold && this.attackCooldown <= 0) {
      this.launchAttack();
    }
  }

  /** Number of units currently in the attack squad. */
  getSquadSize(): number {
    return this.squad.length;
  }

  /** Whether an attack is currently active. */
  isAttacking(): boolean {
    return this.attacking;
  }

  /** Current scout unit ID (null if none). */
  getScoutId(): string | null {
    return this.scoutId;
  }

  private gatherSquad(): void {
    // Refresh squad: remove dead / missing units
    const manager = GameObjectManager.getInstance();
    this.squad = this.squad.filter((id) => {
      const obj = manager.get(id);
      return obj && obj.isAlive() && obj.type === GameObjectType.Unit;
    });

    // Find idle combat units not already in squad or scout
    for (const obj of manager.getUnits()) {
      if (obj.type !== GameObjectType.Unit) continue;
      const unit = obj as Unit;
      if (unit.house.id !== this.house.id) continue;
      if (this.squad.includes(unit.id)) continue;
      if (unit.id === this.scoutId) continue;
      // Only combat units (exclude harvesters, MCVs)
      if (unit.definition.id === 'UNIT_HARVESTER' || unit.definition.id === 'UNIT_MCV') continue;
      // Exclude non-combat units (harvester/MCV already filtered above)

      // Check if idle (not moving)
      if (!unit.logic.isMovingBetweenCells && !unit.logic.isDriving) {
        this.squad.push(unit.id);
      }
    }
  }

  private launchAttack(): void {
    const target = this.findEnemyBaseCenter();
    if (!target) return;

    const manager = GameObjectManager.getInstance();
    for (const id of this.squad) {
      const obj = manager.get(id);
      if (obj && obj.type === GameObjectType.Unit) {
        const unit = obj as Unit;
        unit.logic.moveTo(target.x, target.y, this.pathfinder);
      }
    }
    this.attacking = true;
    this.attackCooldown = this.attackCooldownDuration;
  }

  private updateScout(): void {
    const manager = GameObjectManager.getInstance();
    if (this.scoutId) {
      const obj = manager.get(this.scoutId);
      if (!obj || !obj.isAlive()) {
        this.scoutId = null;
      }
    }

    if (!this.scoutId) {
      // Pick a fast, cheap unit as scout (prefer infantry or jeep)
      for (const obj of manager.getUnits()) {
        if (obj.type !== GameObjectType.Unit) continue;
        const unit = obj as Unit;
        if (unit.house.id !== this.house.id) continue;
        if (unit.definition.id === 'UNIT_HARVESTER' || unit.definition.id === 'UNIT_MCV') continue;
        if (!unit.logic.isMovingBetweenCells && !unit.logic.isDriving) {
          this.scoutId = unit.id;
          // Send to a random point near enemy base
          const target = this.findEnemyBaseCenter();
          if (target) {
            // Scout a point offset from enemy base
            const offsetX = Math.floor(Math.random() * 10) - 5;
            const offsetY = Math.floor(Math.random() * 10) - 5;
            unit.logic.moveTo(target.x + offsetX, target.y + offsetY, this.pathfinder);
          }
          break;
        }
      }
    }
  }

  private findEnemyBaseCenter(): { x: number; y: number } | null {
    const manager = GameObjectManager.getInstance();
    const enemies = HouseManager.getInstance().getEnemiesOf(this.house.id);
    if (enemies.length === 0) return null;

    // Find the first enemy's average building position
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const obj of manager.getBuildings()) {
      if (enemies.some((e) => e.id === obj.house.id)) {
        sumX += obj.x;
        sumY += obj.y;
        count++;
      }
    }

    if (count === 0) {
      // No enemy buildings yet — scout toward a default point
      return { x: 30, y: 30 };
    }

    return { x: Math.round(sumX / count), y: Math.round(sumY / count) };
  }
}
