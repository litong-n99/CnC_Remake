# 深度 0 任务 vs OpenRA 对比分析与重规划

> **分析日期**：2026-05-25  
> **分析范围**：`docs/tasks.md` 中拓扑深度为 0 的全部任务。  
> **OpenRA 版本**：release-20231010  
> **目标**：识别 C&C Remake 与 OpenRA 在深度 0 任务范围内的能力差距，填补缺失设计，输出可执行的更新规划。

---

## 1. 执行摘要

### 1.1 深度 0 任务现状

| 维度 | 数量 | 说明 |
|------|------|------|
| 深度 0 总任务 | 120 | 无显式前置依赖，可并行启动 |
| 已完成 | 44 | Phase 0–5.5 核心基建与基础系统 |
| 待完成 | 76 | 分布在 10 个类别中 |
| 其中 P0 | 2 | Task 95（YAML 规则）、Task 121（优先队列） |
| 其中 P1/P2/P3 | 6 | 127、128、131、132 及若干未标注任务 |

### 1.2 与 OpenRA 的核心差距（Top 5）

| 排名 | 差距领域 | OpenRA 能力 | 我方现状 | 风险等级 |
|------|---------|------------|---------|---------|
| 1 | **Trait/ECS 架构** | Actor 为纯容器，所有行为由 Trait 组合 | `Unit`/`Building` 仍为继承链深的大类 | 🔴 高 |
| 2 | **规则外化** | YAML 定义全部 Actor/武器/科技树 | 硬编码在 TS 常量中 | 🔴 高 |
| 3 | **命令系统** | `Order` 统一序列化，支持网络同步与回放 | 无统一命令抽象，直接方法调用 | 🟡 中 |
| 4 | **脚本运行时** | Lua 沙箱 + `ScriptGlobal` API | 无脚本系统 | 🟡 中 |
| 5 | **音频管理器** | `ISoundEngine` + 分类播放 + 3D 定位 | 无音频系统 | 🟢 低 |

### 1.3 重规划结论

- **新增 4 个深度 0 任务**：填补 OpenRA 有但当前规划中缺失的基础设计
- **调整 8 个任务的优先级**：基于 OpenRA 经验，将部分任务从默认低优提升为 P1/P2
- **为 15 个任务补充 OpenRA 对标模块**：在 `docs/tasks.md` 中增加 `- **OpenRA 对标**` 行
- **无任务删除或合并**：所有现有任务保持独立编号

---

## 2. 逐类别对比分析

> 以下按功能类别对 76 个待完成深度 0 任务逐一与 OpenRA 对比。每个任务标注：
> - **OpenRA 对标**：对应 OpenRA 的类/模块/文件
> - **异同分析**：OpenRA 怎么做的，我方计划怎么做，差距在哪
> - **建议**：是否需要调整优先级、拆分任务、补充依赖

---

### 2.1 核心战斗与游戏逻辑（11 个任务）

#### Task 25: 选择系统（单选、框选、编队）
- **OpenRA 对标**：`OpenRA.Game/Selection.cs`, `OpenRA.Mods.Common/Traits/World/Selection.cs`
- **异同**：
  - OpenRA 的选择系统是世界级 Trait（`World` Actor 挂载），支持多选、类型过滤、声音反馈。
  - 我方计划基于 Babylon.js 的鼠标事件实现框选射线检测，逻辑更简单但功能等价。
- **建议**：无需调整。当前 `SelectionManager.ts` 骨架已在 Task 24 中预留。

#### Task 26: 命令分发器（Move / Attack / Guard / Stop）
- **OpenRA 对标**：`OpenRA.Game/Network/Order.cs`, `OpenRA.Mods.Common/Orders/`
- **异同**：
  - OpenRA 所有玩家输入都封装为 `Order` 对象，序列化后通过网络广播或本地执行。
  - 我方当前计划是直接调用 `unit.moveTo()` 等方法，无统一命令抽象。
- **建议**：⚠️ **重要**。应在 Task 26 中引入 `GameOrder` 接口，即使单人模式也走命令队列。这为 Task 62（Order 序列化）和 Task 68（回放）打下基础。否则后期重构成本高。

#### Task 27: HUD / UI 覆盖层（资源、小地图、单位信息）
- **OpenRA 对标**：`OpenRA.Game/Widgets/`（Widget UI 框架）
- **异同**：
  - OpenRA 使用声明式 YAML UI 定义 + C# `ChromeLogic` 事件处理。
  - 我方计划用 Babylon.GUI 实现 HUD，主菜单等 Shell UI 用 HTML/CSS。
- **建议**：HUD 用 Babylon.GUI 合理，但主菜单/设置等 Shell 页面用 HTML/CSS 与 Babylon.GUI 的混合可能导致 DPI 和层叠问题。建议统一评估：若 Shell UI 也改用 Babylon.GUI，则与 OpenRA 的 Widget 系统思路一致（单一渲染管线）。**暂不调整任务**，但在 Task 27 中增加技术选型备注。

