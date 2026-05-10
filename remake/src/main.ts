import { Vector3, HemisphericLight, MeshBuilder } from '@babylonjs/core';
import { EngineManager } from './core/EngineManager';
import { SceneManager } from './core/SceneManager';
import { RTSCamera } from './core/RTSCamera';

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

  // ── Light ──
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  // ── Reference geometry ──
  const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene);
  ground.position.y = -0.01;

  const box = MeshBuilder.CreateBox('box', { size: 1 }, scene);
  box.position.y = 0.5;

  // ── Render loop ──
  sceneManager.runRenderLoop();

  // ── Lifecycle cleanup ──
  window.addEventListener('beforeunload', () => {
    rtsCamera.dispose();
    sceneManager.dispose();
    engineManager.dispose();
  });
};

bootstrap();

// eslint-disable-next-line no-console
console.info('C&C Remake — Engine & Scene managers initialised');
