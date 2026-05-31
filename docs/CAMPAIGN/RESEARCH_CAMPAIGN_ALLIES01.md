# 战役模式调研：Allies-01「In the Thick of It」

> **调研日期**：2026-05-31
> **目标**：让战役模式可点开并跑通 RA1 盟军第一关
> **数据来源**：`OpenRA/mods/ra/maps/allies-01/`（原封不动照搬）

---

## 1. Allies-01 关卡数据概览

OpenRA 的战役地图是一个文件夹，包含以下文件：

| 文件 | 说明 | 本项目需求 |
|------|------|-----------|
| `map.yaml` | 地图元数据、玩家定义、Actor 初始放置、规则引用 | ✅ 已有 OpenRAMapLoader 可解析 |
| `map.bin` | 二进制地形数据（tile/height/resource） | ✅ 已有 parseMapBin |
| `map.png` | 缩略图 | ⏭️ 可选 |
| `rules.yaml` | 关卡专属规则覆盖 | ❌ 未解析 |
| `weapons.yaml` | 关卡专属武器覆盖 | ❌ 未解析 |
| `map.ftl` | Fluent 本地化消息 | ❌ 未解析 |
| `allies01.lua` | 战役主脚本 | ❌ 未接入 |
| `campaign.lua` | 通用战役脚本（InitObjectives 等） | ❌ 未接入 |

### 1.1 map.yaml 关键内容（Allies-01）

```yaml
Title: 01:   In the Thick of It
Tileset: SNOW
MapSize: 128,128
Bounds: 49,45,30,36
Visibility: MissionSelector
Categories: Campaign

Players:
  PlayerReference@USSR:      Name: USSR,  Bot: campaign, Faction: soviet, Enemies: Greece, England
  PlayerReference@Greece:    Name: Greece, Playable: True, Faction: allies, Allies: England
  PlayerReference@England:   Name: England, Bot: campaign, Faction: allies, Allies: Greece
  PlayerReference@Neutral:   OwnsWorld: True, NonCombatant: True

Actors:
  # 命名 Actor（脚本可直接引用）
  Lab: stek          Owner: USSR   Location: 61,60
  OilPump: v19       Owner: USSR   Location: 59,57
  LabGuard1: e1      Owner: USSR   Location: 64,61   Facing: ...   SubCell: 4
  Patrol1: dog       Owner: USSR   Location: 63,59   SubCell: 2
  Civilian1: c8      Owner: England Location: 74,50  SubCell: 0
  Civilian2: c7      Owner: England Location: 76,48  SubCell: 3

  # Waypoint（脚本用坐标标记）
  InsertionEntry: waypoint   Location: 63,45
  InsertionLZ: waypoint      Location: 63,47
  EinsteinSpawnPoint: waypoint Location: 62,60
  ExtractionLZ: waypoint     Location: 53,49
  CruiserPoint1-4: waypoint  Location: ...

Rules: ra|rules/campaign-rules.yaml, ra|rules/campaign-tooltips.yaml, rules.yaml
Weapons: weapons.yaml
FluentMessages: ra|fluent/lua.ftl, ra|fluent/campaign.ftl, map.ftl
```

### 1.2 allies01.lua 流程拆解

