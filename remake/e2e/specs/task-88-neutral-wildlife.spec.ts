import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 88 — Neutral Buildings & Wildlife', () => {
  test.beforeEach(async ({ page }) => {
    const game = new GamePage(page);
    await game.goto();
    await game.waitForSceneReady();
  });

  test('neutral building capture provides bonus', async ({ page }) => {
    const result = await page.evaluate(() => {
      const NBM = (window as unknown as Record<string, unknown>).NeutralBuildingManager as new () => {
        add: (b: unknown) => void;
        getCapturedBy: (houseId: string) => unknown[];
        tickBonuses: (
          dt: number,
          cb: (houseId: string, bonus: { type: string; value: number }, dt: number) => void
        ) => void;
      };
      const NB = (window as unknown as Record<string, unknown>).NeutralBuilding as unknown;

      const nbm = new NBM();
      const hospital = new (NB as new (
        id: string,
        def: { id: string; name: string; strength: number; bonus: { type: string; value: number } },
        x: number,
        y: number
      ) => {
        capture: (houseId: string) => void;
        isActive: boolean;
      })('hosp1', { id: 'HOSPITAL', name: 'Hospital', strength: 200, bonus: { type: 'heal', value: 5 } }, 10, 10);

      hospital.capture('gdi');
      nbm.add(hospital);

      let healApplied = 0;
      nbm.tickBonuses(1, (_house, bonus) => {
        if (bonus.type === 'heal') healApplied += bonus.value;
      });

      return {
        capturedCount: nbm.getCapturedBy('gdi').length,
        healApplied,
        isActive: hospital.isActive,
      };
    });

    expect(result.capturedCount).toBe(1);
    expect(result.healApplied).toBe(5);
    expect(result.isActive).toBe(true);
  });

  test('wildlife roams and reacts to attack', async ({ page }) => {
    const result = await page.evaluate(() => {
      const WAI = (window as unknown as Record<string, unknown>).WildlifeAI as new () => {
        addAnimal: (id: string, x: number, y: number, speed?: number) => { x: number; y: number; state: string };
        tick: (dt: number) => void;
        onAttacked: (id: string, ax: number, ay: number) => void;
        getAnimal: (id: string) => { x: number; y: number; state: string } | undefined;
      };

      const ai = new WAI();
      ai.addAnimal('cow1', 30, 30, 2);

      const before = ai.getAnimal('cow1');
      const beforeState = before?.state;
      const beforeX = before?.x;

      // Tick for 3 seconds to trigger roam
      for (let i = 0; i < 30; i++) {
        ai.tick(0.1);
      }

      const afterRoam = ai.getAnimal('cow1');
      const afterRoamState = afterRoam?.state;

      // Attack the animal
      ai.onAttacked('cow1', 30, 30);
      const afterAttack = ai.getAnimal('cow1');
      const afterAttackState = afterAttack?.state;

      return {
        beforeState,
        beforeX,
        afterRoamState,
        moved: (afterRoam?.x ?? 0) !== 30 || (afterRoam?.y ?? 0) !== 30,
        afterAttackState,
      };
    });

    expect(result.beforeState).toBe('idle');
    expect(result.moved).toBe(true);
    expect(['flee', 'attack']).toContain(result.afterAttackState);
  });
});
