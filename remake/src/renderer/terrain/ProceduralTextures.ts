import { DynamicTexture, Scene } from '@babylonjs/core';

/**
 * Procedural texture generator — creates simple Canvas-based textures
 * for 8 terrain layers until real artwork is available.
 */

export interface ProceduralTextureSet {
  grass: DynamicTexture;
  road: DynamicTexture;
  water: DynamicTexture;
  rock: DynamicTexture;
  beach: DynamicTexture;
  rough: DynamicTexture;
  tiberium: DynamicTexture;
  snow: DynamicTexture;
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
  const beach = new DynamicTexture('beachTex', SIZE, scene);
  const rough = new DynamicTexture('roughTex', SIZE, scene);
  const tiberium = new DynamicTexture('tiberiumTex', SIZE, scene);
  const snow = new DynamicTexture('snowTex', SIZE, scene);

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

  // Beach — light sand with subtle wet patches
  {
    const ctx = beach.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#C2B280';
    ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, 3000, '#B0A070');
    noise(ctx, 2000, '#D4C490');
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = `rgba(160, 150, 100, ${0.05 + Math.random() * 0.1})`;
      const x = Math.random() * SIZE;
      const y = Math.random() * SIZE;
      const r = 10 + Math.random() * 30;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    beach.update();
  }

  // Rough — scrubland / wasteland, mottled brown-green
  {
    const ctx = rough.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#5C5A3A';
    ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, 3500, '#4E4C2E');
    noise(ctx, 2500, '#6A6848');
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(80, 90, 50, ${0.1 + Math.random() * 0.15})`;
      const x = Math.random() * SIZE;
      const y = Math.random() * SIZE;
      const r = 3 + Math.random() * 8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    rough.update();
  }

  // Tiberium — crystalline green with glow specks
  {
    const ctx = tiberium.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#1A4A1A';
    ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, 2500, '#0F3A0F');
    noise(ctx, 1500, '#2A6A2A');
    // Crystals
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * SIZE;
      const y = Math.random() * SIZE;
      const size = 2 + Math.random() * 6;
      ctx.fillStyle = `rgba(60, 220, 80, ${0.3 + Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.6, y + size * 0.4);
      ctx.lineTo(x - size * 0.6, y + size * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    tiberium.update();
  }

  // Snow — white with subtle blue shadows
  {
    const ctx = snow.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = '#E8E8E8';
    ctx.fillRect(0, 0, SIZE, SIZE);
    noise(ctx, 3000, '#D8D8D8');
    noise(ctx, 2000, '#F0F0F0');
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(200, 210, 230, ${0.05 + Math.random() * 0.1})`;
      const x = Math.random() * SIZE;
      const y = Math.random() * SIZE;
      const r = 15 + Math.random() * 40;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    snow.update();
  }

  return { grass, road, water, rock, beach, rough, tiberium, snow };
}