#### Task 28: 武器与弹道系统（翻译 WEAPON.CPP / BULLET.CPP）
- **OpenRA 对标**：`mods/cnc/weapons/*.yaml`, `OpenRA.Mods.Common/Traits/Armament.cs`, `OpenRA.Mods.Common/Projectiles/`
- **异同**：
  - OpenRA 武器完全外化为 YAML：`WeaponInfo`（武器定义）+ `Projectile`（弹道类型）+ `Warhead`（伤害逻辑）。
  - 我方计划翻译 C++ 的 `WEAPON.CPP` / `BULLET.CPP` 为 TS 类，硬编码逻辑。
- **建议**：⚠️ **重要**。Task 28 的硬编码实现与 Task 95（YAML 规则解析）和 Task 98（Weapon 规则系统，深度 1）存在路线冲突。建议：
  - Task 28 先实现**最小可行**的武器弹道（满足 C++ 数值和基础行为）
  - Task 95 完成后，Task 98 将武器定义迁移到 YAML/JSON
  - 在 Task 28 中增加 `- **OpenRA 对标**：` 和 `- **后续迁移**：` 备注

#### Task 29: 伤害计算与装甲系统
- **OpenRA 对标**：`OpenRA.Mods.Common/Warheads/`, `OpenRA.Mods.Common/Traits/Armor.cs`
- **异同**：
  - OpenRA 伤害计算由 `Warhead` 的 `DamageVersus` 方法处理，支持 `DamageTypes` 标签（如 `Prone50Percent`）。
  - 我方计划翻译 C++ 的 `Take_Damage()`，但 C++ 版本无 `DamageTypes` 概念。
- **建议**：⚠️ **与 Task 133 关联**。Task 133（DamageTypes，深度 1）依赖 Task 29。但 OpenRA 的 DamageTypes 是伤害系统的核心设计，建议在 Task 29 中预留扩展点（如 `DamageModifiers` 接口），避免 Task 133 时大规模重构。

#### Task 30: 采矿与经济系统
- **OpenRA 对标**：`OpenRA.Mods.Common/Traits/Harvester.cs`, `OpenRA.Mods.Common/Traits/Refinery.cs`, `OpenRA.Mods.Common/Traits/Player/PlayerResources.cs`
- **异同**：
  - OpenRA 经济系统由多个 Trait 组合：`Harvester`（采矿行为）+ `Refinery`（卸矿）+ `PlayerResources`（玩家资金）。
  - 我方计划翻译 C++ 的矿石逻辑，但 C++ 中经济逻辑分散在 `UNIT.CPP`（Harvester 状态机）和 `BUILDING.CPP`（Refinery 动画）中。
- **建议**：Task 30.5（经济双轨化，深度 1）已规划 Cash + Resources 分离。当前 Task 30 只需实现 C++ 等价的单轨经济即可。无需调整。

#### Task 31: 战争迷雾（Fog of War）
- **OpenRA 对标**：`OpenRA.Game/Traits/World/Shroud.cs`, `OpenRA.Game/Traits/CreatesShroud.cs`, `OpenRA.Game/Traits/RevealsShroud.cs`
- **异同**：
  - OpenRA 迷雾由两个 Trait 驱动：`RevealsShroud`（单位视野）和 `CreatesShroud`（生成迷雾）。`Shroud` 是世界级 Trait 管理格子可见性。
  - 我方计划实现基于 CellLayer 的能见度数组，渲染层用 Shader 遮罩。
- **建议**：无重大差距。但注意 OpenRA 的迷雾支持`已探索但当前不可见`（灰色）和`从未探索`（黑色）两种状态。确保 Task 31 的设计文档包含这两种状态。

#### Task 32: 游戏主循环与 Tick 系统
- **OpenRA 对标**：`OpenRA.Game/Game.cs` 中的 `LogicTick()` 和 `RenderTick()`
- **异同**：
  - OpenRA 使用固定时间步（`Timestep = 40ms`，即 25 FPS 逻辑帧），渲染帧独立插值。
  - 我方计划 60 FPS 固定步长（Babylon.js 的 `runRenderLoop`）。
- **建议**：⚠️ **关键决策**。OpenRA 的 25 FPS 逻辑帧是 Lockstep 网络同步的基础（所有客户端每 40ms 推进一帧）。若未来要支持 Task 65（Lockstep），则单人模式也应采用固定逻辑帧 + 可变渲染帧的架构。建议在 Task 32 中预留`逻辑帧 vs 渲染帧`分离的接口，或直接将 Task 32 的实现目标调整为"固定逻辑帧（25 FPS）+ 插值渲染"。

#### Task 33: 存档 / 读档系统
- **OpenRA 对标**：`OpenRA.Game/SaveGame.cs`（支持不完整，OpenRA 主要依赖回放）
- **异同**：
  - OpenRA 的存档功能较弱，社区主要使用回放（Replay）来记录游戏。
  - 我方计划实现完整的序列化存档（`WorldState → JSON`）。
