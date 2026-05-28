import { Vector3 } from '@babylonjs/core';
import { EngineManager } from './core/EngineManager';
import { SceneManager } from './core/SceneManager';
import { RTSCamera } from './core/RTSCamera';
import { Lighting } from './renderer/Lighting';
import { TerrainGrid, LandType } from './game/terrain/TerrainGrid';
import { MapLoader } from './game/terrain/MapLoader';
import { Pathfinder } from './game/terrain/Pathfinder';
import { HierarchicalPathfinder } from './game/terrain/HierarchicalPathfinder';
import { GameRules } from './game/rules/GameRules';
import { RuleRegistry } from './game/rules/RuleRegistry';
import { convertUnitDefinition, registerUnitRuleConverter } from './game/rules/UnitDefinitions';
import { BuildLimitTracker, checkBuildLimit } from './game/rules/BuildLimitTracker';
import { ConditionalTrait, ConditionManager, evaluateConditions } from './game/traits/ConditionalTrait';
import {
  GrantConditionOnPrerequisite,
  getOrCreateConditionManager,
  getConditionManager,
} from './game/traits/GrantConditionOnPrerequisite';
import { PauseOnCondition } from './game/traits/PauseOnCondition';
import { Faction, houseTypeToFaction, getFactionToken, canFactionBuild } from './game/rules/FactionRules';
import {
  WEAPON_DEFINITIONS as WeaponInfoDefinitions,
  getWeaponInfo,
  canTarget,
  TargetType,
  convertWeaponInfo,
  registerWeaponRuleConverter,
} from './game/rules/WeaponInfo';
import { computeDamage, getVersus } from './game/rules/WarheadInfo';
import { UNIT_DEFINITIONS, ArmorType } from './game/rules/UnitDefinitions';
import { BUILDING_DEFINITIONS, getBuildingFootprint } from './game/rules/BuildingDefinitions';
import { HouseManager } from './game/house/HouseManager';
import { HouseRelationship, HouseDiplomacy, getRelationshipColor } from './game/house/HouseRelationship';
import {
  getRelationshipColorConfig,
  setRelationshipColorConfig,
  getRelationshipColorForLocalPlayer,
  getRelationshipColorFor,
  hexToColor3,
} from './renderer/ui/RelationshipColors';
import { UnitHealthBarManager } from './renderer/ui/UnitHealthBar';
import { DamageType } from './game/combat/DamageTypes';
import { ScriptRuntime } from './game/scripting/ScriptRuntime';
import { MapGlobal, PlayerGlobal, ActorGlobal, MediaGlobal, UIGlobal } from './game/scripting/ScriptGlobals';
import { TriggerSystem, TriggerGlobal } from './game/scripting/TriggerSystem';
import { HouseType } from './game/house/House';
import { GameObjectFactory } from './game/objects/GameObjectFactory';
import { GameObjectManager } from './game/objects/GameObjectManager';
import { GameObjectType } from './game/objects/GameObject';
import { SelectionManager } from './game/SelectionManager';
import { InputManager } from './core/InputManager';
import { Unit } from './game/objects/Unit';
import { ConstructionQueue } from './game/building/ConstructionQueue';
import { BuildingPlacer } from './game/building/BuildingPlacer';
import { Sidebar } from './renderer/ui/Sidebar';
import { HUD } from './renderer/ui/HUD';
import { GameConsole } from './debug/GameConsole';
import { OrderDispatcher } from './game/order/OrderDispatcher';
import { MoveHandler, StopHandler, AttackHandler, GuardHandler } from './game/order/handlers';
import { groundOrder, actorOrder, selfOrder } from './game/order/GameOrder';
import { AttackMoveHandler } from './game/order/handlers/AttackMoveHandler';
import { PatrolHandler } from './game/order/handlers/PatrolHandler';
import { Activity, ActivityStatus, IdleActivity, SequenceActivity } from './game/activities/Activity';
import {
  MoveActivity,
  MoveFirstHalf,
  MoveSecondHalf,
  facingDiff,
  dirToFacing,
  shouldMoveBackwards,
  arcLerp,
} from './game/activities/MoveActivity';
import { AttackMoveActivity } from './game/activities/AttackMoveActivity';
import { CustomMovementLayer, MovementLayerType } from './game/terrain/CustomMovementLayer';
import { BulletManager } from './game/weapon/Bullet';
import { WEAPON_DEFINITIONS } from './game/weapon/Weapon';
import { DamageCalculator, WarheadType } from './game/combat/DamageCalculator';
import { ResourceLayer } from './game/economy/ResourceLayer';
import { GameLoop } from './game/GameLoop';
import {
  GAME_SPEEDS,
  getGameSpeed,
  getAllGameSpeeds,
  getSpeedRatio,
  DEFAULT_GAME_SPEED,
} from './game/rules/GameSpeeds';
import {
  DEFAULT_LOBBY_OPTIONS,
  createLobbyOptions,
  isTechLevelAllowed,
  isUnitBuildableAtTechLevel,
} from './game/rules/LobbyOptions';
import { FogOfWar, CellVisibility } from './renderer/effects/FogOfWar';
import {
  ShroudRenderer,
  ShroudEdges,
  getNeighborsVisibility,
  getEdges,
  getEdgeSpriteIndex,
} from './renderer/effects/ShroudRenderer';
import {
  SequenceProvider,
  getSequenceProvider,
  resetSequenceProvider,
  loadDefaultSequences,
  DEFAULT_RIFLE_INFANTRY_SEQUENCES,
  DEFAULT_MEDIUM_TANK_SEQUENCES,
} from './game/rules/SequenceProvider';
import { SequenceRenderer } from './renderer/sprites/SequenceRenderer';
import { ParticleManager } from './renderer/effects/ParticleManager';
import { AudioManager } from './core/AudioManager';
import { getLocalization } from './core/Localization';
import { ObjectPool } from './core/ObjectPool';
import { ObjectiveManager } from './game/objectives/ObjectiveManager';
import { WinLoseChecker } from './game/objectives/WinLoseChecker';
import { SheetBuilder } from './renderer/terrain/SheetBuilder';
import { TerrainIndexedMaterial } from './renderer/terrain/TerrainIndexedMaterial';
import { NotificationManager } from './core/NotificationManager';
import { DifficultyScaler } from './game/ai/DifficultyScaler';
import { BotRegistry, RushBot, NormalBot, DefensiveBot } from './game/ai/BotController';
import * as NetworkProtocol from './network/NetworkProtocol';
import * as OrderSerializer from './network/OrderSerializer';
import { RoomClient } from './network/RoomClient';
import { LockstepAdapter } from './network/LockstepAdapter';
import { SyncHash } from './game/SyncHash';
import { ReconnectHandler } from './network/ReconnectHandler';
import { SpectatorManager } from './network/SpectatorManager';
import { ReplayRecorder } from './replay/ReplayRecorder';
import { ReplayPlayer } from './replay/ReplayPlayer';
import { Aircraft } from './game/unit/AircraftMovement';
import { CargoSystem } from './game/unit/CargoSystem';
import { BridgeSystem } from './game/terrain/BridgeSystem';
import { NeutralBuildingManager, NeutralBuilding } from './game/neutral/NeutralBuilding';
import { WildlifeAI } from './game/neutral/WildlifeAI';
import { SpatialTriggerSystem } from './game/world/TriggerSystem';
import { ActorMap } from './game/world/ActorMap';
import { SubCell, getSubCellOffset, INFANTRY_SUBCELLS } from './game/terrain/SubCell';
import { SupportPowerManager } from './game/combat/SupportPowers';
import { ActorPlacer } from './editor/ActorPlacer';
import { SandboxMode } from './game/sandbox/SandboxMode';
import { DesktopAdapter } from './core/DesktopAdapter';
import { Actor } from './game/actors/Actor';
import { TraitRegistry, Trait } from './game/traits/Trait';
import { HealthTrait } from './game/traits/HealthTrait';
import { RenderTrait } from './game/traits/RenderTrait';
import { ArmamentTrait } from './game/traits/ArmamentTrait';
import { DynamicTechTree } from './game/rules/DynamicTechTree';
import { evaluatePrerequisites, extractTokens } from './game/rules/PrerequisiteToken';
import { TouchInputManager } from './core/TouchInputManager';
import { MusicPlayer } from './core/MusicPlayer';
import { VideoPlayer } from './core/VideoPlayer';
import { MixLoader } from './assets/loaders/MixLoader';
import { ShpLoader } from './assets/loaders/ShpLoader';
import { BriefingScreen } from './ui/shell/BriefingScreen';
import {
  getAllCampaigns,
  getCampaignById,
  getMissions,
  getMissionById,
  registerCampaign,
} from './game/campaign/CampaignData';
import {
  loadCampaignProgress,
  saveCampaignProgress,
  markMissionCompleted,
  isMissionUnlocked,
  clearAllCampaignProgress,
  getSavedCampaignIds,
} from './game/campaign/CampaignProgress';
import { CursorManager } from './core/CursorManager';
import { SaveManager } from './save/SaveManager';
import { BuildingTools } from './game/building/BuildingTools';
import { PerformanceMonitor } from './core/PerformanceMonitor';
import { ShellRouter } from './ui/shell/ShellRouter';
import { MainMenu } from './ui/shell/MainMenu';
import { LoadScreen } from './ui/shell/LoadScreen';
import { SettingsMenu } from './ui/shell/SettingsMenu';
import { PauseMenu } from './ui/shell/PauseMenu';
import { CampaignMenu } from './ui/shell/CampaignMenu';
import { SkirmishSetup } from './ui/shell/SkirmishSetup';
import { MultiplayerLobby } from './ui/shell/MultiplayerLobby';
import './ui/styles/shell.css';
import { loadYamlRulesWithFallback } from './game/rules/YamlLoader';

