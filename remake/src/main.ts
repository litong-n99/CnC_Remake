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
import { InputManager } from './core/InputManager';
import { Unit } from './game/objects/Unit';
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

  // ── Task 23.9: 密集场景压力测试 — 2 格宽峡谷桥梁 ──
  // 通过 URL 查询参数 ?task=23.9 启用，避免干扰其他 e2e 测试的地形
  const urlParams = new URLSearchParams(window.location.search);
  const enableTask239 = urlParams.get('task') === '23.9';

  if (enableTask239) {
    // 1. 完整北墙和南墙（横向 Rock，x=0-63）
    for (let x = 0; x < 64; x++) {
      terrain.setCellLandType(x, 15, LandType.Rock);
      terrain.setCellLandType(x, 35, LandType.Rock);
    }

    // 2. 桥梁侧壁（纵向 Rock，让桥梁收窄为 2 格宽 x=29-30）
    for (let y = 15; y <= 35; y++) {
      terrain.setCellLandType(28, y, LandType.Rock);
      terrain.setCellLandType(31, y, LandType.Rock);
    }

    // 3. 显式清除桥梁通道（x=29-30, y=15-35）
    for (let y = 15; y <= 35; y++) {
      terrain.setCellLandType(29, y, LandType.Clear);
      terrain.setCellLandType(30, y, LandType.Clear);
    }

    // 4. 出发区和目标区清除不可通行地形（dummy_map 残留 Rock/Rough/Water）
    // 西侧 Nod 出发区 + 东侧 GDI 目标区
    for (let y = 8; y <= 14; y++) {
      for (let x = 18; x <= 40; x++) {
        const type = terrain.getCellLandType(x, y);
        if (type === LandType.Water || type === LandType.Rock || type === LandType.Rough || type === LandType.River) {
          terrain.setCellLandType(x, y, LandType.Clear);
        }
      }
    }
    // 东侧 GDI 出发区 + 西侧 Nod 目标区
    for (let y = 36; y <= 44; y++) {
      for (let x = 18; x <= 40; x++) {
        const type = terrain.getCellLandType(x, y);
        if (type === LandType.Water || type === LandType.Rock || type === LandType.Rough || type === LandType.River) {
          terrain.setCellLandType(x, y, LandType.Clear);
        }
      }
    }
  } else {
    // 默认模式：为旧 e2e 测试恢复兼容地形（dummy_map 的 Water 会破坏测试位置）
    // 清除测试安全区
    for (let y = 18; y <= 26; y++) {
      for (let x = 22; x <= 38; x++) {
        terrain.setCellLandType(x, y, LandType.Clear);
      }
    }
    // 创建 Rock 墙供 task-23.7 测试（Locomotor 差异）
    for (let y = 22; y <= 23; y++) {
      for (let x = 24; x <= 36; x++) {
        terrain.setCellLandType(x, y, LandType.Rock);
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

  // ── Task 23.9: 西侧10辆Nod + 东侧1辆GDI 交叉过桥测试 ──
  const gdiTanks: Unit[] = [];
  const nodTanks: Unit[] = [];

  if (enableTask239) {
    // GDI 1 辆在东侧，前往西侧
    gdiTanks.push(
      GameObjectFactory.createUnit({
        definition: UNIT_DEFINITIONS.MediumTank,
        house: gdi,
        x: 33,
        y: 40,
        scene,
      })
    );

    // Nod 10 辆在西侧，前往东侧（2排，每排5辆，不重叠）
    for (let i = 0; i < 10; i++) {
      const row = Math.floor(i / 5); // 0 or 1
      const col = i % 5; // 0..4
      nodTanks.push(
        GameObjectFactory.createUnit({
          definition: UNIT_DEFINITIONS.MediumTank,
          house: nod,
          x: 20 + col,
          y: 10 + row,
          scene,
        })
      );
    }

    // 延迟 2s 后同时下达交叉移动命令
    setTimeout(() => {
      const gdiTank = gdiTanks[0];
      const okGdi = gdiTank.logic.moveTo(24, 10, pathfinder);
      console.warn(
        `[Task23.9] GDI moveTo(24,10) = ${okGdi}, path=${JSON.stringify(gdiTank.logic.movement['path']?.map((p: { x: number; y: number }) => [p.x, p.y]))}`
      );

      for (let i = 0; i < nodTanks.length; i++) {
        const tank = nodTanks[i];
        const tx = 33 + (i % 5);
        const ty = 40 + Math.floor(i / 5);
        const ok = tank.logic.moveTo(tx, ty, pathfinder);
        console.warn(
          `[Task23.9] Nod-${i} moveTo(${tx},${ty}) = ${ok}, path=${JSON.stringify(tank.logic.movement['path']?.map((p: { x: number; y: number }) => [p.x, p.y]))}`
        );
      }
      console.warn('Task 23.9: 10 Nod + 1 GDI ordered to cross');
    }, 2000);
  }

  // ── Task 24 默认场景：框选 + 群体移动测试单位 ──
  // 放置在地图东南角 (45-50, 45-50)，避免与 task-23.1~23.8 的 e2e 测试坐标 (22-38, 18-26) 冲突
  if (!enableTask239) {
    // GDI 6 辆 MediumTank，3x2 编队
    for (let i = 0; i < 6; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      gdiTanks.push(
        GameObjectFactory.createUnit({
          definition: UNIT_DEFINITIONS.MediumTank,
          house: gdi,
          x: 45 + col,
          y: 45 + row,
          scene,
        })
      );
    }

    // Nod 2 辆 LightTank 作为攻击目标
    for (let i = 0; i < 2; i++) {
      nodTanks.push(
        GameObjectFactory.createUnit({
          definition: UNIT_DEFINITIONS.LightTank,
          house: nod,
          x: 50 + i,
          y: 45 + i,
          scene,
        })
      );
    }
  }

  // Enable shadows on all spawned objects
  const allSpawned = [...gdiTanks, ...nodTanks];
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

  // ── Debug Console ──
  const gameConsole = new GameConsole(scene, lighting, rtsCamera, terrain, placer, pathfinder);
  gameConsole.install();

  // ── Task 24: InputManager（鼠标输入层）──
  const selectionManager = SelectionManager.getInstance();
  const inputManager = new InputManager(rtsCamera, scene, selectionManager, pathfinder, placer, gameConsole);

  // worldToScreen 通过 inputManager.worldToScreen 暴露给 e2e 测试

  // ── Game loop ──
  const engine = engineManager.getEngine();
  let overlapCheckAccumulator = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime();

    queue.tick(dt);
    if (placer.isPlacing()) {
      const ptr = rtsCamera.getPointerPosition();
      placer.updateFromScreen(ptr.x, ptr.y);
    }
    sidebar.refresh(dt);
    GameObjectManager.getInstance().update(dt);

    // ── Overlap 检测（每秒一次）──
    overlapCheckAccumulator += dt;
    if (overlapCheckAccumulator >= 1000) {
      overlapCheckAccumulator = 0;
      const units = GameObjectManager.getInstance().getUnits();
      for (let i = 0; i < units.length; i++) {
        const a = units[i] as Unit;
        if (!a.isAlive()) continue;
        for (let j = i + 1; j < units.length; j++) {
          const b = units[j] as Unit;
          if (!b.isAlive()) continue;
          const dx = a.logic.x - b.logic.x;
          const dy = a.logic.y - b.logic.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.3) {
            console.warn(
              `[OVERLAP] ${a.id} @(${a.logic.x.toFixed(2)},${a.logic.y.toFixed(2)}) vs ` +
                `${b.id} @(${b.logic.x.toFixed(2)},${b.logic.y.toFixed(2)}) dist=${dist.toFixed(3)} ` +
                `A:from=(${a.logic.fromCellX},${a.logic.fromCellY}) to=(${a.logic.toCellX},${a.logic.toCellY}) ` +
                `B:from=(${b.logic.fromCellX},${b.logic.fromCellY}) to=(${b.logic.toCellX},${b.logic.toCellY})`
            );
          }
        }
      }
    }
  });

  // ── Render loop ──
  sceneManager.runRenderLoop();

  // ── Lifecycle cleanup ──
  window.addEventListener('beforeunload', () => {
    inputManager.dispose();
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

  // ── Expose internals for e2e tests ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  w._engine = engineManager.getEngine();
  w._scene = scene;
  w._selectionManager = selectionManager;
  w._goManager = GameObjectManager.getInstance();
  w._worldToScreen = (worldX: number, worldY: number, worldZ: number) => {
    return inputManager.worldToScreen(new Vector3(worldX, worldY, worldZ));
  };

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
