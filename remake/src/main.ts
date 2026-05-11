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
import { BUILDING_DEFINITIONS } from './game/rules/BuildingDefinitions';
import { HouseManager } from './game/house/HouseManager';
import { HouseType } from './game/house/House';
import { GameObjectFactory } from './game/objects/GameObjectFactory';
import { GameObjectManager } from './game/objects/GameObjectManager';
import { GameObjectType } from './game/objects/GameObject';
import { SelectionManager } from './game/SelectionManager';
import { Unit } from './game/objects/Unit';

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
    alpha: -Math.PI / 4,
    beta: Math.PI / 4,
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
  const pathfinder = new Pathfinder(64, 64, (x, y) => {
    const type = terrain.getCellLandType(x, y);
    return type !== LandType.Water && type !== LandType.Rock && type !== LandType.Wall && type !== LandType.River;
  });

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

  // ── Spawn game objects via Factory ──
  const gdiPowerPlant = GameObjectFactory.createBuilding({
    definition: BUILDING_DEFINITIONS.PowerPlant,
    house: gdi,
    x: 40,
    y: 10,
    scene,
  });
  const gdiBarracks = GameObjectFactory.createBuilding({
    definition: BUILDING_DEFINITIONS.Barracks,
    house: gdi,
    x: 44,
    y: 10,
    scene,
  });
  const gdiTank = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.MediumTank,
    house: gdi,
    x: 42,
    y: 14,
    scene,
  });
  const gdiJeep = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.Jeep,
    house: gdi,
    x: 45,
    y: 15,
    scene,
  });

  const nodPowerPlant = GameObjectFactory.createBuilding({
    definition: BUILDING_DEFINITIONS.PowerPlant,
    house: nod,
    x: 50,
    y: 45,
    scene,
  });
  const nodRefinery = GameObjectFactory.createBuilding({
    definition: BUILDING_DEFINITIONS.OreRefinery,
    house: nod,
    x: 46,
    y: 45,
    scene,
  });
  const nodTank = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.LightTank,
    house: nod,
    x: 48,
    y: 42,
    scene,
  });
  const nodRocket = GameObjectFactory.createUnit({
    definition: UNIT_DEFINITIONS.V2Rocket,
    house: nod,
    x: 45,
    y: 40,
    scene,
  });

  // Enable shadows on all spawned objects
  for (const obj of [gdiPowerPlant, gdiBarracks, gdiTank, gdiJeep, nodPowerPlant, nodRefinery, nodTank, nodRocket]) {
    if (obj.mesh) {
      lighting.addShadowCaster(obj.mesh);
      lighting.enableShadowsOnMesh(obj.mesh);
    }
  }

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

  // 右键：移动选中的单位到地面
  rtsCamera.onRightClick = (screenX, screenY) => {
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

    for (const unit of selected) {
      const success = unit.logic.moveTo(cell.x, cell.y, pathfinder);
      if (success) {
        // eslint-disable-next-line no-console
        console.info(`Move order: ${unit.definition.name} → (${cell.x}, ${cell.y})`);
      } else {
        console.warn(`Move failed for ${unit.definition.name} → (${cell.x}, ${cell.y})`);
      }
    }
  };

  // ── Game loop: update all game objects ──
  const engine = engineManager.getEngine();
  scene.onBeforeRenderObservable.add(() => {
    GameObjectManager.getInstance().update(engine.getDeltaTime());
  });

  // ── Render loop ──
  sceneManager.runRenderLoop();

  // ── Lifecycle cleanup ──
  window.addEventListener('beforeunload', () => {
    GameObjectManager.getInstance().dispose();
    houseManager.dispose();
    terrain.dispose();
    lighting.dispose();
    rtsCamera.dispose();
    sceneManager.dispose();
    engineManager.dispose();
  });

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
