/**
 * 战役加载器 — CAM-17
 *
 * 负责完整的战役关卡加载流程：
 * 1. 加载 OpenRA 地图（map.yaml + map.bin）
 * 2. 根据 Players 创建 House
 * 3. 创建所有初始 Actor（跳过 Waypoint）
 * 4. 建立 NamedActors 字典
 * 5. 初始化 ScriptRuntime 并注册所有 Global API
 * 6. 执行 Lua/JS 脚本的 `WorldLoaded()`
 *
 * OpenRA 对标: MissionBrowserLogic + ScriptContext
 */

import type { Scene } from '@babylonjs/core';
import { OpenRAMapLoader } from '../terrain/OpenRAMapLoader';
import { MapLoader } from '../terrain/MapLoader';
import { TerrainGrid } from '../terrain/TerrainGrid';
import { HouseManager } from '../house/HouseManager';
import { House, HouseType } from '../house/House';
import { GameObjectFactory } from '../objects/GameObjectFactory';
import { GameObjectManager } from '../objects/GameObjectManager';
import { GameObject } from '../objects/GameObject';
// UNIT_DEFINITIONS / BUILDING_DEFINITIONS 现在通过 CampaignRuleLoader.resolveActorType 访问
import { ScriptRuntime } from '../scripting/ScriptRuntime';
import { MapGlobal, PlayerGlobal, ActorGlobal, MediaGlobal, UIGlobal } from '../scripting/ScriptGlobals';
import { TriggerSystem, TriggerGlobal } from '../scripting/TriggerSystem';
import { UtilsGlobal } from '../scripting/UtilsGlobal';
import { ReinforcementsGlobal } from '../scripting/ReinforcementsGlobal';
import { ObjectiveManager } from '../objectives/ObjectiveManager';
import { World } from '../world/World';
import { GameLoop } from '../GameLoop';
import { CampaignRuleLoader } from './CampaignRuleLoader';
import type { FogOfWar } from '../../renderer/effects/FogOfWar';

/** 玩家名称 → HouseType 映射（Allies-01 专用）。 */
function playerNameToHouseType(name: string): HouseType {
  switch (name) {
    case 'Greece':
    case 'England':
      return HouseType.GDI;
    case 'USSR':
      return HouseType.Nod;
    case 'Neutral':
    default:
      return HouseType.Neutral;
  }
}

/** 脚本可用的 Actor 引用（包装器）。 */
export interface ScriptActor {
  readonly id: string;
  readonly type: string;
  readonly owner: string;
  readonly location: { x: number; y: number };
  readonly isWaypoint: boolean;
  /** 对应的游戏对象 ID（Waypoints 为 null）。 */
  gameObjectId: string | null;
  /** 是否已死亡。 */
  isDead: boolean;
  /** 是否在世界中。 */
  isInWorld: boolean;
  stance: string;
  /** 移动命令（占位）。 */
  Move?(loc: { x: number; y: number }): void;
  /** 散开命令（占位）。 */
  Scatter?(): void;
  /** 狩猎命令（占位）。 */
  Hunt?(): void;
  /** Panic 命令（占位）。 */
  Panic?(): void;
}

export interface CampaignLoaderOptions {
  /** 地图文件夹 URL（如 "/maps/allies-01"）。 */
  mapFolderUrl: string;
  /** 场景引用（用于创建 mesh）。 */
  scene: Scene;
  /** 地形网格（用于应用地图）。 */
  terrain: TerrainGrid;
  /** 游戏循环（用于注册触发器 tick）。 */
  gameLoop: GameLoop;
  /** 可选：战争迷雾实例（地图 resize 后同步调整）。 */
  fogOfWar?: FogOfWar;
  /** 可选：规则覆盖 YAML URL。 */
  rulesUrl?: string;
}

export interface CampaignLoadResult {
  readonly scriptRuntime: ScriptRuntime;
  readonly triggerSystem: TriggerSystem;
  readonly objectiveManager: ObjectiveManager;
  readonly scriptActors: ReadonlyMap<string, ScriptActor>;
}

export class CampaignLoader {
  private static instance: CampaignLoader | null = null;
  private currentResult: CampaignLoadResult | null = null;
  private tickCallback: (() => void) | null = null;

  static getInstance(): CampaignLoader {
    if (!CampaignLoader.instance) {
      CampaignLoader.instance = new CampaignLoader();
    }
    return CampaignLoader.instance;
  }

