import { DynamicTexture, Scene } from '@babylonjs/core';

/**
 * Procedural texture generator — creates simple Canvas-based textures
 * for grass, road, water, and rock until real artwork is available.
 */

export interface ProceduralTextureSet {
  grass: DynamicTexture;
  road: DynamicTexture;
  water: DynamicTexture;
  rock: DynamicTexture;
}

const SIZE = 256;

function noise(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, amount: number, color: string): void {
  for (let i = 0; i < amount; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const r = 1 + Math.random() * 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createProceduralTextures(scene: Scene): ProceduralTextureSet {
  const grass = new DynamicTexture('grassTex', SIZE, scene);
  const road = new DynamicTexture('roadTex', SIZE, scene);
  const water = new DynamicTexture('waterTex', SIZE, scene);
  const rock = new DynamicTexture('rockTex', SIZE, scene);

  // Grass — green base with darker speckles
  {
    const ctx = grass.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#3A7326';
    ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, 4000, '#2E5C1E');
    noise(ctx, 2000, '#4A8340');
    grass.update();
  }

  // Road — grey with subtle gravel
  {
    const ctx = road.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#736B5E';
    ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, 3000, '#666050');
    noise(ctx, 1500, '#807A6E');
    road.update();
  }

  // Water — blue with wave-like streaks
  {
    const ctx = water.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#265C8C';
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * SIZE;
      ctx.strokeStyle = `rgba(60, 130, 180, ${0.1 + Math.random() * 0.2})`;
      ctx.lineWidth = 2 + Math.random() * 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(SIZE * 0.3, y + Math.random() * 20 - 10, SIZE * 0.7, y + Math.random() * 20 - 10, SIZE, y);
      ctx.stroke();
    }
    water.update();
  }

  // Rock — brown-grey with cracks
  {
    const ctx = rock.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#665644';
    ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, 2000, '#5A4C3A');
    noise(ctx, 2000, '#726654');
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = 'rgba(80, 70, 55, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let x = Math.random() * SIZE;
      let y = Math.random() * SIZE;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 40;
        y += (Math.random() - 0.5) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    rock.update();
  }

  return { grass, road, water, rock };
}
