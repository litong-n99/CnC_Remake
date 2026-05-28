import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task-R3: 渲染器值对象化 (IRenderable + RenderCollector)', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('r3.1: IRenderable has pos, zOffset, renderLayer, prepareRender', async ({ page }) => {
    const result = await page.evaluate(() => {
      const VO = (window as unknown as Record<string, unknown>)._SpriteRenderableVO as new (
        source: unknown,
        pos: { x: number; y: number; z: number },
        zOffset: number,
        renderLayer: number
      ) => { pos: { x: number; y: number; z: number }; zOffset: number; renderLayer: number; prepareRender(): void };
      if (!VO) return { ok: false, reason: 'missing SpriteRenderableVO' };

      const mockSource = { setPosition: () => {}, setVisible: () => {} };
      const vo = new VO(mockSource, { x: 1, y: 2, z: 3 }, 0.5, 2);
      return {
        ok: true,
        hasPos: vo.pos.x === 1 && vo.pos.y === 2 && vo.pos.z === 3,
        hasZOffset: vo.zOffset === 0.5,
        hasRenderLayer: vo.renderLayer === 2,
        hasPrepareRender: typeof vo.prepareRender === 'function',
      };
    });
    expect(result.ok).toBe(true);
    expect(result.hasPos).toBe(true);
    expect(result.hasZOffset).toBe(true);
    expect(result.hasRenderLayer).toBe(true);
    expect(result.hasPrepareRender).toBe(true);
  });

  test('r3.2: RenderCollector collects and sorts by renderLayer then zOffset', async ({ page }) => {
    const result = await page.evaluate(() => {
      const RC = (window as unknown as Record<string, unknown>)._RenderCollector as new () => {
        add(r: unknown): void;
        collect(): ReadonlyArray<{ renderLayer: number; zOffset: number }>;
        clear(): void;
      };
      if (!RC) return { ok: false, reason: 'missing RenderCollector' };

      const collector = new RC();
      const mockSource = { setPosition: () => {}, setVisible: () => {} };
      const VO = (window as unknown as Record<string, unknown>)._SpriteRenderableVO as new (
        source: unknown,
        pos: { x: number; y: number; z: number },
        zOffset: number,
        renderLayer: number
      ) => { renderLayer: number; zOffset: number; prepareRender(): void };

      collector.add(new VO(mockSource, { x: 0, y: 0, z: 0 }, 2, 1));
      collector.add(new VO(mockSource, { x: 0, y: 0, z: 0 }, 1, 1));
      collector.add(new VO(mockSource, { x: 0, y: 0, z: 0 }, 0, 0));
      collector.add(new VO(mockSource, { x: 0, y: 0, z: 0 }, 3, 1));

      const collected = collector.collect();
      const layers = collected.map((c) => c.renderLayer);
      const zOffsets = collected.map((c) => c.zOffset);

      return {
        ok: true,
        count: collected.length,
        layers,
        zOffsets,
      };
    });
    expect(result.ok).toBe(true);
    expect(result.count).toBe(4);
    // 先按 renderLayer 升序，再按 zOffset 升序
    expect(result.layers).toEqual([0, 1, 1, 1]);
    expect(result.zOffsets).toEqual([0, 1, 2, 3]);
  });

  test('r3.3: RenderCollector clear empties the buffer', async ({ page }) => {
    const result = await page.evaluate(() => {
      const RC = (window as unknown as Record<string, unknown>)._RenderCollector as new () => {
        add(r: unknown): void;
        collect(): ReadonlyArray<unknown>;
        clear(): void;
      };
      const VO = (window as unknown as Record<string, unknown>)._SpriteRenderableVO as new (
        source: unknown,
        pos: { x: number; y: number; z: number },
        zOffset: number,
        renderLayer: number
      ) => unknown;
      if (!RC || !VO) return { ok: false, reason: 'missing exports' };

      const collector = new RC();
      const mockSource = { setPosition: () => {}, setVisible: () => {} };
      collector.add(new VO(mockSource, { x: 0, y: 0, z: 0 }, 0, 0));
      collector.clear();
      const after = collector.collect();
      return { ok: true, count: after.length };
    });
    expect(result.ok).toBe(true);
    expect(result.count).toBe(0);
  });
});