  /** 加载战役关卡。 */
  async load(options: CampaignLoaderOptions): Promise<CampaignLoadResult> {
    const { mapFolderUrl, scene, terrain, gameLoop, fogOfWar } = options;

    // 0. 清理现有游戏对象（避免与默认 skirmish 对象冲突）
    GameObjectManager.getInstance().clear();
    World.getInstance().clear();
    HouseManager.getInstance().clear();

    // 1. 加载地图
    const mapResult = await OpenRAMapLoader.loadFromFolder(mapFolderUrl);
    console.warn(`[CampaignLoader] Map loaded: ${mapResult.mapYaml.Title}`);

    // 2. 检查并调整 TerrainGrid 尺寸
    if (mapResult.gameMap.width !== terrain.getWidth() || mapResult.gameMap.height !== terrain.getHeight()) {
      console.warn(
        `[CampaignLoader] Resizing terrain from ${terrain.getWidth()}x${terrain.getHeight()} to ${mapResult.gameMap.width}x${mapResult.gameMap.height}`
      );
      terrain.resize(scene, mapResult.gameMap.width, mapResult.gameMap.height);
      // 同步调整战争迷雾尺寸
      fogOfWar?.resize(mapResult.gameMap.width, mapResult.gameMap.height, scene);
    }
    // 同步游戏对象世界坐标偏移（确保与地形尺寸一致）
    GameObject.setWorldOffset(mapResult.gameMap.width, mapResult.gameMap.height);

    // 2.5 应用地形
    MapLoader.applyToTerrainGrid(mapResult.gameMap, terrain);

    // 2.6 加载战役规则覆盖（CAM-15）
    await CampaignRuleLoader.load({ mapFolderUrl });

    // 3. 根据 Players 创建 House
    const playerMap = new Map<string, HouseType>();
    for (const playerRef of mapResult.mapYaml.Players) {
      const houseType = playerNameToHouseType(playerRef.name);
      playerMap.set(playerRef.name, houseType);
      playerMap.set(playerRef.id, houseType);

      // 确保 HouseManager 中有这个阵营
      const existing = HouseManager.getInstance().getHouse(houseType);
      if (!existing) {
        HouseManager.getInstance().createHouse(houseType, {
          credits: playerRef.playable ? 5000 : 10000,
        });
      }
    }

    // 4. 创建初始 Actor（跳过 Waypoint）
    const scriptActors = new Map<string, ScriptActor>();
    let createdCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const actor of mapResult.mapYaml.Actors) {
      const scriptActor: ScriptActor = {
        id: actor.id,
        type: actor.type,
        owner: actor.owner,
        location: actor.location,
        isWaypoint: actor.isWaypoint,
        gameObjectId: null,
        isDead: false,
        isInWorld: false,
        stance: 'Defend',
      };

      if (!actor.isWaypoint) {
        // 尝试创建游戏对象
        const houseType = playerMap.get(actor.owner) ?? HouseType.Neutral;
        const house = HouseManager.getInstance().getHouse(houseType);
        const gameObjectId = this.tryCreateGameObject(actor, house, scene);
        if (gameObjectId) {
          scriptActor.gameObjectId = gameObjectId;
          scriptActor.isInWorld = true;
          createdCount++;
        } else {
          failedCount++;
        }
      } else {
        skippedCount++;
      }

      scriptActors.set(actor.id, scriptActor);
    }

    console.warn(
      `[CampaignLoader] Actor creation summary: ${createdCount} created, ${failedCount} failed, ${skippedCount} waypoints skipped (total: ${mapResult.mapYaml.Actors.length})`
    );
    console.warn(
      `[CampaignLoader] Final state: ${GameObjectManager.getInstance().getUnits().length} units, ${GameObjectManager.getInstance().getBuildings().length} buildings in GOM`
    );

    // 5. 初始化 ScriptRuntime
    const scriptRuntime = new ScriptRuntime();
    const triggerSystem = new TriggerSystem();
    const objectiveManager = new ObjectiveManager();

    // 注册到 GameLoop 的 tick（先移除旧的，防止重复）
    if (this.tickCallback) {
      gameLoop.offLogicTick(this.tickCallback);
    }
    this.tickCallback = () => {
      triggerSystem.tick();
    };
    gameLoop.onLogicTick(this.tickCallback);

    // 6. 注册所有 Global API
    this.registerGlobals(scriptRuntime, triggerSystem, objectiveManager, scriptActors, playerMap, scene);

    this.currentResult = {
      scriptRuntime,
      triggerSystem,
      objectiveManager,
      scriptActors,
    };