- **建议**：无需对标 OpenRA。C++ 原版支持存档，这是必须功能。

#### Task 34: 音效事件系统（Dummy 音频占位）
- **OpenRA 对标**：`OpenRA.Game/Sound/Sound.cs`, `ISoundEngine`, `ISoundLoader`
- **异同**：
  - OpenRA 音频系统高度抽象：支持 AUD/WAV/OGG，分类为 `SoundType.World`（3D 定位）和 `SoundType.UI`。
  - 我方计划先用 Web Audio API 做 Dummy 音频占位。
- **建议**：建议在 Task 34 中预留 `SoundCategory` 枚举（UnitVoice, Notification, Weapon, Music, Ambient），与 OpenRA 的分类对齐。这会影响 Task 72-73 的实现。

#### Task 35: 性能优化与发布检查
- **OpenRA 对标**：`OpenRA.Game/Graphics/WorldRenderer.cs`（sprite batching）
- **异同**：
  - OpenRA 使用 CPU 端 sprite batching，因为 2D 精灵数量巨大。
  - 我方使用 Babylon.js GPU 渲染，优化方向不同（实例化、LOD、视锥剔除）。
- **建议**：Task 35 是 Phase 8 的收尾任务，当前无需细化。但建议将 Task 76-81 的渲染性能优化从"远期"提升为"中期"，因为 Babylon.js 的 3D 场景在大量单位时性能下降明显。

---

### 2.2 UI 与交互（16 个任务）

#### Task 36-42: UI Shell 页面（主菜单、战役、遭遇战、多人、设置、加载）
- **OpenRA 对标**：`mods/cnc/chrome/*.yaml`（Widget 声明式 UI）
- **异同**：
  - OpenRA 所有 UI 都在一个渲染管线内（Widget 系统），没有 HTML/CSS 混合。
  - 我方计划 Shell UI 用 HTML/CSS，HUD 用 Babylon.GUI。
- **建议**：🟡 **技术债务风险**。混合 UI 技术栈会导致：
  1. 两套输入事件系统（HTML 鼠标事件 vs Babylon.js 鼠标事件）
  2. 两套 DPI/缩放适配逻辑
  3. 过渡动画难以统一（HTML 页面切换 vs Babylon 场景切换）
  
  **建议方案**：Task 36（主菜单）采用 HTML/CSS 快速实现，但预留迁移到 Babylon.GUI 的接口。若后期发现混合问题严重，再统一迁移。

#### Task 43: 鼠标光标系统（Cursors）
- **OpenRA 对标**：`mods/cnc/cursors.yaml`, `OpenRA.Game/Graphics/CursorManager.cs`
- **异同**：
  - OpenRA 光标由 YAML 定义，支持动画光标（多帧 SHP）。
  - 我方计划用 CSS `cursor` 属性或 Babylon.GUI 自定义光标。
- **建议**：光标动画需要精灵序列支持（Task 70）。建议 Task 43 先用静态 PNG/CSS 实现，Task 70 完成后支持动画光标。

#### Task 44: Sidebar 生产队列 UI
- **OpenRA 对标**：`mods/cnc/chrome/ingame-sidebar.yaml`, `ProductionPaletteWidget.cs`
- **异同**：
  - OpenRA 的 Sidebar 是 Widget 系统的一部分，生产按钮状态由 `ProductionQueue` Trait 驱动。
  - 我方计划用 Babylon.GUI 实现 Sidebar，状态直接查询 `Building` 实例。
- **建议**：无重大差距。注意 OpenRA 的 Sidebar 支持拖拽重新排序生产队列，这是 C++ 原版没有的功能。可作为增强功能，但不必须。

#### Task 45: 建筑放置预览与合法性检查
- **OpenRA 对标**：`OpenRA.Mods.Common/Orders/PlaceBuildingOrderGenerator.cs`
- **异同**：
  - OpenRA 建筑放置是`订单生成器`模式：鼠标移动时生成预览 Order，合法性由 `BuildingInfo` 的 `BuildableTerrain` 和 `Adjacent` 决定。
  - 我方计划直接查询 `TerrainGrid` 和 `ActorMap` 判断合法性。
- **建议**：OpenRA 的`订单生成器`模式将建筑放置视为一种特殊的命令状态（与 Move/Attack 同级），这是优雅的架构。建议在 Task 45 中采用类似设计：引入 `PlaceBuildingOrder` 类型，由 `OrderDispatcher` 统一处理。

#### Task 46: 命令队列（Shift Queue）
- **OpenRA 对标**：`Order.Queued` 字段 + `Activity` 队列
- **异同**：
  - OpenRA 的 Shift 队列由 `Order.Queued = true` 标记，Activity 系统负责顺序执行。
  - 我方计划为单位维护一个 `CommandQueue` 数组。
