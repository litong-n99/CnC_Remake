import { test, expect } from '@playwright/test';

/**
 * Task 23.9 — Corner Cutting (对角线剪枝) 回归测试
 *
 * 验证 Track 车辆不会穿过 Rock 墙角，Foot 步兵可以。
 * 同时运行 60 秒压力测试，确保密集场景中无车辆进入 Rock 格子。
 */

function isTrueRock(cx: number, cy: number): boolean {
  // 西壁 x=28, y=15..35
  if (cx === 28 && cy >= 15 && cy <= 35) return true;
  // 东壁 x=31, y=15..35
  if (cx === 31 && cy >= 15 && cy <= 35) return true;
  // 北墙 y=15, 排除桥梁缺口 x=29,30
  if (cy === 15 && cx >= 0 && cx <= 63 && cx !== 29 && cx !== 30) return true;
  // 南墙 y=35, 排除桥梁缺口 x=29,30
  if (cy === 35 && cx >= 0 && cx <= 63 && cx !== 29 && cx !== 30) return true;
  return false;
}

test('A* corner cutting: Track avoids Rock, Foot cuts through', async ({ page }) => {
  await page.goto('http://localhost:5173/CnC_Remake/?task=23.9');
  await page.waitForTimeout(3000);

  const trackPath = await page.evaluate(() => {
    return (window as unknown as Record<string, unknown>).cnc.pathfind(28, 14, 30, 15, 'None', 'Track') as Array<{
      x: number;
      y: number;
    }> | null;
  });
  const footPath = await page.evaluate(() => {
    return (window as unknown as Record<string, unknown>).cnc.pathfind(28, 14, 30, 15, 'None', 'Foot') as Array<{
      x: number;
      y: number;
    }> | null;
  });

  expect(trackPath).not.toBeNull();
  expect(footPath).not.toBeNull();

  // Track must NOT contain diagonal step (28,14)->(29,15) because (28,15) is Rock
  const trackHasDiagonalThroughRock = trackPath!.some((n, i) => {
    if (i === 0) return false;
    const prev = trackPath![i - 1];
    return prev.x === 28 && prev.y === 14 && n.x === 29 && n.y === 15;
  });
  expect(trackHasDiagonalThroughRock).toBe(false);

  // Foot SHOULD contain the diagonal step because Foot can traverse Rock (terrainSpeed=0.5)
  const footHasDiagonalThroughRock = footPath!.some((n, i) => {
    if (i === 0) return false;
    const prev = footPath![i - 1];
    return prev.x === 28 && prev.y === 14 && n.x === 29 && n.y === 15;
  });
  expect(footHasDiagonalThroughRock).toBe(true);
});

test('60s stress test: no vehicle on true Rock cells', async ({ page }) => {
  await page.goto('http://localhost:5173/CnC_Remake/?task=23.9');
  await page.waitForTimeout(2000);

  const samples: Array<{ time: number; onRock: number }> = [];
  for (let t = 0; t < 60; t += 2) {
    await page.waitForTimeout(2000);
    const vehicles = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<
        string,
        (() => Array<Record<string, unknown>>) | undefined
      >;
      return cnc.debugState?.() ?? [];
    });
    const onRock = vehicles.filter((v) => isTrueRock(Math.round(v.x as number), Math.round(v.y as number))).length;
    samples.push({ time: t + 2, onRock });
  }

  const totalOnRock = samples.reduce((sum, s) => sum + s.onRock, 0);
  expect(totalOnRock).toBe(0);
});