    return this.currentResult;
  }

  getCurrentResult(): CampaignLoadResult | null {
    return this.currentResult;
  }

  private tryCreateGameObject(
    actor: import('../terrain/MapFormat').ActorPlacement,
    house: House | undefined,
    scene: Scene
  ): string | null {
    if (!house) return null;

    // 使用 CampaignRuleLoader 解析类型（支持别名映射和占位创建）
    const resolved = CampaignRuleLoader.resolveActorType(actor.type);
    if (!resolved.def || !resolved.tableKey) {
      console.warn(`[CampaignLoader] Unknown actor type "${actor.type}" for ${actor.id}, skipping.`);
      return null;
    }

    if (resolved.isUnit) {
      try {
        const obj = GameObjectFactory.createUnit({
          definition: resolved.def as import('../rules/UnitDefinitions').UnitDefinition,
          house,
          x: actor.location.x,
          y: actor.location.y,
          scene,
        });
        return obj?.id ?? null;
      } catch (err) {
        console.error(`[CampaignLoader] Failed to create unit "${actor.type}" (${actor.id}):`, err);
        return null;
      }
    } else {
      try {
        const obj = GameObjectFactory.createBuilding({
          definition: resolved.def as import('../rules/BuildingDefinitions').BuildingDefinition,
          house,
          x: actor.location.x,
          y: actor.location.y,
          scene,
        });
        return obj?.id ?? null;
      } catch (err) {
        console.error(`[CampaignLoader] Failed to create building "${actor.type}" (${actor.id}):`, err);
        return null;
      }
    }
  }

  private registerGlobals(
    runtime: ScriptRuntime,
    triggerSystem: TriggerSystem,
    objectiveManager: ObjectiveManager,
    scriptActors: Map<string, ScriptActor>,
    playerMap: Map<string, HouseType>,
    scene: Scene
  ): void {
    // MapGlobal — 扩展 NamedActor 支持
    const mapGlobal = new CampaignMapGlobal(scriptActors);
    runtime.registerGlobal('Map', mapGlobal);

    // PlayerGlobal — 扩展 GetPlayer, Resources, Objectives
    const playerGlobal = new CampaignPlayerGlobal(playerMap, objectiveManager);
    runtime.registerGlobal('Player', playerGlobal);

    // ActorGlobal — 扩展 Create, Move, Scatter, Hunt, Destroy 等
    const actorGlobal = new CampaignActorGlobal(scriptActors, scene, playerMap);
    runtime.registerGlobal('Actor', actorGlobal);

    // TriggerGlobal
    runtime.registerGlobal('Trigger', new CampaignTriggerGlobal(triggerSystem, scriptActors));

    // UtilsGlobal
    runtime.registerGlobal('Utils', new UtilsGlobal());

    // ReinforcementsGlobal
    runtime.registerGlobal('Reinforcements', new ReinforcementsGlobal(scriptActors, scene, playerMap));

    // MediaGlobal
    runtime.registerGlobal('Media', new MediaGlobal());

    // UIGlobal
    runtime.registerGlobal('UI', new UIGlobal());

    // DateTime 辅助
    runtime.registerGlobal('DateTime', { Seconds: (s: number) => s * 1000 });

    // CVec 辅助
    runtime.registerGlobal('CVec', { New: (x: number, y: number) => ({ x, y }) });

    // Camera 占位
    runtime.registerGlobal('Camera', { Position: { x: 0, y: 0 } });

    // 全局目标函数
    runtime.registerGlobal('AddPrimaryObjective', (playerName: string, description: string) => {
      return playerGlobal.addObjective(playerName, description, true);
    });
    runtime.registerGlobal('AddSecondaryObjective', (playerName: string, description: string) => {
      return playerGlobal.addObjective(playerName, description, false);
    });
    runtime.registerGlobal('InitObjectives', (_playerName: string) => {
      // 占位：未来可扩展为初始化目标系统
    });

    // IdleHunt 辅助
    runtime.registerGlobal('IdleHunt', (actorRef: ScriptActor) => {
      if (actorRef && actorRef.gameObjectId) {
        console.warn(`[Campaign] IdleHunt for ${actorRef.id}`);
      }
    });

    // 注册玩家变量到全局（Greece, England, USSR 等）
    for (const [name, _houseType] of playerMap) {
      void _houseType;
      if (name === 'Neutral') continue;
      // 只注册原始名称（不含 PlayerReference@ 前缀）
      if (!name.startsWith('PlayerReference@')) {
        runtime.registerGlobal(name, playerGlobal.getPlayerProxy(name));
      }
    }

    // 注册 NamedActors 到全局（Lab, OilPump, Patrol1 等）
    for (const [id, actor] of scriptActors) {
      if (!id.startsWith('Actor')) {
        runtime.registerGlobal(id, actor);
      }
    }
  }
}

