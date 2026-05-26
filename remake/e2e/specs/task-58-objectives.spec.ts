import { test, expect } from '@playwright/test';
import { GamePage } from '../fixtures/GamePage';

test.describe('Task 58: Objectives System', () => {
  test.beforeEach(async ({ page }) => {
    const gp = new GamePage(page);
    await gp.goto();
    await gp.waitForSceneReady();
  });

  test('task-58.1: add, complete and track objectives', async ({ page }) => {
    const result = await page.evaluate(() => {
      const om = (window as unknown as Record<string, unknown>)._objectiveManager as {
        clear: () => void;
        addObjective: (obj: {
          id: string;
          description: string;
          type: string;
          status: string;
          progress: number;
          targetProgress: number;
          isPrimary: boolean;
        }) => void;
        getAllObjectives: () => Array<{ id: string; status: string; progress: number }>;
        completeObjective: (id: string) => void;
        getCompleted: () => Array<{ id: string }>;
        allPrimariesComplete: () => boolean;
      };
      om.clear();
      om.addObjective({
        id: 'obj-1',
        description: 'Destroy enemy base',
        type: 'destroyBuilding',
        status: 'incomplete',
        progress: 0,
        targetProgress: 1,
        isPrimary: true,
      });
      om.addObjective({
        id: 'obj-2',
        description: 'Build 5 tanks',
        type: 'buildUnits',
        status: 'incomplete',
        progress: 0,
        targetProgress: 5,
        isPrimary: false,
      });
      const before = om.getAllObjectives().map((o) => ({ id: o.id, status: o.status }));
      om.completeObjective('obj-1');
      const after = om.getAllObjectives().map((o) => ({ id: o.id, status: o.status }));
      const completed = om.getCompleted();
      const allPrimary = om.allPrimariesComplete();
      return { before, after, completed: completed.map((c) => c.id), allPrimary };
    });

    expect(result.before).toHaveLength(2);
    expect(result.after[0].status).toBe('complete');
    expect(result.completed).toContain('obj-1');
    expect(result.allPrimary).toBe(true);
  });

  test('task-58.2: progress increment auto-completes when target reached', async ({ page }) => {
    // Setup
    await page.evaluate(() => {
      const om = (window as unknown as Record<string, unknown>)._objectiveManager as {
        clear: () => void;
        addObjective: (obj: {
          id: string;
          description: string;
          type: string;
          status: string;
          progress: number;
          targetProgress: number;
          isPrimary: boolean;
        }) => void;
      };
      om.clear();
      om.addObjective({
        id: 'obj-kills',
        description: 'Kill 3 infantry',
        type: 'destroyAllEnemies',
        status: 'incomplete',
        progress: 0,
        targetProgress: 3,
        isPrimary: true,
      });
    });

    const step1 = await page.evaluate(() => {
      const om = (window as unknown as Record<string, unknown>)._objectiveManager as {
        incrementProgress: (id: string, delta: number) => void;
        getObjective: (id: string) => { status: string; progress: number } | undefined;
      };
      om.incrementProgress('obj-kills', 1);
      return om.getObjective('obj-kills');
    });

    const step2 = await page.evaluate(() => {
      const om = (window as unknown as Record<string, unknown>)._objectiveManager as {
        incrementProgress: (id: string, delta: number) => void;
        getObjective: (id: string) => { status: string; progress: number } | undefined;
      };
      om.incrementProgress('obj-kills', 2);
      return om.getObjective('obj-kills');
    });

    expect(step1!.progress).toBe(1);
    expect(step1!.status).toBe('incomplete');
    expect(step2!.progress).toBe(3);
    expect(step2!.status).toBe('complete');
  });
});
