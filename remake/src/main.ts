import { Vector3 } from '@babylonjs/core';
import { EngineManager } from './core/EngineManager';
import { SceneManager } from './core/SceneManager';
import { RTSCamera } from './core/RTSCamera';
import { Lighting } from './renderer/Lighting';
import { TerrainGrid, LandType } from './game/terrain/TerrainGrid';
import { MapLoader } from './game/terrain/MapLoader';
import { Pathfinder } from './game/terrain/Pathfinder';
import { GameRules } from './game/rules/GameRules';
import { UNIT_DEFINITIONS } from './game/rules/UnitDefinitions';
import { getBuildingFootprint } from './game/rules/BuildingDefinitions';
import { BUILDING_DEFINITIONS } from './game/rules/BuildingDefinitions';
import { HouseManager } from './game/house/HouseManager';
import { HouseType } from './game/house/House';
import { GameObjectFactory } from './game/objects/GameObjectFactory';
import { GameObjectManager } from './game/objects/GameObjectManager';
import { GameObjectType } from './game/objects/GameObject';
import { SelectionManager } from './game/SelectionManager';
import { Unit } from './game/objects/Unit';
import { UnitState } from './game/unit/UnitState';
import { ConstructionQueue } from './game/building/ConstructionQueue';
import { BuildingPlacer } from './game/building/BuildingPlacer';
import { Sidebar } from './renderer/ui/Sidebar';
import { GameConsole } from './debug/GameConsole';
import { PowerManager } from './game/building/PowerManager';