// ── 扩展的 Global 实现 ──

class CampaignMapGlobal extends MapGlobal {
  constructor(private scriptActors: Map<string, ScriptActor>) {
    super(128, 128);
  }

  /** 按名称获取 Actor 引用。 */
  NamedActor(name: string): ScriptActor | null {
    return this.scriptActors.get(name) ?? null;
  }

  /** 所有命名 Actor 字典（排除无名的 Actor0, Actor1 等）。 */
  get NamedActors(): Record<string, ScriptActor> {
    const result: Record<string, ScriptActor> = {};
    for (const [id, actor] of this.scriptActors) {
      if (!id.startsWith('Actor')) {
        result[id] = actor;
      }
    }
    return result;
  }

  /** 获取大厅选项（战役难度等）。 */
  LobbyOptionOrDefault(_key: string, defaultValue: string): string {
    // 占位：未来从 LobbyOptions 读取
    return defaultValue;
  }
}

class CampaignPlayerGlobal extends PlayerGlobal {
  constructor(
    private playerMap: Map<string, HouseType>,
    private objectiveManager: ObjectiveManager
  ) {
    super();
  }

  /** 按名称获取玩家代理对象。 */
  GetPlayer(name: string): PlayerProxy | null {
    return this.getPlayerProxy(name);
  }

  getPlayerProxy(name: string): PlayerProxy {
    const ht = this.playerMap.get(name) ?? HouseType.Neutral;
    const house = HouseManager.getInstance().getHouse(ht);
    const objMgr = this.objectiveManager;
    return {
      get Resources() {
        return house?.credits ?? 0;
      },
      set Resources(value: number) {
        if (house) {
          house.credits = Math.max(0, value);
        }
      },
      get ResourceCapacity() {
        return house?.economy?.capacity ?? 0;
      },
      GetGroundAttackers: () => {
        return GameObjectManager.getInstance()
          .getAll()
          .filter((obj) => obj.isAlive() && obj.house.id === ht)
          .map((obj) => ({
            id: obj.id,
            type: obj.type,
            owner: name,
            location: { x: obj.x, y: obj.y },
            isWaypoint: false,
            gameObjectId: obj.id,
            isDead: false,
            isInWorld: true,
            stance: 'Defend',
          }));
      },
      MarkCompletedObjective: (id: string) => objMgr.completeObjective(id),
      MarkFailedObjective: (id: string) => objMgr.failObjective(id),
      IsObjectiveFailed: (id: string) => objMgr.getObjective(id)?.status === 'failed',
    };
  }

  addObjective(playerName: string, description: string, isPrimary: boolean): string {
    const id = `obj-${playerName}-${description.replace(/\s+/g, '-').toLowerCase()}`;
    this.objectiveManager.addObjective({
      id,
      description,
      type: 'custom',
      status: 'incomplete',
      progress: 0,
      targetProgress: 1,
      isPrimary,
    });
    return id;
  }
}

interface PlayerProxy {
  Resources: number;
  ResourceCapacity: number;
  GetGroundAttackers(): ScriptActor[];
  MarkCompletedObjective(id: string): void;
  MarkFailedObjective(id: string): void;
  IsObjectiveFailed(id: string): boolean;
}

class CampaignActorGlobal extends ActorGlobal {
  constructor(
    private scriptActors: Map<string, ScriptActor>,
    scene: Scene,
    private playerMap: Map<string, HouseType>
  ) {
    super();
    this.setScene(scene);
  }

  /** 创建新 Actor（战役脚本用）。 */
  Create(
    type: string,
    addToWorld: boolean,
    init: { Owner?: string; Location?: { x: number; y: number } }
  ): ScriptActor | null {
    const ownerName = init.Owner ?? 'Neutral';
    const loc = init.Location ?? { x: 0, y: 0 };
    const houseType = this.playerMap.get(ownerName) ?? HouseType.Neutral;
    const house = HouseManager.getInstance().getHouse(houseType);

    const scriptActor: ScriptActor = {
      id: `script-${type}-${Date.now()}`,
      type,
      owner: ownerName,
      location: loc,
      isWaypoint: false,
      gameObjectId: null,
      isDead: false,
      isInWorld: false,
      stance: 'Defend',
    };

    if (addToWorld && house) {
      const goId = this.tryCreateByType(type, house, loc.x, loc.y);
      if (goId) {
        scriptActor.gameObjectId = goId;
        scriptActor.isInWorld = true;
      }
    }

    this.scriptActors.set(scriptActor.id, scriptActor);
    return scriptActor;
  }

