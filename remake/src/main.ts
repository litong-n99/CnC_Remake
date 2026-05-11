import { Vector3 } from '@babylonjs/core';
import { EngineManager } from './core/EngineManager';
import { SceneManager } from './core/SceneManager';
import { RTSCamera } from './core/RTSCamera';
import { Lighting } from './renderer/Lighting';
import { TerrainGrid } from './game/terrain/TerrainGrid';
import { MapLoader } from './game/terrain/MapLoader';
import { GameRules } from './game/rules/GameRules';
import { UNIT_DEFINITIONS } from './game/rules/UnitDefinitions';
import { BUILDING_DEFINITIONS } from './game/rules/BuildingDefinitions';
import { HouseManager } from './game/house/HouseManager';
import { HouseType } from './game/house/House';
import { GameObjectFactory } from './game/objects/GameObjectFactory';
import { GameObjectManager } from './game/objects/GameObjectManager';

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
  try {
    const map = await MapLoader.loadFromUrl('/maps/dummy_map.json');
    MapLoader.applyToTerrainGrid(map, terrain);
    // eslint-disable-next-line no-console
    console.info(`Map loaded: ${map.width}x${map.height}, version ${map.version}`);
  } catch (err) {
    console.warn('Failed to load map, falling back to test pattern:', err);
    terrain.generateTestPattern();
  }

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
console.info('C&C Remake — GameObject Factory initialised');