- **建议**：⚠️ **与 Task 125 关联**。Task 125（Activity 树重构，深度 1）将引入 OpenRA 风格的嵌套 Activity 系统。当前 Task 46 的`扁平队列`实现应与 Task 125 的接口兼容。建议 Task 46 中定义 `IActivity` 接口（即使初期只有 `MoveActivity` 和 `AttackActivity`），为 Task 125 预留迁移路径。

#### Task 47: 攻击移动（Attack-Move）
- **OpenRA 对标**：`AttackMoveActivity.cs`, `AttackMoveOrderGenerator.cs`
- **异同**：
  - OpenRA 攻击移动是一个独立的 `Activity`：向目标点移动，途中遇到敌人自动攻击。
  - 我方计划翻译 C++ 的 `MISSION_ATTACK_MOVE` 状态。
- **建议**：C++ 原版的攻击移动逻辑较简单。OpenRA 的版本更精细（支持`保持阵型`、`优先攻击特定目标类型`）。建议 Task 47 先实现 C++ 等价版本，Task 125（Activity 重构）后支持更复杂的攻击移动行为。

#### Task 48: 巡逻（Patrol）
- **OpenRA 对标**：无原生巡逻命令（社区 Mod 通过脚本实现）
- **异同**：
  - OpenRA 官方 Mod 没有巡逻命令。
  - C++ 原版也没有巡逻命令，这是 RA2 引入的功能。
- **建议**：巡逻是增强功能，非原版必备。建议降低优先级或移至 Phase 10+。

#### Task 49: 单位编组（Ctrl+Number）
- **OpenRA 对标**：`OpenRA.Game/Selection.cs` 中的编组逻辑
- **异同**：
  - OpenRA 支持 0-9 编组，双击编组号选中并聚焦。
  - 我方计划相同实现。
- **建议**：无需调整。

#### Task 50: 双击选中同类单位 + 框选优化
- **OpenRA 对标**：`Selection.cs` 中的双击检测
- **异同**：功能等价。
- **建议**：无需调整。

#### Task 51: Sell / Repair / Power 工具按钮
- **OpenRA 对标**：`OrderGenerator` 系统 + `SellOrder`, `RepairOrder`
- **异同**：
  - OpenRA 将这些工具视为特殊的 OrderGenerator（与建筑放置同级）。
  - 我方计划用 Sidebar 按钮触发。
- **建议**：建议统一使用 `OrderGenerator` 模式：Task 51 的 Sell/Repair/Power 工具、Task 45 的建筑放置、Task 47 的攻击移动，都通过统一的 `OrderGenerator` 接口处理。这减少代码重复，且与 OpenRA 架构对齐。

---

### 2.3 战役与脚本（9 个任务）

#### Task 52-54: 战役数据层、进度保存、简报页面
- **OpenRA 对标**：`mods/cnc/maps/*/map.yaml`（含战役配置）
- **异同**：
  - OpenRA 的战役数据在 `map.yaml` 中定义（玩家、触发器、脚本路径）。
  - 我方计划独立的`战役数据层`。
- **建议**：建议战役数据格式与 OpenRA 地图格式兼容（或至少可转换）。Task 9.6（OpenRA 地图格式兼容）已完成，可利用此能力加载 OpenRA 战役地图。

#### Task 55: 脚本运行时集成（Lua 或 JS）
- **OpenRA 对标**：`OpenRA.Game/Scripting/ScriptContext.cs`, `Eluant`（Lua 运行时）
- **异同**：
  - OpenRA 使用 Lua 5.1 + Eluant，内存限制 50MB，指令限制 1,000,000/次。
  - 我方在 Lua（`fengari-web`）和 JS 之间选择。
- **建议**：⚠️ **关键决策**。推荐 **JavaScript** 而非 Lua：
  1. Web 平台原生支持 JS，无需额外运行时（`fengari-web` 约 200KB WASM）
  2. 调试体验更好（浏览器 DevTools 直接调试）
  3. 与 TypeScript 类型系统更容易集成
  4. OpenRA 的 Lua API 可完全映射到 JS API
  
  但 Lua 的优势是：与 OpenRA 的战役脚本直接兼容（可复用 OpenRA 的 `.lua` 文件）。
  
  **建议方案**：Task 55 选择 **JavaScript**，但设计 `ScriptAPI` 时参考 OpenRA 的 Lua API 命名，方便社区手动转换 OpenRA 战役脚本。

#### Task 56: 脚本全局 API（ScriptGlobals）
- **OpenRA 对标**：`OpenRA.Game/Scripting/ScriptGlobal.cs`, `ScriptActorProperties.cs`, `ScriptPlayerProperties.cs`
- **异同**：
  - OpenRA 的 `ScriptGlobal` 暴露 `Media`, `Map`, `Player`, `Actor`, `Trigger` 等全局对象。
  - 我方需定义等价的 JS API。
- **建议**：直接借鉴 OpenRA 的 API 设计。以下是核心 API 映射：
  | OpenRA Lua API | C&C Remake JS API |
  |----------------|-------------------|
  | `Media.PlaySoundNotification()` | `cnc.media.playSound()` |
  | `Trigger.OnEnteredFootprint()` | `cnc.trigger.onEnteredZone()` |
  | `Actor.Create()` | `cnc.actor.create()` |
  | `Player.MarkCompletedObjective()` | `cnc.player.completeObjective()` |