  private tryCreateByType(type: string, house: House, x: number, y: number): string | null {
    if (!this.scene) return null;

    const resolved = CampaignRuleLoader.resolveActorType(type);
    if (!resolved.def || !resolved.tableKey) {
      console.warn(`[CampaignActorGlobal] Unknown type "${type}"`);
      return null;
    }

    if (resolved.isUnit) {
      try {
        const obj = GameObjectFactory.createUnit({
          definition: resolved.def as import('../rules/UnitDefinitions').UnitDefinition,
          house,
          x,
          y,
          scene: this.scene,
        });
        return obj?.id ?? null;
      } catch {
        return null;
      }
    } else {
      try {
        const obj = GameObjectFactory.createBuilding({
          definition: resolved.def as import('../rules/BuildingDefinitions').BuildingDefinition,
          house,
          x,
          y,
          scene: this.scene,
        });
        return obj?.id ?? null;
      } catch {
        return null;
      }
    }
  }

  /** 查找指定 ID 的 ScriptActor。 */
  Find(id: string): ScriptActor | null {
    return this.scriptActors.get(id) ?? null;
  }
}

class CampaignTriggerGlobal extends TriggerGlobal {
  constructor(system: TriggerSystem, _scriptActors: Map<string, ScriptActor>) {
    super(system);
    void _scriptActors;
  }

  /** 全部死亡后触发。 */
  OnAllKilled(actors: ScriptActor[], callback: () => void): void {
    let remaining = actors.length;
    for (const actor of actors) {
      this.onKilledForActor(actor, () => {
        remaining--;
        if (remaining <= 0) {
          callback();
        }
      });
    }
  }

  /** 任意一个死亡后触发。 */
  OnAnyKilled(actors: ScriptActor[], callback: () => void): void {
    let triggered = false;
    for (const actor of actors) {
      this.onKilledForActor(actor, () => {
        if (!triggered) {
          triggered = true;
          callback();
        }
      });
    }
  }

  /** Actor 空闲时触发（每逻辑帧）。 */
  OnIdle(_actor: ScriptActor, callback: () => void): string {
    // 使用 AfterDelay(0) 模拟每帧触发，实际应接入 Actor 状态机
    return this.afterDelay(0, callback);
  }

  /** Actor 离开世界时触发。 */
  OnRemovedFromWorld(actor: ScriptActor, callback: () => void): string {
    // 监听 gameObjectId 的移除
    const checkInterval = setInterval(() => {
      if (actor.gameObjectId) {
        const obj = GameObjectManager.getInstance().get(actor.gameObjectId);
        if (!obj || !obj.isAlive()) {
          clearInterval(checkInterval);
          callback();
        }
      }
    }, 100);
    return `removed-${actor.id}`;
  }

  /** Actor 受伤时触发。 */
  OnDamaged(
    _actor: ScriptActor,
    _callback: (self: ScriptActor, attacker: ScriptActor, damage: number) => void
  ): string {
    // 占位：需接入 DamageCalculator 事件系统
    return 'damaged-placeholder';
  }

  /** 玩家失败时触发。 */
  OnPlayerLost(_playerName: string, callback: () => void): string {
    // 占位：需接入 WinLoseChecker
    return this.afterDelay(0, callback);
  }

  /** 玩家胜利时触发。 */
  OnPlayerWon(_playerName: string, callback: () => void): string {
    return this.afterDelay(0, callback);
  }

  /** 目标完成时触发。 */
  OnObjectiveCompleted(_playerName: string, _callback: () => void): string {
    return 'obj-complete-placeholder';
  }

  /** 目标失败时触发。 */
  OnObjectiveFailed(_playerName: string, _callback: () => void): string {
    return 'obj-fail-placeholder';
  }

  private onKilledForActor(actor: ScriptActor, callback: () => void): void {
    if (actor.gameObjectId) {
      this.onKilled(actor.gameObjectId, callback);
    }
    // 如果 gameObjectId 为 null（创建失败或 Waypoint），不触发回调
  }
}