```lua
-- 全局变量
InsertionHelicopterType = "tran.insertion"
ExtractionHelicopterType = "tran.extraction"
JeepReinforcements = { "jeep", "jeep" }
TanyaReinforcements = { "e7.noautotarget" }
EinsteinType = "einstein"

-- 1. 开场：直升机运送 Tanya
SendInsertionHelicopter()
  → Reinforcements.ReinforceWithTransport(Greece, "tran.insertion", {"e7.noautotarget"}, path)
  → 4秒后播放 Tanya 语音

-- 2. 初始巡逻队自动 Hunt
RunInitialActivities()
  → OpeningAttack = {Patrol1, Patrol2, Patrol3, Patrol4} 全部 IdleHunt

-- 3. 触发器链
Trigger.OnKilled(Patrol3)        → Civilian1 移动到 CivMove
Trigger.OnKilled(BarrelPower)    → Civilian2 移动 + Responders Hunt
Trigger.OnAllKilled(LabGuardsTeam) → 创建 Einstein + 信号弹 + 撤离直升机
Trigger.OnKilled(Lab)            → 任务失败（LabDestroyed）
Trigger.OnAnyKilled(civilianTeam) → 次要目标失败（CiviliansKilled）

-- 4. 援军
Trigger.AfterDelay(5秒)          → 创建 camera（侦察相机）
OilPumpDestroyed()               → 5秒后 SendJeeps（吉普援军）
LabGuardsKilled()                → 10秒后 SendCruisers（巡洋舰援军）

-- 5. 撤离流程
SendExtractionHelicopter()
  → 直升机到达 ExtractionLZ
Trigger.OnRemovedFromWorld(Einstein) → EvacuateHelicopter（Einstein 登机）
Trigger.OnRemovedFromWorld(Heli)    → HelicopterGone（任务完成）

-- 6. 每帧 Tick
Tick() → USSR.Resources = USSR.Resources - (0.01 * USSR.ResourceCapacity / 25)

-- 7. 目标系统
AddPrimaryObjective(Greece, "find-einstein")
AddPrimaryObjective(Greece, "tanya-survive")
AddPrimaryObjective(Greece, "einstein-survive")
AddSecondaryObjective(Greece, "protect-civilians")
```

### 1.3 关卡目标（玩家视角）

1. **主要目标**：找到爱因斯坦（消灭实验室守卫后生成）
2. **主要目标**：Tanya 存活
3. **主要目标**：爱因斯坦存活并撤离
4. **次要目标**：保护平民（不被误伤）

胜利条件：Einstein 登上撤离直升机并离开地图。
失败条件：Tanya 死亡 / Einstein 死亡 / 实验室被毁（Einstein 未救出前）。

---

## 2. 当前 Remake 项目状态

### 2.1 已有能力 ✅

| 组件 | 状态 | 说明 |
|------|------|------|
| OpenRAMapLoader | ✅ | 加载 map.yaml + map.bin，解析地形、玩家、Actor 放置 |
| MiniYaml 解析器 | ✅ | parseMiniYaml + mapYamlFromNodes |
| BriefingScreen | ✅ | 打字机效果 + 目标列表 + Skip 按钮 |
| CampaignProgress | ✅ | localStorage 存储完成状态、最佳时间、难度 |
| TriggerSystem | ⚠️ 部分 | AfterDelay、OnKilled、OnDestroyed、EnteredFootprint、OnCash |
| ScriptRuntime | ⚠️ | JS 运行时（new Function），非 Lua |
| LuaRuntime | ⚠️ | fengari-web 已集成，**未接入主流程** |
| ScriptGlobals | ⚠️ | MapGlobal、PlayerGlobal、ActorGlobal、MediaGlobal、UIGlobal |
| CampaignMenu | ⚠️ | 硬编码 GDI/Nod（泰伯利亚黎明），**点击无响应** |

### 2.2 缺失能力 ❌

#### A. Lua 脚本执行链

当前 `ScriptRuntime` 是 **JS 运行时**（`new Function`），但 OpenRA 的战役脚本是 **Lua**。

已有 `LuaRuntime`（fengari-web），但：
- 未接入主游戏流程
- 未将 ScriptGlobals 注册为 Lua 全局变量
- `pushJsValue` 中的 function 推送不完整（无参数传递）

**决策**：使用 `LuaRuntime`（fengari-web）执行 Lua 脚本，需要完善 JS→Lua 的 function 绑定。

#### B. MapLoader 增强

当前 `parseActors` 仅解析 `Location` 和 `Owner`：

```typescript
// 当前缺失的字段
interface ActorPlacement {
  facing?: number;      // 朝向（0-1023，OpenRA  facing 单位）
  subCell?: number;     // 步兵子格子（0-4）
}
```

Waypoint 类型 Actor（`type: waypoint`）需要特殊处理——不创建游戏对象，只注册为命名坐标。

#### C. 触发器扩展