#### Task 57: 触发器系统（Triggers）
- **OpenRA 对标**：`OpenRA.Game/Scripting/Trigger.cs`
- **异同**：
  - OpenRA 触发器支持：区域进入、单位死亡、计时器、资源达到阈值等。
  - 我方计划实现基础触发器（区域检测、死亡事件、计时器）。
- **建议**：触发器系统是战役的核心。建议在 Task 57 中预留`条件触发器`接口（如`当玩家资金 > 5000 时触发`），为复杂战役设计提供扩展性。

#### Task 58: 任务目标系统（Objectives）
- **OpenRA 对标**：`OpenRA.Mods.Common/Traits/Player/MissionObjectives.cs`
- **异同**：
  - OpenRA 的目标系统与触发器深度集成：目标完成/失败由触发器回调驱动。
  - 我方计划独立实现目标系统。
- **建议**：建议目标系统与触发器系统（Task 57）紧密耦合：目标状态变更自动触发脚本回调，脚本也能主动标记目标完成。

#### Task 59: 胜利/失败条件与结算
- **OpenRA 对标**：`OpenRA.Mods.Common/Traits/World/MissionData.cs`
- **异同**：功能等价。
- **建议**：无需调整。

#### Task 60: 战役过场动画（Video Playback）
- **OpenRA 对标**：`VqaLoader.cs`（VQA 格式解码）
- **异同**：
  - OpenRA 原生解码 VQA 格式。
  - 我方计划转换为 WebM/MP4 后用 HTML5 `<video>` 播放。
- **建议**：WebM 转换方案更务实，无需调整。

---

### 2.4 网络与多人（8 个任务）

#### Task 61-68: 网络架构到回放系统
- **OpenRA 对标**：`OpenRA.Game/Network/`（OrderManager, Order, UnitOrders, Replay）
- **异同**：
  - OpenRA 使用确定性 Lockstep + 命令同步 + SyncHash 校验。
  - Web 平台使用 WebSocket，天然支持客户端-服务器架构。
- **建议**：⚠️ **架构决策**。OpenRA 的 P2P Lockstep 在 Web 平台不可行（WebRTC 连接数受限，NAT 穿透复杂）。建议采用 **客户端-服务器 Relay** 架构：
  - Task 63（本地服务器）作为 Headless Relay，负责广播命令和 SyncHash 校验
  - 客户端通过 WebSocket 连接 Relay
  - 确定性模拟仍必要（Lockstep），但网络拓扑改为 Star（Relay 为中心）
  
  这与 OpenRA 的 P2P 不同，但更适合 Web 平台。建议在 Task 61（网络架构设计）中明确此决策。

---

### 2.5 资源与内容加载（7 个任务）

#### Task 69: 资源包加载系统（MIX/MPR 解析）
- **OpenRA 对标**：`OpenRA.Game/FileSystem/MixFile.cs`
- **异同**：
  - OpenRA 原生解析 MIX 格式，支持加密 MIX（`MIX.CFG` 密钥）。
  - 我方计划在浏览器中解析 MIX。
- **建议**：浏览器端解析二进制 MIX 可行（JavaScript 的 `ArrayBuffer`），但性能可能受限。建议 Task 69 支持两种模式：
  1. **运行时解析**：小文件直接浏览器解析
  2. **构建时预处理**：CI 中将 MIX 提取为静态资源（PNG/JSON/OGG），减少运行时开销

#### Task 70: 精灵序列系统（SHP 解析与 Sprite Sheet）
- **OpenRA 对标**：`OpenRA.Game/Graphics/SequenceProvider.cs`, `ShpTSLoader.cs`
- **异同**：
  - OpenRA 运行时解析 SHP 为纹理，支持 32/64 方向朝向。
  - 我方计划将 SHP 转换为 PNG sprite sheet + JSON metadata。
- **建议**：构建时转换方案更优，避免浏览器端解析性能问题。但需保留 SHP 解析能力（Task 69 中实现），用于 Mod 开发者动态加载。

#### Task 71: 调色板系统（Palette & Remap）
- **OpenRA 对标**：`OpenRA.Game/Graphics/Palette.cs`, `OpenRA.Game/Graphics/Remap.cs`
- **异同**：
  - OpenRA 使用 DOS 256 色调色板（`.pal` 文件），remap 颜色实现阵营色。
  - 我方计划将调色板应用到 sprite sheet 生成阶段（预着色）。
- **建议**：预着色方案简单但缺乏灵活性（无法运行时换色）。建议预留运行时调色板接口：Babylon.js 的 `Material` 支持纹理调色板重映射，可用 Shader 实现动态 remap。

