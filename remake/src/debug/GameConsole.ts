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
import { OpenRAMapLoader } from '../game/terrain/OpenRAMapLoader';
import { ResourceLayer } from '../game/economy/ResourceLayer';
import { MapEditor } from '../editor/MapEditor';
import { ActorPlacer, PlacedActor } from '../editor/ActorPlacer';
import { SandboxMode, BattleStats } from '../game/sandbox/SandboxMode';
import { DesktopAdapter } from '../core/DesktopAdapter';
import { TouchInputManager } from '../core/TouchInputManager';
import { InstancedUnitRenderer } from '../renderer/InstancedUnitRenderer';
import { ParticleManager } from '../renderer/effects/ParticleManager';
import { BaseBuilderAI } from '../game/ai/BaseBuilderAI';
import { AttackAI } from '../game/ai/AttackAI';
import { InfiltrationSystem } from '../game/unit/InfiltrationSystem';
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
import { OrderDispatcher } from '../game/order/OrderDispatcher';
import { groundOrder, actorOrder, selfOrder, type GameOrder } from '../game/order/GameOrder';
import { OrderGeneratorManager } from '../game/order/OrderGenerator';
import { TestOrderGenerator } from '../game/order/generators/TestOrderGenerator';
import { GameLoop } from '../game/GameLoop';
import { UnitState } from '../game/unit/UnitState';

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

  private indexedTestState: {
    mesh: import('@babylonjs/core').Mesh;
    material: import('../renderer/terrain/TerrainIndexedMaterial').TerrainIndexedMaterial;
    indexedTex: import('@babylonjs/core').RawTexture;
    paletteTex: import('@babylonjs/core').RawTexture;
    rtt: import('@babylonjs/core').RenderTargetTexture;
    rttCam: import('@babylonjs/core').ArcRotateCamera;
  } | null = null;

  private mapEditor: MapEditor;
  private actorPlacer = new ActorPlacer();
  private sandboxMode = new SandboxMode();
  private desktopAdapter = DesktopAdapter.getInstance();
  private touchInputManager: TouchInputManager | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly lighting: Lighting,
    private readonly rtsCamera: RTSCamera,
    private readonly terrain: TerrainGrid,
    private readonly placer: BuildingPlacer,
    private readonly pathfinder?: Pathfinder,
    resourceLayer?: ResourceLayer
  ) {
    // Create default resource layer (Tiberium) if not provided
    this.resourceLayer =
      resourceLayer ??
      new ResourceLayer(terrain.getWidth(), terrain.getHeight(), [
        { name: 'Tiberium', terrainType: 'clear', maxDensity: 255, growthRate: 0.05, spreadRate: 0.02, value: 25 },
        { name: 'Ore', terrainType: 'clear', maxDensity: 200, growthRate: 0.03, spreadRate: 0.01, value: 50 },
      ]);
    this.mapEditor = new MapEditor(terrain, this.resourceLayer, terrain.getTileSet());
  }

  /** Get the resource layer instance. */
  getResourceLayer(): ResourceLayer | null {
    return this.resourceLayer;
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
      terrainLOD: this.terrainLOD.bind(this),
      waterTime: this.waterTime.bind(this),
      splatPixel: this.splatPixel.bind(this),
      pendingSplatUpdates: this.pendingSplatUpdates.bind(this),
      injectTestSprite: this.injectTestSprite.bind(this),
      buildAtlas: this.buildAtlas.bind(this),
      cposToWPos: this.cposToWPos.bind(this),
      wposToCPos: this.wposToCPos.bind(this),
      mpos: this.mpos.bind(this),
      subCell: this.subCell.bind(this),
      createIndexedTest: this.createIndexedTest.bind(this),
      readIndexedPixels: this.readIndexedPixels.bind(this),
      clearIndexedTest: this.clearIndexedTest.bind(this),
      openraMap: this.openraMap.bind(this),
      editorLoadTileSet: this.editorLoadTileSet.bind(this),
      orderDispatch: this.orderDispatch.bind(this),
      orderList: this.orderList.bind(this),
      orderGeneratorCreate: this.orderGeneratorCreate.bind(this),
      orderGeneratorState: this.orderGeneratorState.bind(this),
      orderGeneratorClick: this.orderGeneratorClick.bind(this),
      orderGeneratorCancel: this.orderGeneratorCancel.bind(this),
      gameLoopState: this.gameLoopState.bind(this),
      gameLoopStep: this.gameLoopStep.bind(this),
      pathfindAdvanced: this.pathfindAdvanced.bind(this),
      cellInfoPoolStats: this.cellInfoPoolStats.bind(this),
      editorSelectBrush: this.editorSelectBrush.bind(this),
      editorPaint: this.editorPaint.bind(this),
      editorFloodFill: this.editorFloodFill.bind(this),
      editorUndo: this.editorUndo.bind(this),
      editorRedo: this.editorRedo.bind(this),
      editorExport: this.editorExport.bind(this),
      attack: this.attack.bind(this),
      harvestUnit: this.harvestUnit.bind(this),
      save: this.save.bind(this),
      load: this.load.bind(this),
      peekSave: this.peekSave.bind(this),
      sell: this.sell.bind(this),
      repair: this.repair.bind(this),
      queueLength: this.queueLength.bind(this),
      help: this.help.bind(this),
      // ── Task 90: Actor Placer ──
      actorPlaceUnit: this.actorPlaceUnit.bind(this),
      actorPlaceBuilding: this.actorPlaceBuilding.bind(this),
      actorList: this.actorList.bind(this),
      actorClear: this.actorClear.bind(this),
      // ── Task 91: Sandbox Mode ──
      sandboxSpawn: this.sandboxSpawn.bind(this),
      sandboxBattle: this.sandboxBattle.bind(this),
      sandboxStats: this.sandboxStats.bind(this),
      sandboxClear: this.sandboxClear.bind(this),
      // ── Task 92: Desktop Adapter ──
      desktopPlatform: this.desktopPlatform.bind(this),
      desktopFullscreen: this.desktopFullscreen.bind(this),
      // ── Task 93: Touch Input ──
      touchBind: this.touchBind.bind(this),
      touchUnbind: this.touchUnbind.bind(this),
      touchDevice: this.touchDevice.bind(this),
      // ── Task 77: InstancedUnitRenderer ──
      instancedRenderer: this.instancedRenderer.bind(this),
      instancedRegister: this.instancedRegister.bind(this),
      instancedStats: this.instancedStats.bind(this),
      instancedDispose: this.instancedDispose.bind(this),
      // Task 80: Particle Effects
      spawnExplosion: this.spawnExplosion.bind(this),
      particleStats: this.particleStats.bind(this),
      // Task 82: AI Bot
      baseBuilderAI: this.baseBuilderAI.bind(this),
      baseBuilderTick: this.baseBuilderTick.bind(this),
      attackAI: this.attackAI.bind(this),
      attackAITick: this.attackAITick.bind(this),
      placeBuildingDirect: this.placeBuildingDirect.bind(this),
      // Task 85: Infiltration
      infiltrationStats: this.infiltrationStats.bind(this),
      infiltrationCheck: this.infiltrationCheck.bind(this),
      grantStolenTech: this.grantStolenTech.bind(this),
      // internal refs for e2e
      _scene: this.scene,
      _rtsCamera: this.rtsCamera,
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

    // Task 30: initialize harvester AI for harvester units
    if (unit.definition.id === 'UNIT_HARVESTER' && this.resourceLayer && this.pathfinder) {
      unit.logic.initHarvesterAI(this.resourceLayer, this.pathfinder);
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
    this.placer.startPlacement(allDefs[type], house.color);
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
        console.warn(
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
        console.warn(`Follow ${unit.definition.name} (${unitId}) → ${targetId} @ ${range}`);
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
    locomotionName = 'Track',
    /** Task 132: heuristic weight */
    heuristicWeight = 1.0,
    /** Task 127: lane bias */
    laneBias = false,
    laneBiasCost = 1
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
    const path = this.pathfinder.findPath(
      startX,
      startY,
      endX,
      endY,
      blockedCells,
      check,
      0,
      false,
      getTerrainCost,
      heuristicWeight,
      laneBias,
      laneBiasCost
    );
    // eslint-disable-next-line no-console
    console.info(
      `Pathfind (${startX},${startY}) → (${endX},${endY}) [${checkName}, ${locomotionName}, w=${heuristicWeight}, lb=${laneBias}]:`,
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
    locomotionName = 'Track',
    heuristicWeight = 1.0,
    laneBias = false,
    laneBiasCost = 1
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
      getTerrainCost,
      heuristicWeight,
      laneBias,
      laneBiasCost
    );
    // eslint-disable-next-line no-console
    console.info(
      `Bidirectional (${startX},${startY}) → (${endX},${endY}) [${checkName}, ${locomotionName}, w=${heuristicWeight}, lb=${laneBias}]:`,
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

  /** Task 127 + 132: Advanced pathfinding with full parameter control.
   * @param options — { heuristicWeight?, laneBias?, laneBiasCost? }
   */
  private pathfindAdvanced(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    options: {
      check?: string;
      locomotion?: string;
      heuristicWeight?: number;
      laneBias?: boolean;
      laneBiasCost?: number;
      bidirectional?: boolean;
    } = {}
  ): { path: PathNode[] | null; nodesExplored: number; elapsedMs: number } {
    if (!this.pathfinder) {
      return { path: null, nodesExplored: 0, elapsedMs: 0 };
    }
    const check = this.parseBlockedByActor(options.check ?? 'All');
    const blockedCells = UnitCollision.getBlockedCells('', check);
    const locomotionName = options.locomotion ?? 'Track';
    const locomotion = (Locomotion as Record<string, unknown>)[locomotionName] as Locomotion | undefined;
    const locomotor = locomotion !== undefined ? getLocomotor(locomotion) : getLocomotor(Locomotion.Track);
    const getTerrainCost = this.pathfinder.getTerrainType
      ? makeTerrainCostCallback(locomotor, this.pathfinder.getTerrainType)
      : undefined;

    const hw = options.heuristicWeight ?? 1.0;
    const lb = options.laneBias ?? false;
    const lbc = options.laneBiasCost ?? 1;

    const startTime = performance.now();
    let path: PathNode[] | null;
    const nodesExplored = 0;

    if (options.bidirectional) {
      path = this.pathfinder.findPathBidirectional(
        startX,
        startY,
        endX,
        endY,
        blockedCells,
        check,
        0,
        false,
        getTerrainCost,
        hw,
        lb,
        lbc
      );
    } else {
      path = this.pathfinder.findPath(
        startX,
        startY,
        endX,
        endY,
        blockedCells,
        check,
        0,
        false,
        getTerrainCost,
        hw,
        lb,
        lbc
      );
    }
    const elapsedMs = performance.now() - startTime;
    return { path, nodesExplored, elapsedMs };
  }

  /** Task 128: CellInfoLayerPool statistics. */
  private cellInfoPoolStats(): { size: number; available: number; inUse: number } | null {
    if (!this.pathfinder) return null;
    const pool = this.pathfinder.cellInfoPool;
    return {
      size: pool.size,
      available: pool.availableCount,
      inUse: pool.size - pool.availableCount,
    };
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

  /**
   * Load an OpenRA-format map (`map.yaml` + `map.bin`) from a folder URL.
   *
   * If the map dimensions match the current TerrainGrid, tile data is applied
   * to the grid.  Metadata (title, players, actors) is always returned.
   *
   * @param folderUrl — e.g. `"/maps/test_openra"`.
   */
  private async openraMap(folderUrl: string): Promise<Record<string, unknown>> {
    try {
      // Prepend Vite base path if the URL is relative and missing it
      const base = (import.meta.env.BASE_URL as string) ?? '/';
      let resolvedUrl = folderUrl;
      if (folderUrl.startsWith('/') && base !== '/' && !folderUrl.startsWith(base)) {
        resolvedUrl = `${base}${folderUrl}`.replace(/\/+/g, '/');
      }
      const result = await OpenRAMapLoader.loadFromFolder(resolvedUrl);
      const { gameMap, mapYaml, mapBin } = result;

      // Apply tile data only if dimensions match
      const applied = gameMap.width === this.terrain.getWidth() && gameMap.height === this.terrain.getHeight();
      if (applied) {
        for (let y = 0; y < gameMap.height; y++) {
          for (let x = 0; x < gameMap.width; x++) {
            this.terrain.setCellLandType(x, y, gameMap.cells[y][x].landType);
          }
        }
      }

      return {
        title: mapYaml.Title,
        author: mapYaml.Author,
        tileset: mapYaml.Tileset,
        mapFormat: mapYaml.MapFormat,
        width: mapYaml.MapSize.width,
        height: mapYaml.MapSize.height,
        bounds: mapYaml.Bounds,
        players: mapYaml.Players.map((p) => ({
          id: p.id,
          name: p.name,
          playable: p.playable,
          ownsWorld: p.ownsWorld,
        })),
        actors: mapYaml.Actors.map((a) => ({
          id: a.id,
          type: a.type,
          location: a.location,
          owner: a.owner,
        })),
        binHeader: {
          format: mapBin.header.format,
          tilesOffset: mapBin.header.tilesOffset,
          heightsOffset: mapBin.header.heightsOffset,
          resourcesOffset: mapBin.header.resourcesOffset,
        },
        applied,
      };
    } catch (err) {
      console.warn('Failed to load OpenRA map:', err);
      return { error: String(err) };
    }
  }

  // ── Task 140: GameOrder ──

  /** Dispatch a GameOrder and return the result. */
  private orderDispatch(
    orderString: string,
    subjectId: string,
    targetType: 'ground' | 'actor' | 'none' = 'none',
    targetX?: number,
    targetY?: number,
    targetActorId?: string,
    queued = false
  ): Record<string, unknown> {
    const dispatcher = OrderDispatcher.getInstance();
    let order: GameOrder;
    if (targetType === 'ground' && targetX !== undefined && targetY !== undefined) {
      order = groundOrder(
        orderString as import('../game/order/GameOrder').OrderString,
        subjectId,
        targetX,
        targetY,
        queued
      );
    } else if (targetType === 'actor' && targetActorId) {
      order = actorOrder(
        orderString as import('../game/order/GameOrder').OrderString,
        subjectId,
        targetActorId,
        queued
      );
    } else {
      order = selfOrder(orderString as import('../game/order/GameOrder').OrderString, subjectId);
    }
    const result = dispatcher.dispatch(order);
    return { order, result };
  }

  /** List all registered order handlers. */
  private orderList(): string[] {
    return OrderDispatcher.getInstance().getRegisteredOrderStrings();
  }

  // ── Task 139: OrderGenerator ──

  /** Create and activate a TestOrderGenerator. */
  private orderGeneratorCreate(): Record<string, unknown> {
    const mgr = OrderGeneratorManager.getInstance();
    mgr.set(new TestOrderGenerator());
    return { active: true, type: 'TestOrderGenerator' };
  }

  /** Query current OrderGenerator state. */
  private orderGeneratorState(): Record<string, unknown> {
    const mgr = OrderGeneratorManager.getInstance();
    const gen = mgr.get();
    if (!gen) return { active: false };
    return {
      active: gen.isActive(),
      type: gen.constructor.name,
      ...(gen instanceof TestOrderGenerator ? { clickCount: gen.getMoveCount() } : {}),
    };
  }

  /** Simulate a click on the current OrderGenerator. */
  private orderGeneratorClick(screenX: number, screenY: number, shift = false): Record<string, unknown> {
    const mgr = OrderGeneratorManager.getInstance();
    const result = mgr.handleDown({ screenX, screenY, shift });
    return {
      generated: result.generated,
      feedback: result.feedback,
      message: result.message,
      order: result.order
        ? {
            orderString: result.order.orderString,
            subjectId: result.order.subjectId,
            target: result.order.target,
            queued: result.order.queued,
          }
        : null,
    };
  }

  /** Cancel current OrderGenerator. */
  private orderGeneratorCancel(): Record<string, unknown> {
    OrderGeneratorManager.getInstance().cancel();
    return { active: false };
  }

  // ── Task 141: GameLoop ──

  /** Query GameLoop state (logic tick count, progress, running). */
  private gameLoopState(): Record<string, unknown> {
    // GameLoop is not a singleton; we expose it via window for e2e tests
    const w = window as unknown as Record<string, unknown>;
    const loop = w._gameLoop as GameLoop | undefined;
    if (!loop) return { error: 'GameLoop not exposed' };
    return {
      running: loop.isRunning(),
      logicTickCount: loop.getLogicTickCount(),
      logicTickProgress: loop.getLogicTickProgress(),
      logicIntervalMs: loop.getLogicIntervalMs(),
    };
  }

  /** Manually step one logic frame (for testing / pause-resume). */
  private gameLoopStep(): Record<string, unknown> {
    const w = window as unknown as Record<string, unknown>;
    const loop = w._gameLoop as GameLoop | undefined;
    if (!loop) return { error: 'GameLoop not exposed' };
    const before = loop.getLogicTickCount();
    loop.stepLogic();
    return {
      beforeTick: before,
      afterTick: loop.getLogicTickCount(),
    };
  }

  // ── Map Editor (Task 9.8) ──

  /** Load a TileSet and attach it to the editor. */
  private async editorLoadTileSet(url: string): Promise<Record<string, unknown>> {
    try {
      const base = (import.meta.env.BASE_URL as string) ?? '/';
      let resolvedUrl = url;
      if (url.startsWith('/') && base !== '/' && !url.startsWith(base)) {
        resolvedUrl = `${base}${url}`.replace(/\/+/g, '/');
      }
      const tileSet = await loadTileSetFromUrl(resolvedUrl);
      await this.terrain.loadTileSet(tileSet);
      this.mapEditor.setTileSet(tileSet);
      return {
        name: tileSet.name,
        templateCount: tileSet.templates.size,
        terrainTypeCount: tileSet.terrainTypes.length,
      };
    } catch (err) {
      console.warn('Failed to load tileset for editor:', err);
      return { error: String(err) };
    }
  }

  /** Select the current editor brush. */
  private editorSelectBrush(tool: 'tile' | 'resource', templateId?: number): Record<string, unknown> {
    if (tool === 'tile') {
      if (templateId === undefined) {
        return { error: 'templateId required for tile brush' };
      }
      const ok = this.mapEditor.selectTileBrush(templateId);
      return { tool, templateId, selected: ok };
    }
    this.mapEditor.selectResourceBrush(templateId ?? 1);
    return { tool, resourceType: templateId ?? 1 };
  }

  /** Paint the current brush at a cell. */
  private editorPaint(x: number, y: number): Record<string, unknown> {
    const ok = this.mapEditor.paintCell({ x, y });
    return { x, y, painted: ok };
  }

  /** Flood-fill the current tile brush from a cell. */
  private editorFloodFill(x: number, y: number): Record<string, unknown> {
    const ok = this.mapEditor.floodFill({ x, y });
    return { x, y, filled: ok };
  }

  /** Undo the last editor action. */
  private editorUndo(): Record<string, unknown> {
    const ok = this.mapEditor.undo();
    return { undone: ok, canUndo: this.mapEditor.canUndo(), canRedo: this.mapEditor.canRedo() };
  }

  /** Redo the last undone editor action. */
  private editorRedo(): Record<string, unknown> {
    const ok = this.mapEditor.redo();
    return { redone: ok, canUndo: this.mapEditor.canUndo(), canRedo: this.mapEditor.canRedo() };
  }

  /** Export the current map to OpenRA format. */
  private editorExport(): Record<string, unknown> {
    const { mapYaml, mapBin } = this.mapEditor.exportToOpenRA();
    return {
      title: mapYaml.Title,
      tileset: mapYaml.Tileset,
      width: mapYaml.MapSize.width,
      height: mapYaml.MapSize.height,
      binHeader: mapBin.header,
      tileCount: mapBin.tiles.length,
      resourceCount: mapBin.resources.filter((r) => r.density > 0).length,
    };
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

  /** Enable or query terrain LOD status (Task 76). */
  private terrainLOD(enable?: boolean): {
    enabled: boolean;
    lodCount: number;
    lodVertices: number[];
    originalVertices: number;
  } {
    if (enable === true && !this.terrain.getLOD()) {
      this.terrain.enableLOD(this.scene);
    }
    const lod = this.terrain.getLOD();
    const mesh = this.scene.getMeshByName('terrain');
    const originalVertices = mesh ? mesh.getTotalVertices() : 0;
    const lodVertices: number[] = [];
    if (lod) {
      const count = lod.getLODCount();
      for (let i = 0; i < count; i++) {
        lodVertices.push(lod.getLODVertexCount(i));
      }
    }
    return {
      enabled: lod !== null,
      lodCount: lod?.getLODCount() ?? 0,
      lodVertices,
      originalVertices,
    };
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

  /** Return number of pending batched splat updates (Task 10.3). */
  private pendingSplatUpdates(): number {
    const terrain = this.terrain as unknown as { pendingSplatUpdates: () => number };
    return terrain.pendingSplatUpdates();
  }

  /** Inject a test RGBA frame into the tile cache (Task 10.4 e2e). */
  private injectTestSprite(id: string, width: number, height: number, rgba: number[]): void {
    const cache = this.terrain.getTileCache();
    if (!cache) {
      console.warn('No TileSet loaded');
      return;
    }
    cache.injectTestFrame(id, width, height, new Uint8Array(rgba));
  }

  /** Build texture atlas from current TileSet images (Task 10.4). */
  private async buildAtlas(): Promise<Record<string, unknown>> {
    const cache = this.terrain.getTileCache();
    if (!cache) {
      return { error: 'No TileSet loaded' };
    }
    const ok = await cache.buildAtlas(this.scene);
    return { built: ok, slotCount: cache.hasAtlas() ? 'yes' : 'no' };
  }

  // ── Palette-indexed rendering test (Task 10.6) ──

  /**
   * Create a test quad that uses palette-indexed rendering.
   * The indexed texture is 2×2: [0(trans), 1(red); 2(green), 3(blue)].
   * The palette maps index → RGBA.
   * An orthographic RTT camera renders the quad to a 4×4 off-screen target
   * so `readIndexedPixels` can read back exact colours.
   */
  private async createIndexedTest(): Promise<Record<string, unknown>> {
    this.clearIndexedTest();

    const { RawTexture, Texture, MeshBuilder, ArcRotateCamera, Vector3, RenderTargetTexture } =
      await import('@babylonjs/core');
    const { TerrainIndexedMaterial } = await import('../renderer/terrain/TerrainIndexedMaterial');

    // 2×2 indexed texture (LUMINANCE): top-left=0, top-right=1, bottom-left=2, bottom-right=3
    const idxData = new Uint8Array([0, 1, 2, 3]);
    const indexedTex = RawTexture.CreateLuminanceTexture(
      idxData,
      2,
      2,
      this.scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE
    );

    // 256-entry palette (only first 4 entries matter for the test)
    const palData = new Uint8Array(256 * 4);
    palData.set([0, 0, 0, 0], 0); // index 0 = transparent
    palData.set([255, 0, 0, 255], 4); // index 1 = red
    palData.set([0, 255, 0, 255], 8); // index 2 = green
    palData.set([0, 0, 255, 255], 12); // index 3 = blue

    const paletteTex = RawTexture.CreateRGBATexture(
      palData,
      256,
      1,
      this.scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE
    );

    // Create indexed material
    const mat = new TerrainIndexedMaterial(this.scene, indexedTex, paletteTex, 0);

    // Create quad facing the camera
    const quad = MeshBuilder.CreatePlane('indexedTestQuad', { size: 2 }, this.scene);
    quad.material = mat.getMaterial();

    // Orthographic RTT camera looking straight at the quad from +Z
    const rttCam = new ArcRotateCamera('indexedRTTCam', Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), this.scene);
    rttCam.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
    rttCam.orthoTop = 1;
    rttCam.orthoBottom = -1;
    rttCam.orthoLeft = -1;
    rttCam.orthoRight = 1;

    // 4×4 off-screen render target
    const rtt = new RenderTargetTexture('indexedRTT', 4, this.scene, false);
    rtt.activeCamera = rttCam;
    rtt.renderList = [quad];

    this.indexedTestState = { mesh: quad, material: mat, indexedTex, paletteTex, rtt, rttCam };

    return { success: true, meshName: quad.name };
  }

  /** Read back the 4×4 RTT pixels as a flat RGBA array (Task 10.6 e2e). */
  private async readIndexedPixels(): Promise<number[] | null> {
    if (!this.indexedTestState) return null;

    const { rtt } = this.indexedTestState;
    rtt.render(false, false);
    const pixels = await rtt.readPixels();
    return Array.from(pixels as Uint8Array);
  }

  /** Dispose the indexed test resources. */
  private clearIndexedTest(): void {
    if (!this.indexedTestState) return;
    this.indexedTestState.mesh.dispose();
    this.indexedTestState.material.dispose();
    this.indexedTestState.indexedTex.dispose();
    this.indexedTestState.paletteTex.dispose();
    this.indexedTestState.rtt.dispose();
    this.indexedTestState.rttCam.dispose();
    this.indexedTestState = null;
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

  // ── Task 28: Weapon / Projectile ──

  /**
   * 命令指定单位向目标开火。
   * @param attackerId — 攻击者单位 ID
   * @param targetX    — 目标格子 X
   * @param targetY    — 目标格子 Y
   */
  private attack(attackerId: string, targetX: number, targetY: number): { success: boolean; message: string } {
    const manager = GameObjectManager.getInstance();
    const obj = manager.get(attackerId);
    if (!obj || !obj.isAlive()) {
      return { success: false, message: `Unit "${attackerId}" not found or dead` };
    }
    if (obj.type !== GameObjectType.Unit) {
      return { success: false, message: `"${attackerId}" is not a unit` };
    }

    const unit = obj as Unit;
    const fired = unit.logic.fireAt(this.scene, targetX, targetY);
    return {
      success: fired,
      message: fired
        ? `${unit.definition.name} fired at (${targetX}, ${targetY})`
        : `${unit.definition.name} cannot fire (out of range or reloading)`,
    };
  }

  /**
   * 命令指定矿车开始采矿循环。
   * @param unitId — 矿车单位 ID
   */
  private harvestUnit(unitId: string): { success: boolean; message: string } {
    const manager = GameObjectManager.getInstance();
    const obj = manager.get(unitId);
    if (!obj || !obj.isAlive()) {
      return { success: false, message: `Unit "${unitId}" not found or dead` };
    }
    if (obj.type !== GameObjectType.Unit) {
      return { success: false, message: `"${unitId}" is not a unit` };
    }

    const unit = obj as Unit;
    if (unit.definition.id !== 'UNIT_HARVESTER') {
      return { success: false, message: `"${unitId}" is not a harvester` };
    }

    if (!unit.logic.harvesterAI) {
      if (this.resourceLayer && this.pathfinder) {
        unit.logic.initHarvesterAI(this.resourceLayer, this.pathfinder);
      } else {
        return { success: false, message: 'ResourceLayer or Pathfinder not available' };
      }
    }

    if (unit.logic.harvesterAI) {
      unit.logic.harvesterAI.start();
    }
    unit.logic.stateMachine.transition(UnitState.Harvesting);
    return { success: true, message: `${unit.definition.name} started harvesting` };
  }

  // ── Task 33: Save / Load ──

  private save(): { success: boolean; filename?: string; message: string } {
    const saveManager = (window as unknown as Record<string, unknown>)._saveManager as
      | { save: () => { filename: string; url: string } | null }
      | undefined;
    if (!saveManager) {
      return { success: false, message: 'SaveManager not available' };
    }
    const result = saveManager.save();
    if (result) {
      return { success: true, filename: result.filename, message: `Saved to ${result.filename}` };
    }
    return { success: false, message: 'Save failed' };
  }

  private async load(file?: File): Promise<{ success: boolean; message: string }> {
    const saveManager = (window as unknown as Record<string, unknown>)._saveManager as
      | { load: (f: File) => Promise<boolean> }
      | undefined;
    if (!saveManager) {
      return { success: false, message: 'SaveManager not available' };
    }
    if (!file) {
      return { success: false, message: 'No file provided. Use file input element.' };
    }
    const ok = await saveManager.load(file);
    return { success: ok, message: ok ? 'Load successful' : 'Load failed' };
  }

  private peekSave(): Record<string, unknown> {
    const saveManager = (window as unknown as Record<string, unknown>)._saveManager as
      | { peek: () => Record<string, unknown> }
      | undefined;
    if (!saveManager) {
      return { error: 'SaveManager not available' };
    }
    return saveManager.peek();
  }

  // ── Task 51: Sell / Repair ──

  private sell(buildingId: string): { success: boolean; refund?: number; message: string } {
    const tools = (window as unknown as Record<string, unknown>)._buildingTools as
      | { sellBuilding: (id: string) => { success: boolean; refund: number; message: string } }
      | undefined;
    if (!tools) {
      return { success: false, message: 'BuildingTools not available' };
    }
    return tools.sellBuilding(buildingId);
  }

  private repair(buildingId: string): { success: boolean; cost?: number; message: string } {
    const tools = (window as unknown as Record<string, unknown>)._buildingTools as
      | { repairBuilding: (id: string) => { success: boolean; cost: number; message: string } }
      | undefined;
    if (!tools) {
      return { success: false, message: 'BuildingTools not available' };
    }
    return tools.repairBuilding(buildingId);
  }

  // ── Task 46: Command Queue ──

  private queueLength(unitId: string): number {
    const manager = GameObjectManager.getInstance();
    const obj = manager.get(unitId);
    if (!obj || obj.type !== GameObjectType.Unit) {
      console.warn(`Unit not found: ${unitId}`);
      return -1;
    }
    const unit = obj as Unit;
    return unit.logic.getCommandQueueLength();
  }

  // ── Task 90: Actor Placer ──

  private actorPlaceUnit(type: string, house: 'gdi' | 'nod' = 'gdi', x = 30, y = 30): Record<string, unknown> {
    const allDefs = UNIT_DEFINITIONS as unknown as Record<
      string,
      import('../game/rules/UnitDefinitions').UnitDefinition
    >;
    const def = allDefs[type];
    if (!def) return { error: `Unknown unit type: ${type}. Available: ${Object.keys(allDefs).join(', ')}` };
    const hm = HouseManager.getInstance();
    const h = house === 'gdi' ? hm.getHouse(HouseType.GDI) : hm.getHouse(HouseType.Nod);
    if (!h) return { error: `House ${house} not found` };
    const unit = this.actorPlacer.placeUnit(def, h, x, y, this.scene);
    return { placed: !!unit, id: unit?.id, type, house, x, y };
  }

  private actorPlaceBuilding(type: string, house: 'gdi' | 'nod' = 'gdi', x = 30, y = 30): Record<string, unknown> {
    const allDefs = BUILDING_DEFINITIONS as unknown as Record<
      string,
      import('../game/rules/BuildingDefinitions').BuildingDefinition
    >;
    const def = allDefs[type];
    if (!def) return { error: `Unknown building type: ${type}. Available: ${Object.keys(allDefs).join(', ')}` };
    const hm = HouseManager.getInstance();
    const h = house === 'gdi' ? hm.getHouse(HouseType.GDI) : hm.getHouse(HouseType.Nod);
    if (!h) return { error: `House ${house} not found` };
    const building = this.actorPlacer.placeBuilding(def, h, x, y, this.scene);
    return { placed: !!building, id: building?.id, type, house, x, y };
  }

  private actorList(): PlacedActor[] {
    return this.actorPlacer.getPlacedActors();
  }

  private actorClear(): { cleared: boolean; count: number } {
    const count = this.actorPlacer.getPlacedActors().length;
    this.actorPlacer.clear();
    return { cleared: true, count };
  }

  // ── Task 91: Sandbox Mode ──

  private sandboxSpawn(
    squadId: string,
    type: string,
    count: number,
    house: 'gdi' | 'nod' = 'gdi',
    x = 20,
    y = 20,
    spacing = 2
  ): Record<string, unknown> {
    const allDefs = UNIT_DEFINITIONS as unknown as Record<
      string,
      import('../game/rules/UnitDefinitions').UnitDefinition
    >;
    const def = allDefs[type];
    if (!def) return { error: `Unknown unit type: ${type}. Available: ${Object.keys(allDefs).join(', ')}` };
    const hm = HouseManager.getInstance();
    const h = house === 'gdi' ? hm.getHouse(HouseType.GDI) : hm.getHouse(HouseType.Nod);
    if (!h) return { error: `House ${house} not found` };
    this.sandboxMode.spawnSquad(squadId, def, count, h, x, y, spacing, this.scene);
    return { spawned: true, squadId, type, count, house, x, y };
  }

  private sandboxBattle(squadAId: string, squadBId: string): { started: boolean; message: string } {
    const ok = this.sandboxMode.startBattle(squadAId, squadBId);
    return { started: ok, message: ok ? 'Battle started' : 'One or both squads not found' };
  }

  private sandboxStats(): BattleStats | Record<string, unknown> {
    const stats = this.sandboxMode.getStats();
    if (!stats) return { error: 'No battle stats available' };
    return stats;
  }

  private sandboxClear(): { cleared: boolean } {
    this.sandboxMode.clear();
    return { cleared: true };
  }

  // ── Task 92: Desktop Adapter ──

  private desktopPlatform(): { platform: string; isDesktop: boolean } {
    return { platform: this.desktopAdapter.getPlatform(), isDesktop: this.desktopAdapter.isDesktop() };
  }

  private desktopFullscreen(enter = true): { success: boolean; message: string } {
    try {
      if (enter) {
        void this.desktopAdapter.requestFullscreen();
      } else {
        void this.desktopAdapter.exitFullscreen();
      }
      return { success: true, message: enter ? 'Fullscreen requested' : 'Exited fullscreen' };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  }

  // ── Task 93: Touch Input ──

  private touchBind(): { bound: boolean; message: string } {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) return { bound: false, message: 'Canvas not found' };
    if (this.touchInputManager) this.touchInputManager.unbind();
    this.touchInputManager = new TouchInputManager(canvas, this.rtsCamera);
    this.touchInputManager.bind();
    return { bound: true, message: 'Touch input bound to canvas' };
  }

  private touchUnbind(): { unbound: boolean; message: string } {
    if (this.touchInputManager) {
      this.touchInputManager.unbind();
      this.touchInputManager = null;
      return { unbound: true, message: 'Touch input unbound' };
    }
    return { unbound: false, message: 'No touch input manager to unbind' };
  }

  private touchDevice(): { isTouchDevice: boolean } {
    return { isTouchDevice: TouchInputManager.isTouchDevice() };
  }

  // ── Task 77: InstancedUnitRenderer ──

  private instancedRenderer(enabled?: boolean): {
    enabled: boolean;
    activeCount: number;
    groupCount: number;
    totalSlots: number;
  } {
    const renderer = InstancedUnitRenderer.getInstance();
    renderer.initScene(this.scene);
    if (typeof enabled === 'boolean') {
      renderer.enabled = enabled;
    }
    return {
      enabled: renderer.enabled,
      activeCount: renderer.getActiveCount(),
      groupCount: renderer.getGroupCount(),
      totalSlots: renderer.getTotalInstanceSlots(),
    };
  }

  private instancedRegister(
    unitId: string,
    worldX: number,
    worldZ: number,
    rotationY = 0
  ): { success: boolean; message: string } {
    const renderer = InstancedUnitRenderer.getInstance();
    renderer.initScene(this.scene);

    const unit = GameObjectManager.getInstance()
      .getUnits()
      .find((u) => u.id === unitId) as Unit | undefined;
    if (!unit) return { success: false, message: `Unit ${unitId} not found` };

    const ok = renderer.registerUnit(unitId, unit.definition, unit.house, worldX, worldZ, rotationY);
    return { success: ok, message: ok ? 'Registered' : 'Failed to register' };
  }

  private instancedStats(): { enabled: boolean; activeCount: number; groupCount: number; totalSlots: number } {
    const renderer = InstancedUnitRenderer.getInstance();
    return {
      enabled: renderer.enabled,
      activeCount: renderer.getActiveCount(),
      groupCount: renderer.getGroupCount(),
      totalSlots: renderer.getTotalInstanceSlots(),
    };
  }

  private instancedDispose(): { disposed: boolean } {
    InstancedUnitRenderer.reset();
    return { disposed: true };
  }

  // ── Task 80: Particle Effects ──

  /** Spawn a particle explosion at world coordinates (for e2e / visual testing). */
  private spawnExplosion(worldX?: number, worldY?: number, worldZ?: number): { spawned: boolean } {
    const pm = ParticleManager.getInstance();
    // Default to camera target position if not provided
    const x = worldX ?? this.rtsCamera.getTarget().x;
    const y = worldY ?? 0.5;
    const z = worldZ ?? this.rtsCamera.getTarget().z;
    const spawned = pm.spawnExplosion(x, y, z);
    return { spawned };
  }

  /** Query particle manager statistics. */
  private particleStats(): { activeCount: number; poolSize: number } {
    const pm = ParticleManager.getInstance();
    return {
      activeCount: pm.getActiveCount(),
      poolSize: pm.getPoolSize(),
    };
  }

  // ── Task 82: AI Bot ──

  private baseBuilderAIInstance: BaseBuilderAI | null = null;
  private attackAIInstance: AttackAI | null = null;

  /** Create or query the BaseBuilderAI for a house. */
  private baseBuilderAI(houseName = 'nod'): {
    created: boolean;
    status: string;
    buildIndex: number;
    placedCount: number;
  } {
    const house = this.resolveHouse(houseName);
    if (!house) {
      return { created: false, status: 'unknown-house', buildIndex: 0, placedCount: 0 };
    }
    if (!this.baseBuilderAIInstance) {
      this.baseBuilderAIInstance = new BaseBuilderAI(house, this.terrain, this.scene);
    }
    return {
      created: true,
      status: this.baseBuilderAIInstance.getQueueStatus(),
      buildIndex: this.baseBuilderAIInstance.getBuildIndex(),
      placedCount: this.baseBuilderAIInstance.getPlacedCount(),
    };
  }

  /** Manually tick the BaseBuilderAI (for e2e). */
  private baseBuilderTick(dt = 1000): { status: string; buildIndex: number; placedCount: number } {
    if (!this.baseBuilderAIInstance) {
      return { status: 'not-created', buildIndex: 0, placedCount: 0 };
    }
    this.baseBuilderAIInstance.tick(dt);
    return {
      status: this.baseBuilderAIInstance.getQueueStatus(),
      buildIndex: this.baseBuilderAIInstance.getBuildIndex(),
      placedCount: this.baseBuilderAIInstance.getPlacedCount(),
    };
  }

  /** Create or query the AttackAI for a house. */
  private attackAI(houseName = 'nod'): { created: boolean; squadSize: number; isAttacking: boolean } {
    const house = this.resolveHouse(houseName);
    if (!house) {
      return { created: false, squadSize: 0, isAttacking: false };
    }
    if (!this.attackAIInstance && this.pathfinder) {
      this.attackAIInstance = new AttackAI(house, this.pathfinder);
    }
    return {
      created: this.attackAIInstance !== null,
      squadSize: this.attackAIInstance?.getSquadSize() ?? 0,
      isAttacking: this.attackAIInstance?.isAttacking() ?? false,
    };
  }

  /** Manually tick the AttackAI (for e2e). */
  private attackAITick(_dt = 1000): { squadSize: number; isAttacking: boolean; scoutId: string | null } {
    if (!this.attackAIInstance) {
      return { squadSize: 0, isAttacking: false, scoutId: null };
    }
    this.attackAIInstance.tick(_dt);
    return {
      squadSize: this.attackAIInstance.getSquadSize(),
      isAttacking: this.attackAIInstance.isAttacking(),
      scoutId: this.attackAIInstance.getScoutId(),
    };
  }

  /** Directly place a building at a cell (bypasses construction queue; for e2e setup). */
  private placeBuildingDirect(type: string, houseName: string, x: number, y: number): { placed: boolean; id?: string } {
    const house = this.resolveHouse(houseName);
    if (!house) return { placed: false };
    const def = BUILDING_DEFINITIONS[type];
    if (!def) return { placed: false };
    const building = GameObjectFactory.createBuilding({ definition: def, house, x, y, scene: this.scene });
    return { placed: true, id: building.id };
  }

  // ── Task 85: Infiltration ──

  /** Query infiltration system statistics. */
  private infiltrationStats(): { infiltratedCount: number } {
    const sys = InfiltrationSystem.getInstance();
    return { infiltratedCount: sys.getInfiltratedCount() };
  }

  /** Manually trigger infiltration check on all spy units (for e2e). */
  private infiltrationCheck(): { checked: number; results: Array<{ unitId: string; type: string; amount?: number }> } {
    const sys = InfiltrationSystem.getInstance();
    const results: Array<{ unitId: string; type: string; amount?: number }> = [];
    let checked = 0;
    for (const obj of GameObjectManager.getInstance().getUnits()) {
      const unit = obj as Unit;
      if (unit.definition.id !== 'INFANTRY_SPY') continue;
      checked++;
      const res = sys.checkInfiltration(unit);
      if (res) {
        results.push({ unitId: unit.id, type: res.type, amount: res.amount });
      }
    }
    return { checked, results };
  }

  /** Grant stolen tech to a house. */
  private grantStolenTech(houseName: string): { granted: boolean } {
    const house = this.resolveHouse(houseName);
    if (!house) return { granted: false };
    InfiltrationSystem.getInstance().grantStolenTech(house);
    return { granted: true };
  }
}
