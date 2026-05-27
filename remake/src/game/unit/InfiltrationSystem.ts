import { House } from '../house/House';
import { GameObjectManager } from '../objects/GameObjectManager';
import type { Building } from '../objects/Building';
import type { Unit } from '../objects/Unit';
import { UNIT_DEFINITIONS } from '../rules/UnitDefinitions';

/**
 * Infiltration System — Task 85
 *
 * Handles spy units entering enemy buildings to steal
 * technology, funds, or sabotage power.
 *
 * Source: origin/REDALERT/INFANTRY.CPP (Spy infiltration logic)
 */
export class InfiltrationSystem {
  private static instance: InfiltrationSystem | null = null;
  static getInstance(): InfiltrationSystem {
    if (!InfiltrationSystem.instance) {
      InfiltrationSystem.instance = new InfiltrationSystem();
    }
    return InfiltrationSystem.instance;
  }
  static reset(): void {
    InfiltrationSystem.instance = null;
  }

  /** Set of infiltrated building IDs (prevents double-infiltration). */
  private infiltratedBuildings = new Set<string>();
  /** Houses that have stolen enemy vehicle tech (via war-factory infiltration). */
  private stolenTechHouses = new Set<House>();

  /** Check if a unit entering a cell should trigger infiltration. */
  checkInfiltration(unit: Unit): InfiltrationResult | null {
    if (unit.definition.id !== 'INFANTRY_SPY') return null;

    const cx = Math.round(unit.x);
    const cy = Math.round(unit.y);

    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getBuildings()) {
      if (!obj.isAlive()) continue;
      const building = obj as Building;
      // Must be enemy building
      if (building.house.id === unit.house.id) continue;
      // Check if unit is inside building footprint
      if (!this.isInsideBuilding(cx, cy, building)) continue;
      // Already infiltrated?
      if (this.infiltratedBuildings.has(building.id)) continue;

      return this.applyInfiltration(unit.house, building);
    }
    return null;
  }

  /** Apply infiltration effect based on building type. */
  private applyInfiltration(spyHouse: House, building: Building): InfiltrationResult {
    this.infiltratedBuildings.add(building.id);

    const def = building.definition;

    // Refinery: steal 50% of enemy credits
    if (def.isRefinery) {
      const stolen = Math.floor(building.house.credits * 0.5);
      building.house.credits -= stolen;
      spyHouse.addCredits(stolen);
      return { type: 'credits', amount: stolen, buildingId: building.id };
    }

    // Power plant: temporary power sabotage (record for external power manager)
    if (def.id === 'STRUCT_POWER' || def.id === 'STRUCT_ADVANCED_POWER') {
      return { type: 'power', buildingId: building.id };
    }

    // War Factory / Barracks: steal tech (unlock enemy units)
    if (def.isFactory) {
      this.stolenTechHouses.add(spyHouse);
      return { type: 'tech', buildingId: building.id };
    }

    // Generic building: basic intel
    return { type: 'intel', buildingId: building.id };
  }

  /** Whether a house has stolen enemy vehicle tech. */
  hasStolenTech(house: House): boolean {
    return this.stolenTechHouses.has(house);
  }

  /** Grant stolen tech units to a house (call after infiltration). */
  grantStolenTech(house: House): void {
    if (!this.stolenTechHouses.has(house)) return;
    // Unlock all enemy vehicle units
    for (const [, def] of Object.entries(UNIT_DEFINITIONS)) {
      if (def.locomotion !== 0 /* Foot */ && def.techLevel >= 0) {
        house.availableUnits.add(def.id);
      }
    }
  }

  /** Number of buildings infiltrated (for stats). */
  getInfiltratedCount(): number {
    return this.infiltratedBuildings.size;
  }

  /** Reset for testing. */
  clear(): void {
    this.infiltratedBuildings.clear();
    this.stolenTechHouses.clear();
  }

  private isInsideBuilding(cx: number, cy: number, building: Building): boolean {
    const bx = Math.round(building.x);
    const by = Math.round(building.y);
    const bw = building.definition.width;
    const bh = building.definition.height;
    return cx >= bx && cx < bx + bw && cy >= by && cy < by + bh;
  }
}

/** Result of a successful infiltration. */
export interface InfiltrationResult {
  type: 'credits' | 'power' | 'tech' | 'intel';
  amount?: number;
  buildingId: string;
}