#### Task 72-74: 音频、音乐、视频
- **OpenRA 对标**：`ISoundEngine`, `ISoundLoader`, `MusicPlayer`, `VqaLoader`
- **异同**：OpenRA 原生支持 AUD 格式，Web 平台需转换为 OGG/MP3/WebM。
- **建议**：全部预转换，无需运行时解码。Task 34（音频事件系统）预留的 `SoundCategory` 枚举与 OpenRA 的分类对齐。

#### Task 75: 本地化系统（i18n）
- **OpenRA 对标**：`mods/cnc/fluent/`（Mozilla Fluent 格式）
- **异同**：
  - OpenRA 使用 Fluent 格式（`.ftl`）。
  - 我方计划使用 `i18next` + JSON。
- **建议**：`i18next` + JSON 是 Web 标准方案，无需调整。

---

### 2.6 渲染性能（6 个任务）

#### Task 76-81: LOD、实例化、视锥剔除、对象池、特效合批、纹理图集
- **OpenRA 对标**：`WorldRenderer.cs`（CPU sprite batching）
- **异同**：
  - OpenRA 是 2D 精灵渲染，性能优化方向是 CPU batching 和纹理图集。
  - 我方是 3D 渲染，优化方向是 GPU 实例化、LOD、视锥剔除。
- **建议**：
  - 🟡 **提升 Task 77（实例化）优先级至 P1**：Babylon.js 的 `InstancedMesh` 对大量同类型单位（如 50+ 步兵）性能提升显著，是 3D RTS 的核心优化。
  - 🟡 **提升 Task 78（视锥剔除）优先级至 P1**：Babylon.js 默认启用视锥剔除，但自定义 UI 元素（如小地图标记、选择框）需要手动实现剔除逻辑。
  - 其他任务（76、79-81）保持现有优先级。

---

### 2.7 AI 与高级功能（7 个任务）

#### Task 82: 基础 AI Bot（建造与扩张）
- **OpenRA 对标**：`OpenRA.Mods.Common/AI/`（HackyAI, D2kAI）
- **异同**：
  - OpenRA 的 AI 是模块化的：`SupportPowerDecision`, `SquadManager`, `BaseBuilder`。
  - 我方计划翻译 C++ 的 AI 逻辑。
- **建议**：OpenRA 的 AI 模块设计值得借鉴。建议 Task 82 引入 `AIBot` 接口 + `BaseBuilderModule`/`AttackManagerModule` 的组合模式，而非单一的 `AIBot` 大类。

#### Task 83: AI 难度等级
- **OpenRA 对标**：`HackyAI` 的 `Difficulty` 参数
- **异同**：OpenRA 通过 YAML 配置 AI 参数（建造间隔、攻击频率等）实现难度调整。
- **建议**：建议难度参数外化为 JSON 配置（与 Task 95 的 YAML/JSON 规则系统对齐）。

#### Task 84-88: 超级武器、间谍、空军、桥梁、中立单位
- **OpenRA 对标**：对应 Trait（`NukePower`, `Infiltrate`, `Aircraft`, `BridgeHut`, `Neutral`）
- **异同**：OpenRA 的这些功能都是 Trait 组合实现的，无需修改 Actor 类。
- **建议**：⚠️ **Trait 系统依赖性**。Task 84-88 的当前规划基于继承式 `Unit`/`Building` 类。若 Task 96（Trait 系统，深度 1）先完成，则这些功能应重构为 Trait 挂载。建议：
  - Task 84-88 先按 C++ 翻译实现（继承式）
  - Task 96 完成后，将通用逻辑提取为 Trait（如 `AircraftMovementTrait` 从 `Unit` 中分离）
  - 在 Task 84-88 中增加 `- **Trait 迁移**：Task 96 完成后提取为独立 Trait` 备注

---

### 2.8 编辑器与工具（3 个任务）

#### Task 89: 内置地图编辑器（Tile Brush）
- **OpenRA 对标**：OpenRA 没有内置浏览器地图编辑器（桌面编辑器是独立的）。
- **异同**：我方计划浏览器内置编辑器，这是超越 OpenRA 的设计。
- **建议**：Task 9.8（编辑器地形刷系统）已完成基础 tile brush。Task 89 应扩展为完整的地图编辑器（包含 Actor 放置、触发器编辑、规则覆盖）。

#### Task 90: 编辑器 Actor 放置与触发器编辑
- **OpenRA 对标**：OpenRA 的桌面地图编辑器支持 Actor 放置和触发器编辑。
- **异同**：功能等价，但平台不同（桌面 vs 浏览器）。
- **建议**：建议编辑器输出格式兼容 OpenRA 地图格式（`map.yaml` + `map.bin`），方便社区复用地图。

#### Task 91: 单位测试/平衡工具
- **OpenRA 对标**：无专门工具，社区通过 Mod 和自定义地图测试。
- **建议**：这是增强功能，优先级保持低。

---

### 2.9 平台与发布（3 个任务）

#### Task 92-94: 桌面打包、移动端、Steam
- **OpenRA 对标**：OpenRA 是桌面应用（.NET + SDL2）。
- **建议**：这些是 Phase 17 远期任务，与 OpenRA 无直接对标。保持现有规划。