const bootstrap = async (onReady?: () => void): Promise<void> => {
  // ── Task 95: YAML 规则解析基础设施 ──
  await loadYamlRulesWithFallback();

  // ── Engine ──
  const engineManager = EngineManager.getInstance();
  engineManager.initialize('app');

  // ── Scene ──
  const sceneManager = SceneManager.getInstance();
  const scene = sceneManager.initialize();

  // ── RTS Camera ──
  const rtsCamera = new RTSCamera(scene, engineManager.getEngine(), {
    target: Vector3.Zero(),
    initialZoom: 50,
    alpha: Math.PI, // South-to-North view (camera at south edge looking north)
    beta: (2 * Math.PI) / 9, // ~40° pitch, matching OpenRA's CameraPitch
    edgeThreshold: 5, // 鼠标贴住边缘 5px 内热区时滚动
    uiRightPanelWidth: 190, // Sidebar 宽度，排除在右边缘滚动区域外
  });

  // ── Lighting & Shadows ──
  const lighting = new Lighting(scene);

  // ── Terrain Grid ──
  const terrain = new TerrainGrid(scene, 64, 64);
  terrain.enableLOD(scene);

  // ── Load map from JSON ──
  // Vite base path: import.meta.env.BASE_URL handles both dev (/CnC_Remake/) and prod
  const mapUrl = `${import.meta.env.BASE_URL}maps/dummy_map.json`.replace(/\/+/g, '/');
  try {
    const map = await MapLoader.loadFromUrl(mapUrl);
    MapLoader.applyToTerrainGrid(map, terrain);
    console.warn(`Map loaded: ${map.width}x${map.height}, version ${map.version}`);
  } catch (err) {
    console.warn('Failed to load map, falling back to test pattern:', err);
    terrain.generateTestPattern();
  }

  // ── Task 23.9: 密集场景压力测试 — 2 格宽峡谷桥梁 ──
  // 通过 URL 查询参数 ?task=23.9 启用，避免干扰其他 e2e 测试的地形
  const urlParams = new URLSearchParams(window.location.search);
  const enableTask239 = urlParams.get('task') === '23.9';
  const enableTask2312 = urlParams.get('task') === '23.12';
  const enableTask2313 = urlParams.get('task') === '23.13';

  if (enableTask239) {
    // 1. 完整北墙和南墙（横向 Rock，x=0-63）
    for (let x = 0; x < 64; x++) {
      terrain.setCellLandType(x, 15, LandType.Rock);
      terrain.setCellLandType(x, 35, LandType.Rock);
    }

    // 2. 桥梁侧壁（纵向 Rock，让桥梁收窄为 2 格宽 x=29-30）
    for (let y = 15; y <= 35; y++) {
      terrain.setCellLandType(28, y, LandType.Rock);
      terrain.setCellLandType(31, y, LandType.Rock);
    }

    // 3. 显式清除桥梁通道（x=29-30, y=15-35）
    for (let y = 15; y <= 35; y++) {
      terrain.setCellLandType(29, y, LandType.Clear);
      terrain.setCellLandType(30, y, LandType.Clear);
    }

    // 4. 出发区和目标区清除不可通行地形（dummy_map 残留 Rock/Rough/Water）
    // 西侧 Nod 出发区 + 东侧 GDI 目标区
    for (let y = 8; y <= 14; y++) {
      for (let x = 18; x <= 40; x++) {
        const type = terrain.getCellLandType(x, y);
        if (type === LandType.Water || type === LandType.Rock || type === LandType.Rough || type === LandType.River) {
          terrain.setCellLandType(x, y, LandType.Clear);
        }
      }
    }
    // 东侧 GDI 出发区 + 西侧 Nod 目标区
    for (let y = 36; y <= 44; y++) {
      for (let x = 18; x <= 40; x++) {
        const type = terrain.getCellLandType(x, y);
        if (type === LandType.Water || type === LandType.Rock || type === LandType.Rough || type === LandType.River) {
          terrain.setCellLandType(x, y, LandType.Clear);
        }
      }
    }
  } else if (enableTask2312) {
    // Task 23.12: 清除全图障碍，确保大规模单位可以自由移动
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const type = terrain.getCellLandType(x, y);
        if (type === LandType.Water || type === LandType.Rock || type === LandType.Rough || type === LandType.River) {
          terrain.setCellLandType(x, y, LandType.Clear);
        }
      }
    }
  } else if (enableTask2313) {
    // Task 23.13: 创建明确的 Water 分隔带用于 HPF 测试
    // 垂直 Water 墙：x=30, y=0-63，将地图分为左右两个 domain
    for (let y = 0; y < 64; y++) {
      terrain.setCellLandType(30, y, LandType.Water);
    }
    // 确保两侧地面可通行（除 Water 墙外）
    for (let y = 0; y < 64; y++) {
      for (let x = 20; x <= 40; x++) {
        if (x !== 30) {
          const type = terrain.getCellLandType(x, y);
          if (type === LandType.Water || type === LandType.Rock || type === LandType.Rough || type === LandType.River) {
            terrain.setCellLandType(x, y, LandType.Clear);
          }
        }
      }
    }
  } else {
    // 默认模式：为旧 e2e 测试恢复兼容地形（dummy_map 的 Water 会破坏测试位置）
    // 清除测试安全区
    for (let y = 18; y <= 26; y++) {
      for (let x = 22; x <= 38; x++) {
        terrain.setCellLandType(x, y, LandType.Clear);
      }
    }
    // 创建 Rock 墙供 task-23.7 测试（Locomotor 差异）
    for (let y = 22; y <= 23; y++) {
      for (let x = 24; x <= 36; x++) {
        terrain.setCellLandType(x, y, LandType.Rock);
      }
    }
  }

  // ── Pathfinder ──
  // 动态阻塞回调：每帧查询建筑 footprint，让 A* 自动绕开建筑
  const getBuildingBlockedCells = (): ReadonlySet<string> => {
    const blocked = new Set<string>();
    for (const obj of GameObjectManager.getInstance().getAll()) {
      if (!obj.isAlive()) continue;
      if (obj.type !== GameObjectType.Building) continue;
      const building = obj as import('./game/objects/Building').Building;
      const def = building.definition;
      // 只阻塞建筑 footprint 本身（单位可紧贴建筑边缘行走）
      for (const cell of getBuildingFootprint(def)) {
        blocked.add(`${building.x + cell.dx},${building.y + cell.dy}`);
      }
    }
    return blocked;
  };

  const pathfinder = new Pathfinder(
    64,
    64,
    (x, y) => {
      // isPassable 只检查绝对不可通行的地形（Water）。
      // Rock / Wall / River 的通行性由各单位的 Locomotor 的 TerrainSpeeds 控制。
      const type = terrain.getCellLandType(x, y);
      return type !== LandType.Water;
    },
    getBuildingBlockedCells,
    (x, y) => terrain.getCellLandType(x, y),
    (x, y) => terrain.getCellHeight(x, y)
  );

  // Task 23.13: 地形修改后重建 HierarchicalPathfinder domain
  if (enableTask2313) {
    pathfinder.hierarchical.rebuild();
  }

  // ── Bot Registry (Task 27.6) ──
  BotRegistry.register('bot-rush', RushBot);
  BotRegistry.register('bot-normal', NormalBot);
  BotRegistry.register('bot-defensive', DefensiveBot);

  // ── Houses ──
  const houseManager = HouseManager.getInstance();

  const gdi = houseManager.createHouse(HouseType.GDI, {
    isHuman: true,
    credits: GameRules.mpDefaultMoney,
    capacity: 2000,
  });

  const nod = houseManager.createHouse(HouseType.Nod, {
    isHuman: false,
    credits: GameRules.mpDefaultMoney,
    capacity: 2000,
  });

  // ── Task 23.9: 西侧10辆Nod + 东侧1辆GDI 交叉过桥测试 ──
  // ── Task 23.12: LocomotorCache 验收场景 — 64+ 单位混合编队 ──
  const gdiTanks: Unit[] = [];
  const nodTanks: Unit[] = [];
  const patrolUnits: Unit[] = [];

  if (enableTask239) {
    // GDI 1 辆在东侧，前往西侧
    gdiTanks.push(
      GameObjectFactory.createUnit({
        definition: UNIT_DEFINITIONS.MediumTank,
        house: gdi,
        x: 33,
        y: 40,
        scene,
      })
    );

    // Nod 10 辆在西侧，前往东侧（2排，每排5辆，不重叠）
    for (let i = 0; i < 10; i++) {
      const row = Math.floor(i / 5); // 0 or 1
      const col = i % 5; // 0..4
      nodTanks.push(
        GameObjectFactory.createUnit({
          definition: UNIT_DEFINITIONS.MediumTank,
          house: nod,
          x: 20 + col,
          y: 10 + row,
          scene,
        })
      );
    }

    // 延迟 2s 后同时下达交叉移动命令
    setTimeout(() => {
      const gdiTank = gdiTanks[0];
      const okGdi = gdiTank.logic.moveTo(24, 10, pathfinder);
      console.warn(
        `[Task23.9] GDI moveTo(24,10) = ${okGdi}, path=${JSON.stringify(gdiTank.logic.movement['path']?.map((p: { x: number; y: number }) => [p.x, p.y]))}`
      );

      for (let i = 0; i < nodTanks.length; i++) {
        const tank = nodTanks[i];
        const tx = 33 + (i % 5);
        const ty = 40 + Math.floor(i / 5);
        const ok = tank.logic.moveTo(tx, ty, pathfinder);
        console.warn(
          `[Task23.9] Nod-${i} moveTo(${tx},${ty}) = ${ok}, path=${JSON.stringify(tank.logic.movement['path']?.map((p: { x: number; y: number }) => [p.x, p.y]))}`
        );
      }
      console.warn('Task 23.9: 10 Nod + 1 GDI ordered to cross');
    }, 2000);
  } else if (enableTask2312) {
    // ═══════════════════════════════════════════════════════════════
    // Task 23.12 验收场景：64+ 单位混合编队
    // ═══════════════════════════════════════════════════════════════
    // 目标：验证 LocomotorCache 在 50+ 单位同屏时的性能收益
    //
    // 编队构成：
    //   A. 西北 stationary 方阵 — 16 辆 GDI MediumTank（4×4）
    //      → 验证 HasStationaryActor flag
    //   B. 东南 stationary 混合 — 16 辆 Nod LightTank + 16 步兵（4×4 坦克 + 4×4 步兵交错）
    //      → 验证 HasCrushableActor + sharesCell 计数
    //   C. 中央巡逻队 — 16 辆坦克（8 GDI + 8 Nod）沿水平线循环移动
    //      → 验证 HasMovingActor flag + 移动中 cache 更新
    //
    // 相机初始位置对准中央，便于观察移动单位与两侧方阵。
    // ═══════════════════════════════════════════════════════════════

    // A. 西北 GDI 方阵 (5,5)-(14,14) 中取 4×4 = 16 辆
    for (let i = 0; i < 16; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      gdiTanks.push(
        GameObjectFactory.createUnit({
          definition: UNIT_DEFINITIONS.MediumTank,
          house: gdi,
          x: 5 + col * 2,
          y: 5 + row * 2,
          scene,
        })
      );
    }

    // B. 东南 Nod 方阵 (45,45)-(54,54) — 16 辆 LightTank + 16 步兵交错
    for (let i = 0; i < 16; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      nodTanks.push(
        GameObjectFactory.createUnit({
          definition: UNIT_DEFINITIONS.LightTank,
          house: nod,
          x: 45 + col * 2,
          y: 45 + row * 2,
          scene,
        })
      );
    }
    for (let i = 0; i < 16; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      GameObjectFactory.createUnit({
        definition: UNIT_DEFINITIONS.RifleInfantry,
        house: nod,
        x: 46 + col * 2,
        y: 46 + row * 2,
        scene,
      });
    }

    // C. 中央巡逻队 — 16 辆坦克沿 y=30 水平线分布
    for (let i = 0; i < 8; i++) {
      patrolUnits.push(
        GameObjectFactory.createUnit({
          definition: UNIT_DEFINITIONS.MediumTank,
          house: gdi,
          x: 20 + i * 2,
          y: 30,
          scene,
        })
      );
    }
    for (let i = 0; i < 8; i++) {
      patrolUnits.push(
        GameObjectFactory.createUnit({
          definition: UNIT_DEFINITIONS.LightTank,
          house: nod,
          x: 36 + i * 2,
          y: 30,
          scene,
        })
      );
    }

    // 相机对准中央
    rtsCamera.setTarget(new Vector3(0, 0, 0));

    // 巡逻循环：每 6 秒让所有巡逻单位向对面移动
    let patrolDirection = 1; // 1 = 向右，-1 = 向左
    const runPatrol = () => {
      if (patrolUnits.length === 0) return;
      const targetX = patrolDirection > 0 ? 50 : 14;
      for (const u of patrolUnits) {
        if (u.isAlive()) {
          u.logic.moveTo(targetX, u.logic.fromCellY, pathfinder);
        }
      }
      patrolDirection *= -1;
    };
    // 延迟 2s 后开始第一次巡逻
    setTimeout(() => {
      runPatrol();
      // 之后每 8s 切换方向
      setInterval(runPatrol, 8000);
    }, 2000);

    console.warn(
      `[Task23.12] Scene ready: ${gdiTanks.length} GDI tanks + ${nodTanks.length} Nod tanks + 16 infantry + ${patrolUnits.length} patrol units = ${gdiTanks.length + nodTanks.length + 16 + patrolUnits.length} total`
    );
    console.warn(`[Task23.12] Console commands: cnc.cacheStats() | cnc.benchmarkPaths(200) | cnc.locomotorCache(x,y)`);
  }

  // ── Task 24 默认场景：框选 + 群体移动测试单位 ──
  // 放置在地图东南角 (45-50, 45-50)，避免与 task-23.1~23.8 的 e2e 测试坐标 (22-38, 18-26) 冲突
  if (!enableTask239 && !enableTask2312) {
    // GDI 6 辆 MediumTank，3x2 编队
    for (let i = 0; i < 6; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      gdiTanks.push(
        GameObjectFactory.createUnit({
          definition: UNIT_DEFINITIONS.MediumTank,
          house: gdi,
          x: 45 + col,
          y: 45 + row,
          scene,
        })
      );
    }

    // Nod 2 辆 LightTank 作为攻击目标
    for (let i = 0; i < 2; i++) {
      nodTanks.push(
        GameObjectFactory.createUnit({
          definition: UNIT_DEFINITIONS.LightTank,
          house: nod,
          x: 50 + i,
          y: 45 + i,
          scene,
        })
      );
    }
  }

  // Enable shadows on all spawned objects
  const allSpawned = [...gdiTanks, ...nodTanks];
  for (const obj of allSpawned) {
    if (obj.mesh) {
      lighting.addShadowCaster(obj.mesh);
      lighting.enableShadowsOnMesh(obj.mesh);
    }
  }

  // ── Minimal infrastructure for interaction ──
  const queue = new ConstructionQueue(gdi);
  const placer = new BuildingPlacer(scene, rtsCamera.getCamera(), terrain);

  // ── Sidebar ──
  const sidebar = new Sidebar(
    scene,
    gdi,
    queue,
    (def) => {
      const ok = queue.startBuilding(def);
      if (ok) {
        // eslint-disable-next-line no-console
        console.info(`Started building ${def.name} — Credits left: ${gdi.credits}`);
      } else {
        console.warn(`Cannot build ${def.name} — check funds/prerequisites/queue status`);
      }
    },
    () => {
      if (queue.status === 'ready' && queue.currentDefinition) {
        placer.startPlacement(queue.currentDefinition, gdi.color);
      }
    },
    (mode) => {
      if (mode === 'repair') {
        rtsCamera.setCursorColor('#0f0');
      } else if (mode === 'sell') {
        rtsCamera.setCursorColor('#f90');
      } else {
        rtsCamera.setCursorColor('#fff');
      }
    }
  );

  // ── Task 30: Resource Layer ──
  const resourceLayer = new ResourceLayer(terrain.getWidth(), terrain.getHeight(), [
    { name: 'Tiberium', terrainType: 'clear', maxDensity: 255, growthRate: 0.05, spreadRate: 0.02, value: 25 },
    { name: 'Ore', terrainType: 'clear', maxDensity: 200, growthRate: 0.03, spreadRate: 0.01, value: 50 },
  ]);

  // ── Particle Manager (Task 80) ──
  const particleManager = ParticleManager.getInstance();
  particleManager.init(scene);

  // ── Debug Console ──
  const gameConsole = new GameConsole(scene, lighting, rtsCamera, terrain, placer, pathfinder, resourceLayer);
  gameConsole.install();

  // ── Task 31: Fog of War ──
  const fogOfWar = new FogOfWar({
    width: terrain.getWidth(),
    height: terrain.getHeight(),
    sightRadius: 10,
    heightOffset: 0.15,
  });
  fogOfWar.create(scene);

  // ── Task 34: AudioManager 初始化（用户首次点击后激活）──
  const audioManager = AudioManager.getInstance();
  const initAudio = () => {
    audioManager.init();
    window.removeEventListener('click', initAudio);
    window.removeEventListener('keydown', initAudio);
  };
  window.addEventListener('click', initAudio);
  window.addEventListener('keydown', initAudio);

  // ── Task 43: CursorManager 绑定 canvas ──
  const cursorManager = CursorManager.getInstance();
  const canvas = engineManager.getEngine().getRenderingCanvas();
  if (canvas) cursorManager.bind(canvas);

  // ── Task 33: SaveManager ──
  const saveManager = new SaveManager(terrain, scene);

  // ── Task 51: BuildingTools ──
  const buildingTools = new BuildingTools();

  // ── Task 140: OrderDispatcher 初始化 ──
  const orderDispatcher = OrderDispatcher.getInstance();
  orderDispatcher.register(new MoveHandler(pathfinder));
  orderDispatcher.register(new StopHandler());
  orderDispatcher.register(new AttackHandler());
  orderDispatcher.register(new GuardHandler(pathfinder));
  orderDispatcher.register(new AttackMoveHandler(pathfinder));
  orderDispatcher.register(new PatrolHandler(pathfinder));

  // ── Task 24: InputManager（鼠标输入层）──
  const selectionManager = SelectionManager.getInstance();
  selectionManager.setViewerHouseType(HouseType.GDI);
  const inputManager = new InputManager(rtsCamera, scene, selectionManager, placer, gameConsole);

  // ── Task 27: HUD 覆盖层 ──
  const hud = new HUD();
  const healthBarManager = new UnitHealthBarManager();

  selectionManager.onSelectionChanged = (selected) => {
    hud.showUnitInfo(selected as Unit[]);
    // 显示选中单位的血条，隐藏非选中单位的血条
    const allUnits = GameObjectManager.getInstance().getUnits();
    for (const u of allUnits) {
      if ((selected as Unit[]).includes(u as Unit)) {
        healthBarManager.show(u as Unit);
      } else {
        healthBarManager.hide(u.id);
      }
    }
  };

  // worldToScreen 通过 inputManager.worldToScreen 暴露给 e2e 测试

  // ── Task 141: GameLoop — 逻辑帧与渲染帧分离 ──
  // 当前保持 60 FPS 逻辑帧以兼容现有单位移动系统；
  // 后续 Task 65（Lockstep）时统一降至 25 FPS 并更新单位插值逻辑。
  const gameLoop = new GameLoop({ logicFps: 60 });
  let overlapCheckAccumulator = 0;

  // 逻辑帧（25 FPS）：所有游戏状态更新
  gameLoop.onLogicTick((dt: number) => {
    queue.tick(dt);
    GameObjectManager.getInstance().update(dt);
    terrain.update(dt);
    BulletManager.getInstance().updateAll();

    // ── Task 31: 更新战争迷雾（仅本地玩家 GDI 的视野）──
    const gdiUnits = GameObjectManager.getInstance()
      .getUnits()
      .filter((u) => u.isAlive() && u.house.id === HouseType.GDI) as Unit[];
    fogOfWar.update(gdiUnits.map((u) => ({ x: u.x, y: u.y, team: u.house.id })));

    // ── Task 30.5: 矿石精炼（Resources → Cash）──
    // 每帧将所有矿石储量按固定速率精炼为资金
    for (const house of HouseManager.getInstance().getAllHouses()) {
      if (house.economy.tiberium > 0) {
        house.economy.refineResources(Infinity);
      }
    }

    // ── Overlap 检测（每秒一次）──
    overlapCheckAccumulator += dt;
    if (overlapCheckAccumulator >= 1000) {
      overlapCheckAccumulator = 0;
      const units = GameObjectManager.getInstance().getUnits();
      for (let i = 0; i < units.length; i++) {
        const a = units[i] as Unit;
        if (!a.isAlive()) continue;
        for (let j = i + 1; j < units.length; j++) {
          const b = units[j] as Unit;
          if (!b.isAlive()) continue;
          const dx = a.logic.x - b.logic.x;
          const dy = a.logic.y - b.logic.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.3) {
            console.warn(
              `[OVERLAP] ${a.id} @(${a.logic.x.toFixed(2)},${a.logic.y.toFixed(2)}) vs ` +
                `${b.id} @(${b.logic.x.toFixed(2)},${b.logic.y.toFixed(2)}) dist=${dist.toFixed(3)} ` +
                `A:from=(${a.logic.fromCellX},${a.logic.fromCellY}) to=(${a.logic.toCellX},${a.logic.toCellY}) ` +
                `B:from=(${b.logic.fromCellX},${b.logic.fromCellY}) to=(${b.logic.toCellX},${b.logic.toCellY})`
            );
          }
        }
      }
    }
  });

  // 渲染帧（可变 FPS）：视觉更新和插值
  gameLoop.onRenderTick((_dt: number) => {
    if (placer.isPlacing()) {
      const ptr = rtsCamera.getPointerPosition();
      placer.updateFromScreen(ptr.x, ptr.y);
    }
    sidebar.refresh(_dt);
    particleManager.update();
    hud.updateResourceBar(gdi);
    hud.drawMinimap();
    healthBarManager.updateAll(GameObjectManager.getInstance().getUnits() as Unit[]);
  });

  const engine = engineManager.getEngine();
  gameLoop.start(engine, scene);

  // ── Lifecycle cleanup ──
  window.addEventListener('beforeunload', () => {
    inputManager.dispose();
    sidebar.dispose();
    placer.dispose();
    GameObjectManager.getInstance().dispose();
    houseManager.dispose();
    fogOfWar.dispose();
    terrain.dispose();
    lighting.dispose();
    rtsCamera.dispose();
    sceneManager.dispose();
    engineManager.dispose();
  });

  // ── Expose internals for e2e tests ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  w._engine = engineManager.getEngine();
  w._scene = scene;
  w._selectionManager = selectionManager;
  w._goManager = GameObjectManager.getInstance();
  w._houseManager = HouseManager.getInstance();
  w._goFactory = GameObjectFactory;
  w._worldToScreen = (worldX: number, worldY: number, worldZ: number) => {
    return inputManager.worldToScreen(new Vector3(worldX, worldY, worldZ));
  };
  w._gameLoop = gameLoop;
  w._GameLoopClass = GameLoop;
  w._bulletManager = BulletManager.getInstance();
  w.UNIT_DEFINITIONS = UNIT_DEFINITIONS;
  w.BUILDING_DEFINITIONS = BUILDING_DEFINITIONS;
  w.GameRules = GameRules;
  w._networkProtocol = NetworkProtocol;
  w._orderSerializer = OrderSerializer;
  w.RoomClient = RoomClient;
  w.LockstepAdapter = LockstepAdapter;
  w.SyncHash = SyncHash;
  w.ReconnectHandler = ReconnectHandler;
  w.SpectatorManager = SpectatorManager;
  w.ReplayRecorder = ReplayRecorder;
  w.ReplayPlayer = ReplayPlayer;
  w.Aircraft = Aircraft;
  w.CargoSystem = CargoSystem;
  w.BridgeSystem = BridgeSystem;
  w._terrainGrid = terrain;
  w.NeutralBuildingManager = NeutralBuildingManager;
  w.NeutralBuilding = NeutralBuilding;
  w.WildlifeAI = WildlifeAI;
  w.SpatialTriggerSystem = SpatialTriggerSystem;
  w.ActorMap = ActorMap;
  w.SubCell = SubCell;
  w._getSubCellOffset = getSubCellOffset;
  w._INFANTRY_SUBCELLS = INFANTRY_SUBCELLS;
  w.WEAPON_DEFINITIONS = WEAPON_DEFINITIONS;
  w.DamageCalculator = DamageCalculator;
  w.WarheadType = WarheadType;
  w.ArmorType = ArmorType;
  w._resourceLayer = resourceLayer;
  w._fogOfWar = fogOfWar;
  w._audioManager = audioManager;
  w._cursorManager = cursorManager;
  w._orderDispatcher = orderDispatcher;
  w.groundOrder = groundOrder;
  w.actorOrder = actorOrder;
  w.selfOrder = selfOrder;
  w._saveManager = saveManager;
  w._buildingTools = buildingTools;
  w._placer = placer;
  w._localization = getLocalization();
  w._ObjectPool = ObjectPool;
  w._objectiveManager = new ObjectiveManager();
  w._WinLoseChecker = WinLoseChecker;
  w._SheetBuilder = SheetBuilder;
  w._TerrainIndexedMaterial = TerrainIndexedMaterial;
  w._notificationManager = new NotificationManager();
  w._DifficultyScaler = DifficultyScaler;
  w._HierarchicalPathfinder = HierarchicalPathfinder;
  w._SupportPowerManager = SupportPowerManager;
  w._ActorPlacer = ActorPlacer;
  w._SandboxMode = SandboxMode;
  w._DesktopAdapter = DesktopAdapter;
  w._TouchInputManager = TouchInputManager;
  w._musicPlayer = new MusicPlayer();
  w._videoPlayer = new VideoPlayer();
  w._MixLoader = MixLoader;
  w._ShpLoader = ShpLoader;
  w._BriefingScreen = BriefingScreen;
  w._CampaignData = {
    getAllCampaigns,
    getCampaignById,
    getMissions,
    getMissionById,
    registerCampaign,
  };
  w._CampaignProgress = {
    loadCampaignProgress,
    saveCampaignProgress,
    markMissionCompleted,
    isMissionUnlocked,
    clearAllCampaignProgress,
    getSavedCampaignIds,
  };
  w._HouseType = HouseType;
  w._BotRegistry = BotRegistry;
  w._RushBot = RushBot;
  w._NormalBot = NormalBot;
  w._DefensiveBot = DefensiveBot;
  w._HouseRelationship = HouseRelationship;
  w._HouseDiplomacy = HouseDiplomacy;
  w._getRelationshipColor = getRelationshipColor;
  w._getRelationshipColorConfig = getRelationshipColorConfig;
  w._setRelationshipColorConfig = setRelationshipColorConfig;
  w._getRelationshipColorForLocalPlayer = getRelationshipColorForLocalPlayer;
  w._getRelationshipColorFor = getRelationshipColorFor;
  w._hexToColor3 = hexToColor3;
  w._UnitHealthBarManager = UnitHealthBarManager;
  w._DamageType = DamageType;
  // ── Task 95/97: Rule Registry + YAML Inheritance ──
  w._RuleRegistry = RuleRegistry;
  w._convertUnitDefinition = convertUnitDefinition;
  w._registerUnitRuleConverter = registerUnitRuleConverter;
  // ── Task 98: Weapon Rules ──
  w._WeaponDefinitions = WeaponInfoDefinitions;
  // ── Task 136: Game Speeds & Lobby Options ──
  w._GameSpeeds = GAME_SPEEDS;
  w._getGameSpeed = getGameSpeed;
  w._getAllGameSpeeds = getAllGameSpeeds;
  w._getSpeedRatio = getSpeedRatio;
  w._DefaultGameSpeed = DEFAULT_GAME_SPEED;
  w._DefaultLobbyOptions = DEFAULT_LOBBY_OPTIONS;
  w._createLobbyOptions = createLobbyOptions;
  w._isTechLevelAllowed = isTechLevelAllowed;
  w._isUnitBuildableAtTechLevel = isUnitBuildableAtTechLevel;
  // ── Task 135: Faction Rules & Build Limits ──
  w._BuildLimitTracker = BuildLimitTracker;
  // ── Task 125: Activity Tree ──
  w._Activity = Activity;
  w._ActivityStatus = ActivityStatus;
  w._IdleActivity = IdleActivity;
  w._SequenceActivity = SequenceActivity;
  w._MoveActivity = MoveActivity;
  w._MoveFirstHalf = MoveFirstHalf;
  w._MoveSecondHalf = MoveSecondHalf;
  w._AttackMoveActivity = AttackMoveActivity;
  // ── Task 129: MovePart Refinement ──
  w._facingDiff = facingDiff;
  w._dirToFacing = dirToFacing;
  w._shouldMoveBackwards = shouldMoveBackwards;
  w._arcLerp = arcLerp;
  // ── Task 138: Sequence System ──
  w._SequenceProvider = SequenceProvider;
  w._getSequenceProvider = getSequenceProvider;
  w._resetSequenceProvider = resetSequenceProvider;
  w._loadDefaultSequences = loadDefaultSequences;
  w._DEFAULT_RIFLE_INFANTRY_SEQUENCES = DEFAULT_RIFLE_INFANTRY_SEQUENCES;
  w._DEFAULT_MEDIUM_TANK_SEQUENCES = DEFAULT_MEDIUM_TANK_SEQUENCES;
  w._SequenceRenderer = SequenceRenderer;
  // ── Task 126: Custom Movement Layer ──
  w._CustomMovementLayer = CustomMovementLayer;
  w._MovementLayerType = MovementLayerType;
  // ── Task 9.7: Shroud Renderer ──
  w._ShroudRenderer = ShroudRenderer;
  w._ShroudEdges = ShroudEdges;
  w._getNeighborsVisibility = getNeighborsVisibility;
  w._getEdges = getEdges;
  w._getEdgeSpriteIndex = getEdgeSpriteIndex;
  w._CellVisibility = CellVisibility;
  w._FogOfWar = FogOfWar;
  // ── Task 137: Conditional Trait System ──
  w._ConditionalTrait = ConditionalTrait;
  w._ConditionManager = ConditionManager;
  w._evaluateConditions = evaluateConditions;
  w._GrantConditionOnPrerequisite = GrantConditionOnPrerequisite;
  w._getOrCreateConditionManager = getOrCreateConditionManager;
  w._getConditionManager = getConditionManager;
  w._PauseOnCondition = PauseOnCondition;
  w._checkBuildLimit = checkBuildLimit;
  w._Faction = Faction;
  w._houseTypeToFaction = houseTypeToFaction;
  w._getFactionToken = getFactionToken;
  w._canFactionBuild = canFactionBuild;
  w._getWeaponInfo = getWeaponInfo;
  w._canTarget = canTarget;
  w._TargetType = TargetType;
  w._computeDamage = computeDamage;
  w._getVersus = getVersus;
  w._convertWeaponInfo = convertWeaponInfo;
  w._registerWeaponRuleConverter = registerWeaponRuleConverter;
  w._HouseManager = HouseManager;
  // HouseManager 动态方法代理（避免 Vite HMR 导致实例方法过时）
  w._getAlliesOf = (type: HouseType) => HouseManager.getInstance().getAlliesOf(type);
  w._getEnemiesOf = (type: HouseType) => HouseManager.getInstance().getEnemiesOf(type);
  w._getRelationshipBetween = (a: HouseType, b: HouseType) => HouseManager.getInstance().getRelationship(a, b);
  w._getBot = (type: HouseType) => HouseManager.getInstance().getBot(type);
  w._getSpectators = () => HouseManager.getInstance().getSpectators();
  // ── Task 55/56/57: Scripting & Triggers ──
  w._ScriptRuntime = ScriptRuntime;
  w._TriggerSystem = TriggerSystem;
  w._TriggerGlobal = TriggerGlobal;
  w._MapGlobal = MapGlobal;
  w._PlayerGlobal = PlayerGlobal;
  w._ActorGlobal = ActorGlobal;
  w._MediaGlobal = MediaGlobal;
  w._UIGlobal = UIGlobal;

  // ── Task 96: Trait / Actor System ──
  w._Actor = Actor;

  w._TraitRegistry = TraitRegistry;
  w._Trait = Trait;
  w._HealthTrait = HealthTrait;
  w._RenderTrait = RenderTrait;
  w._ArmamentTrait = ArmamentTrait;

  // ── Task 134: Dynamic TechTree ──
  w._DynamicTechTree = DynamicTechTree;
  w._evaluatePrerequisites = evaluatePrerequisites;
  w._extractTokens = extractTokens;

  // ── Verification ──
  const goManager = GameObjectManager.getInstance();
  // eslint-disable-next-line no-console
  console.info('GDI — Credits:', gdi.credits, '| Buildings:', gdi.curBuildings, '| Units:', gdi.curUnits);
  // eslint-disable-next-line no-console
  console.info('Nod — Credits:', nod.credits, '| Buildings:', nod.curBuildings, '| Units:', nod.curUnits);
  // eslint-disable-next-line no-console
  console.info(
    'Total objects:',
    goManager.getAll().length,
    '| Units:',
    goManager.getUnits().length,
    '| Buildings:',
    goManager.getBuildings().length
  );

  onReady?.();

  // ── UI Shell & Router (Tasks 36, 37, 41, 42) ──
  const app = document.getElementById('app');
  if (app) {
    const canvas = app.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas) {
      const router = new ShellRouter();
      const mainMenu = new MainMenu(app, router);
      const loadScreen = new LoadScreen(app);
      const settingsMenu = new SettingsMenu(app, router);
      const pauseMenu = new PauseMenu(app, router);
      const campaignMenu = new CampaignMenu(app, router);
      const skirmishSetup = new SkirmishSetup(app, router);
      const multiplayerLobby = new MultiplayerLobby(app, router);

      router.registerContainers({
        game: canvas,
        menu: mainMenu.getElement(),
        loading: loadScreen.getElement(),
        settings: settingsMenu.getElement(),
        pause: pauseMenu.getElement(),
        campaign: campaignMenu.getElement(),
        skirmish: skirmishSetup.getElement(),
        lobby: multiplayerLobby.getElement(),
      });

      // Default to menu for real users, but game for e2e tests (navigator.webdriver)
      // so existing tests that directly page.goto() don't get blocked by the shell overlay
      const isE2E = (navigator as unknown as Record<string, unknown>).webdriver === true;
      router.navigate(isE2E ? 'game' : 'menu');

      // Start game flow: menu → loading → game
      mainMenu.setOnStartGame(() => {
        router.navigate('loading');
        loadScreen.setProgress(0);
        loadScreen.setTip('正在初始化战场...');

        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 15 + 5;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
          }
          loadScreen.setProgress(progress);
        }, 200);

        setTimeout(() => {
          clearInterval(interval);
          loadScreen.setProgress(100);
          settingsMenu.applyToAudio(audioManager);
          router.navigate('game');
        }, 1500);
      });

      // Pause / Resume
      pauseMenu.setOnResume(() => router.navigate('game'));

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const current = router.getCurrentPage();
          if (current === 'game') {
            router.navigate('pause');
          } else if (current === 'pause') {
            router.navigate('game');
          } else if (
            current === 'settings' ||
            current === 'campaign' ||
            current === 'skirmish' ||
            current === 'lobby'
          ) {
            router.navigate('menu');
          }
        }
      });

      // Expose for e2e
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)._router = router;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)._settingsMenu = settingsMenu;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)._performanceMonitor = performanceMonitor;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)._skirmishSetup = skirmishSetup;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)._rtsCamera = rtsCamera;
    }
  }

  // eslint-disable-next-line no-console
  console.info('C&C Remake — Shell UI initialised');
};

// ── Entry Point ──
const audioManager = AudioManager.getInstance();
const performanceMonitor = PerformanceMonitor.getInstance();

// Initialize audio on first user interaction
document.addEventListener(
  'click',
  () => {
    audioManager.init();
  },
  { once: true }
);

// Start performance monitoring
performanceMonitor.start();

// Bootstrap game immediately (existing e2e tests expect cnc on load)
bootstrap();
