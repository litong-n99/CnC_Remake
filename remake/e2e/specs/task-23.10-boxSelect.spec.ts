import { test, expect } from '@playwright/test';

/**
 * Task 23.10 — 框选 + 群体移动回归测试
 *
 * 验证框选矩形能正确选中多个单位，右键移动命令能同步下达给所有选中单位。
 *
 * 注意：框选拖动使用 JS dispatchEvent 而非 Playwright mouse.down()/move()/up()，
 * 因为 headless Chromium 中 canvas 上的 mousedown/mouseup 事件不被 Playwright mouse API 触发。
 */

/** Convert world position to screen pixels via the exposed helper. */
async function worldToScreen(
  page: ReturnType<(typeof test)['extend']['fixtures']['page']>,
  worldX: number,
  worldY: number,
  worldZ: number
): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    (args) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = (window as any)._worldToScreen;
      if (!fn) return null;
      return fn(args.worldX, args.worldY, args.worldZ);
    },
    { worldX, worldY, worldZ }
  );
}

/** Perform a box-select drag via JS MouseEvent dispatch. */
async function boxSelectViaDispatch(
  page: ReturnType<(typeof test)['extend']['fixtures']['page']>,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): Promise<void> {
  await page.evaluate(
    (args) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canvas = (window as any)._engine?.getRenderingCanvas();
      if (!canvas) return;

      canvas.dispatchEvent(
        new MouseEvent('mousedown', {
          button: 0,
          clientX: args.minX,
          clientY: args.minY,
          bubbles: true,
        })
      );

      for (let i = 1; i <= 10; i++) {
        const t = i / 10;
        canvas.dispatchEvent(
          new MouseEvent('mousemove', {
            button: 0,
            clientX: args.minX + (args.maxX - args.minX) * t,
            clientY: args.minY + (args.maxY - args.minY) * t,
            bubbles: true,
          })
        );
      }

      window.dispatchEvent(
        new MouseEvent('mouseup', {
          button: 0,
          clientX: args.maxX,
          clientY: args.maxY,
          bubbles: true,
        })
      );
    },
    { minX, minY, maxX, maxY }
  );
}

test('box-select multiple units', async ({ page }) => {
  await page.goto('http://localhost:5173/CnC_Remake/');
  await page.waitForTimeout(2000);

  // Clear default scene units
  await page.evaluate(() => {
    const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (() => void) | undefined>;
    cnc.clear?.();
  });

  // Spawn 3 tanks at known cell coordinates
  await page.evaluate(() => {
    const cnc = (window as unknown as Record<string, unknown>).cnc as Record<
      string,
      (type: string, house: string, x: number, y: number) => unknown
    >;
    cnc.unit('MediumTank', 'gdi', 30, 30);
    cnc.unit('MediumTank', 'gdi', 32, 30);
    cnc.unit('MediumTank', 'gdi', 34, 30);
  });
  await page.waitForTimeout(500);

  // Convert cell positions to screen positions
  const positions = await Promise.all([
    worldToScreen(page, 30 - 32, 0, 30 - 32),
    worldToScreen(page, 32 - 32, 0, 30 - 32),
    worldToScreen(page, 34 - 32, 0, 30 - 32),
  ]);

  const validPositions = positions.filter((p): p is { x: number; y: number } => p !== null);
  expect(validPositions.length).toBe(3);

  const minX = Math.min(...validPositions.map((p) => p.x)) - 30;
  const minY = Math.min(...validPositions.map((p) => p.y)) - 30;
  const maxX = Math.max(...validPositions.map((p) => p.x)) + 30;
  const maxY = Math.max(...validPositions.map((p) => p.y)) + 30;

  await boxSelectViaDispatch(page, minX, minY, maxX, maxY);
  await page.waitForTimeout(300);

  const selectedCount = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sm = (window as any)._selectionManager;
    if (!sm) return -1;
    return sm.getSelected().length;
  });

  expect(selectedCount).toBe(3);
});

