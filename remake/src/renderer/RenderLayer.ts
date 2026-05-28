/**
 * RenderLayer — Task-R4: 深度排序优化
 *
 * Babylon.js RenderingGroupId 分层系统：
 *   将场景中的 mesh 按材质/功能分到不同的渲染组，
 *   确保透明物体在不透明物体之后绘制，overlay 在最后绘制。
 *
 * OpenRA 对标: `OpenRA.Game/Graphics/WorldRenderer.cs` 中的渲染阶段
 *
 * 分层策略：
 *   0. Opaque     — 地形、建筑、单位实体（不透明 mesh）
 *   1. Transparent— 战争迷雾、地形贴花（alpha blend）
 *   2. Sprite     — Billboard 精灵、粒子系统
 *   3. Overlay    — 血条、选择圈（禁用深度写入，始终在最上层）
 */

import { Mesh, type Material, type Scene } from '@babylonjs/core';

export enum RenderLayer {
  /** 不透明物体：地形、建筑、单位实体 mesh */
  Opaque = 0,
  /** 透明混合：战争迷雾、地形贴花 */
  Transparent = 1,
  /** 精灵层：Billboard、粒子 */
  Sprite = 2,
  /** 覆盖层：血条、选择圈（无深度测试干扰） */
  Overlay = 3,
}

/** 将 mesh 分配到指定渲染层。 */
export function setRenderLayer(mesh: Mesh, layer: RenderLayer): void {
  mesh.renderingGroupId = layer;
}

/** 读取 mesh 当前渲染层。 */
export function getRenderLayer(mesh: Mesh): RenderLayer {
  return mesh.renderingGroupId as RenderLayer;
}

/**
 * 配置材质的深度写入行为。
 * Overlay 层通常需要禁用深度写入，避免被场景物体遮挡。
 */
export function setDepthWrite(material: Material, enabled: boolean): void {
  // Babylon.js StandardMaterial 使用 needDepthPrePass 控制深度预通过
  // 对于 overlay 材质，我们通过 zOffset 和 renderingGroupId 避免遮挡
  // 这里设置 zOffset 为负值（让 mesh 在深度测试中更靠近相机）
  material.zOffset = enabled ? 0 : -10;
}

/**
 * 配置场景的渲染顺序。
 * 确保各层按正确顺序绘制：Opaque → Transparent → Sprite → Overlay。
 */
export function configureSceneRenderingOrder(scene: Scene): void {
  // Babylon.js 默认按 renderingGroupId 升序渲染
  // 0 → 1 → 2 → 3，符合我们的需求
  // 额外配置：Transparent 层使用 alpha 混合排序
  scene.setRenderingOrder(RenderLayer.Transparent, undefined, undefined, undefined);
}

/**
 * 批量将一组 mesh 分配到同一渲染层。
 */
export function setRenderLayerForAll(meshes: Mesh[], layer: RenderLayer): void {
  for (const mesh of meshes) {
    setRenderLayer(mesh, layer);
  }
}

/**
 * 获取场景中各渲染层的 mesh 数量统计。
 * 用于调试和性能监控。
 */
export function getRenderLayerStats(scene: Scene): Record<RenderLayer, number> {
  const stats: Record<number, number> = {
    [RenderLayer.Opaque]: 0,
    [RenderLayer.Transparent]: 0,
    [RenderLayer.Sprite]: 0,
    [RenderLayer.Overlay]: 0,
  };

  for (const mesh of scene.meshes) {
    const layer = mesh.renderingGroupId as RenderLayer;
    if (layer in stats) {
      stats[layer]++;
    }
  }

  return stats as Record<RenderLayer, number>;
}
