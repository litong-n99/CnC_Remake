import type { PathNode } from './IPathGraph';

/**
 * Cell 搜索状态 — Task 128
 *
 * OpenRA 对标: `CellInfo` struct in `PathSearch.cs`
 */
export enum CellStatus {
  Unvisited = 0,
  Open = 1,
  Closed = 2,
}

export interface CellInfo {
  g: number;
  h: number;
  f: number;
  status: CellStatus;
  parent: PathNode | null;
}

/**
 * PooledCellInfoLayer — 可复用的 CellInfo 二维数组
 *
 * 避免每次 A* 搜索都分配新的大数组，减少 GC 压力。
 * OpenRA 对标: `PooledCellInfoLayer` in `CellInfoLayerPool.cs`
 */
export class PooledCellInfoLayer {
  private readonly cells: CellInfo[][];
  private _inUse = false;

  constructor(width: number, height: number) {
    this.cells = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({
        g: Infinity,
        h: 0,
        f: Infinity,
        status: CellStatus.Unvisited,
        parent: null,
      }))
    );
  }

  get(x: number, y: number): CellInfo {
    return this.cells[y][x];
  }

  /** 重置所有 Cell 为默认值 */
  reset(): void {
    for (let y = 0; y < this.cells.length; y++) {
      const row = this.cells[y];
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        c.g = Infinity;
        c.h = 0;
        c.f = Infinity;
        c.status = CellStatus.Unvisited;
        c.parent = null;
      }
    }
  }

  markInUse(): void {
    this._inUse = true;
  }

  markFree(): void {
    this._inUse = false;
  }

  get inUse(): boolean {
    return this._inUse;
  }

  get width(): number {
    return this.cells[0]?.length ?? 0;
  }

  get height(): number {
    return this.cells.length;
  }
}

/**
 * CellInfoLayerPool — 搜索层对象池
 *
 * 按地图尺寸隔离池，默认最大容量 4 层（支持同时 4 条并行寻路）。
 * OpenRA 对标: `CellInfoLayerPool.cs` + `ConditionalWeakTable<World, CellInfoLayerPool>`
 */
export class CellInfoLayerPool {
  private readonly layers: PooledCellInfoLayer[] = [];
  private readonly maxSize: number;

  constructor(width: number, height: number, poolSize = 4) {
    this.maxSize = poolSize;
    for (let i = 0; i < poolSize; i++) {
      this.layers.push(new PooledCellInfoLayer(width, height));
    }
  }

  /** 获取一个空闲的 CellInfo 层；若无空闲层则返回 null */
  getLayer(): PooledCellInfoLayer | null {
    for (const layer of this.layers) {
      if (!layer.inUse) {
        layer.markInUse();
        layer.reset();
        return layer;
      }
    }
    return null;
  }

  /** 归还 CellInfo 层到池中 */
  returnLayer(layer: PooledCellInfoLayer): void {
    layer.markFree();
  }

  /** 当前池中总层数 */
  get size(): number {
    return this.maxSize;
  }

  /** 当前空闲层数 */
  get availableCount(): number {
    return this.layers.filter((l) => !l.inUse).length;
  }
}
