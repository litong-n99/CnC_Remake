/**
 * 立场着色系统 — Task 51.5
 * 根据外交关系为 UI 元素（选择环、血条、小地图、建筑幽灵）分配颜色。
 *
 * OpenRA 对标: OpenRA.Game/Player.cs 中 PlayerRelationshipColor() + SetupRelationshipColors()
 */

import { HouseType } from '../../game/house/House';
import { HouseRelationship } from '../../game/house/HouseRelationship';
import { HouseManager } from '../../game/house/HouseManager';
import { Color3 } from '@babylonjs/core';

/** 四色映射配置：自己 / 盟友 / 敌人 / 中立。 */
export interface RelationshipColorConfig {
  self: string;
  ally: string;
  enemy: string;
  neutral: string;
}

/** 默认配色（Self=绿, Ally=蓝, Enemy=红, Neutral=灰）。 */
export const DEFAULT_RELATIONSHIP_COLORS: RelationshipColorConfig = {
  self: '#00FF00',
  ally: '#00AAFF',
  enemy: '#FF0000',
  neutral: '#888888',
};

let currentConfig: RelationshipColorConfig = { ...DEFAULT_RELATIONSHIP_COLORS };

/** 获取当前配色配置。 */
export function getRelationshipColorConfig(): RelationshipColorConfig {
  return { ...currentConfig };
}

/** 设置全局配色配置。 */
export function setRelationshipColorConfig(config: RelationshipColorConfig): void {
  currentConfig = { ...config };
}

/** 将 hex 颜色字符串转为 Babylon.js Color3。 */
export function hexToColor3(hex: string): Color3 {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return new Color3(r, g, b);
}

/**
 * 根据观察者阵营与目标阵营的关系返回颜色。
 * @param viewerType — 观察者阵营
 * @param targetType — 目标阵营
 * @param config   — 可选自定义配色（默认使用全局配置）
 */
export function getRelationshipColorFor(
  viewerType: HouseType,
  targetType: HouseType,
  config: RelationshipColorConfig = currentConfig
): string {
  if (viewerType === targetType) return config.self;

  const viewerHouse = HouseManager.getInstance().getHouse(viewerType);
  if (!viewerHouse) return config.neutral;

  const rel = viewerHouse.getRelationshipWith(targetType);
  switch (rel) {
    case HouseRelationship.Ally:
      return config.ally;
    case HouseRelationship.Enemy:
      return config.enemy;
    case HouseRelationship.Neutral:
      return config.neutral;
    default:
      return config.neutral;
  }
}

/**
 * 以本地玩家（人类玩家）为观察者，返回对目标阵营的关系颜色。
 * @param targetType — 目标阵营
 * @param config   — 可选自定义配色
 */
export function getRelationshipColorForLocalPlayer(
  targetType: HouseType,
  config: RelationshipColorConfig = currentConfig
): string {
  const local = HouseManager.getInstance().getPlayerHouse();
  if (!local) return DEFAULT_RELATIONSHIP_COLORS.neutral;
  return getRelationshipColorFor(local.id, targetType, config);
}

/**
 * 以本地玩家为观察者，返回对目标阵营的关系颜色对应的 Babylon Color3。
 */
export function getRelationshipColor3ForLocalPlayer(targetType: HouseType): Color3 {
  return hexToColor3(getRelationshipColorForLocalPlayer(targetType));
}