---

### 2.10 OpenRA 深度对齐补充（6 个任务）

#### Task 95: YAML 规则解析基础设施
- **OpenRA 对标**：`OpenRA.Game/Manifest.cs`, `ObjectCreator.cs`, `MiniYaml.cs`
- **异同**：OpenRA 使用 `MiniYaml` 解析器，运行时加载规则。Web 端解析 YAML 慢且增加包体积。
- **建议**：⚠️ **已规划为 P0**。建议构建时将 YAML → JSON（CI 流水线中执行），运行时只加载 JSON。这兼顾 OpenRA 的 YAML 生态（社区 Mod 用 YAML）和 Web 端性能。

#### Task 121: A* 优先队列（Binary Heap）
- **OpenRA 对标**：`PathSearch.cs` 使用 `CellInfoLayer` + 优先队列
- **建议**：⚠️ **已规划为 P0**。优先队列是寻路性能的基础，优先完成。

#### Task 127-128: Lane Bias、Path Cache
- **OpenRA 对标**：`PathSearch.cs` 中的邻居裁剪和缓存
- **建议**：P2 合理，是性能优化项，非功能必备。

#### Task 131-132: ActorMap Bin、启发式权重
- **OpenRA 对标**：`ActorMap` 使用空间哈希，`PathSearch` 支持启发式权重调整
- **建议**：P3 合理，是高级优化。

---

## 3. 差距识别与新增任务建议

基于以上对比分析，识别出 4 个 OpenRA 有但当前深度 0 规划中**缺失的基础设计**。建议新增为深度 0 任务：

### 新增 Task 139: 统一 OrderGenerator 框架
- **目标**：为建筑放置（Task 45）、Sell/Repair/Power 工具（Task 51）、攻击移动（Task 47）等提供统一的命令生成器抽象。
- **OpenRA 对标**：`OpenRA.Mods.Common/Orders/OrderGenerator.cs`
- **设计**：
  - `abstract OrderGenerator`：处理鼠标移动/点击/取消事件，生成 `GameOrder`
  - `PlaceBuildingOrderGenerator`：Task 45 使用
  - `SellToolOrderGenerator` / `RepairToolOrderGenerator` / `PowerToolOrderGenerator`：Task 51 使用
  - `AttackMoveOrderGenerator`：Task 47 使用
- **优先级**：🟡 P1
- **依赖**：无（深度 0）
- **验收**：`cnc.building()` 控制台命令通过 `PlaceBuildingOrderGenerator` 实现。

### 新增 Task 140: GameOrder 命令抽象与队列
- **目标**：定义统一的 `GameOrder` 接口，所有玩家输入（移动、攻击、建造、出售）都封装为 Order，支持本地执行和网络序列化。
- **OpenRA 对标**：`OpenRA.Game/Network/Order.cs`
- **设计**：
  ```typescript
  interface GameOrder {
    readonly orderString: string;  // "Move", "Attack", "Build", "Sell"
    readonly subjectId: string;     // 发出命令的单位/玩家 ID
    readonly target: OrderTarget;   // 目标（地面位置 / 单位 / 建筑）
    readonly queued: boolean;       // Shift 队列
  }
  ```
- **优先级**：🔴 P0
- **依赖**：无（深度 0）
- **验收**：Task 26（命令分发器）基于 `GameOrder` 实现；Task 46（Shift 队列）基于 `GameOrder.queued` 实现。
- **关联**：Task 139（OrderGenerator 生成 GameOrder）、Task 62（Order 序列化）、Task 68（回放录制 Order 数组）。

### 新增 Task 141: 逻辑帧与渲染帧分离架构
- **目标**：将游戏模拟从渲染循环中分离，固定 25 FPS 逻辑帧 + 可变渲染帧插值。
- **OpenRA 对标**：`OpenRA.Game/Game.cs`（`LogicTick` vs `RenderTick`）
- **设计**：
  - `GameLoop.ts` 维护独立的 `logicTickCount`（每 40ms +1）
  - 渲染帧根据 `logicTickCount` 和 `logicTickProgress`（0.0–1.0）插值单位位置
  - 所有游戏逻辑（移动、攻击、建造）只在逻辑帧中执行
- **优先级**：🟡 P1
- **依赖**：无（深度 0）
- **验收**：浏览器 60 FPS 渲染时，单位移动平滑；降低至 30 FPS 时，游戏逻辑仍保持 25 FPS，不慢放。
- **关联**：Task 32（游戏主循环）、Task 65（Lockstep 需要固定逻辑帧）。

### 新增 Task 142: 音频分类管理器（AudioManager）
- **目标**：封装 Web Audio API，支持分类播放、3D 定位、播放列表。
- **OpenRA 对标**：`OpenRA.Game/Sound/Sound.cs`
- **设计**：
  - `AudioManager` 单例
  - `SoundCategory` 枚举：UnitVoice, Notification, Weapon, Music, Ambient
  - 每类独立音量控制
  - 3D 定位：根据相机距离调整音量和声相
