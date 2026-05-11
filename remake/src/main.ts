import { Vector3, MeshBuilder } from '@babylonjs/core';
import { EngineManager } from './core/EngineManager';
import { SceneManager } from './core/SceneManager';
import { RTSCamera } from './core/RTSCamera';
import { Lighting } from './renderer/Lighting';
import { TerrainGrid } from './game/terrain/TerrainGrid';
import { GameRules } from './game/rules/GameRules';
import { UNIT_DEFINITIONS } from './game/rules/UnitDefinitions';
import { BUILDING_DEFINITIONS } from './game/rules/BuildingDefinitions';

const bootstrap = (): void => {
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
  terrain.generateTestPattern();

  // ── Test geometry ──
  const box = MeshBuilder.CreateBox('box', { size: 1 }, scene);
  box.position.y = 0.5;
  lighting.addShadowCaster(box);
  lighting.enableShadowsOnMesh(box);

  // ── Render loop ──
  sceneManager.runRenderLoop();

  // ── Lifecycle cleanup ──
  window.addEventListener('beforeunload', () => {
    terrain.dispose();
    lighting.dispose();
    rtsCamera.dispose();
    sceneManager.dispose();
    engineManager.dispose();
  });

  // ── Verify Task 11 acceptance criteria ──
  // eslint-disable-next-line no-console
  console.info('GameRules.buildSpeedBias =', GameRules.buildSpeedBias);
  // eslint-disable-next-line no-console
  console.info('UNIT_DEFINITIONS.MediumTank.speed =', UNIT_DEFINITIONS.MediumTank.speed);
  // eslint-disable-next-line no-console
  console.info('BUILDING_DEFINITIONS.PowerPlant.power =', BUILDING_DEFINITIONS.PowerPlant.power);
};

bootstrap();

// eslint-disable-next-line no-console
console.info('C&C Remake — Rules & Definitions initialised');
