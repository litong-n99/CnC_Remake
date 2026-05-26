import { test, expect } from '@playwright/test';

test.describe('Task 27.5 — Diplomacy System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('task-27.5.1: HouseRelationship enum exists with Ally/Enemy/Neutral', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HR = (window as unknown as Record<string, unknown>)._HouseRelationship;
      if (!HR) return { ok: false, reason: '_HouseRelationship not exposed' };
      return {
        ok: HR.Ally === 'Ally' && HR.Enemy === 'Enemy' && HR.Neutral === 'Neutral',
        values: { Ally: HR.Ally, Enemy: HR.Enemy, Neutral: HR.Neutral },
      };
    });
    expect(result.ok).toBe(true);
  });

  test('task-27.5.2: HouseDiplomacy defaults to Enemy for others', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HD = (window as unknown as Record<string, unknown>)._HouseDiplomacy;
      const HT = (window as unknown as Record<string, unknown>)._HouseType;
      if (!HD || !HT) return { ok: false, reason: 'missing exposure' };
      const dip = new HD(HT.GDI);
      return {
        ok: dip.getRelationship(HT.Nod) === 'Enemy' && dip.isEnemyWith(HT.Nod),
        gdiToNod: dip.getRelationship(HT.Nod),
        gdiToSelf: dip.getRelationship(HT.GDI),
      };
    });
    expect(result.ok).toBe(true);
    expect(result.gdiToSelf).toBe('Ally');
  });

  test('task-27.5.3: setRelationship changes relation to Ally', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HD = (window as unknown as Record<string, unknown>)._HouseDiplomacy;
      const HR = (window as unknown as Record<string, unknown>)._HouseRelationship;
      const HT = (window as unknown as Record<string, unknown>)._HouseType;
      const dip = new HD(HT.GDI);
      dip.setRelationship(HT.Nod, HR.Ally);
      return {
        ok: dip.isAlliedWith(HT.Nod) && !dip.isEnemyWith(HT.Nod),
        relation: dip.getRelationship(HT.Nod),
      };
    });
    expect(result.ok).toBe(true);
    expect(result.relation).toBe('Ally');
  });

  test('task-27.5.4: initializeByTeam sets same-team Ally, different-team Enemy', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HD = (window as unknown as Record<string, unknown>)._HouseDiplomacy;
      const HT = (window as unknown as Record<string, unknown>)._HouseType;
      const dip = new HD(HT.GDI);
      dip.initializeByTeam(
        [
          { type: HT.GDI, team: 1 },
          { type: HT.Nod, team: 1 },
          { type: HT.USSR, team: 2 },
        ],
        1
      );
      return {
        gdiToNod: dip.getRelationship(HT.Nod),
        gdiToUssr: dip.getRelationship(HT.USSR),
        gdiToSelf: dip.getRelationship(HT.GDI),
      };
    });
    expect(result.gdiToNod).toBe('Ally');
    expect(result.gdiToUssr).toBe('Enemy');
    expect(result.gdiToSelf).toBe('Ally');
  });

  test('task-27.5.5: HouseManager uses diplomacy for getEnemiesOf/getAlliesOf', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HM = (window as unknown as Record<string, unknown>)._HouseManager;
      const HT = (window as unknown as Record<string, unknown>)._HouseType;
      const HR = (window as unknown as Record<string, unknown>)._HouseRelationship;
      const getEnemiesOf = (window as unknown as Record<string, unknown>)._getEnemiesOf;
      const getAlliesOf = (window as unknown as Record<string, unknown>)._getAlliesOf;
      if (!HM || !getEnemiesOf || !getAlliesOf) return { ok: false, reason: 'missing exposure' };
      const hm = HM.getInstance();
      hm.clear?.();
      const gdi = hm.createHouse(HT.GDI, { team: 1 });
      hm.createHouse(HT.Nod, { team: 1 });
      hm.createHouse(HT.USSR, { team: 2 });

      // 强制设置 GDI-Nod 为 Enemy（覆盖同队默认）
      gdi.diplomacy.setRelationship(HT.Nod, HR.Enemy);
      // 重新初始化外交关系以传播
      const all = hm.getAllHouses();
      const snapshot = all.map((h: unknown) => ({
        type: (h as Record<string, unknown>).id,
        team: (h as Record<string, unknown>).team,
      }));
      for (const h of all) (h as Record<string, unknown>).initializeDiplomacy(snapshot);

      const enemies = getEnemiesOf(HT.GDI).map((h: unknown) => (h as Record<string, unknown>).id);
      const allies = getAlliesOf(HT.GDI).map((h: unknown) => (h as Record<string, unknown>).id);
      return { enemies, allies, ok: true };
    });
    expect(result.ok).toBe(true);
    expect(result.enemies).toContain(2); // HouseType.USSR = 2
    expect(result.allies).toContain(9); // HouseType.Nod = 9
  });

  test('task-27.5.6: getRelationshipColor returns correct colors', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = (window as unknown as Record<string, unknown>)._getRelationshipColor;
      const HR = (window as unknown as Record<string, unknown>)._HouseRelationship;
      return {
        ally: fn(HR.Ally),
        enemy: fn(HR.Enemy),
        neutral: fn(HR.Neutral),
      };
    });
    expect(result.ally).toBe('#00FF00');
    expect(result.enemy).toBe('#FF0000');
    expect(result.neutral).toBe('#888888');
  });

  test('task-27.5.7: serialize and deserialize round-trip', async ({ page }) => {
    const result = await page.evaluate(() => {
      const HD = (window as unknown as Record<string, unknown>)._HouseDiplomacy;
      const HR = (window as unknown as Record<string, unknown>)._HouseRelationship;
      const HT = (window as unknown as Record<string, unknown>)._HouseType;
      const dip = new HD(HT.GDI);
      dip.setRelationship(HT.Nod, HR.Ally);
      dip.setRelationship(HT.USSR, HR.Neutral);
      const serialized = dip.serialize();
      const dip2 = new HD(HT.GDI);
      dip2.deserialize(serialized);
      return {
        nod: dip2.getRelationship(HT.Nod),
        ussr: dip2.getRelationship(HT.USSR),
        nodExplicit: dip2.getExplicitAllies().includes(HT.Nod),
      };
    });
    expect(result.nod).toBe('Ally');
    expect(result.ussr).toBe('Neutral');
    expect(result.nodExplicit).toBe(true);
  });
});
