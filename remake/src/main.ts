import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, Color4 } from '@babylonjs/core';

const app = document.getElementById('app');
if (!app) throw new Error('App container not found');
const canvas = document.createElement('canvas');
canvas.id = 'renderCanvas';
app.appendChild(canvas);

const engine = new Engine(canvas, true);

const createScene = (): Scene => {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 1);

  const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 15, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  // Ground plane for reference
  const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene);
  ground.position.y = -0.01;

  // A simple box to confirm 3D rendering works
  const box = MeshBuilder.CreateBox('box', { size: 1 }, scene);
  box.position.y = 0.5;

  return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener('resize', () => {
  engine.resize();
});

// eslint-disable-next-line no-console
console.info('C&C Remake — Babylon.js scene initialized');
