import type { Scene } from '@babylonjs/core';
import type { Lighting } from '../renderer/Lighting';
import { GameObjectFactory } from '../game/objects/GameObjectFactory';
import { GameObjectManager } from '../game/objects/GameObjectManager';
import { GameObjectType } from '../game/objects/GameObject';
import { HouseManager } from '../game/house/HouseManager';
import { HouseType } from '../game/house/House';
import { UNIT_DEFINITIONS } from '../game/rules/UnitDefinitions';
import { BUILDING_DEFINITIONS } from '../game/rules/BuildingDefinitions';
import type { BuildingDefinition } from '../game/rules/BuildingDefinitions';
import { Unit } from '../game/objects/Unit';
import { Building } from '../game/objects/Building';
import type { House } from '../game/house/House';
import { RTSCamera } from '../core/RTSCamera';
import { TerrainGrid, LandType } from '../game/terrain/TerrainGrid';
import { UnitCollision } from '../game/unit/UnitCollision';
import { BlockedByActor } from '../game/unit/BlockedByActor';
import { ActorMap } from '../game/world/ActorMap';
import { LocomotorCache, CellFlag } from '../game/world/LocomotorCache';
import { BuildingPlacer } from '../game/building/BuildingPlacer';
import type { PathNode, Pathfinder } from '../game/terrain/Pathfinder';
import { getLocomotor, makeTerrainCostCallback } from '../game/rules/Locomotor';
import { Locomotion } from '../game/rules/UnitDefinitions';

/**
 * Debug console — exposes `window.cnc` commands for runtime spawning,
 * inspection and manipulation of game objects.
 *
 * This is a development aid only; it bypasses normal build queues and
 * prerequisites.  Do not use in production builds.
 */
