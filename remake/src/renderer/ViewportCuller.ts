/**
 * ViewportCuller — Task-R1: 视口裁剪系统
 * OpenRA 对标: `OpenRA.Game/Graphics/Viewport.cs` + `ScreenMap.cs`
 *
 * 基于相机位置和目标计算世界空间视口边界，
 * 批量设置视口外 mesh 的可见性。
 */

import type { ArcRotateCamera } from '@babylonjs/core';
import type { GameObject } from '../game/objects/GameObject';

export interface CullResult {
  readonly visible: GameObject[];
  readonly culled: GameObject[];
}

export class ViewportCuller {
  private marginCells = 3; // 视口外保留几格，避免 pop-in

  /** 计算当前视口在世界空间中的矩形边界（XZ 平面）。
   * 返回 { minX, maxX, minZ, maxZ } */
  getWorldBounds(camera: ArcRotateCamera): { minX: number; maxX: number; minZ: number; maxZ: number } {
    const target = camera.target;
    const radius = camera.radius;
    // 粗略估计：视口覆盖的范围约为 radius 的 1.5 倍（考虑 FOV）
    const halfSize = radius * 0.75;
    return {
      minX: target.x - halfSize,
      maxX: target.x + halfSize,
      minZ: target.z - halfSize,
      maxZ: target.z + halfSize,
    };
  }

  /** 批量裁剪：视口内 mesh 设为可见，视口外设为不可见。
   * 返回 { visible, culled } 用于统计。 */
  cull(objects: readonly GameObject[], camera: ArcRotateCamera): CullResult {
    const bounds = this.getWorldBounds(camera);
    const cellSize = 1.5; // world units per cell
    const margin = this.marginCells * cellSize;

    const visible: GameObject[] = [];
    const culled: GameObject[] = [];

    for (const obj of objects) {
      if (!obj.isAlive() || !obj.mesh) continue;

      const inView =
        obj.x >= bounds.minX - margin &&
        obj.x <= bounds.maxX + margin &&
        obj.y >= bounds.minZ - margin &&
        obj.y <= bounds.maxZ + margin;

      obj.mesh.isVisible = inView;
      if (inView) {
        visible.push(obj);
      } else {
        culled.push(obj);
      }
    }

    return { visible, culled };
  }

  /** 设置裁剪边界外的保留边距（格子数）。 */
  setMarginCells(cells: number): void {
    this.marginCells = cells;
  }
}
