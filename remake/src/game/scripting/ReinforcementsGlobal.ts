/**
 * ReinforcementsGlobal — CAM-13
 *
 * 援军系统：地面援军和运输机援军。
 * OpenRA 对标: OpenRA.Mods.Common/Scripting/Global/ReinforcementsGlobal.cs
 */

import type { Scene } from '@babylonjs/core';
import { HouseManager } from '../house/HouseManager';
import { HouseType } from '../house/House';
import { GameObjectFactory } from '../objects/GameObjectFactory';
import { CampaignRuleLoader } from '../campaign/CampaignRuleLoader';
import type { ScriptActor } from '../campaign/CampaignLoader';

export interface ReinforcementEntry {
  readonly type: string;
  readonly location: { x: number; y: number };
  readonly gameObjectId: string | null;
}

export class ReinforcementsGlobal {
  constructor(
    private scriptActors: Map<string, ScriptActor>,
    private scene: Scene,
    private playerMap: Map<string, HouseType>
  ) {}

  /**
   * 地面援军：在路径起点创建单位，然后沿路径移动。
   * @param playerName — 玩家名称（如 "Greece"）
   * @param types — 单位类型数组
   * @param path — 路径点数组（CPos）
   * @param interval — 生成间隔（毫秒）
   * @returns 创建的 Actor 数组
   */
  Reinforce(playerName: string, types: string[], path: { x: number; y: number }[], _interval = 0): ScriptActor[] {
    const houseType = this.playerMap.get(playerName) ?? HouseType.Neutral;
    const house = HouseManager.getInstance().getHouse(houseType);
    if (!house || path.length === 0) return [];

    const startLoc = path[0];
    const created: ScriptActor[] = [];

    for (const type of types) {
      const scriptActor = this.createActor(type, playerName, startLoc.x, startLoc.y);
      if (scriptActor) {
        created.push(scriptActor);
        // TODO: 命令单位沿 path 移动
      }
    }

    return created;
  }

  /**
   * 运输机援军：创建运输机，装载乘客，沿路径飞行。
   * @param playerName — 玩家名称
   * @param transportType — 运输机类型
   * @param passengerTypes — 乘客类型数组（可选）
   * @param path — 飞行路径
   * @param entryPath — 进入路径（可选）
   * @returns [运输机, 乘客数组]
   */
  ReinforceWithTransport(
    playerName: string,
    transportType: string,
    passengerTypes: string[] | null,
    path: { x: number; y: number }[],
    _entryPath?: { x: number; y: number }[]
  ): [ScriptActor | null, ScriptActor[]] {
    const houseType = this.playerMap.get(playerName) ?? HouseType.Neutral;
    const house = HouseManager.getInstance().getHouse(houseType);
    if (!house || path.length === 0) return [null, []];

    const startLoc = path[0];
    const transport = this.createActor(transportType, playerName, startLoc.x, startLoc.y);

    const passengers: ScriptActor[] = [];
    if (passengerTypes) {
      for (const type of passengerTypes) {
        const p = this.createActor(type, playerName, startLoc.x, startLoc.y);
        if (p) passengers.push(p);
      }
    }

    // TODO: 命令运输机沿 path 飞行，到达后卸载乘客

    return [transport, passengers];
  }

  private createActor(type: string, owner: string, x: number, y: number): ScriptActor | null {
    const houseType = this.playerMap.get(owner) ?? HouseType.Neutral;
    const house = HouseManager.getInstance().getHouse(houseType);
    if (!house) return null;

    const scriptActor: ScriptActor = {
      id: `reinf-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type,
      owner,
      location: { x, y },
      isWaypoint: false,
      gameObjectId: null,
      isDead: false,
      isInWorld: false,
      stance: 'Defend',
    };

    const resolved = CampaignRuleLoader.resolveActorType(type);
    if (resolved.def) {
      try {
        if (resolved.isUnit) {
          const obj = GameObjectFactory.createUnit({
            definition: resolved.def as import('../rules/UnitDefinitions').UnitDefinition,
            house,
            x,
            y,
            scene: this.scene,
          });
          if (obj) {
            scriptActor.gameObjectId = obj.id;
            scriptActor.isInWorld = true;
          }
        } else {
          const obj = GameObjectFactory.createBuilding({
            definition: resolved.def as import('../rules/BuildingDefinitions').BuildingDefinition,
            house,
            x,
            y,
            scene: this.scene,
          });
          if (obj) {
            scriptActor.gameObjectId = obj.id;
            scriptActor.isInWorld = true;
          }
        }
      } catch {
        // ignore
      }
    }

    this.scriptActors.set(scriptActor.id, scriptActor);
    return scriptActor;
  }
}
