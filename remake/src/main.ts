import { Vector3, MeshBuilder } from '@babylonjs/core';
import { EngineManager } from './core/EngineManager';
import { SceneManager } from './core/SceneManager';
import { RTSCamera } from './core/RTSCamera';
import { Lighting } from './renderer/Lighting';

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

  // ── Reference geometry ──
  const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene);
  ground.position.y = -0.01;
  lighting.enableShadowsOnMesh(ground);

  const box = MeshBuilder.CreateBox('box', { size: 1 }, scene);
  box.position.y = 0.5;
  lighting.addShadowCaster(box);
  lighting.enableShadowsOnMesh(box);

  // ── Render loop ──
  sceneManager.runRenderLoop();

  // ── Lifecycle cleanup ──
  window.addEventListener('beforeunload', () => {
    lighting.dispose();
    rtsCamera.dispose();
    sceneManager.dispose();
    engineManager.dispose();
  });
};

bootstrap();

// eslint-disable-next-line no-console
console.info('C&C Remake — Lighting & Shadows initialised');
