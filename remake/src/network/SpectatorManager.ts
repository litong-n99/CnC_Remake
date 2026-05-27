/**
 * Spectator Manager — Task 67
 *
 * Manages spectator connections: observers who join mid-game
 * without owning units. Spectators see the full map (no fog)
 * and do not affect game state.
 *
 * OpenRA 对标: Server.SpectatorSlots
 */

export interface Spectator {
  id: string;
  name: string;
  joinedAtFrame: number;
}

export class SpectatorManager {
  private spectators = new Map<string, Spectator>();

  addSpectator(id: string, name: string, frame: number): Spectator {
    const spec: Spectator = { id, name, joinedAtFrame: frame };
    this.spectators.set(id, spec);
    return spec;
  }

  removeSpectator(id: string): boolean {
    return this.spectators.delete(id);
  }

  getSpectator(id: string): Spectator | undefined {
    return this.spectators.get(id);
  }

  getAllSpectators(): Spectator[] {
    return Array.from(this.spectators.values());
  }

  getCount(): number {
    return this.spectators.size;
  }

  clear(): void {
    this.spectators.clear();
  }
}
