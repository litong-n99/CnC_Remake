import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 80 — Particle Effects', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('particle manager exists and reports zero active on init', async () => {
    const stats = await game.particleStats();
    expect(stats.activeCount).toBe(0);
  });

  test('spawning a single explosion increases active count', async () => {
    await game.spawnExplosion(0, 0.5, 0);
    const stats = await game.particleStats();
    expect(stats.activeCount).toBe(1);
    expect(stats.poolSize).toBeGreaterThanOrEqual(1);
  });

  test('spawning 50 explosions does not throw and pool caps gracefully', async ({ page }) => {
    // Spawn 50 explosions in parallel via a single evaluate for speed
    const results = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as {
        spawnExplosion(x: number, y: number, z: number): { spawned: boolean };
      };
      const r: boolean[] = [];
      for (let i = 0; i < 50; i++) {
        const res = cnc.spawnExplosion(i * 0.1, 0.5, i * 0.1);
        r.push(res.spawned);
      }
      return r;
    });
    const successCount = results.filter((s) => s).length;
    expect(successCount).toBe(50);

    const stats = await game.particleStats();
    expect(stats.poolSize).toBeGreaterThanOrEqual(50);
  });

  test('pool grows on demand and recycles after expiry', async ({ page }) => {
    // Spawn a few explosions
    await game.spawnExplosion(0, 0.5, 0);
    await game.spawnExplosion(1, 0.5, 1);
    let stats = await game.particleStats();
    expect(stats.activeCount).toBe(2);
    expect(stats.poolSize).toBeGreaterThanOrEqual(2);

    // Wait for expiry (1s) — render loop calls particleManager.update()
    await page.waitForTimeout(1200);

    stats = await game.particleStats();
    expect(stats.activeCount).toBe(0);
    // Pool retains systems for reuse
    expect(stats.poolSize).toBeGreaterThanOrEqual(2);
  });
});