| 触发器 | allies01.lua 使用 | 当前状态 |
|--------|------------------|---------|
| `Trigger.AfterDelay` | ✅ 大量使用 | ✅ 已有（毫秒）⚠️ OpenRA 用逻辑帧 |
| `Trigger.OnKilled` | ✅ 大量使用 | ✅ 已有 |
| `Trigger.OnAllKilled` | ✅ LabGuardsTeam | ❌ 缺失 |
| `Trigger.OnAnyKilled` | ✅ civilianTeam | ❌ 缺失 |
| `Trigger.OnIdle` | ✅ SovietArmy Hunt | ❌ 缺失 |
| `Trigger.OnRemovedFromWorld` | ✅ Einstein 登机 | ❌ 缺失 |
| `Trigger.OnDamaged` | ✅ 通用（campaign.lua） | ❌ 缺失 |
| `Trigger.OnPlayerLost` | ✅ InitObjectives | ❌ 缺失 |
| `Trigger.OnPlayerWon` | ✅ InitObjectives | ❌ 缺失 |
| `Trigger.OnObjectiveCompleted` | ✅ InitObjectives | ❌ 缺失 |
| `Trigger.OnObjectiveFailed` | ✅ InitObjectives | ❌ 缺失 |

#### D. 全局 API 扩展

**ActorGlobal** 当前只有 `create/destroy/find/getActorsOf`。需要扩展：
- `Actor.Create(type, addToWorld, init)` — 支持 `addToWorld=false`
- `Actor.Move(loc)` — 队列移动指令
- `Actor.Scatter()` — 分散
- `Actor.Hunt()` — 自动攻击敌人
- `Actor.Attack(target)` — 攻击目标
- `Actor.Destroy()` — 自毁
- `Actor.Stance` — 姿态（Defend/AttackAnything/ReturnFire/HoldFire）
- `Actor.IsDead` / `Actor.IsInWorld` / `Actor.Type`
- `Actor.HasProperty(name)` / `Actor.CanTarget(target)`
- `Actor.GetHealth()` / `Actor.GetDamageState()`

**PlayerGlobal** 需要扩展：
- `Player.GetPlayer(name)` — 按名称获取（Greece→GDI, USSR→Nod）
- `Player.GetActors()` — 获取玩家所有 Actor
- `Player.GetGroundAttackers()` — 获取地面攻击单位
- `Player.Resources` / `Player.ResourceCapacity`
- `Player.MarkCompletedObjective(id)` / `Player.MarkFailedObjective(id)`
- `Player.IsObjectiveFailed(id)`

**MapGlobal** 需要扩展：
- `Map.NamedActor(name)` — 按名称获取 Actor 引用
- `Map.NamedActors` — 所有命名 Actor 字典
- `Map.LobbyOptionOrDefault(key, default)` — 获取难度等选项

**新增 UtilsGlobal**：
- `Utils.Do(table, func)` — 遍历
- `Utils.Random(table)` — 随机选择
- `Utils.Where(table, predicate)` — 过滤
- `Utils.Any(table, predicate)` — 存在检查

**新增 ReinforcementsGlobal**：
- `Reinforcements.Reinforce(player, types, path, interval)` — 地面援军
- `Reinforcements.ReinforceWithTransport(player, transportType, passengerTypes, path)` — 运输机

**新增 MediaGlobal**：
- `Media.DisplayMessage(text, prefix?)` — HUD 消息
- `Media.PlaySpeechNotification(player, sound)` — 语音通知
- `Media.PlaySoundNotification(player, sound)` — 音效通知

#### E. 目标系统（Objectives）

需要全新实现：
- `AddPrimaryObjective(player, description)` → 返回 objective id
- `AddSecondaryObjective(player, description)` → 返回 objective id
- `MarkCompletedObjective(id)` / `MarkFailedObjective(id)`
- `IsObjectiveFailed(id)`
- HUD 显示当前目标列表（与 BriefingScreen 共享数据）

#### F. 规则覆盖加载