export class GameConsole {
  private pendingBuilding: { readonly definition: BuildingDefinition; readonly house: House } | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly lighting: Lighting,
    private readonly rtsCamera: RTSCamera,
    private readonly terrain: TerrainGrid,
    private readonly placer: BuildingPlacer,
    private readonly pathfinder?: Pathfinder
  ) {}

  /** Register all commands on `window.cnc`. */
  install(): void {
    (window as unknown as Record<string, unknown>).cnc = {
      unit: this.createUnit.bind(this),
      building: this.startBuildingPlacement.bind(this),
      money: this.money.bind(this),
      power: this.power.bind(this),
      kill: this.kill.bind(this),
      clear: this.clear.bind(this),
      list: this.list.bind(this),
      actorMap: this.actorMap.bind(this),
      collision: this.collision.bind(this),
      pathfind: this.pathfind.bind(this),
      moveUnit: this.moveUnit.bind(this),
      distance: this.distance.bind(this),
      debugState: this.debugState.bind(this),
      locomotorCache: this.locomotorCache.bind(this),
      help: this.help.bind(this),
    };
    // eslint-disable-next-line no-console
    console.info('GameConsole installed. Type cnc.help() for available commands.');
  }

  // ── Spawning ──

  /**
   * Spawn a unit at the given cell coordinates.
   *
   * If `x` and `y` are omitted, the unit is placed on the nearest
   * passable ground to the current camera target.
   *
   * @param type      — key from {@link UNIT_DEFINITIONS} (e.g. `'MediumTank'`)
   * @param houseName — `'gdi'` (default) or `'nod'`
   * @param x         — cell X coordinate (optional)
   * @param y         — cell Y coordinate (optional)
   */
  private createUnit(type: string, houseName = 'gdi', x?: number, y?: number): Unit | undefined {
    const allDefs = UNIT_DEFINITIONS as unknown as Record<
      string,
      import('../game/rules/UnitDefinitions').UnitDefinition
    >;
    if (!(type in allDefs)) {
      console.warn(`Unknown unit type: "${type}". Available:`, Object.keys(allDefs).join(', '));
      return undefined;
    }
    const house = this.resolveHouse(houseName);
    if (!house) {
      console.warn(`Unknown house: "${houseName}". Available: gdi, nod`);
      return undefined;
    }

    // Resolve spawn position
    let spawnX = x;
    let spawnY = y;
    if (spawnX === undefined || spawnY === undefined) {
      const free = this.findNearestFreeCell();
      if (!free) {
        console.warn('No free ground found near camera target');
        return undefined;
      }
      spawnX = free.x;
      spawnY = free.y;
    }

    const unit = GameObjectFactory.createUnit({
      definition: allDefs[type],
      house,
      x: spawnX,
      y: spawnY,
      scene: this.scene,
    });
    if (unit.mesh) {
      this.lighting.addShadowCaster(unit.mesh);
      this.lighting.enableShadowsOnMesh(unit.mesh);
    }
    // eslint-disable-next-line no-console
    console.info(`Created ${unit.definition.name} at (${spawnX}, ${spawnY}) for ${house.name}`);
    return unit;
  }

  /**
   * Start placement mode for a building.
   *
   * A ghost preview follows the mouse; left-click to confirm placement,
   * right-click to cancel.  This bypasses the construction queue.
   *
   * @param type      — key from {@link BUILDING_DEFINITIONS} (e.g. `'PowerPlant'`)
   * @param houseName — `'gdi'` (default) or `'nod'`
   * @returns `true` if placement mode was started successfully.
   */
  private startBuildingPlacement(type: string, houseName = 'gdi'): boolean {
    const allDefs = BUILDING_DEFINITIONS as unknown as Record<string, BuildingDefinition>;
    if (!(type in allDefs)) {
      console.warn(`Unknown building type: "${type}". Available:`, Object.keys(allDefs).join(', '));
      return false;
    }
    const house = this.resolveHouse(houseName);
    if (!house) {
      console.warn(`Unknown house: "${houseName}". Available: gdi, nod`);
      return false;
    }
    this.pendingBuilding = { definition: allDefs[type], house };
    this.placer.startPlacement(allDefs[type]);
    // eslint-disable-next-line no-console
    console.info(
      `Placement mode started for ${allDefs[type].name} (${house.name}) — left-click to place, right-click to cancel`
    );
    return true;
  }

  // ── Pending-building bridge (called by main.ts) ──

  /** Whether the console has a building waiting to be placed. */
  hasPendingBuilding(): boolean {
    return this.pendingBuilding !== null;
  }

  /**
   * Place the pending building at the given cell.
   * @returns The created Building, or `null` if nothing is pending.
   */
  tryPlaceBuilding(cellX: number, cellY: number, scene: Scene): Building | null {
    if (!this.pendingBuilding) return null;
    const { definition, house } = this.pendingBuilding;
    const building = GameObjectFactory.createBuilding({
      definition,
      house,
      x: cellX,
      y: cellY,
      scene,
    });
    this.pendingBuilding = null;
    return building;
  }

  /** Cancel the pending building without placing it. */
  clearPendingBuilding(): void {
    this.pendingBuilding = null;
  }

  // ── Economy ──

  /**
   * Show or modify credits.
   *
   * @param houseName — `'gdi'`, `'nod'` or omitted (shows all)
   * @param amount    — credits to add; omitted = show only
   */
  private money(houseName?: string, amount?: number): void {
    const manager = HouseManager.getInstance();
    if (houseName === undefined) {
      for (const h of manager.getAllHouses()) {
        // eslint-disable-next-line no-console
        console.info(`${h.name}: ${h.credits} credits`);
      }
      return;
    }
    const house = this.resolveHouse(houseName);
    if (!house) {
      console.warn(`Unknown house: "${houseName}"`);
      return;
    }
    if (amount === undefined) {
      // eslint-disable-next-line no-console
      console.info(`${house.name}: ${house.credits} credits`);
      return;
    }
    house.addCredits(amount);
    // eslint-disable-next-line no-console
    console.info(`${house.name}: +${amount} credits → ${house.credits}`);
  }

  /**
   * Show power status.
   *
   * @param houseName — `'gdi'`, `'nod'` or omitted (shows all)
   */
  private power(houseName?: string): void {
    const manager = HouseManager.getInstance();
    if (houseName === undefined) {
      for (const h of manager.getAllHouses()) {
        const bal = h.getPowerBalance();
        // eslint-disable-next-line no-console
        console.info(`${h.name}: ${h.power}/${h.drain} (${bal >= 0 ? '+' : ''}${bal})`);
      }
      return;
    }
    const house = this.resolveHouse(houseName);
    if (!house) {
      console.warn(`Unknown house: "${houseName}"`);
      return;
    }
    // eslint-disable-next-line no-console
    console.info(`${house.name}: production=${house.power}, drain=${house.drain}, balance=${house.getPowerBalance()}`);
  }

  // ── Destruction ──

  /**
   * Kill objects.
   *
   * @param type — `'units'`, `'buildings'` or omitted (all)
   */
  private kill(type?: string): void {
    const manager = GameObjectManager.getInstance();
    let count = 0;
    for (const obj of manager.getAll()) {
      if (!obj.isAlive()) continue;
      if (type === 'units' && obj.type !== GameObjectType.Unit) continue;
      if (type === 'buildings' && obj.type !== GameObjectType.Building) continue;
      manager.unregister(obj.id);
      count++;
    }
    // eslint-disable-next-line no-console
    console.info(`Killed ${count} objects${type ? ` (${type})` : ''}`);
  }

  /** Remove every object from the world. */
  private clear(): void {
    GameObjectManager.getInstance().clear();
    // eslint-disable-next-line no-console
    console.info('All objects cleared');
  }

  /** List all units and buildings. */
  private list(): void {
    const manager = GameObjectManager.getInstance();
    const units = manager.getUnits();
    const buildings = manager.getBuildings();
    // eslint-disable-next-line no-console
    console.info(`Units (${units.length}):`);
    for (const u of units) {
      const unit = u as Unit;
      // eslint-disable-next-line no-console
      console.info(`  [${unit.house.name}] ${unit.definition.name} at (${unit.x}, ${unit.y})`);
    }
    // eslint-disable-next-line no-console
    console.info(`Buildings (${buildings.length}):`);
    for (const b of buildings) {
      const building = b as Building;
      // eslint-disable-next-line no-console
      console.info(`  [${building.house.name}] ${building.definition.name} at (${building.x}, ${building.y})`);
    }
  }

  /** Check whether a cell is blocked by another unit.
   * @param check — 'All' | 'Stationary' | 'Immovable' | 'None' (default 'All')
   * @returns true if the cell contains at least one unit other than excludeId.
   */
  private collision(x: number, y: number, excludeId?: string, checkName = 'All'): boolean {
    const check = this.parseBlockedByActor(checkName);
    const blocked = UnitCollision.isPositionBlocked(x, y, excludeId ?? '', check);
    // eslint-disable-next-line no-console
    console.info(`Collision (${x}, ${y}) [${checkName}]: ${blocked ? 'BLOCKED' : 'FREE'}`);
    return blocked;
  }

  /** Move a specific unit to a target cell.
   * @returns true if a path was found and movement started.
   */
  private moveUnit(unitId: string, targetX: number, targetY: number): boolean {
    if (!this.pathfinder) {
      console.warn('Pathfinder not available in GameConsole');
      return false;
    }
    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getAll()) {
      if (obj.id === unitId && obj.type === GameObjectType.Unit) {
        const unit = obj as Unit;
        const success = unit.logic.moveTo(targetX, targetY, this.pathfinder);
        // eslint-disable-next-line no-console
        console.info(
          `Move ${unit.definition.name} (${unitId}) → (${targetX}, ${targetY}):`,
          success ? 'STARTED' : 'FAILED'
        );
        return success;
      }
    }
    console.warn(`Unit not found: ${unitId}`);
    return false;
  }

  /** Run A* pathfinding with current unit blockers.
   * @param check — 'All' | 'Stationary' | 'Immovable' | 'None' (default 'All')
   * @param locomotion — 'Foot' | 'Track' | 'Wheel' | 'Winged' | 'Float' (default 'Track')
   * @returns Path nodes (incl. start & end) or null if no path.
   */
  private pathfind(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    checkName = 'All',
    locomotionName = 'Track'
  ): PathNode[] | null {
    if (!this.pathfinder) {
      console.warn('Pathfinder not available in GameConsole');
      return null;
    }
    const check = this.parseBlockedByActor(checkName);
    const blockedCells = UnitCollision.getBlockedCells('', check);
    const locomotion = (Locomotion as Record<string, unknown>)[locomotionName] as Locomotion | undefined;
    const locomotor = locomotion !== undefined ? getLocomotor(locomotion) : getLocomotor(Locomotion.Track);
    const getTerrainCost = this.pathfinder.getTerrainType
      ? makeTerrainCostCallback(locomotor, this.pathfinder.getTerrainType)
      : undefined;
    const path = this.pathfinder.findPath(startX, startY, endX, endY, blockedCells, check, 0, false, getTerrainCost);
    // eslint-disable-next-line no-console
    console.info(
      `Pathfind (${startX},${startY}) → (${endX},${endY}) [${checkName}, ${locomotionName}]:`,
      path ? path.map((n) => `(${n.x},${n.y})`).join(' -> ') : 'NO PATH'
    );
    return path;
  }

  private parseBlockedByActor(name: string): BlockedByActor {
    switch (name) {
      case 'None':
        return BlockedByActor.None;
      case 'Immovable':
        return BlockedByActor.Immovable;
      case 'Stationary':
        return BlockedByActor.Stationary;
      default:
        return BlockedByActor.All;
    }
  }

  /** Inspect ActorMap occupancy.
   * @returns Structured data for programmatic access (e.g. E2E tests).
   */
  private actorMap(
    x?: number,
    y?: number
  ):
    | { cells: Array<{ x: number; y: number; occupants: readonly string[] }> }
    | { x: number; y: number; occupants: readonly string[] } {
    const am = ActorMap.getInstance();
    if (x !== undefined && y !== undefined) {
      const occupants = am.getOccupants(x, y);
      // eslint-disable-next-line no-console
      console.info(`Cell (${x}, ${y}): ${occupants.length} unit(s) — [${occupants.join(', ')}]`);
      return { x, y, occupants };
    } else {
      const cells = am.getAllOccupiedCells();
      // eslint-disable-next-line no-console
      console.info(`ActorMap — ${cells.size} occupied cell(s):`);
      const result: Array<{ x: number; y: number; occupants: readonly string[] }> = [];
      for (const key of cells) {
        const [cx, cy] = key.split(',').map(Number);
        const occupants = am.getOccupants(cx, cy);
        // eslint-disable-next-line no-console
        console.info(`  (${cx}, ${cy}): [${occupants.join(', ')}]`);
        result.push({ x: cx, y: cy, occupants });
      }
      return { cells: result };
    }
  }

  /** Inspect LocomotorCache at a specific cell.
   * @returns CellCache data for programmatic access (e.g. E2E tests).
   */
  private locomotorCache(x: number, y: number): Record<string, unknown> | undefined {
    const cache = LocomotorCache.getInstance().getCache(x, y);
    // eslint-disable-next-line no-console
    console.info(
      `LocomotorCache (${x}, ${y}): total=${cache.totalCount}, ` +
        `sharesCell=${cache.sharesCellCount}, nonSharesCell=${cache.nonSharesCellCount}, ` +
        `moving=${cache.movingCount}, stationary=${cache.stationaryCount}, ` +
        `flags=${this.formatCellFlags(cache.cellFlag)}`
    );
    return {
      x,
      y,
      cellFlag: cache.cellFlag,
      sharesCellCount: cache.sharesCellCount,
      nonSharesCellCount: cache.nonSharesCellCount,
      movingCount: cache.movingCount,
      stationaryCount: cache.stationaryCount,
      totalCount: cache.totalCount,
    };
  }

  private formatCellFlags(flag: number): string {
    const names: string[] = [];
    if (flag === CellFlag.HasFreeSpace) names.push('HasFreeSpace');
    if (flag & CellFlag.HasMovingActor) names.push('HasMovingActor');
    if (flag & CellFlag.HasStationaryActor) names.push('HasStationaryActor');
    if (flag & CellFlag.HasMovableActor) names.push('HasMovableActor');
    if (flag & CellFlag.HasCrushableActor) names.push('HasCrushableActor');
    if (flag & CellFlag.HasTemporaryBlocker) names.push('HasTemporaryBlocker');
    return names.join(' | ') || '0';
  }

  /** Return debug state for all units. */
  private debugState(): Array<Record<string, unknown>> {
    const manager = GameObjectManager.getInstance();
    const result: Array<Record<string, unknown>> = [];
    for (const obj of manager.getUnits()) {
      const unit = obj as Unit;
      result.push({
        id: unit.id,
        x: unit.x,
        y: unit.y,
        fromCellX: unit.logic.fromCellX,
        fromCellY: unit.logic.fromCellY,
        toCellX: unit.logic.toCellX,
        toCellY: unit.logic.toCellY,
        isMoving: unit.logic.isMovingBetweenCells,
        isBlocking: unit.logic.isBlocking,
        state: unit.logic.stateMachine.state,
      });
    }
    return result;
  }

  /** Return Euclidean distance between two units. */
  private distance(idA: string, idB: string): number {
    const manager = GameObjectManager.getInstance();
    const a = manager.get(idA);
    const b = manager.get(idB);
    if (!a || !b) {
      console.warn(`One or both units not found: ${idA}, ${idB}`);
      return -1;
    }
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // eslint-disable-next-line no-console
    console.info(`Distance ${idA} ↔ ${idB}: ${dist.toFixed(3)}`);
    return dist;
  }

  /** Show help text. */
  private help(): void {
    // eslint-disable-next-line no-console
    console.info(`
╔══════════════════════════════════════════════════════════════╗
║           C&C Remake — Debug Console (window.cnc)            ║
╠══════════════════════════════════════════════════════════════╣
║ cnc.unit(type, house='gdi', x?, y?)                          ║
║   Spawn a unit. Omit x,y to place at camera centre.          ║
║   Example: cnc.unit('MediumTank', 'gdi')                     ║
║   Example: cnc.unit('MediumTank', 'nod', 30, 30)             ║
║                                                              ║
║ cnc.building(type, house='gdi')                              ║
║   Start placement mode for a building. Ghost follows mouse;  ║
║   left-click to place, right-click to cancel.                ║
║   Example: cnc.building('PowerPlant', 'gdi')                 ║
║                                                              ║
║ cnc.money(house?, amount?)                                   ║
║   Show or add credits. Example: cnc.money('gdi', 5000)       ║
║                                                              ║
║ cnc.power(house?)                                            ║
║   Show power status. Example: cnc.power('nod')               ║
║                                                              ║
║ cnc.kill(type?)                                              ║
║   Kill objects. type = 'units' | 'buildings' | undefined     ║
║                                                              ║
║ cnc.clear()                                                  ║
║   Remove all objects from the world.                         ║
║                                                              ║
║ cnc.list()                                                   ║
║   List all units and buildings.                              ║
║                                                              ║
║ cnc.actorMap(x?, y?)                                         ║
║   Inspect ActorMap occupancy. Omit x,y to list all cells.    ║
║   Example: cnc.actorMap(30, 30)                              ║
║                                                              ║
║ cnc.locomotorCache(x, y)                                     ║
║   Inspect LocomotorCache cell flags and counts.              ║
║   Example: cnc.locomotorCache(30, 30)                        ║
║                                                              ║
║ cnc.collision(x, y, excludeId?)                              ║
║   Check if a cell is blocked by another unit.                ║
║   Example: cnc.collision(30, 30, 'unit-id')                  ║
║                                                              ║
║ cnc.pathfind(startX, startY, endX, endY)                     ║
║   Run A* with current unit blockers. Returns path or null.   ║
║   Example: cnc.pathfind(30, 30, 40, 30)                      ║
║                                                              ║
║ cnc.moveUnit(unitId, targetX, targetY)                       ║
║   Order a specific unit to move to target cell.              ║
║   Example: cnc.moveUnit('unit-abc', 40, 30)                  ║
║                                                              ║
║ cnc.distance(unitIdA, unitIdB)                               ║
║   Return Euclidean distance between two units.               ║
║   Example: cnc.distance('unit-a', 'unit-b')                  ║
║                                                              ║
║ cnc.help()                                                   ║
║   Show this help message.                                    ║
╚══════════════════════════════════════════════════════════════╝
`);
  }

  // ── Helpers ──

  private resolveHouse(name: string): House | undefined {
    const manager = HouseManager.getInstance();
    const lower = name.toLowerCase();
    if (lower === 'gdi') return manager.getHouse(HouseType.GDI);
    if (lower === 'nod') return manager.getHouse(HouseType.Nod);
    return undefined;
  }

  /**
   * Find the nearest passable ground cell to the current camera target.
   * Uses BFS spiral search; checks terrain type and building footprint.
   */
  private findNearestFreeCell(): { x: number; y: number } | undefined {
    const target = this.rtsCamera.getTarget();
    const cx = Math.floor(target.x + 32);
    const cy = Math.floor(target.z + 32);

    const w = this.terrain.getWidth();
    const h = this.terrain.getHeight();

    const isPassable = (x: number, y: number): boolean => {
      if (x < 0 || x >= w || y < 0 || y >= h) return false;
      const type = this.terrain.getCellLandType(x, y);
      if (type === LandType.Water || type === LandType.Rock || type === LandType.Wall || type === LandType.River) {
        return false;
      }
      return !UnitCollision.isPositionBlocked(x, y, '__spawn__');
    };

    const visited = new Set<string>();
    const queue: Array<[number, number]> = [[cx, cy]];
    visited.add(`${cx},${cy}`);

    while (queue.length > 0) {
      const cell = queue.shift();
      if (!cell) break;
      const [x, y] = cell;
      if (isPassable(x, y)) {
        return { x, y };
      }
      const neighbors: Array<[number, number]> = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      for (const [nx, ny] of neighbors) {
        const key = `${nx},${ny}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }
    return undefined;
  }
}
