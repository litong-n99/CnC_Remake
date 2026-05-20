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
    edgeThreshold: 5, // 鼠标贴住边缘 5px 内热区时滚动
    uiRightPanelWidth: 190, // Sidebar 宽度，排除在右边缘滚动区域外
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

  // ── Task 23.7 验收场景：岩石峡谷 ──
  // 在中间区域创建一道完整的 Rock 墙。
  // 步兵（Foot）Rock=0.5 可直接穿过岩石，车辆（Track）Rock=0 必须绕路。
  for (let x = 24; x <= 36; x++) {
    terrain.setCellLandType(x, 22, LandType.Rock);
    terrain.setCellLandType(x, 23, LandType.Rock);
  }

  // 将所有 Water 改为 Clear，方便测试（避免车辆在水上）
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      if (terrain.getCellLandType(x, y) === LandType.Water) {
        terrain.setCellLandType(x, y, LandType.Clear);
      }
    }
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
      // isPassable 只检查绝对不可通行的地形（Water）。
      // Rock / Wall / River 的通行性由各单位的 Locomotor 的 TerrainSpeeds 控制。
      const type = terrain.getCellLandType(x, y);
      return type !== LandType.Water;
    },
    getBuildingBlockedCells,
    (x, y) => terrain.getCellLandType(x, y)
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

  // ── Task 23.8 验收：SubCell 步兵共享 + NotifyBlocker Nudge ──
  // 5 名步兵共享 (30,20)，1 辆坦克从 (30,18) 驶入触发 Nudge
  const task238Units: Unit[] = [];
  for (let i = 0; i < 5; i++) {
    task238Units.push(
      GameObjectFactory.createUnit({
        definition: UNIT_DEFINITIONS.RifleInfantry,
        house: gdi,
        x: 30,
        y: 20,
        scene,
      })
    );
  }
  const nudgeTank = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.MediumTank,
    house: gdi,
    x: 30,
    y: 18,
    scene,
  });
  task238Units.push(nudgeTank);

  // 自动下达移动命令（延迟 1s 确保场景初始化完成）
  setTimeout(() => {
    nudgeTank.logic.moveTo(30, 20, pathfinder);
    // eslint-disable-next-line no-console
    console.info('Task 23.8: Tank ordered to (30,20) — infantry should Nudge away');
  }, 1000);

  // Enable shadows on all spawned objects
  const allSpawned = [...task238Units];
  for (const obj of allSpawned) {
    if (obj.mesh) {
      lighting.addShadowCaster(obj.mesh);
      lighting.enableShadowsOnMesh(obj.mesh);
    }
  }

  // ── Minimal infrastructure for interaction ──
  const queue = new ConstructionQueue(gdi);
  const placer = new BuildingPlacer(scene, rtsCamera.getCamera(), terrain);

  // ── Sidebar ──
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
      if (mode === 'repair') {
        rtsCamera.setCursorColor('#0f0');
      } else if (mode === 'sell') {
        rtsCamera.setCursorColor('#f90');
      } else {
        rtsCamera.setCursorColor('#fff');
      }
    }
  );

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

  // 左键：选中单位
  rtsCamera.onLeftClick = (screenX, screenY) => {
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

    queue.tick(dt);
    if (placer.isPlacing()) {
      const ptr = rtsCamera.getPointerPosition();
      placer.updateFromScreen(ptr.x, ptr.y);
    }
    sidebar.refresh(dt);
    GameObjectManager.getInstance().update(dt);
  });

  // ── Render loop ──
  sceneManager.runRenderLoop();

  // ── Lifecycle cleanup ──
  window.addEventListener('beforeunload', () => {
    sidebar.dispose();
    placer.dispose();
    GameObjectManager.getInstance().dispose();
    houseManager.dispose();
    terrain.dispose();
    lighting.dispose();
    rtsCamera.dispose();
    sceneManager.dispose();
    engineManager.dispose();
  });

  // ── Debug Console ──
  const gameConsole = new GameConsole(scene, lighting, rtsCamera, terrain, placer, pathfinder);
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