`rules.yaml` 和 `weapons.yaml` 需要解析并合并到现有规则系统。
Allies-01 的覆盖内容：
- `TRAN.Extraction` / `TRAN.Insertion` — 自定义运输直升机
- `EINSTEIN` — 乘客类型定义
- `C8` — 继承 `^ArmedCivilian`
- `JEEP` — 可载 Einstein
- `TSLA` — 电力消耗改为 -150

#### G. 战役菜单与流程

当前 CampaignMenu：
- 显示 GDI/Nod（泰伯利亚黎明）
- 点击任务只 `console.info`，**不触发任何加载**

需要：
1. 改为 Red Alert 的 Allies/Soviet 战役
2. 点击任务 → BriefingScreen.show() → SKIP → 加载 OpenRA 地图 → 执行 Lua → 进入游戏

---

## 3. 前置任务清单

按依赖关系排序，**标红为 Allies-01 必需**：

### Phase A：基础设施（阻塞所有后续任务）

| 任务 | 说明 | 工作量 | Allies-01 必需 |
|------|------|--------|---------------|
| **CAM-1** | MapLoader 增强：解析 Facing、SubCell、Waypoint | 0.5d | 🔴 是 |
| **CAM-2** | LuaRuntime 接入主流程：fengari-web + 全局 API 注册 | 1d | 🔴 是 |
| **CAM-3** | ActorGlobal 扩展：Move/Scatter/Hunt/Attack/Destroy/IsDead/Stance | 1d | 🔴 是 |
| **CAM-4** | PlayerGlobal 扩展：GetPlayer/GetActors/GetGroundAttackers/Resources/Objectives | 0.5d | 🔴 是 |
| **CAM-5** | UtilsGlobal：Do/Random/Where/Any | 0.25d | 🔴 是 |
| **CAM-6** | MapGlobal 扩展：NamedActor/NamedActors/LobbyOptionOrDefault | 0.25d | 🔴 是 |

### Phase B：触发器扩展

| 任务 | 说明 | 工作量 | Allies-01 必需 |
|------|------|--------|---------------|
| **CAM-7** | Trigger.OnAllKilled / Trigger.OnAnyKilled | 0.5d | 🔴 是 |
| **CAM-8** | Trigger.OnIdle | 0.25d | 🔴 是 |
| **CAM-9** | Trigger.OnRemovedFromWorld | 0.25d | 🔴 是 |
| **CAM-10** | Trigger.OnDamaged | 0.25d | 🟡 中（campaign.lua 用） |
| **CAM-11** | Trigger.OnPlayerLost / Trigger.OnPlayerWon / Trigger.OnObjectiveCompleted / Trigger.OnObjectiveFailed | 0.5d | 🔴 是 |

### Phase C：游戏机制

| 任务 | 说明 | 工作量 | Allies-01 必需 |
|------|------|--------|---------------|
| **CAM-12** | Objectives 目标系统 + HUD 显示 | 1d | 🔴 是 |
| **CAM-13** | Reinforcements 援军系统（地面+运输机） | 1d | 🔴 是 |
| **CAM-14** | MediaGlobal 完善：DisplayMessage/PlaySpeech/PlaySound | 0.5d | 🔴 是 |
| **CAM-15** | 规则覆盖加载：rules.yaml + weapons.yaml 合并 | 0.5d | 🟡 中（可先 hardcode） |

### Phase D：战役流程

| 任务 | 说明 | 工作量 | Allies-01 必需 |
|------|------|--------|---------------|
| **CAM-16** | 战役菜单改为 RA Allies/Soviet，连接加载流程 | 0.5d | 🔴 是 |
| **CAM-17** | BriefingScreen → 加载地图 → Lua WorldLoaded → 游戏流程 | 0.5d | 🔴 是 |
| **CAM-18** | Allies-01 数据搬运：复制 OpenRA 地图文件到 public/maps/allies-01 | 0.25d | 🔴 是 |
| **CAM-19** | Allies-01 端到端测试与 Bug 修复 | 1d | 🔴 是 |

**总计预估工作量**：约 **10 天**（按 Allies-01 必需项计算）。

---

## 4. 关键设计决策

### 4.1 Lua vs JS 运行时

OpenRA 使用 Lua（Eluant），本项目已有：
- `ScriptRuntime`（JS，Task 55）
- `LuaRuntime`（fengari-web，Task-SCR1）