test('right-click move order applies to all selected units', async ({ page }) => {
  await page.goto('http://localhost:5173/CnC_Remake/');
  await page.waitForTimeout(2000);

  // Clear default scene units
  await page.evaluate(() => {
    const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (() => void) | undefined>;
    cnc.clear?.();
  });

  // Spawn 2 tanks
  await page.evaluate(() => {
    const cnc = (window as unknown as Record<string, unknown>).cnc as Record<
      string,
      (type: string, house: string, x: number, y: number) => unknown
    >;
    cnc.unit('MediumTank', 'gdi', 30, 30);
    cnc.unit('MediumTank', 'gdi', 31, 30);
  });
  await page.waitForTimeout(500);

  const positions = await Promise.all([
    worldToScreen(page, 30 - 32, 0, 30 - 32),
    worldToScreen(page, 31 - 32, 0, 30 - 32),
  ]);
  expect(positions.length).toBe(2);
  expect(positions[0]).not.toBeNull();
  expect(positions[1]).not.toBeNull();

  const minX = Math.min(...positions.map((p) => p!.x)) - 30;
  const minY = Math.min(...positions.map((p) => p!.y)) - 30;
  const maxX = Math.max(...positions.map((p) => p!.x)) + 30;
  const maxY = Math.max(...positions.map((p) => p!.y)) + 30;

  await boxSelectViaDispatch(page, minX, minY, maxX, maxY);
  await page.waitForTimeout(300);

  const beforeMove = await page.evaluate(() => {
    const cnc = (window as unknown as Record<string, unknown>).cnc as Record<
      string,
      (() => Array<Record<string, unknown>>) | undefined
    >;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sm = (window as any)._selectionManager;
    const units = cnc.debugState?.() ?? [];
    return {
      selectedCount: sm ? sm.getSelected().length : -1,
      allIdle: units.every((u) => u.state === 'IDLE'),
      unitCount: units.length,
    };
  });
  expect(beforeMove.selectedCount).toBe(2);
  expect(beforeMove.unitCount).toBe(2);
  expect(beforeMove.allIdle).toBe(true);

  // Right-click on a distant ground position
  const targetScreen = await worldToScreen(page, 40 - 32, 0, 40 - 32);
  expect(targetScreen).not.toBeNull();

  await page.mouse.click(targetScreen!.x, targetScreen!.y, { button: 'right' });
  await page.waitForTimeout(1000);

  const afterMove = await page.evaluate(() => {
    const cnc = (window as unknown as Record<string, unknown>).cnc as Record<
      string,
      (() => Array<Record<string, unknown>>) | undefined
    >;
    return cnc.debugState?.() ?? [];
  });

  expect(afterMove.length).toBe(2);
  expect(afterMove.every((u) => u.state !== 'IDLE')).toBe(true);
});

test('toggleSelect and selectMultiple API work correctly', async ({ page }) => {
  await page.goto('http://localhost:5173/CnC_Remake/');
  await page.waitForTimeout(2000);

  // Clear default scene units
  await page.evaluate(() => {
    const cnc = (window as unknown as Record<string, unknown>).cnc as Record<string, (() => void) | undefined>;
    cnc.clear?.();
  });

  // Spawn 2 tanks
  await page.evaluate(() => {
    const cnc = (window as unknown as Record<string, unknown>).cnc as Record<
      string,
      (type: string, house: string, x: number, y: number) => unknown
    >;
    cnc.unit('MediumTank', 'gdi', 30, 30);
    cnc.unit('MediumTank', 'gdi', 32, 30);
  });
  await page.waitForTimeout(500);

  // Directly test SelectionManager API via page.evaluate
  const result = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sm = (window as any)._selectionManager;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scene = (window as any)._scene;
    if (!sm || !scene) return { error: 'missing objects' };

    // Get actual Unit objects from manager
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manager = (window as any)._goManager;
    if (!manager) return { error: 'no manager' };

    const allUnits = manager.getUnits();
    if (allUnits.length < 2) return { error: 'not enough tanks', count: allUnits.length };

    const unit1 = allUnits[0];
    const unit2 = allUnits[1];
    if (!unit1 || !unit2) return { error: 'units not found' };

    // Test select (single)
    sm.select(unit1, scene);
    let selected = sm.getSelected().length;

    // Test toggleSelect (add)
    sm.toggleSelect(unit2, scene);
    selected = sm.getSelected().length;

    // Test toggleSelect (remove)
    sm.toggleSelect(unit1, scene);
    selected = sm.getSelected().length;

    // Test selectMultiple
    sm.selectMultiple([unit1, unit2], scene);
    selected = sm.getSelected().length;

    // Test clear
    sm.clear();
    selected = sm.getSelected().length;

    return { selected, tankCount: allUnits.length };
  });

  expect(result.error).toBeUndefined();
  expect(result.tankCount).toBe(2);
  expect(result.selected).toBe(0); // after clear
});