const bootstrap = async (): Promise<void> => {
  // ── Engine ──
  const engineManager = EngineManager.getInstance();
  engineManager.initialize('app');

  // ── Scene ──
  const sceneManager = SceneManager.getInstance();
  const scene = sceneManager.initialize();

  // ── RTS Camera ──
  const rtsCamera = new RTSCamera(scene, engineManager.getEngine(), {
    target: Vector3.Zero(),
    initialZoom: 50,
    alpha: Math.PI, // South-to-North view (camera at south edge looking north)
    beta: (2 * Math.PI) / 9, // ~40° pitch, matching OpenRA's CameraPitch
  });

  // ── Lighting & Shadows ──
  const lighting = new Lighting(scene);

  // ── Terrain Grid ──
  const terrain = new TerrainGrid(scene, 64, 64);

  // ── Load map from JSON ──
  // Vite base path: import.meta.env.BASE_URL handles both dev (/CnC_Remake/) and prod
  const mapUrl = `${import.meta.env.BASE_URL}maps/dummy_map.json`.replace(/\/+/g, '/');
  try {
    const map = await MapLoader.loadFromUrl(mapUrl);
    MapLoader.applyToTerrainGrid(map, terrain);
    console.warn(`Map loaded: ${map.width}x${map.height}, version ${map.version}`);
  } catch (err) {
    console.warn('Failed to load map, falling back to test pattern:', err);
    terrain.generateTestPattern();
  }

  // ── Pathfinder ──
  // 动态阻塞回调：每帧查询建筑 footprint，让 A* 自动绕开建筑
  const getBuildingBlockedCells = (): ReadonlySet<string> => {
    const blocked = new Set<string>();
    for (const obj of GameObjectManager.getInstance().getAll()) {
      if (!obj.isAlive()) continue;
      if (obj.type !== GameObjectType.Building) continue;
      const building = obj as import('./game/objects/Building').Building;
      const def = building.definition;
      // 只阻塞建筑 footprint 本身（单位可紧贴建筑边缘行走）
      for (const cell of getBuildingFootprint(def)) {
        blocked.add(`${building.x + cell.dx},${building.y + cell.dy}`);
      }
    }
    return blocked;
  };

  const pathfinder = new Pathfinder(
    64,
    64,
    (x, y) => {
      const type = terrain.getCellLandType(x, y);
      return type !== LandType.Water && type !== LandType.Rock && type !== LandType.Wall && type !== LandType.River;
    },
    getBuildingBlockedCells
  );

  // ── Houses ──
  const houseManager = HouseManager.getInstance();

  const gdi = houseManager.createHouse(HouseType.GDI, {
    isHuman: true,
    credits: GameRules.mpDefaultMoney,
    capacity: 2000,
  });

  const nod = houseManager.createHouse(HouseType.Nod, {
    isHuman: false,
    credits: GameRules.mpDefaultMoney,
    capacity: 2000,
  });

  // ── Spawn all building types for both houses ──
  // GDI base (top-right quadrant)
  const gdiBuildings = [
    GameObjectFactory.createBuilding({
      definition: BUILDING_DEFINITIONS.ConstructionYard,
      house: gdi,
      x: 34,
      y: 6,
      scene,
    }),
    GameObjectFactory.createBuilding({ definition: BUILDING_DEFINITIONS.PowerPlant, house: gdi, x: 40, y: 6, scene }),
    GameObjectFactory.createBuilding({
      definition: BUILDING_DEFINITIONS.AdvancedPower,
      house: gdi,
      x: 44,
      y: 6,
      scene,
    }),
    GameObjectFactory.createBuilding({ definition: BUILDING_DEFINITIONS.Barracks, house: gdi, x: 48, y: 6, scene }),
    GameObjectFactory.createBuilding({ definition: BUILDING_DEFINITIONS.WarFactory, house: gdi, x: 38, y: 10, scene }),
    GameObjectFactory.createBuilding({ definition: BUILDING_DEFINITIONS.Radar, house: gdi, x: 42, y: 10, scene }),
    GameObjectFactory.createBuilding({ definition: BUILDING_DEFINITIONS.Helipad, house: gdi, x: 46, y: 10, scene }),
    GameObjectFactory.createBuilding({
      definition: BUILDING_DEFINITIONS.RepairFacility,
      house: gdi,
      x: 50,
      y: 10,
      scene,
    }),
  ];

  // Nod base (bottom-right quadrant)
  const nodBuildings = [
    GameObjectFactory.createBuilding({
      definition: BUILDING_DEFINITIONS.ConstructionYard,
      house: nod,
      x: 34,
      y: 38,
      scene,
    }),
    GameObjectFactory.createBuilding({ definition: BUILDING_DEFINITIONS.PowerPlant, house: nod, x: 40, y: 38, scene }),
    GameObjectFactory.createBuilding({ definition: BUILDING_DEFINITIONS.OreRefinery, house: nod, x: 44, y: 38, scene }),
    GameObjectFactory.createBuilding({ definition: BUILDING_DEFINITIONS.WarFactory, house: nod, x: 48, y: 38, scene }),
    GameObjectFactory.createBuilding({ definition: BUILDING_DEFINITIONS.Radar, house: nod, x: 52, y: 38, scene }),
    GameObjectFactory.createBuilding({ definition: BUILDING_DEFINITIONS.Helipad, house: nod, x: 40, y: 42, scene }),
    GameObjectFactory.createBuilding({
      definition: BUILDING_DEFINITIONS.RepairFacility,
      house: nod,
      x: 44,
      y: 42,
      scene,
    }),
    GameObjectFactory.createBuilding({ definition: BUILDING_DEFINITIONS.Shipyard, house: nod, x: 52, y: 42, scene }),
  ];

  const gdiTank = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.MediumTank,
    house: gdi,
    x: 42,
    y: 14,
    scene,
  });
  const gdiJeep = GameObjectFactory.createUnit({ definition: UNIT_DEFINITIONS.Jeep, house: gdi, x: 45, y: 15, scene });
  const nodTank = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.LightTank,
    house: nod,
    x: 46,
    y: 40,
    scene,
  });
  const nodRocket = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.V2Rocket,
    house: nod,
    x: 50,
    y: 40,
    scene,
  });

  // ── Infantry spawn ──
  const gdiRifle1 = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.RifleInfantry,
    house: gdi,
    x: 41,
    y: 16,
    scene,
  });
  const gdiRifle2 = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.RifleInfantry,
    house: gdi,
    x: 43,
    y: 16,
    scene,
  });
  const gdiRocket = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.RocketSoldier,
    house: gdi,
    x: 44,
    y: 17,
    scene,
  });
  const gdiEngineer = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.Engineer,
    house: gdi,
    x: 42,
    y: 17,
    scene,
  });

  const nodRifle1 = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.RifleInfantry,
    house: nod,
    x: 45,
    y: 42,
    scene,
  });
  const nodRifle2 = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.RifleInfantry,
    house: nod,
    x: 47,
    y: 42,
    scene,
  });
  const nodFlame = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.Flamethrower,
    house: nod,
    x: 46,
    y: 43,
    scene,
  });
  const nodDog = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.AttackDog,
    house: nod,
    x: 48,
    y: 43,
    scene,
  });

  // Enable shadows on all spawned objects
  const allSpawned = [
    ...gdiBuildings,
    ...nodBuildings,
    gdiTank,
    gdiJeep,
    nodTank,
    nodRocket,
    gdiRifle1,
    gdiRifle2,
    gdiRocket,
    gdiEngineer,
    nodRifle1,
    nodRifle2,
    nodFlame,
    nodDog,
  ];
  for (const obj of allSpawned) {
    if (obj.mesh) {
      lighting.addShadowCaster(obj.mesh);
      lighting.enableShadowsOnMesh(obj.mesh);
    }
  }

  // ── Task 22: Construction Queue & Sidebar ──
  const queue = new ConstructionQueue(gdi);
  const placer = new BuildingPlacer(scene, rtsCamera.getCamera(), terrain);

  // ── Sidebar mode state ──
  let sidebarMode: import('./renderer/ui/Sidebar').SidebarMode = 'normal';

  const sidebar = new Sidebar(
    scene,
    gdi,
    queue,
    (def) => {
      const ok = queue.startBuilding(def);
      if (ok) {
        // eslint-disable-next-line no-console
        console.info(`Started building ${def.name} — Credits left: ${gdi.credits}`);
      } else {
        console.warn(`Cannot build ${def.name} — check funds/prerequisites/queue status`);
      }
    },
    () => {
      if (queue.status === 'ready' && queue.currentDefinition) {
        placer.startPlacement(queue.currentDefinition);
      }
    },
    (mode) => {
      sidebarMode = mode;
      // Update cursor color to indicate mode
      if (mode === 'repair') {
        rtsCamera.setCursorColor('#0f0');
      } else if (mode === 'sell') {
        rtsCamera.setCursorColor('#f90');
      } else {
        rtsCamera.setCursorColor('#fff');
      }
    }
  );

  /** 更新 House 电力（遍历所有建筑重新计算）。 */
  const updateHousePower = (house: import('./game/house/House').House): void => {
    let production = 0;
    let consumption = 0;
    for (const obj of GameObjectManager.getInstance().getBuildings()) {
      if (obj.house !== house || !obj.isAlive()) continue;
      const building = obj as import('./game/objects/Building').Building;
      const p = building.definition.power;
      if (p > 0) production += p;
      else consumption += Math.abs(p);
    }
    house.updatePower(production, consumption);
  };

  // ── Task 17: Selection & Right-click to move ──
  const selectionManager = SelectionManager.getInstance();

  /** 将世界坐标转换为格子坐标。 */
  const worldToCell = (worldPos: Vector3): { x: number; y: number } => ({
    x: Math.floor(worldPos.x + 32),
    y: Math.floor(worldPos.z + 32),
  });

  /** 将屏幕坐标转为地面坐标，再查找最近的单位（1.5 格半径内）。 */
  const pickUnitAt = (screenX: number, screenY: number): Unit | null => {
    const groundPos = rtsCamera.screenToGround(screenX, screenY);
    if (!groundPos) return null;

    let closest: Unit | null = null;
    let closestDist = Infinity;

    for (const obj of GameObjectManager.getInstance().getUnits()) {
      if (obj.type !== GameObjectType.Unit) continue;
      const unit = obj as Unit;
      const pos = unit.getPosition();
      const dx = pos.x - groundPos.x;
      const dz = pos.z - groundPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 1.5 && dist < closestDist) {
        closest = unit;
        closestDist = dist;
      }
    }
    return closest;
  };

  /** 将屏幕坐标转为地面坐标，再查找最近的建筑（2 格半径内）。 */
  const pickBuildingAt = (screenX: number, screenY: number): import('./game/objects/Building').Building | null => {
    const groundPos = rtsCamera.screenToGround(screenX, screenY);
    if (!groundPos) return null;

    let closest: import('./game/objects/Building').Building | null = null;
    let closestDist = Infinity;

    for (const obj of GameObjectManager.getInstance().getBuildings()) {
      if (obj.type !== GameObjectType.Building) continue;
      const b = obj as import('./game/objects/Building').Building;
      const pos = b.getPosition?.() ?? new Vector3(b.x - 31.5, 0, b.y - 31.5);
      const dx = pos.x - groundPos.x;
      const dz = pos.z - groundPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 2.0 && dist < closestDist) {
        closest = b;
        closestDist = dist;
      }
    }
    return closest;
  };

  // 左键：放置建筑 / 选中单位 / 维修 / 出售
  rtsCamera.onLeftClick = (screenX, screenY) => {
    // 放置模式优先
    if (placer.isPlacing()) {
      const ptr = rtsCamera.getPointerPosition();
      placer.updateFromScreen(ptr.x, ptr.y);
      const cell = placer.confirmPlacement();
      if (cell) {
        let building: import('./game/objects/Building').Building | null;
        if (gameConsole.hasPendingBuilding()) {
          building = gameConsole.tryPlaceBuilding(cell.x, cell.y, scene);
        } else {
          building = queue.placeBuilding(cell.x, cell.y, scene);
        }
        if (building) {
          updateHousePower(gdi);
          if (building.mesh) {
            lighting.addShadowCaster(building.mesh);
            lighting.enableShadowsOnMesh(building.mesh);
          }
          // eslint-disable-next-line no-console
          console.info(`Placed ${building.definition.name} at (${cell.x}, ${cell.y})`);
        }
      } else {
        console.warn('Invalid placement position');
      }
      return;
    }

    // ── Repair mode ──
    if (sidebarMode === 'repair') {
      const b = pickBuildingAt(screenX, screenY);
      if (b && b.house === gdi && b.isAlive()) {
        const repairCost = Math.floor(b.definition.cost * 0.1);
        if (gdi.credits < repairCost) {
          console.warn(`Not enough credits to repair ${b.definition.name} (need $${repairCost})`);
          return;
        }
        const oldHp = b.health;
        b.health = Math.min(b.definition.strength, b.health + Math.floor(b.definition.strength * 0.25));
        if (b.health > oldHp) {
          gdi.spendCredits(repairCost);
          // eslint-disable-next-line no-console
          console.info(`Repaired ${b.definition.name} (+${b.health - oldHp} HP) for $${repairCost}`);
        } else {
          console.warn(`${b.definition.name} is already at full health`);
        }
      } else {
        console.warn('No friendly building found to repair');
      }
      return;
    }

    // ── Sell mode ──
    if (sidebarMode === 'sell') {
      const b = pickBuildingAt(screenX, screenY);
      if (b && b.house === gdi && b.isAlive()) {
        const refund = Math.floor(b.definition.cost * 0.5);
        gdi.addCredits(refund);
        b.dispose();
        GameObjectManager.getInstance().unregister(b.id);
        updateHousePower(gdi);
        // eslint-disable-next-line no-console
        console.info(`Sold ${b.definition.name} for $${refund}`);
      } else {
        console.warn('No friendly building found to sell');
      }
      return;
    }

    // ── Normal mode: select unit ──
    console.warn('Left-click detected at', screenX, screenY);

    const unit = pickUnitAt(screenX, screenY);
    if (unit) {
      selectionManager.select(unit, scene);
      console.warn(`Selected unit: ${unit.definition.name} (${unit.id}) at (${unit.x}, ${unit.y})`);
    } else {
      selectionManager.clear();
      console.warn('No unit found at click position');
    }
  };

  // 右键：取消放置 或 对选中单位下达命令（移动 / 攻击）
  rtsCamera.onRightClick = (screenX, screenY) => {
    // 放置模式下右键 = 取消
    if (placer.isPlacing()) {
      placer.cancelPlacement();
      gameConsole.clearPendingBuilding();
      console.warn('Placement cancelled');
      return;
    }

    // Repair / Sell 模式下右键 = 取消模式
    if (sidebarMode !== 'normal') {
      sidebarMode = 'normal';
      rtsCamera.setCursorColor('#fff');
      console.warn('Mode cancelled');
      return;
    }

    console.warn('Right-click detected at', screenX, screenY);

    const worldPos = rtsCamera.screenToGround(screenX, screenY);
    if (!worldPos) {
      console.warn('screenToGround returned null');
      return;
    }

    const cell = worldToCell(worldPos);
    console.warn('Ground cell:', cell.x, cell.y, 'world:', worldPos.x, worldPos.z);

    if (cell.x < 0 || cell.x >= 64 || cell.y < 0 || cell.y >= 64) {
      console.warn('Cell out of bounds:', cell);
      return;
    }

    const selected = selectionManager.getSelected();
    if (selected.length === 0) {
      console.warn('No unit selected — click a unit first (left click)');
      return;
    }

    // 检查是否右键点击了某个单位（攻击目标）
    const targetUnit = pickUnitAt(screenX, screenY);
    const isEnemyTarget = targetUnit && targetUnit.house !== selected[0].house;

    for (const unit of selected) {
      if (isEnemyTarget && targetUnit) {
        // 攻击命令：设置攻击目标，有炮塔的单位进入 TurretTracking
        unit.logic.attackTarget = { x: targetUnit.x, y: targetUnit.y };
        if (unit.definition.hasTurret) {
          unit.logic.stateMachine.transition(UnitState.TurretTracking);
        }
        // eslint-disable-next-line no-console
        console.info(`Attack order: ${unit.definition.name} → ${targetUnit.definition.name}`);
      } else {
        // 移动命令：清除攻击目标
        unit.logic.attackTarget = undefined;
        const success = unit.logic.moveTo(cell.x, cell.y, pathfinder);
        if (success) {
          // eslint-disable-next-line no-console
          console.info(`Move order: ${unit.definition.name} → (${cell.x}, ${cell.y})`);
        } else {
          console.warn(`Move failed for ${unit.definition.name} → (${cell.x}, ${cell.y})`);
        }
      }
    }
  };

  // ── Game loop ──
  const engine = engineManager.getEngine();
  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime();

    // Task 22: update construction queue + ghost + sidebar
    queue.tick(dt);
    if (placer.isPlacing()) {
      const ptr = rtsCamera.getPointerPosition();
      placer.updateFromScreen(ptr.x, ptr.y);
    }
    sidebar.refresh(dt);

    // Task 23: 电力检查 — 输出因电力不足而停摆的建筑
    const powerMgr = PowerManager.getInstance();
    const unpowered = powerMgr.getUnpoweredBuildingsForHouse(gdi.id);
    if (unpowered.length > 0 && Math.random() < 0.02) {
      // 低频率日志，避免刷屏
      console.warn(
        `LOW POWER — ${unpowered.length} buildings offline:`,
        unpowered.map((b) => b.definition.name).join(', ')
      );
    }

    GameObjectManager.getInstance().update(dt);
  });

  // ── Render loop ──
  sceneManager.runRenderLoop();

  // ── Lifecycle cleanup ──
  window.addEventListener('beforeunload', () => {
    sidebar.dispose();
    placer.dispose();
    PowerManager.getInstance().dispose();
    GameObjectManager.getInstance().dispose();
    houseManager.dispose();
    terrain.dispose();
    lighting.dispose();
    rtsCamera.dispose();
    sceneManager.dispose();
    engineManager.dispose();
  });

  // ── Debug Console ──
  const gameConsole = new GameConsole(scene, lighting, rtsCamera, terrain, placer);
  gameConsole.install();

  // ── Verification ──
  const goManager = GameObjectManager.getInstance();
  // eslint-disable-next-line no-console
  console.info('GDI — Credits:', gdi.credits, '| Buildings:', gdi.curBuildings, '| Units:', gdi.curUnits);
  // eslint-disable-next-line no-console
  console.info('Nod — Credits:', nod.credits, '| Buildings:', nod.curBuildings, '| Units:', nod.curUnits);
  // eslint-disable-next-line no-console
  console.info(
    'Total objects:',
    goManager.getAll().length,
    '| Units:',
    goManager.getUnits().length,
    '| Buildings:',
    goManager.getBuildings().length
  );
};

bootstrap();

// eslint-disable-next-line no-console
console.info('C&C Remake — Pathfinder & Unit Movement initialised');