**决策**：使用 `LuaRuntime` 执行战役脚本。
- 理由：原封不动照搬 OpenRA 的 `.lua` 文件，不做任何翻译
- 需要完善 `pushJsValue` 的 function 绑定（支持参数传递和返回值）
- `ScriptRuntime` 保留用于未来可能的 JS mod 脚本

### 4.2 逻辑帧 vs 真实时间

OpenRA 的 `Trigger.AfterDelay(delay, func)` 使用**逻辑帧**（25 FPS，一帧 = 40ms）。
当前 `TriggerSystem.afterDelay(ms)` 使用**真实毫秒**。

**决策**：战役模式下 `AfterDelay` 使用逻辑帧计数。
- 在 `GameLoop.stepLogic()` 中维护 `logicFrame` 计数器
- `Trigger.AfterDelay(100)` = 100 逻辑帧 = 4 秒（25 FPS）
- 与 OpenRA 行为一致

### 4.3 玩家名称映射

OpenRA 使用 `"Greece"` / `"USSR"` / `"England"` 等，本项目使用 `HouseType.GDI` / `HouseType.Nod`。

**决策**：建立名称到 HouseType 的映射表：
```typescript
const PLAYER_NAME_MAP: Record<string, HouseType> = {
  'Greece': HouseType.GDI,    // Allies 玩家
  'England': HouseType.GDI,   // Allies 友军
  'USSR': HouseType.Nod,      // Soviet 敌人
  'Neutral': HouseType.Neutral,
};
```

### 4.4 Actor 命名引用

map.yaml 中的命名 Actor（如 `Lab`, `Patrol1`, `InsertionLZ`）需要：
1. 加载时创建并注册到 `Map.NamedActors` 字典
2. Lua 脚本中通过名称直接引用（`Trigger.OnKilled(Lab, ...)`）
3. Waypoint 类型只注册坐标，不创建游戏对象

---

## 5. 最小可运行版本（MVP）

如果希望快速验证，可以按以下顺序实现 MVP（约 3-4 天）：

1. **CAM-2** LuaRuntime 接入（执行 allies01.lua 的 `WorldLoaded`）
2. **CAM-1** MapLoader 解析 Waypoint + Facing + SubCell
3. **CAM-3** ActorGlobal.create（支持命名注册）
4. **CAM-7** Trigger.OnKilled + Trigger.AfterDelay
5. **CAM-12** Objectives 基础版（只记录完成/失败，无 HUD）
6. **CAM-16** 战役菜单连接 + **CAM-18** 数据搬运

MVP 跑通标准：
- 能点开 Allies-01 → 显示简报 → 进入游戏
- 地图上正确放置所有 Actor（包括朝向和子格子）
- `WorldLoaded` 执行成功，设置目标
- 杀死 LabGuard 后触发后续事件

---

## 6. 参考文件

| 文件 | 说明 |
|------|------|
| `OpenRA/mods/ra/maps/allies-01/` | 源数据文件夹 |
| `OpenRA/mods/ra/maps/allies-01/allies01.lua` | 战役主脚本 |
| `OpenRA/mods/ra/maps/allies-01/map.yaml` | 地图数据 |
| `OpenRA/mods/ra/maps/allies-01/rules.yaml` | 规则覆盖 |
| `OpenRA/mods/ra/scripts/campaign.lua` | 通用战役脚本 |
| `OpenRA/OpenRA.Mods.Common/Scripting/Global/TriggerGlobal.cs` | OpenRA 触发器实现 |
| `OpenRA/OpenRA.Mods.Common/Scripting/Global/ReinforcementsGlobal.cs` | 援军系统 |
| `OpenRA/OpenRA.Mods.Common/Traits/Player/MissionObjectives.cs` | 目标系统 |
| `remake/src/game/scripting/TriggerSystem.ts` | 当前触发器 |
| `remake/src/game/script/LuaRuntime.ts` | fengari-web 封装 |
| `remake/src/game/terrain/OpenRAMapLoader.ts` | 地图加载器 |
