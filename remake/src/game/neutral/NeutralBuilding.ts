/**
 * Neutral Building — Task 88
 *
 * Neutral structures that can be captured to provide faction-wide bonuses.
 * Examples: Hospital (infantry auto-heal), Oil Derrick (periodic income).
 */

export type NeutralBonusType = 'heal' | 'income' | 'vision';

export interface NeutralBonus {
  type: NeutralBonusType;
  value: number; // heal = HP/s, income = credits/s, vision = sight bonus
}

export interface NeutralBuildingDef {
  id: string;
  name: string;
  strength: number;
  bonus: NeutralBonus;
}

export class NeutralBuilding {
  id: string;
  def: NeutralBuildingDef;
  x: number;
  y: number;
  health: number;
  capturedBy: string | null = null;
  isActive = false;

  constructor(id: string, def: NeutralBuildingDef, x: number, y: number) {
    this.id = id;
    this.def = def;
    this.x = x;
    this.y = y;
    this.health = def.strength;
  }

  capture(houseId: string): void {
    this.capturedBy = houseId;
    this.isActive = true;
  }

  loseCapture(): void {
    this.capturedBy = null;
    this.isActive = false;
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.isActive = false;
    }
  }

  isAlive(): boolean {
    return this.health > 0;
  }
}

export class NeutralBuildingManager {
  private buildings = new Map<string, NeutralBuilding>();

  add(building: NeutralBuilding): void {
    this.buildings.set(building.id, building);
  }

  get(id: string): NeutralBuilding | undefined {
    return this.buildings.get(id);
  }

  getAll(): NeutralBuilding[] {
    return Array.from(this.buildings.values());
  }

  getCapturedBy(houseId: string): NeutralBuilding[] {
    return this.getAll().filter((b) => b.capturedBy === houseId && b.isActive);
  }

  remove(id: string): boolean {
    return this.buildings.delete(id);
  }

  /** Apply passive bonuses (call every logic tick). */
  tickBonuses(dt: number, applyCallback: (houseId: string, bonus: NeutralBonus, dt: number) => void): void {
    for (const b of this.buildings.values()) {
      if (b.isActive && b.capturedBy) {
        applyCallback(b.capturedBy, b.def.bonus, dt);
      }
    }
  }
}
