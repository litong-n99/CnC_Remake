import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 68 — Replay System', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('ReplayRecorder records frames and exports JSON', async ({ page }) => {
    const result = await page.evaluate(() => {
      const RR = (window as unknown as Record<string, unknown>).ReplayRecorder as new () => {
        start: (seed: number, map: string, players: string[]) => void;
        recordFrame: (frame: number, orders: unknown[]) => void;
        stop: () => { header: { seed: number; mapName: string }; frames: unknown[] };
        toJSON: () => string;
        isRecording: () => boolean;
        getFrameCount: () => number;
      };

      const rr = new RR();
      rr.start(42, 'map-01', ['p1', 'p2']);
      rr.recordFrame(0, [
        { orderString: 'Move', subjectId: 'u1', target: { type: 'ground', x: 10, y: 20 }, queued: false },
      ]);
      rr.recordFrame(1, [
        { orderString: 'Attack', subjectId: 'u2', target: { type: 'actor', actorId: 'e1' }, queued: false },
      ]);
      const data = rr.stop();
      const json = rr.toJSON();
      return {
        seed: data.header.seed,
        mapName: data.header.mapName,
        frameCount: data.frames.length,
        jsonLength: json.length,
        wasRecording: rr.isRecording(),
      };
    });

    expect(result.seed).toBe(42);
    expect(result.mapName).toBe('map-01');
    expect(result.frameCount).toBe(2);
    expect(result.jsonLength).toBeGreaterThan(0);
    expect(result.wasRecording).toBe(false);
  });

  test('ReplayPlayer loads and replays recorded data', async ({ page }) => {
    const result = await page.evaluate(() => {
      const RR = (window as unknown as Record<string, unknown>).ReplayRecorder as new () => {
        start: (seed: number, map: string, players: string[]) => void;
        recordFrame: (frame: number, orders: unknown[]) => void;
        toJSON: () => string;
        stop: () => unknown;
      };
      const RP = (window as unknown as Record<string, unknown>).ReplayPlayer as new () => {
        loadFromJSON: (json: string) => void;
        play: () => void;
        tick: () => { frame: number; orders: unknown[] } | null;
        getHeader: () => { seed: number } | null;
        getProgress: () => number;
        isFinished: () => boolean;
      };

      const rr = new RR();
      rr.start(99, 'map-02', ['p1']);
      rr.recordFrame(0, [
        { orderString: 'Move', subjectId: 'u1', target: { type: 'ground', x: 1, y: 2 }, queued: false },
      ]);
      rr.recordFrame(1, [{ orderString: 'Stop', subjectId: 'u1', target: { type: 'none' }, queued: false }]);
      rr.stop();
      const json = rr.toJSON();

      const rp = new RP();
      rp.loadFromJSON(json);
      rp.play();

      const f1 = rp.tick();
      const f2 = rp.tick();
      void rp.tick(); // f3 should be null (end)
      const header = rp.getHeader();

      return {
        headerSeed: header?.seed,
        f1Frame: f1?.frame,
        f1OrderCount: (f1?.orders as unknown[] | undefined)?.length,
        f2Frame: f2?.frame,
        finished: rp.isFinished(),
        progress: rp.getProgress(),
      };
    });

    expect(result.headerSeed).toBe(99);
    expect(result.f1Frame).toBe(0);
    expect(result.f1OrderCount).toBe(1);
    expect(result.f2Frame).toBe(1);
    expect(result.finished).toBe(true);
    expect(result.progress).toBe(1);
  });
});
