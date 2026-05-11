import { Vector3, MeshBuilder } from '@babylonjs/core';
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

  // ── Test geometry ──
  const box = MeshBuilder.CreateBox('box', { size: 1 }, scene);
  box.position.y = 0.5;
  lighting.addShadowCaster(box);
  lighting.enableShadowsOnMesh(box);

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

  gdi.addBuilding(BUILDING_DEFINITIONS.PowerPlant.id);
  gdi.addBuilding(BUILDING_DEFINITIONS.Barracks.id);
  gdi.addUnit(UNIT_DEFINITIONS.MediumTank.id);
  gdi.addUnit(UNIT_DEFINITIONS.Jeep.id);

  nod.addBuilding(BUILDING_DEFINITIONS.PowerPlant.id);
  nod.addBuilding(BUILDING_DEFINITIONS.OreRefinery.id);
  nod.addUnit(UNIT_DEFINITIONS.LightTank.id);
  nod.addUnit(UNIT_DEFINITIONS.V2Rocket.id);

  // ── Render loop ──
  sceneManager.runRenderLoop();

  // ── Lifecycle cleanup ──
  window.addEventListener('beforeunload', () => {
    houseManager.dispose();
    terrain.dispose();
    lighting.dispose();
    rtsCamera.dispose();
    sceneManager.dispose();
    engineManager.dispose();
  });

  // ── Verification ──
  // eslint-disable-next-line no-console
  console.info('GDI — Credits:', gdi.credits, '| Buildings:', gdi.curBuildings, '| Units:', gdi.curUnits);
  // eslint-disable-next-line no-console
  console.info('Nod — Credits:', nod.credits, '| Buildings:', nod.curBuildings, '| Units:', nod.curUnits);
};

bootstrap();

// eslint-disable-next-line no-console
console.info('C&C Remake — Map Loader initialised');
