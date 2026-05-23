import { test, expect } from '@playwright/test';

/**
 * Task 23.9 — 西侧 10 Nod + 东侧 1 GDI 交叉过桥测试
 *
 * 验证所有车辆能在 2 格宽桥梁场景中成功到达对岸。
 */

test('10 Nod + 1 GDI cross bridge and reach destinations', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto('http://localhost:5173/CnC_Remake/?task=23.9');
  await page.waitForTimeout(4000); // init + 2s delay + start moving

  // Poll for 60 seconds (11 tanks through 2-cell bridge needs time)
  const finalStates: Array<{
    id: string;
    x: number;
    y: number;
    state: string;
  }> = [];

  for (let t = 0; t < 60; t++) {
    await page.waitForTimeout(1000);
    const vehicles = await page.evaluate(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc as Record<
        string,
        (() => Array<Record<string, unknown>>) | undefined
      >;
      return cnc.debugState?.() ?? [];
    });

    if (t === 59) {
      for (const v of vehicles) {
        finalStates.push({
          id: v.id as string,
          x: v.x as number,
          y: v.y as number,
          state: v.state as string,
        });
      }
    }
  }

  console.log(
    'Final states:',
    finalStates.map((v) => `${v.id}(${v.x.toFixed(1)},${v.y.toFixed(1)})[${v.state}]`).join(' | ')
  );

  // All vehicles should be IDLE (reached destination) within 60s
  for (const v of finalStates) {
    expect(v.state).toBe('IDLE');
  }

  // GDI tank (go_1) started at (33,40) targeting (24,10) => should be near y=10
  const gdi = finalStates.find((v) => v.id === 'go_1');
  expect(gdi).toBeDefined();
  expect(gdi!.y).toBeLessThanOrEqual(12);

  // Nod tanks started at y=10-11 targeting y=40-41 => should be near y=40
  const nodTanks = finalStates.filter((v) => v.id !== 'go_1');
  expect(nodTanks.length).toBe(10);
  for (const v of nodTanks) {
    expect(v.y).toBeGreaterThanOrEqual(38);
  }
});
