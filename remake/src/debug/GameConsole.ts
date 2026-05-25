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
import { loadTileSetFromUrl } from '../game/terrain/TileSet';
import { ResourceLayer } from '../game/economy/ResourceLayer';
import { UnitCollision } from '../game/unit/UnitCollision';
import { BlockedByActor } from '../game/unit/BlockedByActor';
import { ActorMap } from '../game/world/ActorMap';
import { LocomotorCache, CellFlag } from '../game/world/LocomotorCache';
import { MoveCooldownHelper } from '../game/unit/MoveCooldownHelper';
import { BuildingPlacer } from '../game/building/BuildingPlacer';
import type { PathNode, Pathfinder } from '../game/terrain/Pathfinder';
import { Crushable } from '../game/unit/Crushable';
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

  private resourceLayer: ResourceLayer | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly lighting: Lighting,
    private readonly rtsCamera: RTSCamera,
    private readonly terrain: TerrainGrid,
    private readonly placer: BuildingPlacer,
    private readonly pathfinder?: Pathfinder
  ) {
    // Create default resource layer (Tiberium)
    this.resourceLayer = new ResourceLayer(terrain.getWidth(), terrain.getHeight(), [
      { name: 'Tiberium', terrainType: 'clear', maxDensity: 255, growthRate: 0.05, spreadRate: 0.02, value: 25 },
      { name: 'Ore', terrainType: 'clear', maxDensity: 200, growthRate: 0.03, spreadRate: 0.01, value: 50 },
    ]);
  }

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
      pathfindBi: this.pathfindBi.bind(this),
      pathfindPredicate: this.pathfindPredicate.bind(this),
      moveUnit: this.moveUnit.bind(this),
      moveWithinRange: this.moveWithinRange.bind(this),
      follow: this.follow.bind(this),
      distance: this.distance.bind(this),
      debugState: this.debugState.bind(this),
      locomotorCache: this.locomotorCache.bind(this),
      cacheStats: this.cacheStats.bind(this),
      benchmarkPaths: this.benchmarkPaths.bind(this),
      hierarchical: this.hierarchical.bind(this),
      cooldown: this.cooldown.bind(this),
      setCooldown: this.setCooldown.bind(this),
      getCooldown: this.getCooldown.bind(this),
      tickCooldown: this.tickCooldown.bind(this),
      setFacing: this.setFacing.bind(this),
      getFacing: this.getFacing.bind(this),
      setCrushProb: this.setCrushProb.bind(this),
      crush: this.crush.bind(this),
      pathGraph: this.pathGraph.bind(this),
      cellLayer: this.cellLayer.bind(this),
      mapGrid: this.mapGrid.bind(this),
      terrain: this.terrain,
      loadTileSet: this.loadTileSet.bind(this),
      tileSet: this.tileSet.bind(this),
      setTerrainTile: this.setTerrainTile.bind(this),
      getTerrainTile: this.getTerrainTile.bind(this),
      resource: this.resource.bind(this),
      setResource: this.setResource.bind(this),
      harvest: this.harvest.bind(this),
      tickResources: this.tickResources.bind(this),
      enableTextureMode: this.enableTextureMode.bind(this),
      terrainMaterial: this.terrainMaterial.bind(this),
      waterTime: this.waterTime.bind(this),
      splatPixel: this.splatPixel.bind(this),
      cposToWPos: this.cposToWPos.bind(this),
      wposToCPos: this.wposToCPos.bind(this),
      mpos: this.mpos.bind(this),
      subCell: this.subCell.bind(this),
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

  private moveWithinRange(
    unitId: string,
    targetX: number,
    targetY: number,
    minRange: number,
    maxRange: number
  ): boolean {
    if (!this.pathfinder) {
      console.warn('Pathfinder not available in GameConsole');
      return false;
    }
    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getAll()) {
      if (obj.id === unitId && obj.type === GameObjectType.Unit) {
        const unit = obj as Unit;
        const success = unit.logic.moveWithinRange(targetX, targetY, minRange, maxRange, this.pathfinder);
        console.info(
          `MoveWithinRange ${unit.definition.name} (${unitId}) → (${targetX},${targetY}) [${minRange}-${maxRange}]:`,
          success ? 'STARTED' : 'FAILED'
        );
        return success;
      }
    }
    console.warn(`Unit not found: ${unitId}`);
    return false;
  }

  private follow(unitId: string, targetId: string, range: number): boolean {
    if (!this.pathfinder) {
      console.warn('Pathfinder not available in GameConsole');
      return false;
    }
    const manager = GameObjectManager.getInstance();
    let found = false;
    for (const obj of manager.getAll()) {
      if (obj.id === unitId && obj.type === GameObjectType.Unit) {
        const unit = obj as Unit;
        unit.logic.follow(targetId, range, this.pathfinder);
        console.info(`Follow ${unit.definition.name} (${unitId}) → ${targetId} @ ${range}`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.warn(`Unit not found: ${unitId}`);
      return false;
    }
    return true;
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

  /** Bidirectional A* pathfinding.
   * @returns Path nodes or null.
   */
  private pathfindBi(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    checkName = 'All',
    locomotionName = 'Track'
  ): PathNode[] | null {
    if (!this.pathfinder) {
      console.warn('Pathfinder not available');
      return null;
    }
    const check = this.parseBlockedByActor(checkName);
    const blockedCells = UnitCollision.getBlockedCells('', check);
    const locomotion = (Locomotion as Record<string, unknown>)[locomotionName] as Locomotion | undefined;
    const locomotor = locomotion !== undefined ? getLocomotor(locomotion) : getLocomotor(Locomotion.Track);
    const getTerrainCost = this.pathfinder.getTerrainType
      ? makeTerrainCostCallback(locomotor, this.pathfinder.getTerrainType)
      : undefined;
    const path = this.pathfinder.findPathBidirectional(
      startX,
      startY,
      endX,
      endY,
      blockedCells,
      check,
      0,
      false,
      getTerrainCost
    );
    // eslint-disable-next-line no-console
    console.info(
      `Bidirectional (${startX},${startY}) → (${endX},${endY}) [${checkName}, ${locomotionName}]:`,
      path ? path.map((n) => `(${n.x},${n.y})`).join(' -> ') : 'NO PATH'
    );
    return path;
  }

  /** Predicate Search — find path to first cell satisfying a condition.
   * @param condition — 'rightOfX30' | 'belowY30' | 'nearTarget' (targetX,targetY,radius)
   * @returns Path nodes or null.
   */
  private pathfindPredicate(startX: number, startY: number, condition: string, maxDistance = 20): PathNode[] | null {
    if (!this.pathfinder) {
      console.warn('Pathfinder not available');
      return null;
    }
    let predicate: (x: number, y: number) => boolean;
    let desc: string;
    if (condition === 'rightOfX30') {
      predicate = (x) => x > 30;
      desc = 'x > 30';
    } else if (condition === 'belowY30') {
      predicate = (_x, y) => y > 30;
      desc = 'y > 30';
    } else if (condition.startsWith('nearTarget')) {
      const parts = condition.split(',');
      const tx = Number(parts[1] ?? 30);
      const ty = Number(parts[2] ?? 30);
      const r = Number(parts[3] ?? 5);
      predicate = (x, y) => {
        const dx = x - tx;
        const dy = y - ty;
        return Math.sqrt(dx * dx + dy * dy) <= r;
      };
      desc = `distance to (${tx},${ty}) <= ${r}`;
    } else {
      console.warn(`Unknown predicate condition: ${condition}`);
      return null;
    }
    const blockedCells = UnitCollision.getBlockedCells('', BlockedByActor.All);
    const path = this.pathfinder.findPathToPredicate(
      startX,
      startY,
      predicate,
      maxDistance,
      blockedCells,
      BlockedByActor.All
    );
    // eslint-disable-next-line no-console
    console.info(
      `Predicate (${startX},${startY}) [${desc}, max=${maxDistance}]:`,
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

  /** Global LocomotorCache statistics. */
  private cacheStats(): Record<string, unknown> {
    const stats = LocomotorCache.getInstance().getStats();
    // eslint-disable-next-line no-console
    console.info(
      `LocomotorCache Stats: cachedCells=${stats.cachedCells}, dirtyCells=${stats.dirtyCells}, ` +
        `HasMoving=${stats.hasMoving}, HasStationary=${stats.hasStationary}, ` +
        `HasCrushable=${stats.hasCrushable}, HasFreeSpace=${stats.hasFreeSpace}, ` +
        `HasTemporaryBlocker=${stats.hasTemporaryBlocker}`
    );
    return stats;
  }

  /** Query MoveCooldownHelper remaining cooldown for a unit (ms). */
  private cooldown(unitId: string): number {
    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getUnits()) {
      const unit = obj as Unit;
      if (unit.id === unitId) {
        // Access private cooldownHelper via any cast (debug only)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const helper = (unit.logic.movement as any).cooldownHelper as MoveCooldownHelper | undefined;
        if (helper) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const remaining = (helper as any).cooldownRemainingMs as number;
          // eslint-disable-next-line no-console
          console.info(`Cooldown ${unitId}: ${remaining.toFixed(0)}ms remaining`);
          return remaining;
        }
      }
    }
    console.warn(`Unit not found: ${unitId}`);
    return -1;
  }

  /** Test helper: manually set cooldown for a unit (ms). */
  private setCooldown(unitId: string, ms: number): boolean {
    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getUnits()) {
      const unit = obj as Unit;
      if (unit.id === unitId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const helper = (unit.logic.movement as any).cooldownHelper as MoveCooldownHelper | undefined;
        if (helper) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (helper as any).cooldownRemainingMs = ms;
          // eslint-disable-next-line no-console
          console.info(`Set cooldown ${unitId} = ${ms}ms`);
          return true;
        }
      }
    }
    console.warn(`Unit not found: ${unitId}`);
    return false;
  }

  /** Test helper: get cooldown remaining for a unit (ms). */
  private getCooldown(unitId: string): number {
    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getUnits()) {
      const unit = obj as Unit;
      if (unit.id === unitId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const helper = (unit.logic.movement as any).cooldownHelper as
          | import('../game/unit/MoveCooldownHelper').MoveCooldownHelper
          | undefined;
        if (helper) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const remaining = (helper as any).remainingMs as number;
          // eslint-disable-next-line no-console
          console.info(`Cooldown for ${unitId}: ${remaining}ms`);
          return remaining;
        }
      }
    }
    console.warn(`Unit not found: ${unitId}`);
    return -1;
  }

  /** Test helper: tick cooldown for a unit (ms). */
  private tickCooldown(unitId: string, deltaTime: number): void {
    const manager = GameObjectManager.getInstance();
    for (const obj of manager.getUnits()) {
      const unit = obj as Unit;
      if (unit.id === unitId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const helper = (unit.logic.movement as any).cooldownHelper as
          | import('../game/unit/MoveCooldownHelper').MoveCooldownHelper
          | undefined;
        if (helper) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (helper as any).tick(deltaTime);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const remaining = (helper as any).remainingMs as number;
          // eslint-disable-next-line no-console
          console.info(`Cooldown ticked for ${unitId}: remaining = ${remaining}ms`);
          return;
        }
      }
    }
    console.warn(`Unit not found: ${unitId}`);
  }

  /** Test helper: manually set body facing for a unit (0-255 DirType). */
  private setFacing(unitId: string, facing: number): void {
    const manager = GameObjectManager.getInstance();
    const obj = manager.get(unitId);
    if (!obj || obj.type !== GameObjectType.Unit) {
      console.warn(`Unit not found: ${unitId}`);
      return;
    }
    const unit = obj as Unit;
    unit.logic.bodyFacing = ((facing % 256) + 256) % 256;
    // eslint-disable-next-line no-console
    console.info(`Set facing for ${unitId} to ${unit.logic.bodyFacing}`);
  }

  /** Test helper: get body facing for a unit. */
  private getFacing(unitId: string): number | undefined {
    const manager = GameObjectManager.getInstance();
    const obj = manager.get(unitId);
    if (!obj || obj.type !== GameObjectType.Unit) {
      console.warn(`Unit not found: ${unitId}`);
      return undefined;
    }
    const unit = obj as Unit;
    return unit.logic.bodyFacing;
  }

  /** Set WarnCrush probability (0–1), for testing. */
  private setCrushProb(p: number): void {
    Crushable.setWarnProbability(p);
    // eslint-disable-next-line no-console
    console.info(`Crush warn probability set to ${p}`);
  }

  /** Manually trigger OnCrush at a cell (test helper). */
  private crush(
    cellX: number,
    cellY: number,
    crusherId: string
  ): { count: number; occupants: string[]; crusher: string | undefined } {
    const occupants = ActorMap.getInstance().getOccupants(cellX, cellY);
    const crusher = GameObjectManager.getInstance().get(crusherId);
    const count = Crushable.onCrush(cellX, cellY, crusherId);
    // eslint-disable-next-line no-console
    console.info(
      `Crush at (${cellX},${cellY}): ${count} units crushed, occupants=${occupants.join(',')}, crusher=${crusher?.id}`
    );
    return { count, occupants: occupants.slice(), crusher: crusher?.id };
  }

  /** Task 23.19: Inspect GroundPathGraph connections at a cell. */
  private pathGraph(
    x: number,
    y: number
  ): {
    connections: Array<{ x: number; y: number; cost: number }>;
    heuristicToOrigin: number;
  } {
    if (!this.pathfinder) {
      return { connections: [], heuristicToOrigin: -1 };
    }
    const graph = this.pathfinder.groundGraph;
    const conns = graph.getConnections({ x, y });
    return {
      connections: conns.map((c) => ({ x: c.node.x, y: c.node.y, cost: Math.round(c.cost * 1000) / 1000 })),
      heuristicToOrigin: Math.round(graph.getHeuristic({ x, y }, { x: 0, y: 0 }) * 1000) / 1000,
    };
  }

  /** Inspect HierarchicalPathfinder domain at a cell. */
  private hierarchical(x: number, y: number): number {
    const domain = this.pathfinder?.hierarchical.getDomain(x, y) ?? -1;
    // eslint-disable-next-line no-console
    console.info(`HierarchicalPathfinder (${x}, ${y}): domain=${domain}`);
    return domain;
  }

  /**
   * Benchmark pathfinding performance.
   * @param count — number of random path queries (default 100)
   * @returns average time per query in ms
   */
  private benchmarkPaths(count = 100): number {
    if (!this.pathfinder) {
      console.warn('Pathfinder not available');
      return -1;
    }
    const w = 64;
    const h = 64;
    const blockedCells = UnitCollision.getBlockedCells('', BlockedByActor.All);
    let success = 0;
    let fail = 0;
    const t0 = performance.now();
    for (let i = 0; i < count; i++) {
      const sx = Math.floor(Math.random() * w);
      const sy = Math.floor(Math.random() * h);
      const ex = Math.floor(Math.random() * w);
      const ey = Math.floor(Math.random() * h);
      const path = this.pathfinder.findPath(sx, sy, ex, ey, blockedCells, BlockedByActor.All);
      if (path) success++;
      else fail++;
    }
    const t1 = performance.now();
    const avg = (t1 - t0) / count;
    // eslint-disable-next-line no-console
    console.info(
      `Benchmark ${count} paths: ${(t1 - t0).toFixed(2)}ms total, ${avg.toFixed(3)}ms avg, ` +
        `${success} success, ${fail} fail`
    );
    return avg;
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
        isTurningInPlace: unit.logic.isTurningInPlace,
        bodyFacing: unit.logic.bodyFacing,
        targetBodyFacing: unit.logic.targetBodyFacing,
        state: unit.logic.stateMachine.state,
        currentHealth: unit.logic.currentHealth,
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
║ cnc.cacheStats()                                             ║
║   Global LocomotorCache statistics.                          ║
║                                                              ║
║ cnc.benchmarkPaths(count=100)                                ║
║   Benchmark random pathfinding. Returns avg ms/query.        ║
║                                                              ║
║ cnc.hierarchical(x, y)                                       ║
║   Query HierarchicalPathfinder domain ID at a cell.          ║
║                                                              ║
║ cnc.cooldown(unitId)                                         ║
║   Query MoveCooldownHelper remaining cooldown (ms).          ║
║                                                              ║
║ cnc.collision(x, y, excludeId?)                              ║
║   Check if a cell is blocked by another unit.                ║
║   Example: cnc.collision(30, 30, 'unit-id')                  ║
║                                                              ║
║ cnc.pathfind(startX, startY, endX, endY)                     ║
║   Run A* with current unit blockers. Returns path or null.   ║
║   Example: cnc.pathfind(30, 30, 40, 30)                      ║
║                                                              ║
║ cnc.pathfindBi(startX, startY, endX, endY)                   ║
║   Run Bidirectional A*. Returns path or null.                ║
║                                                              ║
║ cnc.pathfindPredicate(startX, startY, condition, maxDist)    ║
║   Predicate Search — find first cell matching condition.     ║
║   Example: cnc.pathfindPredicate(25,25,'rightOfX30',20)      ║
║                                                              ║
║ cnc.moveUnit(unitId, targetX, targetY)                       ║
║   Order a specific unit to move to target cell.              ║
║   Example: cnc.moveUnit('unit-abc', 40, 30)                  ║
║                                                              ║
║ cnc.distance(unitIdA, unitIdB)                               ║
║   Return Euclidean distance between two units.               ║
║   Example: cnc.distance('unit-a', 'unit-b')                  ║
║                                                              ║
║ cnc.cposToWPos(x, y)                                         ║
║   Convert cell coordinate to world position (Task 9.5).      ║
║   Example: cnc.cposToWPos(10, 10)                            ║
║                                                              ║
║ cnc.wposToCPos(wx, wy, wz=0)                                 ║
║   Convert world position to cell coordinate (Task 9.5).      ║
║   Example: cnc.wposToCPos(10240, 0, 10240)                   ║
║                                                              ║
║ cnc.mpos(x, y)                                               ║
║   Convert cell to map (array) coordinate (Task 9.5).         ║
║   Example: cnc.mpos(10, 10)                                  ║
║                                                              ║
║ cnc.subCell(x, y, index=0)                                   ║
║   Get sub-cell centre in world coordinates (Task 9.5).       ║
║   Example: cnc.subCell(10, 10, 1)                            ║
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
  /** Inspect CellLayer at a cell or get layer statistics. */
  private cellLayer(x?: number, y?: number): Record<string, unknown> {
    const layer = this.terrain.getCellLayer();
    if (x !== undefined && y !== undefined) {
      const data = layer.get(x, y);
      return { x, y, landType: data.landType };
    }
    return {
      width: layer.getWidth(),
      height: layer.getHeight(),
    };
  }

  /** Inspect MapGrid configuration. */
  private mapGrid(): Record<string, unknown> {
    const grid = this.terrain.getMapGrid();
    return {
      type: grid.type,
      tileSize: grid.tileSize,
      cellSize: grid.cellSize,
      subCellCount: grid.subCellOffsets.length,
    };
  }

  /** Convert cell coordinate to world position (Task 9.5). */
  private cposToWPos(x: number, y: number): Record<string, unknown> {
    const grid = this.terrain.getMapGrid();
    const cpos = { x, y };
    const wpos = grid.centerOfCellWPos(cpos);
    const babylon = grid.wposToBabylon(wpos);
    const mpos = grid.toMPos(cpos);
    return { cpos, wpos, babylon, mpos };
  }

  /** Convert world position to cell coordinate (Task 9.5). */
  private wposToCPos(wx: number, wy: number, wz = 0): Record<string, unknown> {
    const grid = this.terrain.getMapGrid();
    const wpos = { x: wx, y: wy, z: wz };
    const cpos = grid.cellContainingWPos(wpos);
    return { wpos, cpos };
  }

  /** Convert cell coordinate to MPos (Task 9.5). */
  private mpos(x: number, y: number): Record<string, unknown> {
    const grid = this.terrain.getMapGrid();
    const cpos = { x, y };
    const mpos = grid.toMPos(cpos);
    return { cpos, mpos, type: grid.type };
  }

  /** Get sub-cell centre in world coordinates (Task 9.5). */
  private subCell(x: number, y: number, index = 0): Record<string, unknown> {
    const grid = this.terrain.getMapGrid();
    const cpos = { x, y };
    const wpos = grid.centerOfSubCellWPos(cpos, index);
    const babylon = grid.wposToBabylon(wpos);
    return { cpos, index, wpos, babylon };
  }

  /** Load a TileSet from URL and attach it to the TerrainGrid. */
  private async loadTileSet(url: string): Promise<Record<string, unknown>> {
    try {
      const tileSet = await loadTileSetFromUrl(url);
      await this.terrain.loadTileSet(tileSet);
      return {
        name: tileSet.name,
        templateCount: tileSet.templates.size,
        terrainTypeCount: tileSet.terrainTypes.length,
      };
    } catch (err) {
      console.warn('Failed to load tileset:', err);
      return { error: String(err) };
    }
  }

  /** Inspect current TileSet (if loaded). */
  private tileSet(): Record<string, unknown> | null {
    const ts = this.terrain.getTileSet();
    if (!ts) return null;
    return {
      name: ts.name,
      templateCount: ts.templates.size,
      terrainTypeCount: ts.terrainTypes.length,
      terrainTypes: ts.terrainTypes.map((t) => t.type),
    };
  }

  /** Place a TerrainTile (template id + index) at a cell. */
  private setTerrainTile(x: number, y: number, type: number, index = 0): void {
    this.terrain.setTerrainTile(x, y, { type, index });
  }

  /** Read the TerrainTile at a cell. */
  private getTerrainTile(x: number, y: number): Record<string, unknown> | null {
    const tile = this.terrain.getTerrainTile(x, y);
    if (!tile) return null;
    const cache = this.terrain.getTileCache();
    return {
      type: tile.type,
      index: tile.index,
      terrainTypeName: cache?.getTerrainTypeName(tile) ?? 'unknown',
      landTypeFallback: cache?.getLandTypeFallback(tile) ?? -1,
    };
  }

  /** Inspect resource at a cell. */
  private resource(x: number, y: number): Record<string, unknown> | null {
    if (!this.resourceLayer) return null;
    const cell = this.resourceLayer.get(x, y);
    return { x, y, type: cell.type, density: cell.density, harvestable: cell.density > 0 };
  }

  /** Place a resource seed at a cell. */
  private setResource(x: number, y: number, type = 1, density = 50): void {
    if (!this.resourceLayer) return;
    this.resourceLayer.set(x, y, type, density);
  }

  /** Harvest (reduce density) at a cell.  Returns amount removed. */
  private harvest(x: number, y: number, amount = 10): number {
    if (!this.resourceLayer) return 0;
    return this.resourceLayer.harvest(x, y, amount);
  }

  /** Manually advance resource simulation by N ticks. */
  private tickResources(ticks = 1): void {
    if (!this.resourceLayer) return;
    const getTerrainName = (cx: number, cy: number): string | undefined => {
      const lt = this.terrain.getCellLandType(cx, cy);
      return LandType[lt]?.toLowerCase();
    };
    for (let i = 0; i < ticks; i++) {
      this.resourceLayer.tick(this.terrain, getTerrainName);
    }
  }

  /** Switch terrain rendering to texture-splatting mode (Task 9.4). */
  private enableTextureMode(): void {
    this.terrain.enableTextureMode(this.scene);
  }

  /** Inspect terrain mesh material name. */
  private terrainMaterial(): string {
    const mesh = this.scene.getMeshByName('terrain');
    if (!mesh) return 'no-mesh';
    if (!mesh.material) return 'no-material';
    return mesh.material.getClassName();
  }

  /** Return current water animation time (Task 10.1). */
  private waterTime(): number {
    // Access internal waterTime via a cast — debug console only
    const terrain = this.terrain as unknown as { waterTime: number };
    return terrain.waterTime ?? 0;
  }

  /** Inspect splat-map pixel weights at a cell (Task 10.2). */
  private splatPixel(x: number, y: number): Record<string, unknown> | undefined {
    const terrain = this.terrain as unknown as {
      isTextureMode: () => boolean;
      debugGetSplatWeights: (
        x: number,
        y: number
      ) => { splat1: [number, number, number, number]; splat2: [number, number, number, number] } | undefined;
    };
    if (!terrain.isTextureMode()) return undefined;
    const weights = terrain.debugGetSplatWeights(x, y);
    if (!weights) return undefined;
    return { x, y, splat1: weights.splat1, splat2: weights.splat2 };
  }

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