- **优先级**：🟡 P1
- **依赖**：无（深度 0）
- **验收**：`cnc.unit('MediumTank')` 时播放创建音效，相机远离时音量衰减。
- **关联**：Task 34（音效事件系统）、Task 72（语音）、Task 73（音乐）。

---

## 4. 优先级调整建议

以下任务的优先级建议调整（基于 OpenRA 经验和对后续任务的影响）：

| 任务 | 当前优先级 | 建议优先级 | 理由 |
|------|-----------|-----------|------|
| Task 32（游戏主循环） | 无 | 🟡 P1 | 需在早期确定逻辑帧/渲染帧分离（Task 141），否则后期重构成本高 |
| Task 34（音效系统） | 无 | 🟡 P1 | 建议升级为 AudioManager（Task 142），为全部音频功能打基础 |
| Task 45（建筑放置） | 无 | 无 | 建议基于 Task 139（OrderGenerator）实现，增加 `- **实现方式**：` 备注 |
| Task 46（Shift 队列） | 无 | 无 | 建议基于 Task 140（GameOrder）实现，增加 `- **实现方式**：` 备注 |
| Task 47（攻击移动） | 无 | 无 | 建议基于 Task 139（OrderGenerator）实现 |
| Task 51（工具按钮） | 无 | 无 | 建议基于 Task 139（OrderGenerator）实现 |
| Task 55（脚本运行时） | 无 | 🟡 P1 | JS 脚本系统是战役（Task 52-60）的前置，提升为 P1 |
| Task 77（实例化渲染） | 无 | 🟡 P1 | 3D RTS 核心性能优化，大量单位时必需 |
| Task 78（视锥剔除） | 无 | 🟡 P1 | 3D RTS 核心性能优化 |
| Task 84-88（高级功能） | 无 | 无 | 增加 `- **Trait 迁移备注**：` 提示 Task 96 后重构 |

---

## 5. 重规划后的深度 0 任务统计

| 类别 | 原有任务数 | 新增任务数 | 调整后总数 | P0 | P1 | P2 | P3 |
|------|-----------|-----------|-----------|----|----|----|----|
| 核心战斗 | 11 | 2（139, 140） | 13 | 1 | 4 | 2 | 0 |
| UI 与交互 | 16 | 0 | 16 | 0 | 1 | 3 | 0 |
| 战役与脚本 | 9 | 0 | 9 | 0 | 2 | 2 | 1 |
| 网络与多人 | 8 | 0 | 8 | 0 | 1 | 2 | 0 |
| 资源与内容 | 7 | 0 | 7 | 0 | 1 | 2 | 1 |
| 渲染性能 | 6 | 0 | 6 | 0 | 2 | 2 | 0 |
| AI 与高级 | 7 | 0 | 7 | 0 | 1 | 3 | 0 |
| 编辑器与工具 | 3 | 0 | 3 | 0 | 1 | 1 | 0 |
| 平台与发布 | 3 | 0 | 3 | 0 | 0 | 1 | 1 |
| OpenRA 补充 | 6 | 1（142） | 7 | 2 | 2 | 2 | 1 |
| **总计** | **76** | **4** | **80** | **3** | **16** | **21** | **4** |

> 注：P0 新增 1 个（Task 140 GameOrder），原有 Task 95 和 Task 121 保持 P0。

---

## 6. 关键依赖链（新增任务与现有任务的连接）

```
Task 140 (GameOrder) ──┬──→ Task 26 (命令分发器)
                       ├──→ Task 46 (Shift 队列)
                       ├──→ Task 139 (OrderGenerator)
                       └──→ Task 62 (Order 序列化，深度1)

Task 139 (OrderGenerator) ──┬──→ Task 45 (建筑放置)
                            ├──→ Task 47 (攻击移动)
                            └──→ Task 51 (工具按钮)

Task 141 (逻辑帧分离) ───→ Task 32 (游戏主循环)
                       └──→ Task 65 (Lockstep，深度1)

Task 142 (AudioManager) ──┬──→ Task 34 (音效系统)
                          ├──→ Task 72 (语音)
                          └──→ Task 73 (音乐)
```

---

## 7. 下一步行动清单

1. **将本分析中的 4 个新增任务（139–142）插入 `docs/tasks.md`**
2. **为 15 个现有任务补充 `- **OpenRA 对标**：` 行**（Task 26, 28, 29, 32, 34, 45, 46, 47, 51, 55, 61, 69, 70, 82, 95）
3. **调整 8 个任务的优先级标注**（Task 32, 34, 55, 77, 78 提升为 P1）
4. **更新附录 C**：深度 0 任务数 76 → 80，已完成 44 → 44（无变化），待完成 76 → 80

---

*本文档为深度 0 任务与 OpenRA 的对比分析结果，用于指导 Sprint 排期和技术选型。随开发进度更新。*
