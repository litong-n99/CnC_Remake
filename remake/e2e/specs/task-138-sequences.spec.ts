import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 138 — Sequence System', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('SequenceProvider registers and queries sequences', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SequenceProvider = (window as unknown as Record<string, unknown>)._SequenceProvider as new () => {
        register: (type: string, seq: unknown) => void;
        getSequence: (type: string, name: string) => unknown;
        hasSequence: (type: string, name: string) => boolean;
        getSequenceNames: (type: string) => string[];
      };

      const provider = new SequenceProvider();
      provider.register('TestUnit', {
        idle: { start: 0, length: 1, tick: 100 },
        move: { start: 1, length: 6, tick: 80, loop: true },
        die: { start: 7, length: 8, tick: 100, loop: false },
      });

      return {
        hasIdle: provider.hasSequence('TestUnit', 'idle'),
        hasAttack: provider.hasSequence('TestUnit', 'attack'),
        names: provider.getSequenceNames('TestUnit'),
        idleStart: (provider.getSequence('TestUnit', 'idle') as { start: number })?.start,
        moveLoop: (provider.getSequence('TestUnit', 'move') as { loop: boolean })?.loop,
        dieLoop: (provider.getSequence('TestUnit', 'die') as { loop: boolean })?.loop,
      };
    });

    expect(result.hasIdle).toBe(true);
    expect(result.hasAttack).toBe(false);
    expect(result.names).toEqual(['idle', 'move', 'die']);
    expect(result.idleStart).toBe(0);
    expect(result.moveLoop).toBe(true);
    expect(result.dieLoop).toBe(false);
  });

  test('SequenceProvider fallback to base name for variant sequences', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SequenceProvider = (window as unknown as Record<string, unknown>)._SequenceProvider as new () => {
        register: (type: string, seq: unknown) => void;
        getSequence: (type: string, name: string) => unknown;
      };

      const provider = new SequenceProvider();
      provider.register('TestUnit', {
        die: { start: 0, length: 8, tick: 100, loop: false },
      });

      // "die-fire" should fallback to "die"
      const dieFire = provider.getSequence('TestUnit', 'die-fire');
      return {
        found: !!dieFire,
        start: (dieFire as { start: number })?.start,
      };
    });

    expect(result.found).toBe(true);
    expect(result.start).toBe(0);
  });

  test('SequenceRenderer advances frames on tick', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SequenceProvider = (window as unknown as Record<string, unknown>)._SequenceProvider as new () => {
        register: (type: string, seq: unknown) => void;
      };
      const SequenceRenderer = (window as unknown as Record<string, unknown>)._SequenceRenderer as new (
        provider: unknown,
        actorType: string
      ) => {
        tick: (dt: number) => void;
        getCurrentFrameIndex: () => number;
        getCurrentSequenceName: () => string;
      };

      const provider = new SequenceProvider();
      provider.register('TestUnit', {
        move: { start: 10, length: 6, tick: 100, loop: true },
      });

      const renderer = new SequenceRenderer(provider, 'TestUnit');
      renderer.tick(0); // init to move not set, should default to idle (not registered)
      // Re-register with idle
      provider.register('TestUnit', {
        idle: { start: 0, length: 1, tick: 100 },
        move: { start: 10, length: 6, tick: 100, loop: true },
      });

      (renderer as unknown as { setSequence: (name: string) => void }).setSequence('move');
      const f0 = renderer.getCurrentFrameIndex();
      renderer.tick(50); // half frame, no advance
      const f1 = renderer.getCurrentFrameIndex();
      renderer.tick(60); // 50+60=110 > 100, advance 1 frame
      const f2 = renderer.getCurrentFrameIndex();
      renderer.tick(500); // elapsed=10+500=510, advance=5, frame=(1+5)%6=0
      const f3 = renderer.getCurrentFrameIndex();

      return { f0, f1, f2, f3, name: renderer.getCurrentSequenceName() };
    });

    expect(result.name).toBe('move');
    expect(result.f0).toBe(10); // start + frame 0
    expect(result.f1).toBe(10); // still frame 0 after 50ms (< 100ms tick)
    expect(result.f2).toBe(11); // advanced 1 frame after 110ms
    expect(result.f3).toBe(10); // looped back to frame 0 after 510ms total
  });

  test('SequenceRenderer handles non-looping die sequence', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SequenceProvider = (window as unknown as Record<string, unknown>)._SequenceProvider as new () => {
        register: (type: string, seq: unknown) => void;
      };
      const SequenceRenderer = (window as unknown as Record<string, unknown>)._SequenceRenderer as new (
        provider: unknown,
        actorType: string
      ) => {
        setSequence: (name: string) => void;
        tick: (dt: number) => void;
        getCurrentFrameIndex: () => number;
        isFinished: () => boolean;
      };

      const provider = new SequenceProvider();
      provider.register('TestUnit', {
        die: { start: 96, length: 8, tick: 100, loop: false },
      });

      const renderer = new SequenceRenderer(provider, 'TestUnit');
      renderer.setSequence('die');

      renderer.tick(100); // frame 0 → 1
      renderer.tick(100); // frame 1 → 2
      renderer.tick(100); // frame 2 → 3
      renderer.tick(100); // frame 3 → 4
      renderer.tick(100); // frame 4 → 5
      renderer.tick(100); // frame 5 → 6
      renderer.tick(100); // frame 6 → 7 (not finished yet, 7 < 8)
      const f7 = renderer.getCurrentFrameIndex();
      const finished7 = renderer.isFinished();

      renderer.tick(100); // frame 7 → 8, clamped to 7, finished
      const f8 = renderer.getCurrentFrameIndex();
      const finished8 = renderer.isFinished();

      return { f7, finished7, f8, finished8 };
    });

    expect(result.f7).toBe(96 + 7); // last frame but not yet finished
    expect(result.finished7).toBe(false);
    expect(result.f8).toBe(96 + 7); // stays at last frame
    expect(result.finished8).toBe(true);
  });

  test('SequenceRenderer calculates facing-aware frame index', async ({ page }) => {
    const result = await page.evaluate(() => {
      const SequenceProvider = (window as unknown as Record<string, unknown>)._SequenceProvider as new () => {
        register: (type: string, seq: unknown) => void;
      };
      const SequenceRenderer = (window as unknown as Record<string, unknown>)._SequenceRenderer as new (
        provider: unknown,
        actorType: string
      ) => {
        setSequence: (name: string) => void;
        getCurrentFrameIndexForFacing: (facing: number) => number;
      };

      const provider = new SequenceProvider();
      // 8 facings, each with 6 frames (transpose=6)
      provider.register('TestUnit', {
        move: { start: 0, length: 6, tick: 80, facings: 8, transpose: 6 },
      });

      const renderer = new SequenceRenderer(provider, 'TestUnit');
      renderer.setSequence('move');

      // facing 0 (north) → facing index 0
      const f0 = renderer.getCurrentFrameIndexForFacing(0);
      // facing 64 (east) → facing index 2 (64/256*8 = 2)
      const f64 = renderer.getCurrentFrameIndexForFacing(64);
      // facing 128 (south) → facing index 4
      const f128 = renderer.getCurrentFrameIndexForFacing(128);
      // facing 192 (west) → facing index 6
      const f192 = renderer.getCurrentFrameIndexForFacing(192);

      return { f0, f64, f128, f192 };
    });

    // start=0, transpose=6, frame=0
    // facing 0: 0 + 0*6 + 0 = 0
    expect(result.f0).toBe(0);
    // facing 64: 0 + 2*6 + 0 = 12
    expect(result.f64).toBe(12);
    // facing 128: 0 + 4*6 + 0 = 24
    expect(result.f128).toBe(24);
    // facing 192: 0 + 6*6 + 0 = 36
    expect(result.f192).toBe(36);
  });

  test('Default sequences load correctly for RifleInfantry', async ({ page }) => {
    const result = await page.evaluate(() => {
      const loadDefaultSequences = (window as unknown as Record<string, unknown>)._loadDefaultSequences as () => void;
      const getSequenceProvider = (window as unknown as Record<string, unknown>)._getSequenceProvider as () => {
        getSequenceNames: (type: string) => string[];
        getSequence: (type: string, name: string) => unknown;
      };

      // Reset and load defaults
      const reset = (window as unknown as Record<string, unknown>)._resetSequenceProvider as () => void;
      reset();
      loadDefaultSequences();

      const provider = getSequenceProvider();
      const names = provider.getSequenceNames('RifleInfantry');
      const moveSeq = provider.getSequence('RifleInfantry', 'move') as { length: number; tick: number; loop: boolean };
      const dieFireSeq = provider.getSequence('RifleInfantry', 'die-fire') as { length: number };

      return { names, moveLength: moveSeq?.length, moveTick: moveSeq?.tick, dieFireLength: dieFireSeq?.length };
    });

    expect(result.names).toContain('idle');
    expect(result.names).toContain('move');
    expect(result.names).toContain('attack');
    expect(result.names).toContain('die');
    expect(result.names).toContain('die-fire');
    expect(result.names).toContain('prone');
    expect(result.moveLength).toBe(6);
    expect(result.moveTick).toBe(80);
    expect(result.dieFireLength).toBe(8);
  });
});
