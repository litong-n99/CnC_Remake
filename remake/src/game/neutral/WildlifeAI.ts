/**
 * Wildlife AI — Task 88
 *
 * Neutral animals that roam the map randomly.
 * When attacked they either flee or counter-attack.
 */

export interface Wildlife {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  state: 'idle' | 'roam' | 'flee' | 'attack';
  targetX?: number;
  targetY?: number;
}

export class WildlifeAI {
  private animals = new Map<string, Wildlife>();
  private roamTimer = 0;
  private readonly roamInterval = 2; // seconds

  addAnimal(id: string, x: number, y: number, speed = 1): Wildlife {
    const animal: Wildlife = {
      id,
      x,
      y,
      health: 10,
      maxHealth: 10,
      speed,
      state: 'idle',
    };
    this.animals.set(id, animal);
    return animal;
  }

  removeAnimal(id: string): boolean {
    return this.animals.delete(id);
  }

  getAnimal(id: string): Wildlife | undefined {
    return this.animals.get(id);
  }

  getAllAnimals(): Wildlife[] {
    return Array.from(this.animals.values());
  }

  /** Notify that an animal was attacked. It switches to flee or attack. */
  onAttacked(animalId: string, attackerX: number, attackerY: number): void {
    const animal = this.animals.get(animalId);
    if (!animal || animal.health <= 0) return;

    // 50% flee, 50% counter-attack (simple rule)
    const dx = animal.x - attackerX;
    const dy = animal.y - attackerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (Math.random() < 0.5) {
      animal.state = 'flee';
      // Run away from attacker
      if (dist > 0.001) {
        animal.targetX = animal.x + (dx / dist) * 5;
        animal.targetY = animal.y + (dy / dist) * 5;
      }
    } else {
      animal.state = 'attack';
      animal.targetX = attackerX;
      animal.targetY = attackerY;
    }
  }

  /** Advance AI for all animals. */
  tick(dt: number): void {
    this.roamTimer += dt;
    const shouldPickNewRoam = this.roamTimer >= this.roamInterval;
    if (shouldPickNewRoam) {
      this.roamTimer = 0;
    }

    for (const a of this.animals.values()) {
      if (a.health <= 0) continue;

      if (a.state === 'idle' && shouldPickNewRoam) {
        a.state = 'roam';
        a.targetX = a.x + (Math.random() - 0.5) * 4;
        a.targetY = a.y + (Math.random() - 0.5) * 4;
      }

      if (a.state === 'roam' || a.state === 'flee' || a.state === 'attack') {
        if (a.targetX === undefined || a.targetY === undefined) {
          a.state = 'idle';
          continue;
        }

        const dx = a.targetX - a.x;
        const dy = a.targetY - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = a.speed * dt;

        if (dist <= step) {
          a.x = a.targetX;
          a.y = a.targetY;
          a.state = 'idle';
          a.targetX = undefined;
          a.targetY = undefined;
        } else {
          a.x += (dx / dist) * step;
          a.y += (dy / dist) * step;
        }
      }
    }
  }
}
