# OpenRA 架构分析与 C&C Remake 借鉴指南

> **分析日期**：2026-05-10  
> **OpenRA 版本**：release-20231010（引擎 + mods/cnc + mods/ra + mods/ts + mods/d2k）  
> **分析目标**：提取 OpenRA 中可被 C&C Remake（Babylon.js + TypeScript）借鉴的架构设计、数据格式、算法与资源组织方式。

---

## 目录

1. [OpenRA 整体架构](#1-openra-整体架构)
2. [核心子系统分析](#2-核心子系统分析)
3. [对 C&C Remake 的直接借鉴](#3-对-cc-remake-的直接借鉴)
4. [静态资源清单](#4-静态资源清单)
5. [技术债务与风险提醒](#5-技术债务与风险提醒)

---

## 1. OpenRA 整体架构

OpenRA 采用严格的 **引擎 + Mod** 分层架构：

| 层 | 目录 | 职责 | 类比 C&C Remake |
|---|---|---|---|
| **引擎** | `OpenRA.Game/`, `OpenRA.Platforms.Default/` | 渲染器、音频、输入、网络、地图解析、Trait 系统、Widget UI、脚本运行时 | Babylon.js + 我们的 TS 核心框架 |
| **通用 Mod** | `OpenRA.Mods.Common/` | 所有官方 Mod 共享的 Trait、命令、寻路、AI、特效 | `src/game/` 中的通用游戏逻辑 |
| **专属 Mod** | `OpenRA.Mods.Cnc/`, `OpenRA.Mods.D2k/` | 特定 Mod 的 C# Trait（如 C&C 的泰伯利亚逻辑） | `src/game/tiberiandawn/` 等分支 |
| **数据 Mod** | `mods/cnc/`, `mods/ra/`, `mods/ts/`, `mods/d2k/` | 纯 YAML + 精灵 + 音效 + Lua 脚本，**零编译代码** | `public/` 下的 JSON 地图、材质、规则文件 |

**关键设计：引擎零游戏逻辑**。引擎只提供框架，所有单位、建筑、武器、UI 都通过 YAML 定义，Trait 通过反射加载。这让 Mod 制作无需改引擎代码。

---

## 2. 核心子系统分析

### 2.1 Actor + Trait 系统（最值得借鉴）

**位置**：`OpenRA.Game/Actor.cs`, `OpenRA.Game/GameRules/ActorInfo.cs`, `OpenRA.Game/TraitDictionary.cs`

OpenRA 的 `Actor` 是一个**空容器**，所有行为由附加的 `Trait` 提供：

```csharp
// Actor.cs — 空容器，只有 ID、Owner、Position
class Actor {
    uint ActorID;
    Player Owner;
    ActorInfo Info;
    // 行为全部由 Traits 提供
}

// ActorInfo.cs — 从 YAML 加载的蓝图
class ActorInfo {
    // YAML 中 "Mobile:" → 反射查找 "MobileInfo" 类
    // YAML 中 "Health:" → 反射查找 "HealthInfo" 类
    Dictionary<string, TraitInfo> traits;
}
```

**示例 YAML**（`mods/cnc/rules/vehicles.yaml`）：
```yaml
MCV:
    Inherits: ^Vehicle
    Valued:
        Cost: 3000
    Tooltip:
        Name: actor-mcv.name
    Mobile:
        Speed: 60
        Locomotor: heavywheeled
    Health:
        HP: 120000
    Armor:
        Type: Heavy
    Transforms:
        IntoActor: fact
```

**对我们的启示**：
- 当前 `Unit` / `Building` 类继承链深（`GameObject` → `Unit`），新增行为需改类。
- **借鉴方案**：引入轻量级 Trait/Component 系统。`Unit` 变为数据容器，`MobileTrait`、`HealthTrait`、`RenderTrait` 等独立挂载。
- `TraitDictionary` 用二分查找实现 O(log n) 查询，Web 端可用 `Map<string, Component>` 替代。

---

### 2.2 命令序列化与 Lockstep 网络同步

**位置**：`OpenRA.Game/Network/Order.cs`, `OpenRA.Game/Network/OrderManager.cs`, `OpenRA.Game/Network/UnitOrders.cs`

OpenRA 使用 **确定性 Lockstep**：
- 每帧所有客户端接收相同的 `Order[]` 输入。
- 本地模拟完全一致，只需同步命令，无需同步状态。
- 每 N 帧发送 SyncHash，校验世界一致性。

```csharp
// Order.cs — 序列化命令
class Order {
    string OrderString;   // "Move", "Attack", "Deploy"
    Actor Subject;        // 发出命令的单位
    Target Target;        // 目标（地面/单位）
    bool Queued;          // Shift 队列
    // ... 其他字段
}
```

**对我们的启示**：
- 当前无网络层。未来联网对战必须采用确定性模拟 + 命令同步。
- **借鉴方案**：定义 `GameOrder` 接口，每帧收集玩家输入，序列化为二进制，通过 WebSocket 广播。
- `OrderManager` 负责缓冲、排序、重连。

---

### 2.3 Widget UI 框架（声明式 UI）

**位置**：`OpenRA.Game/Widgets/Widget.cs`, `OpenRA.Game/Widgets/WidgetLoader.cs`, `mods/*/chrome/*.yaml`

OpenRA 的 UI 是纯声明式的：
- **布局**由 YAML 定义（位置、大小、锚点表达式如 `X: (WINDOW_WIDTH - WIDTH) / 2`）。
- **逻辑**由 `ChromeLogic` C# 类处理（事件订阅、数据更新）。
- 运行时 `WidgetLoader` 解析 YAML，通过反射创建 `ButtonWidget`、`LabelWidget` 等。

**示例**（`mods/cnc/chrome/mainmenu.yaml`）：
```yaml
Background@MAINMENU:
    Logic: MainMenuLogic
    Children:
        Button@SINGLEPLAYER_BUTTON:
            X: (WINDOW_WIDTH - WIDTH) / 2
            Y: 280
            Width: 200
            Height: 30
            Text: Singleplayer
        Button@MULTIPLAYER_BUTTON:
            X: (WINDOW_WIDTH - WIDTH) / 2
            Y: 320
            Width: 200
            Height: 30
            Text: Multiplayer
```

**对我们的启示**：
- 当前无 UI 框架。未来主菜单、战役选择、设置页面都需要。
- **借鉴方案**：所有交互 UI 统一使用 Babylon.GUI 实现（Shell 页面、HUD、侧边栏、主菜单、设置等）。
- Babylon.GUI 提供与 3D 场景一致的坐标系和渲染管线，避免 HTML 与 Canvas 的层叠和 DPI 适配问题。

---

### 2.4 战役脚本系统（Lua 沙箱）

**位置**：`OpenRA.Game/Scripting/ScriptContext.cs`, `mods/*/scripts/`, `mods/*/maps/*/*.lua`

OpenRA 使用 **Lua + Eluant** 运行时：
- 内存限制 50MB，指令限制 1,000,000/次调用。
- `ScriptGlobal` 类暴露引擎 API：`Media`, `Map`, `Player`, `Actor`, `Trigger`。
- `ScriptActorProperties` / `ScriptPlayerProperties` 暴露单位/玩家方法。

**示例 Lua 脚本**：
```lua
-- 触发器：当单位进入区域时
Trigger.OnEnteredFootprint({ CPos.New(10, 10), CPos.New(11, 10) }, function(a)
    if a.Owner == player then
        Media.PlaySoundNotification(player, "MissionAccomplished")
        player.MarkCompletedObjective(obj1)
    end
end)
```

**对我们的启示**：
- 战役必须有脚本系统驱动事件。
- **借鉴方案**：集成 `fengari`（Lua 5.3 的 WebAssembly 实现）或直接使用 JavaScript 作为脚本。
- 定义 `ScriptAPI` 暴露：创建单位、设置目标、播放语音、区域检测、计时器。

---

### 2.5 寻路系统（分层 A*）

**位置**：`OpenRA.Mods.Common/Pathfinder/PathSearch.cs`, `OpenRA.Mods.Common/Pathfinder/HierarchicalPathFinder.cs`

OpenRA 寻路亮点：
- **分层寻路（HPF）**：地图划分为 10×10 网格，构建抽象图。长路径先粗粒度规划，再细粒度 A*。
- **Locomotor 系统**：不同单位对不同地形有不同移动成本（如重型坦克在沙地慢）。
- **CellInfoLayerPool**：搜索层对象池，减少 GC。

**对我们的启示**：
- 当前 `Pathfinder.ts` 是基础 A*，64×64 地图足够，但扩展到 128×128+ 或大量单位时需要 HPF。
- **借鉴方案**：Phase 8 后引入 `HierarchicalPathfinder`，先粗后细。

---

### 2.6 资源加载与 Mod 系统

**位置**：`OpenRA.Game/ModData.cs`, `OpenRA.Game/Manifest.cs`, `mods/*/mod.yaml`

`mod.yaml` 是 Mod 的入口清单：
```yaml
Metadata:
    Title: Tiberian Dawn
    Version: release-20231010
Assemblies:
    - OpenRA.Mods.Common.dll
    - OpenRA.Mods.Cnc.dll
Rules:
    - mods/cnc/rules/defaults.yaml
    - mods/cnc/rules/vehicles.yaml
Sequences:
    - mods/cnc/sequences/vehicles.yaml
Weapons:
    - mods/cnc/weapons/smallguns.yaml
TileSets:
    - mods/cnc/tilesets/desert.yaml
MapFolders:
    - mods/cnc/maps
```

**对我们的启示**：
- 当前规则硬编码在 TS 中（`UnitDefinitions.ts`）。
- **借鉴方案**：规则外化为 JSON/YAML，支持 Mod 覆盖。引擎加载时合并规则树（基础规则 → Mod 规则 → 地图规则）。

---

### 2.7 音频系统

**位置**：`OpenRA.Game/Sound/Sound.cs`, `OpenRA.Game/Sound/ISoundLoader.cs`

- 抽象 `ISoundEngine` / `ISoundLoader`，支持多种格式（AUD, WAV, OGG）。
- 分类播放：`SoundType.World`（世界音效，3D 定位）、`SoundType.UI`（界面音效）。
- 音乐播放列表 + 淡入淡出。

**对我们的启示**：
- 当前无音频。Web Audio API 足够，但需要封装 `AudioManager`，支持分类、3D 定位、播放列表。

---

### 2.8 地图格式

**位置**：`OpenRA.Game/Map/Map.cs`, `OpenRA.Game/Map/MapCache.cs`

OpenRA 地图由多个文件组成：
- `map.yaml`：元数据、Actor 定义、玩家定义、规则覆盖。
- `map.bin`：二进制 tile 数据。
- `script.lua`：战役脚本。

**对我们的启示**：
- 当前 `dummy_map.json` 是简化版。
- **借鉴方案**：扩展地图格式为目录（`maps/mission01/map.json` + `maps/mission01/script.ts`），支持 Actor 预放置、规则覆盖、脚本。

---

## 3. 对 C&C Remake 的直接借鉴

### 3.1 短期可落地（Phase 5–8 内）

| OpenRA 设计 | C&C Remake 实施方案 | 优先级 |
|---|---|---|
| **Trait/Component 系统** | 重构 `Unit`/`Building` 为数据容器，`MobileComponent`、`HealthComponent`、`RenderComponent` 独立挂载 | 高 |
| **命令序列化** | 定义 `GameOrder` 接口，为网络对战和回放做准备 | 中 |
| **规则外化** | 将 `UnitDefinitions.ts` / `BuildingDefinitions.ts` 转为 JSON/YAML，引擎运行时加载合并 | 高 |
| **Widget UI 框架** | 所有交互 UI 统一使用 Babylon.GUI 实现 | 高 |
| **Locomotor 系统** | 不同单位对不同地形有不同速度和通行性（如轮式不能上沙地） | 中 |
| **音频管理器** | 封装 Web Audio API，支持分类、3D 定位、播放列表 | 中 |

### 3.2 中期规划（Phase 9–12）

| OpenRA 设计 | C&C Remake 实施方案 | 优先级 |
|---|---|---|
| **Lua 脚本运行时** | 集成 `fengari-web`，暴露 `ScriptAPI` 用于战役 | 高 |
| **分层寻路** | `HierarchicalPathFinder`，支持大地图和大量单位 | 中 |
| **Lockstep 网络** | WebSocket + 确定性模拟 + SyncHash | 高 |
| **回放系统** | 录制 `GameOrder[]` 到文件，支持回放播放 | 中 |
| **资源包加载** | 支持 MIX/MPR 格式解析，加载原始 C&C 资源 | 高 |
| **精灵序列系统** | SHP 解析 + 帧动画 + 32 方向朝向 | 高 |
| **调色板系统** | DOS/Win 调色板加载，remap 颜色（阵营色） | 高 |

### 3.3 长期规划（Phase 13+）

| OpenRA 设计 | C&C Remake 实施方案 | 优先级 |
|---|---|---|
| **地图编辑器** | 内置浏览器编辑器，支持 tile 绘制、Actor 放置、触发器编辑 | 低 |
| **AI Bot 模块** | 基于行为的 AI（建造队列、扩张、攻击策略） | 低 |
| **视频播放** | VQA 格式解码，战役过场动画 | 低 |
| **多平台打包** | Electron/Tauri 桌面应用封装 | 低 |

---

## 4. 静态资源清单

> 以下是从原始 C&C 游戏和 OpenRA 中提取/转换所需的静态资源。资源文件格式基于 OpenRA 的 `mods/cnc/` 和 `mods/ra/` 目录结构。

### 4.1 精灵图（Sprites）

| 资源类别 | 文件格式 | 来源 | 用途 |
|---|---|---|---|
| 单位动画 | `*.shp` (Westwood) | `CONQUER.MIX` | 坦克、步兵、飞机的 32/64 方向行走/攻击动画 |
| 建筑动画 | `*.shp` | `CONQUER.MIX` | 建筑建造、工作、受损、死亡动画 |
| 地形贴图 | `*.tem` / `*.sno` / `*.des` | `GENERAL.MIX` | 草地、沙地、水域、道路、悬崖 tile |
| 特效 | `*.shp` | `CONQUER.MIX` | 爆炸、枪口火焰、烟雾、建造动画 |
| UI Chrome | `*.shp` | `CONQUER.MIX` | 按钮、面板、边框、侧边栏 |
| 图标 | `*.shp` / `*.tem` | `CONQUER.MIX` | 单位/建筑图标（sidebar 和雷达） |
| 光标 | `*.shp` | `CONQUER.MIX` | 各种鼠标光标（默认、选择、移动、攻击、建造） |

**OpenRA 处理方式**：
- `mods/cnc/sequences/*.yaml` 定义 SHP 文件的帧序列、方向数、播放速度。
- `SequenceProvider` 运行时按 actor 名称查询当前帧。

**我们的处理方式**：
- 将 SHP 转换为 sprite sheet（PNG + JSON metadata），Web 端用 `BABYLON.Sprite` 或 `DynamicTexture` 渲染。
- 或使用 `shp.js`（社区实现的 SHP 解码器）在运行时解析。

### 4.2 音频

| 资源类别 | 文件格式 | 来源 | 用途 |
|---|---|---|---|
| 单位语音 | `*.aud` (Westwood) | `SPEECH.MIX` | 选中、移动、攻击、死亡语音 |
| 通知 | `*.aud` / `*.v00` | `SPEECH.MIX` | "Building", "Silos needed", "Mission accomplished" |
| 武器音效 | `*.aud` / `*.wav` | `SOUNDS.MIX` | 枪声、炮声、爆炸声 |
| 背景音乐 | `*.aud` / `*.ogg` | `SCORES.MIX` | 战役/遭遇战背景音乐 |
| 环境音效 | `*.aud` | `SOUNDS.MIX` | 建筑工作声、水流声 |

**OpenRA 处理方式**：
- `ISoundLoader` 插件系统支持 AUD、WAV、OGG。
- `Sound` 类按分类（World/UI）管理播放。

**我们的处理方式**：
- 将 AUD 转换为 OGG/MP3，Web Audio API 播放。
- `AudioManager` 按 `SoundCategory`（UnitVoice, Notification, Weapon, Music, Ambient）管理。

### 4.3 视频

| 资源类别 | 文件格式 | 来源 | 用途 |
|---|---|---|---|
| 战役过场 | `*.vqa` (Westwood) | `MOVIES.MIX` | 战役开始/结束/中间过场动画 |

**OpenRA 处理方式**：
- `VqaLoader` 解析 VQA 格式，逐帧解码为纹理。

**我们的处理方式**：
- 将 VQA 转换为 WebM/MP4，HTML5 `<video>` 播放（更简单）。
- 或集成 `libvqa.js` 在 Canvas 上解码（更原汁原味）。

### 4.4 地图

| 资源类别 | 文件格式 | 来源 | 用途 |
|---|---|---|---|
| 原始地图 | `*.mpr` / `*.ini` | `SC-000.mix` | 原始 C&C 和 Red Alert 地图 |
| OpenRA 地图 | `map.yaml` + `map.bin` | `mods/cnc/maps/` | OpenRA 转换后的地图（含 Actor 预放置） |

**我们的处理方式**：
- 支持导入 `.mpr`（解析二进制 tile 数据 + INI 元数据）。
- 内部格式扩展为 JSON + 脚本。

### 4.5 数据文件

| 资源类别 | 文件格式 | 来源 | 用途 |
|---|---|---|---|
| 调色板 | `*.pal` | `TEMPERAT.PAL` | DOS 256 色调色板，用于 SHP 着色 |
| 规则文件 | `*.yaml` | `mods/cnc/rules/` | Actor、武器、科技树定义 |
| 字体 | `*.fnt` / `*.bin` | `GENERAL.MIX` | 游戏内点阵字体 |

### 4.6 本地化

| 资源类别 | 文件格式 | 来源 | 用途 |
|---|---|---|---|
| 翻译字符串 | `*.ftl` (Fluent) | `mods/cnc/fluent/` | 多语言文本（OpenRA 使用 Mozilla Fluent） |

**我们的处理方式**：
- 使用 `i18next` + JSON 翻译文件，或直接使用 TypeScript 常量（初期）。

---

## 5. 技术债务与风险提醒

### 5.1 应避免直接移植的 OpenRA 设计

| 设计 | 原因 | 替代方案 |
|---|---|---|
| C# 反射加载 Trait | Web 端无反射性能优势，且 Tree-shaking 困难 | TS 显式注册表 `ComponentRegistry.register('Mobile', MobileComponent)` |
| 运行时 YAML 解析 | 浏览器解析 YAML 慢，且增加包体积 | 构建时将 YAML → JSON，运行时加载 JSON |
| 固定时间步 + Lockstep（单人模式） | 单人模式不需要网络同步，固定步长限制帧率 | 单人模式用可变 `deltaTime`，仅多人模式用 Lockstep |
| 软件渲染管线 | OpenRA 使用 CPU 端 sprite batching | Babylon.js GPU 渲染已足够高效 |

### 5.2 关键风险

1. **SHP 解析性能**：在浏览器中实时解析 SHP 可能卡顿。建议构建时预处理为 PNG sprite sheet。
2. **音频格式兼容**：Web Audio API 不原生支持 AUD。必须预转换。
3. **网络延迟**：Lockstep 要求所有玩家同帧，高延迟玩家会拖慢所有人。需考虑输入预测或帧快进。
4. **资源版权**：原始 C&C 资源受 EA 版权保护。OpenRA 要求用户自行提供原始游戏文件。我们的项目也需明确此限制。

---

## 附录：OpenRA 关键源码索引

| 主题 | 文件路径 |
|---|---|
| 游戏入口 | `OpenRA.Game/Game.cs` |
| 世界模拟 | `OpenRA.Game/World.cs` |
| Actor 容器 | `OpenRA.Game/Actor.cs` |
| Trait 查询 | `OpenRA.Game/TraitDictionary.cs` |
| Actor 蓝图 | `OpenRA.Game/GameRules/ActorInfo.cs` |
| 命令定义 | `OpenRA.Game/Network/Order.cs` |
| 网络管理 | `OpenRA.Game/Network/OrderManager.cs` |
| Lua 脚本 | `OpenRA.Game/Scripting/ScriptContext.cs` |
| 地图加载 | `OpenRA.Game/Map/Map.cs` |
| 渲染管线 | `OpenRA.Game/Graphics/WorldRenderer.cs` |
| UI 框架 | `OpenRA.Game/Widgets/Widget.cs` |
| 寻路 | `OpenRA.Mods.Common/Pathfinder/PathSearch.cs` |
| 分层寻路 | `OpenRA.Mods.Common/Pathfinder/HierarchicalPathFinder.cs` |
| Mod 清单 | `OpenRA.Game/Manifest.cs` |
| C&C Mod 规则 | `mods/cnc/rules/*.yaml` |
| C&C Mod 序列 | `mods/cnc/sequences/*.yaml` |
| C&C 战役脚本 | `mods/cnc/maps/*/*.lua` |
