import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

/**
 * Task 90: 编辑器 Actor 放置与触发器编辑
 *
 * 验收：放置 5 辆敌方坦克 + 1 个 MCV，验证 actorList 与 actorClear。
 */
test.describe('task-90 actor placer', () => {
  let game: GamePage;

  test.beforeEach(async ({ page }) => {
    game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test.afterEach(async () => {
    await game.actorClear();
  });

  test('place 5 enemy tanks and 1 MCV', async () => {
    const results: Record<string, unknown>[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await game.actorPlaceUnit('MediumTank', 'nod', 30 + i, 30);
      expect(r.error).toBeUndefined();
      expect(r.placed).toBe(true);
      results.push(r);
    }

    const mcv = await game.actorPlaceBuilding('ConstructionYard', 'gdi', 35, 35);
    expect(mcv.error).toBeUndefined();
    expect(mcv.placed).toBe(true);

    const list = await game.actorList();
    expect(list.length).toBe(6);
    expect(list.filter((a) => a.type === 'unit').length).toBe(5);
    expect(list.filter((a) => a.type === 'building').length).toBe(1);

    // Verify IDs are unique
    const ids = list.map((a) => a.id as string);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('actorClear removes all placed actors', async () => {
    await game.actorPlaceUnit('LightTank', 'nod', 30, 30);
    await game.actorPlaceUnit('LightTank', 'nod', 31, 30);

    let list = await game.actorList();
    expect(list.length).toBe(2);

    const clearResult = await game.actorClear();
    expect(clearResult.cleared).toBe(true);
    expect(clearResult.count).toBe(2);

    list = await game.actorList();
    expect(list.length).toBe(0);
  });

  test('place unit by definition id', async () => {
    const r = await game.actorPlaceUnit('MCV', 'gdi', 30, 30);
    expect(r.error).toBeUndefined();
    expect(r.placed).toBe(true);
  });
});
