/**
 * Cargo System — Task 86
 *
 * Manages loading/unloading of infantry into transport units
 * (e.g. helicopters, APCs).
 *
 * OpenRA 对标: Cargo trait
 */

import type { Unit } from '../objects/Unit';

export interface CargoHolder {
  id: string;
  maxPassengers: number;
  passengers: Unit[];
}

export class CargoSystem {
  private holders = new Map<string, CargoHolder>();

  registerHolder(unitId: string, maxPassengers: number): CargoHolder {
    const holder: CargoHolder = { id: unitId, maxPassengers, passengers: [] };
    this.holders.set(unitId, holder);
    return holder;
  }

  unregisterHolder(unitId: string): boolean {
    return this.holders.delete(unitId);
  }

  loadPassenger(holderId: string, passenger: Unit): boolean {
    const holder = this.holders.get(holderId);
    if (!holder) return false;
    if (holder.passengers.length >= holder.maxPassengers) return false;
    if (holder.passengers.includes(passenger)) return false;
    holder.passengers.push(passenger);
    return true;
  }

  unloadPassenger(holderId: string, passengerId?: string): Unit | null {
    const holder = this.holders.get(holderId);
    if (!holder || holder.passengers.length === 0) return null;

    if (passengerId) {
      const idx = holder.passengers.findIndex((p) => p.id === passengerId);
      if (idx === -1) return null;
      return holder.passengers.splice(idx, 1)[0] ?? null;
    }
    // Unload the first passenger
    return holder.passengers.shift() ?? null;
  }

  unloadAll(holderId: string): Unit[] {
    const holder = this.holders.get(holderId);
    if (!holder) return [];
    const all = holder.passengers.slice();
    holder.passengers = [];
    return all;
  }

  getPassengerCount(holderId: string): number {
    return this.holders.get(holderId)?.passengers.length ?? 0;
  }

  isFull(holderId: string): boolean {
    const holder = this.holders.get(holderId);
    if (!holder) return true;
    return holder.passengers.length >= holder.maxPassengers;
  }

  getHolder(holderId: string): CargoHolder | undefined {
    return this.holders.get(holderId);
  }
}
