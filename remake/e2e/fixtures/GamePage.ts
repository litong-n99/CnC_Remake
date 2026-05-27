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

  /** Check whether a cell is blocked by another unit. */
  async collision(x: number, y: number, excludeId?: string): Promise<boolean> {
    return await this.page.evaluate(
      ({ cx, cy, exId }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.collision?.(cx, cy, exId) as boolean) ?? false;
      },
      { cx: x, cy: y, exId: excludeId }
    );
  }

  /** Run A* pathfinding with current unit blockers.
   * @param check — 'All' | 'Stationary' | 'Immovable' | 'None' (default 'All')
   */
  async pathfind(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    check = 'All'
  ): Promise<Array<{ x: number; y: number }> | null> {
    return await this.page.evaluate(
      ({ sx, sy, ex, ey, ck }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.pathfind?.(sx, sy, ex, ey, ck) as Array<{ x: number; y: number }> | null) ?? null;
      },
      { sx: startX, sy: startY, ex: endX, ey: endY, ck: check }
    );
  }

  /** Order a specific unit to move to a target cell. */
  async moveUnit(unitId: string, targetX: number, targetY: number): Promise<boolean> {
    return await this.page.evaluate(
      ({ id, tx, ty }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.moveUnit?.(id, tx, ty) as boolean) ?? false;
      },
      { id: unitId, tx: targetX, ty: targetY }
    );
  }

  /** Task 23.18: Move a unit within a min/max range of a target cell. */
  async moveWithinRange(
    unitId: string,
    targetX: number,
    targetY: number,
    minRange: number,
    maxRange: number
  ): Promise<boolean> {
    return await this.page.evaluate(
      ({ id, tx, ty, minR, maxR }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.moveWithinRange?.(id, tx, ty, minR, maxR) as boolean) ?? false;
      },
      { id: unitId, tx: targetX, ty: targetY, minR: minRange, maxR: maxRange }
    );
  }

  /** Task 23.18: Order a unit to follow another unit. */
  async follow(unitId: string, targetId: string, range: number): Promise<boolean> {
    return await this.page.evaluate(
      ({ id, tid, r }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.follow?.(id, tid, r) as boolean) ?? false;
      },
      { id: unitId, tid: targetId, r: range }
    );
  }

  /** Get Euclidean distance between two units. */
  async unitDistance(idA: string, idB: string): Promise<number> {
    return await this.page.evaluate(
      ({ a, b }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.distance?.(a, b) as number) ?? -1;
      },
      { a: idA, b: idB }
    );
  }

  /** Poll ActorMap until a unit reaches the target cell (or timeout). */
  async waitForUnitAt(unitId: string, targetX: number, targetY: number, timeout = 15000): Promise<void> {
    await this.page.waitForFunction(
      ({ id, tx, ty }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        const result = cnc.actorMap?.(tx, ty) as { x: number; y: number; occupants: readonly string[] } | undefined;
        return result ? result.occupants.includes(id) : false;
      },
      { id: unitId, tx: targetX, ty: targetY },
      { timeout }
    );
  }

  /** List all units and buildings (returns via console, mainly for debugging). */
  async list(): Promise<void> {
    await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => void) | undefined>).cnc;
      cnc.list?.();
    });
  }

  /** Set a unit's body facing (0–255 DirType). */
  async setFacing(unitId: string, facing: number): Promise<void> {
    await this.page.evaluate(
      ({ id, f }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        cnc.setFacing?.(id, f);
      },
      { id: unitId, f: facing }
    );
  }

  /** Get a unit's body facing (0–255 DirType). */
  async getFacing(unitId: string): Promise<number | undefined> {
    return await this.page.evaluate(
      ({ id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.getFacing?.(id) as number | undefined) ?? undefined;
      },
      { id: unitId }
    );
  }

  /**
   * Load an OpenRA-format map from a folder URL.
   * @returns Parsed map metadata and application status.
   */
  async openraMap(folderUrl: string): Promise<Record<string, unknown>> {
    return await this.page.evaluate(
      ({ url }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.openraMap?.(url) as Record<string, unknown> | undefined) ?? { error: 'openraMap not available' };
      },
      { url: folderUrl }
    );
  }

  // ── Map Editor helpers (Task 9.8) ──

  async editorLoadTileSet(url: string): Promise<Record<string, unknown>> {
    return await this.page.evaluate(
      ({ u }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.editorLoadTileSet?.(u) as Record<string, unknown> | undefined) ?? {
            error: 'editorLoadTileSet not available',
          }
        );
      },
      { u: url }
    );
  }

  async editorSelectBrush(tool: 'tile' | 'resource', templateId?: number): Promise<Record<string, unknown>> {
    return await this.page.evaluate(
      ({ t, id }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.editorSelectBrush?.(t, id) as Record<string, unknown> | undefined) ?? {
            error: 'editorSelectBrush not available',
          }
        );
      },
      { t: tool, id: templateId }
    );
  }

  async editorPaint(x: number, y: number): Promise<Record<string, unknown>> {
    return await this.page.evaluate(
      ({ cx, cy }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.editorPaint?.(cx, cy) as Record<string, unknown> | undefined) ?? { error: 'editorPaint not available' }
        );
      },
      { cx: x, cy: y }
    );
  }

  async editorFloodFill(x: number, y: number): Promise<Record<string, unknown>> {
    return await this.page.evaluate(
      ({ cx, cy }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.editorFloodFill?.(cx, cy) as Record<string, unknown> | undefined) ?? {
            error: 'editorFloodFill not available',
          }
        );
      },
      { cx: x, cy: y }
    );
  }

  async editorUndo(): Promise<Record<string, unknown>> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (cnc.editorUndo?.() as Record<string, unknown> | undefined) ?? { error: 'editorUndo not available' };
    });
  }

  async editorRedo(): Promise<Record<string, unknown>> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (cnc.editorRedo?.() as Record<string, unknown> | undefined) ?? { error: 'editorRedo not available' };
    });
  }

  async editorExport(): Promise<Record<string, unknown>> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (cnc.editorExport?.() as Record<string, unknown> | undefined) ?? { error: 'editorExport not available' };
    });
  }

  /** Get debug state for all units. */
  async debugState(): Promise<
    Array<{
      id: string;
      x: number;
      y: number;
      fromCellX: number;
      fromCellY: number;
      toCellX: number;
      toCellY: number;
      isMoving: boolean;
      isBlocking: boolean;
      isTurningInPlace: boolean;
      bodyFacing: number;
      targetBodyFacing: number;
      state: string;
    }>
  > {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (
        (cnc.debugState?.() as
          | Array<{
              id: string;
              x: number;
              y: number;
              fromCellX: number;
              fromCellY: number;
              toCellX: number;
              toCellY: number;
              isMoving: boolean;
              isBlocking: boolean;
              isTurningInPlace: boolean;
              bodyFacing: number;
              targetBodyFacing: number;
              state: string;
            }>
          | undefined) ?? []
      );
    });
  }

  // ── Task 90: Actor Placer helpers ──

  async actorPlaceUnit(type: string, house: 'gdi' | 'nod' = 'gdi', x = 30, y = 30): Promise<Record<string, unknown>> {
    return await this.page.evaluate(
      ({ t, h, cx, cy }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.actorPlaceUnit?.(t, h, cx, cy) as Record<string, unknown> | undefined) ?? {
            error: 'actorPlaceUnit not available',
          }
        );
      },
      { t: type, h: house, cx: x, cy: y }
    );
  }

  async actorPlaceBuilding(
    type: string,
    house: 'gdi' | 'nod' = 'gdi',
    x = 30,
    y = 30
  ): Promise<Record<string, unknown>> {
    return await this.page.evaluate(
      ({ t, h, cx, cy }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.actorPlaceBuilding?.(t, h, cx, cy) as Record<string, unknown> | undefined) ?? {
            error: 'actorPlaceBuilding not available',
          }
        );
      },
      { t: type, h: house, cx: x, cy: y }
    );
  }

  async actorList(): Promise<Array<Record<string, unknown>>> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (cnc.actorList?.() as Array<Record<string, unknown>> | undefined) ?? [];
    });
  }

  async actorClear(): Promise<Record<string, unknown>> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (cnc.actorClear?.() as Record<string, unknown> | undefined) ?? { error: 'actorClear not available' };
    });
  }

  // ── Task 91: Sandbox Mode helpers ──

  async sandboxSpawn(
    squadId: string,
    type: string,
    count: number,
    house: 'gdi' | 'nod' = 'gdi',
    x = 20,
    y = 20,
    spacing = 2
  ): Promise<Record<string, unknown>> {
    return await this.page.evaluate(
      ({ sid, t, c, h, cx, cy, s }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.sandboxSpawn?.(sid, t, c, h, cx, cy, s) as Record<string, unknown> | undefined) ?? {
            error: 'sandboxSpawn not available',
          }
        );
      },
      { sid: squadId, t: type, c: count, h: house, cx: x, cy: y, s: spacing }
    );
  }

  async sandboxBattle(squadAId: string, squadBId: string): Promise<Record<string, unknown>> {
    return await this.page.evaluate(
      ({ a, b }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.sandboxBattle?.(a, b) as Record<string, unknown> | undefined) ?? { error: 'sandboxBattle not available' }
        );
      },
      { a: squadAId, b: squadBId }
    );
  }

  async sandboxStats(): Promise<Record<string, unknown>> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (cnc.sandboxStats?.() as Record<string, unknown> | undefined) ?? { error: 'sandboxStats not available' };
    });
  }

  async sandboxClear(): Promise<Record<string, unknown>> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (cnc.sandboxClear?.() as Record<string, unknown> | undefined) ?? { error: 'sandboxClear not available' };
    });
  }

  // ── Task 92: Desktop Adapter helpers ──

  async desktopPlatform(): Promise<Record<string, unknown>> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (
        (cnc.desktopPlatform?.() as Record<string, unknown> | undefined) ?? { error: 'desktopPlatform not available' }
      );
    });
  }

  async desktopFullscreen(enter = true): Promise<Record<string, unknown>> {
    return await this.page.evaluate(
      ({ e }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.desktopFullscreen?.(e) as Record<string, unknown> | undefined) ?? {
            error: 'desktopFullscreen not available',
          }
        );
      },
      { e: enter }
    );
  }

  // ── Task 93: Touch Input helpers ──

  async touchBind(): Promise<Record<string, unknown>> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (cnc.touchBind?.() as Record<string, unknown> | undefined) ?? { error: 'touchBind not available' };
    });
  }

  async touchUnbind(): Promise<Record<string, unknown>> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (cnc.touchUnbind?.() as Record<string, unknown> | undefined) ?? { error: 'touchUnbind not available' };
    });
  }

  async touchDevice(): Promise<Record<string, unknown>> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (cnc.touchDevice?.() as Record<string, unknown> | undefined) ?? { error: 'touchDevice not available' };
    });
  }

  // ── Task 76: Terrain LOD helpers ──

  async terrainLOD(): Promise<{
    enabled: boolean;
    lodCount: number;
    lodVertices: number[];
    originalVertices: number;
  }> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (
        (cnc.terrainLOD?.() as
          | {
              enabled: boolean;
              lodCount: number;
              lodVertices: number[];
              originalVertices: number;
            }
          | undefined) ?? { enabled: false, lodCount: 0, lodVertices: [], originalVertices: 0 }
      );
    });
  }

  /** Set camera zoom radius directly (for LOD e2e tests). */
  async setCameraZoom(radius: number): Promise<void> {
    await this.page.evaluate(
      ({ r }) => {
        const rts = (window as unknown as Record<string, unknown>).cnc._rtsCamera as {
          getCamera(): { radius: number };
        };
        rts.getCamera().radius = r;
        (rts as unknown as { targetZoom: number }).targetZoom = r;
      },
      { r: radius }
    );
  }

  // ── Task 82: AI Bot helpers ──

  async baseBuilderAI(
    house = 'nod'
  ): Promise<{ created: boolean; status: string; buildIndex: number; placedCount: number }> {
    return await this.page.evaluate(
      ({ h }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.baseBuilderAI?.(h) as { created: boolean; status: string; buildIndex: number; placedCount: number }) ?? {
            created: false,
            status: 'error',
            buildIndex: 0,
            placedCount: 0,
          }
        );
      },
      { h: house }
    );
  }

  async baseBuilderTick(dt = 1000): Promise<{ status: string; buildIndex: number; placedCount: number }> {
    return await this.page.evaluate(
      ({ d }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.baseBuilderTick?.(d) as { status: string; buildIndex: number; placedCount: number }) ?? {
            status: 'error',
            buildIndex: 0,
            placedCount: 0,
          }
        );
      },
      { d: dt }
    );
  }

  async attackAI(house = 'nod'): Promise<{ created: boolean; squadSize: number; isAttacking: boolean }> {
    return await this.page.evaluate(
      ({ h }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.attackAI?.(h) as { created: boolean; squadSize: number; isAttacking: boolean }) ?? {
            created: false,
            squadSize: 0,
            isAttacking: false,
          }
        );
      },
      { h: house }
    );
  }

  async attackAITick(dt = 1000): Promise<{ squadSize: number; isAttacking: boolean; scoutId: string | null }> {
    return await this.page.evaluate(
      ({ d }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (
          (cnc.attackAITick?.(d) as { squadSize: number; isAttacking: boolean; scoutId: string | null }) ?? {
            squadSize: 0,
            isAttacking: false,
            scoutId: null,
          }
        );
      },
      { d: dt }
    );
  }

  async placeBuildingDirect(
    type: string,
    house: string,
    x: number,
    y: number
  ): Promise<{ placed: boolean; id?: string }> {
    return await this.page.evaluate(
      ({ t, h, cx, cy }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.placeBuildingDirect?.(t, h, cx, cy) as { placed: boolean; id?: string }) ?? { placed: false };
      },
      { t: type, h: house, cx: x, cy: y }
    );
  }

  async money(house: string, amount: number): Promise<void> {
    await this.page.evaluate(
      ({ h, a }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        cnc.money?.(h, a);
      },
      { h: house, a: amount }
    );
  }

  // ── Task 80: Particle Effects helpers ──

  async spawnExplosion(worldX = 0, worldY = 0.5, worldZ = 0): Promise<{ spawned: boolean }> {
    return await this.page.evaluate(
      ({ x, y, z }) => {
        const cnc = (window as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>).cnc;
        return (cnc.spawnExplosion?.(x, y, z) as { spawned: boolean }) ?? { spawned: false };
      },
      { x: worldX, y: worldY, z: worldZ }
    );
  }

  async particleStats(): Promise<{ activeCount: number; poolSize: number }> {
    return await this.page.evaluate(() => {
      const cnc = (window as unknown as Record<string, (() => unknown) | undefined>).cnc;
      return (
        (cnc.particleStats?.() as { activeCount: number; poolSize: number } | undefined) ?? {
          activeCount: 0,
          poolSize: 0,
        }
      );
    });
  }

  /** Get the active terrain mesh vertex count (accounts for LOD switching). */
  async getActiveTerrainVertices(): Promise<number> {
    return await this.page.evaluate(() => {
      const scene = (window as unknown as Record<string, unknown>).cnc._scene as {
        activeCamera: unknown;
        getMeshByName(name: string): {
          getTotalVertices(): number;
          getLOD(camera: unknown): { getTotalVertices(): number } | null;
        } | null;
      };
      const terrain = scene.getMeshByName('terrain');
      if (!terrain) return 0;
      const camera = scene.activeCamera;
      if (!camera) return terrain.getTotalVertices();
      const lodMesh = terrain.getLOD(camera);
      return lodMesh ? lodMesh.getTotalVertices() : terrain.getTotalVertices();
    });
  }
}
