import { test, expect } from '@playwright/test';

/**
 * Task 23.9 — 1 GDI + 5 Nod 交叉过桥测试
 *
 * 验证所有车辆能在 2 格宽桥梁场景中成功到达对岸。
 */

test('1 GDI + 5 Nod cross bridge and reach destinations', async ({ page }) => {
  await page.goto('http://localhost:5173/CnC_Remake/?task=23.9');
  await page.waitForTimeout(4000); // init + 2s delay + start moving

  // Poll for 30 seconds
  const finalStates: Array<{
    id: string;
    x: number;
    y: number;
    state: string;
    frame: number;
  }> = [];

  for (let t = 0; t < 30; t++) {
    await page.waitForTimeout(1000);
    const vehicles = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<
        string,
        (() => Array<Record<string, unknown>>) | undefined
      >;
      return cnc.debugState?.() ?? [];
    });

    if (t === 29) {
      for (const v of vehicles) {
        finalStates.push({
          id: v.id,
          x: v.x,
          y: v.y,
          state: v.state,
          frame: t + 4,
        });
      }
    }
  }

  console.log(
    'Final states:',
    finalStates.map((v) => `${v.id}(${v.x.toFixed(1)},${v.y.toFixed(1)})[${v.state}]`).join(' | ')
  );

  // All vehicles should be IDLE (reached destination) within 30s
  for (const v of finalStates) {
    expect(v.state).toBe('IDLE');
  }

  // GDI tank (go_1) started at (29,10) targeting (29,40) => should be near y=40
  const gdi = finalStates.find((v) => v.id === 'go_1');
  expect(gdi).toBeDefined();
  expect(gdi!.y).toBeGreaterThanOrEqual(38);

  // Nod tanks started at y=40 targeting y=10 => should be near y=10
  const nodTanks = finalStates.filter((v) => v.id !== 'go_1');
  expect(nodTanks.length).toBe(5);
  for (const v of nodTanks) {
    expect(v.y).toBeLessThanOrEqual(12);
  }
});
