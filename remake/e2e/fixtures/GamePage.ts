import type { Page } from '@playwright/test';

/**
 * Page Object Model for C&C Remake game page.
 *
 * Wraps `window.cnc` debug-console commands exposed by GameConsole.ts
 * so tests can interact with the game world declaratively.
 */
export class GamePage {
  constructor(private readonly page: Page) {}

  /** Navigate to the game and wait for the engine & GameConsole to be ready. */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForFunction(() => {
      const cnc = (window as unknown as Record<string, unknown>).cnc;
      return typeof cnc === 'object' && cnc !== null;
    });
  }

  /** Wait until Babylon scene is fully initialised (terrain + objects spawned). */
  async waitForSceneReady(): Promise<void> {
    // The scene creates objects on bootstrap; we just need a short beat
    // after the page load so the first render loop has run.
    await this.page.waitForTimeout(500);
  }

  /** Clear every object from the world. */
  async clear(): Promise<void> {
    await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => void) | undefined>).cnc;
      cnc.clear?.();
    });
  }

  /**
   * Spawn a unit via the debug console.
   * Verification should be done via actorMap() because the returned Unit
   * object is not serialisable across the Playwright bridge.
   */
  async spawnUnit(type: string, house: string, x: number, y: number): Promise<void> {
    await this.page.evaluate(
      ({ t, h, cx, cy }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        cnc.unit?.(t, h, cx, cy);
      },
      { t: type, h: house, cx: x, cy: y }
    );
  }

  /**
   * Query ActorMap occupancy.
   * @returns Cell data when x,y provided; all cells when omitted.
   */
  async actorMap(
    x?: number,
    y?: number
  ): Promise<
    | { cells: Array<{ x: number; y: number; occupants: readonly string[] }> }
    | { x: number; y: number; occupants: readonly string[] }
  > {
    return await this.page.evaluate(
      ({ cx, cy }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return cnc.actorMap?.(cx, cy) as
          | { cells: Array<{ x: number; y: number; occupants: readonly string[] }> }
          | { x: number; y: number; occupants: readonly string[] };
      },
      { cx: x, cy: y }
    );
  }

  /** List all units and buildings (returns via console, mainly for debugging). */
  async list(): Promise<void> {
    await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => void) | undefined>).cnc;
      cnc.list?.();
    });
  }
}
