# 项目任务分解表

> **调试约定**：每个 Task 完成后，请在右侧 `[ ]` 打勾，并在对应行末尾追加 `ready` 表示资源到位或 `done` 表示代码完成。  
> **类型检查**：每个 Task 提交前运行 `npm run type-check`，通过即可，不强制 `build`。

---

## Phase 0: 原始代码学习与 Harness 更新（Pre-coding）

> **参考文档**：
> - `harness/04_CPP_TO_TS_MAPPING.md` — C++ → TS 代码翻译规范
> - `harness/05_OPENRA_ANALYSIS.md` — OpenRA 架构分析
> - `harness/05_RA2WEB_ANALYSIS.md` — RA2-Web（React + Three.js 红警2网页版）架构与组件分析，含数据解析器、渲染系统、音频系统、Trait/ECS 设计、触发器系统、任务系统、虚拟文件系统的详细映射
>
> **本地参考项目**：`ra2-web/` 目录已移出 git 跟踪（`.gitignore`），仅保留本地副本作为架构参考。如需更新其分析内容，修改 `harness/05_RA2WEB_ANALYSIS.md` 即可。

### Task 0: 获取原始 C++ 源码并放置到 origin/
- **目标**：将 EA 开源的 `CnC_Remastered_Collection` 源码下载并解压到 `origin/` 目录，保持原始目录结构不变。
- **文件位置**：`origin/REDALERT/`, `origin/TIBERIANDAWN/`, `origin/CnCTDRAMapEditor/`
- **验收**：`origin/REDALERT/UNIT.CPP` 文件存在且可打开阅读。
- **状态**：[x] `ready` / `done`

### Task 0.1: 阅读 REDALERT/UNIT.CPP 与 UNIT.H，提取核心状态机
- **目标**：理解 `UnitClass` 的继承链（`TechnoClass` → `FootClass` → `UnitClass`）、核心属性（Speed, Health, Armor, Mission）、状态机（Idle/Moving/Attacking/Dying）。
- **输出**：将提取的类结构、关键常量、状态转换条件更新到 `harness/04_CPP_TO_TS_MAPPING.md` 的 §1.1 节。
- **验收**：`04_CPP_TO_TS_MAPPING.md` 中包含与源码一致的 UnitClass 字段列表及行号引用。
- **状态**：[x] `done`

### Task 0.2: 阅读 REDALERT/BUILDING.CPP 与 BUILDING.H，提取建筑核心逻辑
- **目标**：理解 `BuildingClass` 的电力、建造队列、科技树、放置逻辑。
- **输出**：更新 `harness/04_CPP_TO_TS_MAPPING.md` §1.2 节。
- **验收**：`04_CPP_TO_TS_MAPPING.md` 中包含 BuildingClass 的 `PowerDrain`、`IsFactory`、`Begin_Construction` 等核心方法映射。
- **状态**：[x] `done`

### Task 0.3: 阅读 REDALERT/RULES.CPP，提取全局数值常量
- **目标**：提取单位造价、建造时间、伤害倍率、视野范围等全局常量。
- **输出**：更新 `harness/04_CPP_TO_TS_MAPPING.md` §2.3 的 `UNIT_DEFINITIONS` 与 `BUILDING_DEFINITIONS`。
- **验收**：`GameRules.ts` 设计文档中的数值与 `RULES.CPP` 源码一致。
- **状态**：[x] `done`

### Task 0.4: 阅读 REDALERT/TERRAIN.CPP / CELL.CPP，提取地图与格子系统
- **目标**：理解 `CellClass` 属性、地形类型枚举、通行性规则。
- **输出**：更新 `harness/04_CPP_TO_TS_MAPPING.md` §3 坐标系统与地形通行性。
- **验收**：`TerrainGrid.ts` 设计文档中的 `CELL_SIZE` 换算逻辑与 C++ 坐标系一致。
- **状态**：[x] `done`

### Task 0.5: 阅读 REDALERT/WEAPON.CPP / BULLET.CPP，提取弹道与伤害公式
- **目标**：理解武器定义、弹道飞行、命中判定、伤害计算公式。
- **输出**：更新 `harness/04_CPP_TO_TS_MAPPING.md` §2.2 弹头修正表与 §1.x 弹道系统。
- **验收**：`DamageCalculator.ts` 设计文档中的公式与 `UNIT.CPP` 中 `Take_Damage()` 一致。
- **状态**：[x] `done`

---

## Phase 1: 基建与工具链（Foundation）

### Task 1: Vite + TypeScript + Babylon.js 项目脚手架
- **目标**：初始化项目，安装依赖，确保 `npm run dev` 能打开空白 3D 场景。
- **文件**：`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- **关键配置**：
  - `vite.config.ts` 中设置 `base: '/CnC_Remake/'`（适配 GitHub Pages 子目录）
  - `tsconfig.json` 开启 `strict: true`, `noImplicitAny: true`
- **验收**：浏览器打开看到黑色 Canvas，控制台无报错。
- **状态**：[x] `done`

### Task 2: ESLint + Prettier + Git 钩子
- **目标**：统一代码风格，提交前自动格式化与类型检查。
- **文件**：`remake/eslint.config.js`, `remake/.prettierrc`, `.husky/pre-commit`, `remake/lint-staged.config.js`
- **验收**：提交代码时自动触发 `lint-staged` + `tsc --noEmit`。
- **状态**：[x] `done`

### Task 3: GitHub 仓库初始化与分支保护
- **目标**：创建仓库，设置 `main`（发布）与 `dev`（开发）分支，配置分支保护规则。
- **已完成（本地）**：
  - Git 仓库初始化，`master` 重命名为 `main`
  - `dev` 分支已创建
  - 操作手册已写入 `harness/03_SETUP_AND_DEPLOYMENT.md` §5
- **待手动完成（需你的 GitHub 账号）**：
  1. 在 https://github.com/new 创建 `CnC_Remake` 空仓库
  2. `git remote add origin https://github.com/<USER>/CnC_Remake.git`
  3. `git push -u origin main && git push -u origin dev`
  4. 在 Settings → Branches 中为 `main` 和 `dev` 添加保护规则
- **验收**：`main` 分支需 PR + CI 通过才能合并。
- **状态**：[x] `done`（本地部分）/ `ready`（GitHub 部分待手动执行）

### Task 4: GitHub Actions CI — Type Check & Lint
- **目标**：每次 Push / PR 时自动运行类型检查与 ESLint。
- **文件**：`.github/workflows/ci.yml`
- **验收**：PR 页面显示绿色对勾，类型错误阻断合并。
- **状态**：[x] `done`

### Task 5: GitHub Actions CD — 自动部署到 GitHub Pages
- **目标**：`main` 分支合并后自动构建并发布到 `gh-pages`。
- **文件**：`.github/workflows/deploy.yml`
- **验收**：访问 `https://<user>.github.io/CnC_Remake/` 能看到最新版本。
- **状态**：[x] `done`

---

## Phase 2: 3D 核心与场景（Engine Core）

### Task 6: EngineManager & SceneManager 单例封装
- **目标**：封装 Babylon.js `Engine` 与 `Scene` 生命周期，处理窗口 Resize 与销毁。
- **参考 C++**：`WIN32LIB/` 中的初始化与消息循环。
- **文件**：`src/core/EngineManager.ts`, `src/core/SceneManager.ts`
- **验收**：页面刷新/调整窗口大小后引擎稳定运行，内存无泄漏。
- **状态**：[x] `done`

### Task 7: RTS 相机系统（俯视角 + 边缘滚动 + 缩放）
- **目标**：实现红警经典相机：默认俯视角 45°、鼠标移到屏幕边缘平移、滚轮缩放、右键拖拽平移。
- **参考 C++**：`DISPLAY.CPP` 中的视口控制逻辑。
- **文件**：`src/core/RTSCamera.ts`
- **数值沿用**：缩放范围 20-100（世界单位），边缘阈值 20px。
- **验收**：鼠标移到屏幕左边缘，相机向左平滑移动；滚轮缩放有阻尼感。
- **状态**：[x] `done`

### Task 8: 光照与阴影系统
- **目标**：`DirectionalLight` 模拟太阳，`HemisphericLight` 环境光，`ShadowGenerator` 生成动态阴影。
- **文件**：`src/renderer/Lighting.ts`
- **验收**：场景中放置一个 Box，能看到清晰阴影，性能 60FPS。
- **状态**：[x] `done`

### Task 9: 地形网格系统（Cell-based Ground）
- **目标**：将 C++ 的格子逻辑映射到 3D 地面。生成 `MAP_WIDTH x MAP_HEIGHT` 的网格地面，每个 Cell 对应一个地面贴片。
- **参考 C++**：`TERRAIN.CPP`, `CELL.CPP`。
- **文件**：`src/game/terrain/TerrainGrid.ts`
- **Dummy 资源**：地面用 `GroundMesh` 或 `TiledGround`，不同地形类型（草地/ pavement/ 水）用不同颜色的 `StandardMaterial`。
- **验收**：生成 64x64 格子地图，切换不同地形颜色可见。
- **状态**：[x] `done`

### Task 9.1: CellLayer<T> 泛型地形层 + 事件驱动 — 数据层架构升级 🔴 P0
- **目标**：将当前原始的 `CellData[][]` 二维数组重构为 OpenRA 风格的 `CellLayer<T>` 泛型层：连续一维数组存储、支持 `CPos` 索引包装、`CellEntryChanged` 事件驱动、多 layer 隔离。所有地形/高度/资源的变更通过事件通知监听者（渲染器、寻路器、Shroud）增量更新。
- **文件**：`src/game/terrain/CellLayer.ts`, `src/game/terrain/MapGrid.ts`, `src/game/terrain/TerrainGrid.ts`
- **OpenRA 对标**：`OpenRA.Game/Map/CellLayer.cs` + `CellLayerBase.cs` + `ProjectedCellLayer.cs`
- **关键变更**：
  - `CellLayer<T>` 泛型类：底层 `T[] entries`（大小 = width × height），`Index(CPos)` 转换为一维下标；支持 `this[cpos]` 读写器
  - `CellEntryChanged: (CPos) => void` 事件：任何格子的数据变更自动触发，监听者（`TerrainRenderer`、`HierarchicalPathfinder`、`ShroudRenderer`）按需增量更新
  - `ProjectedCellLayer<T>`：专用于投影坐标 `PPos` 索引的数组（无事件），为 Shroud 系统预留
  - `MapGrid`：定义网格几何规则（`Rectangular` vs `RectangularIsometric`）、`TileSize`、`SubCellOffsets`、`TilesByDistance` 预计算
  - 现有 `TerrainGrid.cells` 迁移为 `CellLayer<CellData>`，保持 `getCellLandType` / `setCellLandType` API 向后兼容
- **依赖**：Task 13（MapLoader 需适配新数据结构）
- **验收**：`terrainGrid.cells[10][20].landType = Water` 触发 `CellEntryChanged` 事件，`TerrainRenderer` 和 `HierarchicalPathfinder` 自动收到通知并更新对应格子；128×128 地图内存占用与原始二维数组相当或更优
- **状态**：[x] `done`

### Task 9.2: TileSet / Template 地形模板系统 — C&C 地图核心 🔴 P0
- **目标**：实现 OpenRA 风格的 `TileSet`（剧场定义）+ `TerrainTemplate`（多格组合模板）系统。每个地形格子不再存储单一 `LandType`，而是存储 `TerrainTile(templateId, index)`，引用外部 `tileset.yaml` 中定义的模板。支持 `PickAny` 随机变体、局部高度偏移、斜坡类型。
- **文件**：`src/game/terrain/TileSet.ts`, `src/game/terrain/TerrainTemplate.ts`, `src/game/terrain/TerrainTile.ts`, `public/tilesets/temperat.yaml`
- **OpenRA 对标**：`DefaultTerrain.cs` + `DefaultTerrainTemplateInfo.cs` + `TerrainInfo.cs` + `DefaultTileCache.cs`
- **关键变更**：
  - `TileSet`：从 YAML 加载，含 `General`（TileSize, Palette, SheetSize）、`Terrain`（`TerrainTypeInfo[]`，按字母排序后分配 byte 索引）、`Templates`（`TerrainTemplateInfo[]`）
  - `TerrainTemplateInfo`：`Id`(ushort), `Images`(Sprite 路径数组), `Frames`(使用哪些 frame), `Size`(模板占据的格子数，如 2×2 悬崖), `PickAny`(bool，随机选取索引), `DepthImages`(深度图路径)
  - `TerrainTile`：`{ type: ushort, index: byte }`，`type` 指向 `TerrainTemplateInfo.Id`，`index` 是模板内的局部索引
  - `TerrainTileInfo`：每模板内 tile 的元数据——`TerrainType`(byte 索引), `Height`(局部高度偏移), `RampType`(斜坡), `MinColor/MaxColor`(小地图颜色范围), `Riser`(8 方向期望高度 discontinuity)
  - `CellData` 升级：`landType` 字段废弃（保留兼容），新增 `terrainTile: TerrainTile`
  - `DefaultTileCache`：解析 `Images` → Sprite Frame → 通过 `SheetBuilder` 打包到 Texture Atlas；`TileSprite(tile)` 根据 type 找模板、index 取 sprite、随机选 variant
- **依赖**：Task 9.1（CellLayer 提供事件驱动的基础数据层）
- **验收**：加载 `temperat.yaml` 后，64×64 地图每个格子引用正确的模板和子索引；`PickAny=true` 的草地模板每次加载随机选取变体；悬崖模板（2×2 或更大）在地图上正确拼合
- **状态**：[x] `done`

### Task 9.3: 资源层 (ResourceLayer) — Tiberium/Ore 密度与生长 🟡 P1
- **目标**：实现独立的资源层，管理地图上可采集资源（Tiberium 晶体、Ore 矿石）的分布与密度。支持密度 0-255、生长扩散、枯竭再生。为采矿经济系统（Task 30）提供数据基础。
- **文件**：`src/game/economy/ResourceLayer.ts`, `src/game/terrain/CellLayer.ts`
- **OpenRA 对标**：`OpenRA.Mods.Common/Traits/World/ResourceLayer.cs` + `IResourceLayer.cs`
- **关键变更**：
  - `ResourceLayer`：管理 `CellLayer<ResourceCell>`，每个格子记录 `type`(资源类型索引) 和 `density`(0-255)
  - `ResourceTypeInfo`：从 YAML 加载，定义 `Type`(名称), `TerrainType`(覆盖的地形类型), `MaxDensity`(上限), `GrowthRate`(每 tick 生长概率), `SpreadRate`(向相邻空格子扩散概率), `Value`(每密度单位的价值)
  - 生长逻辑：每 tick 遍历所有资源格，按 `GrowthRate` 增加密度（不超过 `MaxDensity`）；按 `SpreadRate` 向相邻 Clear 格子扩散新资源
  - `CellEntryChanged` 事件：密度变更时通知 `ResourceRenderer` 更新显示帧
  - 与 `HarvesterAI`（Task 30）对接：`ResourceLayer.getHarvestableCells()` 返回地图上所有含可采集资源的格子
- **依赖**：Task 9.1（CellLayer 事件驱动）
- **验收**：地图上 10 个种子资源点经过 100 tick 后自然扩散成一片资源区；矿车调用 `ResourceLayer.harvest(cell)` 后该格密度下降，视觉上从高密度 sprite 切换到低密度 sprite
- **状态**：[x] `done`

### Task 9.4: TerrainSpriteLayer + Texture Splatting Shader — 真实地形渲染 🟡 P1
- **目标**：从纯色顶点色地形升级为真实纹理渲染。实现 OpenRA 风格的 `TerrainSpriteLayer`（GPU 顶点数组管理 + 脏行增量更新），并在此基础上实现 Babylon.js 自定义 Shader 的 **Texture Splatting**（草地/道路/水域/悬崖多纹理混合）。
- **文件**：`src/renderer/terrain/TerrainSpriteLayer.ts`, `src/renderer/materials/TerrainSplatMaterial.ts`, `src/renderer/shaders/terrain.splat.fx`
- **OpenRA 对标**：`TerrainSpriteLayer.cs` + `TerrainRenderer.cs` + `WorldRenderer.Draw` 中的地形绘制顺序
- **关键变更**：
  - `TerrainSpriteLayer`：管理每行一个 GPU 顶点缓冲；仅上传可见行的脏数据；支持 Palette 索引和光照染色
  - `TerrainSplatMaterial`：自定义 Babylon.js ShaderMaterial，支持 4-8 层纹理（草地、道路、水域、岩石、沙滩、粗糙地、泰伯利亚、雪）
  - Texture Splatting：每个 Cell 输出一个 splat 权重（如 `splatR=草地, splatG=道路, splatB=水域, splatA=岩石`），Shader 在片元阶段按权重混合多层纹理
  - 与 `TileSet` 对接：通过 `DefaultTileCache` 获取每个 `TerrainTile` 对应的 Sprite/Texture，写入 `TerrainSpriteLayer` 的顶点数据
  - 水面动画：Water 类型格子使用动态 UV 偏移或法线贴图模拟波纹
  - 地形过渡：相邻不同地形类型之间通过 splat 权重渐变实现自然混合（替代当前的硬边界）
- **依赖**：Task 9.1（CellLayer 事件触发渲染更新），Task 9.2（TileSet 提供纹理来源）
- **验收**：64×64 地图显示真实纹理（草地、道路、水域），相邻地形间有过渡混合；Water 格子有动态波纹动画；相机 zoom 到 100 时远处地形 LOD 降低
- **状态**：[x] `done`

### Task 9.5: 多坐标系统重构 (CPos/MPos/PPos/WPos) — 等轴测与高度投影 🟡 P1
- **目标**：将当前简单的 `Cell(x,y) ↔ Vector3` 重构为 OpenRA 风格的多层坐标系统：`CPos`(逻辑+层) → `MPos`(数组坐标) → `PPos`(投影坐标) → `WPos`(3D世界)。支持等轴测网格和高度投影，为精确命中测试和斜坡移动提供基础。
- **文件**：`src/game/terrain/Coordinates.ts`, `src/game/terrain/MapGrid.ts`, `src/game/terrain/Viewport.ts`
- **OpenRA 对标**：`CPos.cs` + `MPos.cs` + `PPos.cs` + `WPos.cs` + `WVec.cs` + `WDist.cs` + `CVec.cs` + `Viewport.cs`
- **关键变更**：
  - `CPos { x, y, layer? }`：Cell 逻辑坐标，32bit 紧凑打包（未来可支持 256 层）
  - `MPos { u, v }`：数组坐标；矩形网格 `u=x, v=y`；等轴测网格 `u=(x-y)/2, v=x+y`
  - `PPos { u, v }`：投影坐标，用于渲染和 Shroud；等轴测下 `MPos→PPos` 直接映射；带高度时一个 `MPos` 可能投影到多个 `PPos`（悬崖覆盖）
  - `WPos { x, y, z }`：世界坐标；1 cell = 1024 WDist（Rect）或 1448 对角线（Iso）；Z 由 `Height` + `Ramp` 插值决定
  - `WVec / WDist / CVec`：世界向量、世界距离、Cell 向量；支持 `Length`、`Rotate`、`Yaw` 等运算
  - `Viewport`：屏幕坐标 → 世界坐标 → Cell 坐标的转换链；`ViewToWorld` 使用候选 cell → 四边形 `PolygonContains` 精确 hit test（替代当前简单的 `Math.round`）
  - `MapGrid`：定义 `Type`（`Rectangular` / `RectangularIsometric`）、`TileSize`、`SubCellOffsets`、`Ramps`
- **依赖**：Task 9.1（CellLayer 支持 CPos 索引），Task 130（高度系统提供 Z 坐标来源）
- **验收**：等轴测模式下，Cell (10,20) 的世界坐标与屏幕坐标双向转换误差 < 0.5 像素；`Viewport.ViewToWorld(mouseX, mouseY)` 在斜坡边缘精确命中正确的 Cell；高度差 ≥2 的悬崖不可通行
- **状态**：[x] `done`

### Task 9.6: 地图格式兼容 (OpenRA map.yaml + map.bin) — 生态兼容 🟢 P2
- **目标**：支持加载 OpenRA 原生地图格式（文件夹：`map.yaml` + `map.bin` + `map.png`），使项目可直接使用 OpenRA 地图生态和真实 C&C 地图数据。
- **文件**：`src/game/terrain/OpenRAMapLoader.ts`, `src/game/terrain/MapFormat.ts`, `src/game/terrain/GameMap.ts`
- **OpenRA 对标**：`Map.cs` 中 `LoadBinaryData` / `SaveBinaryData` + `map.yaml` 解析
- **关键变更**：
  - `map.yaml` 解析：MiniYaml 解析器读取 `MapFormat`, `RequiresMod`, `Title`, `Author`, `Tileset`, `MapSize`, `Bounds`, `Players`, `Actors`, `Rules`
  - `map.bin` 二进制解析（Little-endian）：
    - Header：`byte Format`, `ushort Width/Height`, `uint TilesOffset`, `uint HeightsOffset`, `uint ResourcesOffset`
    - Tiles 段：`ushort tile.Type` + `byte tile.Index`
    - Heights 段：`byte height`
    - Resources 段：`byte type` + `byte density`
  - `MapFormat.ts`：定义 `MapYaml` / `MapBinData` / `MiniYamlNode` 接口，完整兼容 OpenRA 元数据结构
  - `OpenRAMapLoader.loadFromFolder()`：从文件夹 URL 加载 `map.yaml` + `map.bin`，合并为 `GameMap`
  - `GameConsole.openraMap()`：调试命令暴露解析结果（标题、玩家、演员、bin header、应用状态）
  - 回退机制：若 `map.bin` 不存在，生成 stub（所有 tile type=1, height=0, resource=0）
  - Tile type → `LandType` 映射：简化映射（0→Water, 1→Clear, 2→Rock, 3→Road，其余循环）
- **依赖**：Task 9.1（CellLayer 存储解析后的数据），Task 9.5（坐标系统）
- **验收**：
  - [x] `OpenRAMapLoader` 正确解析 4×4 测试地图的 `map.yaml` 元数据和 `map.bin` 二进制数据
  - [x] `cnc.openraMap('/maps/test_openra')` 返回正确标题、作者、Tileset、尺寸、Bounds、Players、Actors、bin header
  - [x] 尺寸不匹配时（4×4 地图 vs 64×64 TerrainGrid）`applied=false`，不报错
  - [x] 全部 115 个 e2e 测试通过（109 原有 + 6 新增）
- **状态**：[x] `done`

### Task 9.7: Shroud 边缘贴图渲染系统 — 迷雾视觉精细化 🟢 P2
- **目标**：在 Task 31（Fog of War）的基础逻辑之上，实现 OpenRA 风格的 Shroud 边缘贴图渲染：使用 bitfield 描述 8 邻居可见性状态，索引到 sprite 序列的对应帧，实现平滑的迷雾边缘过渡。
- **文件**：`src/renderer/effects/ShroudRenderer.ts`, `src/renderer/materials/ShroudMaterial.ts`
- **OpenRA 对标**：`ShroudRenderer.cs` + `Shroud.cs` 中 `GetEdges` / `GetNeighborsVisibility`
- **关键变更**：
  - `ShroudRenderer`：管理两个 `TerrainSpriteLayer`——`shroudLayer`（未探索区域 = 黑色）和 `fogLayer`（已探索但当前不可见 = 灰蒙）
  - 边缘检测：`Edges` enum 定义 4 角 + 4 边（扩展模式）的可见性组合；`GetNeighborsVisibility` 查询 8 邻居的 `CellVisibility`；`GetEdges` 生成边缘 bitfield
  - Sprite 索引：`shroudSprites` / `fogSprites` 从序列加载，支持多 variant；`Index` 数组定义 bitfield → sprite frame 的映射
  - 增量更新：`UpdateShroudCell(PPos)` 标记自身 dirty 并脏化 8 邻居（边缘相互影响）；渲染时仅更新 dirty quad
  - 与 `ProjectedCellLayer` 对接：Shroud 数据使用 `PPos` 索引（考虑高度投影后的屏幕覆盖）
- **依赖**：Task 31（Fog of War 基础逻辑），Task 9.1（CellLayer 事件驱动），Task 9.5（PPos 投影坐标）
- **验收**：单位移动后，新视野区域的 Shroud 边缘呈现自然的锯齿状/弧形过渡（非生硬矩形）；离开视野的单位所在格子变为 Fog（半透明覆盖），边缘同样有平滑过渡
- **状态**：[ ] `done`

### Task 9.8: 编辑器地形刷系统 (Tile Brush + FloodFill + Undo) ⚪ P3
- **目标**：实现 OpenRA 风格的地图编辑器地形刷：模板绘制（左键点刷/拖拽绘制）、`PickAny` 随机变体、Shift+FloodFill（相同地形类型区域填充）、Undo/Redo 操作栈。
- **文件**：`src/editor/brushes/EditorTileBrush.ts`, `src/editor/brushes/EditorResourceBrush.ts`, `src/editor/actions/EditorAction.ts`, `src/editor/MapEditor.ts`, `src/game/terrain/TerrainGrid.ts`
- **OpenRA 对标**：`EditorTileBrush.cs` + `EditorResourceBrush.cs` + `FloodFillEditorAction.cs` + `EditorDefaultBrush.cs`
- **关键变更**：
  - `TerrainGrid.setCellData()`：新增方法，支持编辑器精确恢复旧状态（含 terrainTile）
  - `EditorAction` 抽象基类：`do()` / `undo()` / `merge()`；`EditorTileAction` 批量记录 `oldData→newData`；`EditorResourceAction` 批量记录资源变化
  - `EditorTileBrush`：持有 `TerrainTemplateInfo`，`paintCell(cpos)` 放置完整模板 footprint（支持 1×1 和 2×2）；`floodFill(cpos)` BFS 填充相同 terrain type 的连通区域；`pickAny` 随机化 index
  - `EditorResourceBrush`：`paintCell(cpos)` 调用 `ResourceLayer.addDensity()`
  - `MapEditor`：管理 `tileBrush` / `resourceBrush`、Undo/Redo 双栈、工具切换、OpenRA 格式导出（`MapYaml` + `MapBinData`）；支持 canvas 鼠标事件（mousedown/mousemove/mouseup/shift+click）
  - `GameConsole` 命令：`editorLoadTileSet` / `editorSelectBrush` / `editorPaint` / `editorFloodFill` / `editorUndo` / `editorRedo` / `editorExport`
- **依赖**：Task 9.2（TileSet 提供模板数据），Task 9.3（ResourceLayer 提供资源数据），Task 9.5（Viewport 提供精确坐标转换）
- **验收**：
  - [x] 加载 temperat.json 后选中 Clear01 模板，在 (30,30) 绘制，getTerrainTile 返回 `{type:1, index:0}`
  - [x] 选中 2×2 CliffNE (id=100) 模板，在 (30,30) 绘制，4 个格子分别获得正确 index (0,1,2,3)
  - [x] pickAny 模板绘制时 index 在有效范围内
  - [x] FloodFill：3×3 Clear 区域被 Water 模板 flood fill 后全部变为 Water
  - [x] Undo 恢复绘制前状态（terrainTile 被清除）
  - [x] Redo 重新应用被撤销的操作
  - [x] 导出 OpenRA 格式：64×64 地图，binHeader format=11，tileCount=4096
  - [x] 全部 124 个 e2e 测试通过（123 稳定通过，1 个 flaky 为已有 Task 23.4 时序问题，与本次改动无关）
- **状态**：[x] `done`

> **📋 地形系统演进路线汇总**
>
> Task 9 完成基础骨架（`TerrainGrid` + `CellData` + 顶点色）。Task 9.1–9.8 按**建议执行顺序**递进：
> **9.1（CellLayer）→ 9.2（TileSet）→ 9.3（ResourceLayer）→ 9.4（Texture Splatting）→ 130（Height）→ 9.5（Coordinates）→ 9.6（Map Format）→ 9.7（Shroud）→ 9.8（Editor Brush）**

### Task 10: 地形材质与纹理系统

> **状态说明**：Task 10 基础骨架（顶点色三色地形）已完成。以下子任务是按 OpenRA 对标分析后制定的**扩展路线图**，将地形渲染从"程序化着色器原型"推进到"可加载真实 C&C 美术资源的混合渲染系统"。

- **总体目标**：在保持 Babylon.js 3D 引擎优势的前提下，实现与 OpenRA 地形生态兼容的多层渲染系统——底层用 Texture Splatting 提供自然过渡，关键 tile 用真实 sprite/decal 精确覆盖。
- **参考 C++**：`TERRAIN.CPP` 中的地形类型枚举。
- **OpenRA 对标**：`TerrainSpriteLayer.cs` + `TerrainRenderer.cs` + `DefaultTileCache.cs` + `SheetBuilder.cs`

---

#### Task 10.1: Splat Shader 扩展至 8 层 + 水面动画
- **目标**：当前 `TerrainSplatMaterial` 仅支持 4 层（grass/road/water/rock），无法覆盖全部地形类型。扩展至 8 层，覆盖 Beach、Rough、Tiberium、Snow/Wall；并为 Water 类型添加动态波纹。
- **文件**：`src/renderer/terrain/TerrainSplatMaterial.ts`, `src/renderer/terrain/ProceduralTextures.ts`, `src/game/terrain/TerrainGrid.ts`
- **关键变更**：
  - Fragment shader 增加 `beachTex` / `roughTex` / `tiberiumTex` / `snowTex`（或通用 `layer5-8`）
  - 新增 `time` uniform，Water 层 UV 做正弦扰动 `sin(time + uv * freq) * amp`
  - `landTypeToSplat` 映射表扩展至全部 `LandType` 枚举
- **依赖**：Task 9.4（基础 splat shader 已就位）
- **验收**：64×64 地图中同时出现草地、道路、水域、岩石、沙滩五种地形，Water 格子有可见波纹动画
- **状态**：[x] `done`

#### Task 10.2: Splat Map 渐变过渡
- **目标**：消除当前硬切边界。相邻不同 `LandType` 的格子之间应在 splat map 上产生 2–4 格的双线性权重渐变，使 shader 混合出自然过渡带。
- **文件**：`src/game/terrain/TerrainGrid.ts`
- **关键变更**：
  - `rebuildSplatMap()` 在写入 splat 权重后，对相邻异质地形做盒式模糊或线性插值
  - 过渡宽度可配置（默认 2 格），避免大面积同质化模糊
  - 保留悬崖/墙壁等需要硬边界的类型（通过 `TerrainTileInfo.rampType` 或 `LandType` 白名单控制）
- **依赖**：Task 10.1（8 层 splat 先就位）
- **验收**：草地→道路、道路→水域的交界处呈现 2–4 格的柔和渐变，无锯齿硬边
- **状态**：[x] `done`

#### Task 10.3: Splat 更新合并优化
- **目标**：当前 `updateSplatCell` 每格变更立即调用 `DynamicTexture.update()`，在 `ResourceLayer.tickResources()` 高频变更或大地图（256×256）场景下会造成 CPU→GPU 带宽 stall。
- **文件**：`src/game/terrain/TerrainGrid.ts`
- **关键变更**：
  - 引入 `dirtySplatCells: Set<string>` 缓冲队列
  - `CellEntryChanged` 触发时仅标记 dirty，通过 `requestAnimationFrame` 批量 flush
  - 研究 Babylon.js `DynamicTexture` 局部更新 API（如 `update()` 是否支持 dirty rect），或降级为 `RawTexture` + `updateRGBDAsync`
- **依赖**：Task 9.4（splat map 更新链路已存在）
- **验收**：连续 100 次 `setCellLandType` 调用在 1 帧内完成，仅触发 1 次 GPU texture upload
- **状态**：[x] `done`

#### Task 10.4: TileSet 真实 Sprite 加载（OpenRA 美术资源接入）
- **目标**：让 `DefaultTileCache` 从 OpenRA 原始的 `.shp`/`.tmp` 文件解析真实图像，替代 Canvas 2D 程序化纹理。这是与 OpenRA 生态兼容的核心步骤。
- **文件**：`src/game/terrain/DefaultTileCache.ts`, `src/renderer/terrain/ShpLoader.ts`（或 `TmpLoader.ts`）
- **关键变更**：
  - 实现 `.shp` 格式解析器（Westwood Sprite 格式，社区已有 JS 参考实现）
  - 将解析后的帧图像打包为 Babylon.js `Texture` atlas（类似 OpenRA 的 `SheetBuilder`）
  - `DefaultTileCache.resolve(tile)` 返回真实 `Texture` + UV rect，而非 fallback `LandType`
  - 回退机制：若真实图像缺失，继续使用 procedural texture
- **依赖**：Task 9.2（TileSet YAML 解析已就位）
- **验收**：加载 `temperat.yaml` + 对应 `.shp`/`.tmp` 后，`TerrainGrid` 显示真实 C&C 地形 sprite，不再是纯色方块
- **状态**：[x] `done`

#### Task 10.5: Macro Tile Decal 层
- **目标**：在 Texture Splatting 之上增加贴花（decal）层，用真实 sprite 精确覆盖关键地形特征（建筑地基、特殊悬崖、桥梁、道路标记）。实现"底层 shader 自然过渡 + 上层 sprite 精确还原"的混合视觉。
- **文件**：`src/renderer/terrain/TerrainDecalLayer.ts`
- **关键变更**：
  - 每个需要精确覆盖的 cell 生成一个贴花 mesh（Babylon `Decal` 或平铺 quad），贴附在 terrain surface 上
  - Decal 使用 `DefaultTileCache` 解析的真实 sprite texture + alpha 混合
  - 支持 `PickAny` 随机变体，与 OpenRA 的随机化逻辑一致
  - 非关键 cell（大面积草地/水域）不生成 decal，由 splat shader 负责，减少 draw call
- **依赖**：Task 10.4（真实 sprite 加载先就位）
- **验收**：同屏显示 100 个 decal tile，fps 不低于 55；悬崖边缘呈现原版像素精确形状，底部仍由 splat 草地自然过渡
- **状态**：[x] `done`

#### Task 10.6: Palette 索引 Shader 支持
- **目标**：C&C 原版大量 sprite 使用 Indexed（1-channel）+ Palette 查找。为 100% 还原原版视觉效果，shader 需支持 1-channel texture + 256-entry palette uniform。
- **文件**：`src/renderer/terrain/TerrainIndexedMaterial.ts`（或扩展 `TerrainSplatMaterial`）
- **关键变更**：
  - Shader variant：1-channel `sampler2D` + `vec4 palette[256]` uniform
  - 在 fragment stage 用 `texture2D(indexTex, uv).r * 255.0` 作为 palette 索引
  - 支持 OpenRA 的 `TextureChannel`（R/G/B/A 各存一个 palette 的 sprite）——通过 shader swizzle 选择通道
  - 与 `SpriteRenderer.SheetCount` 限制对齐：单 draw call 最多 8 个 atlas texture
- **依赖**：Task 10.4（真实 sprite 加载先就位）
- **验收**：同一个 atlas texture 的 R/G/B/A 四个通道分别映射到四个不同 palette 的 sprite，shader 正确渲染出四种不同颜色方案的地形
- **状态**：[x] `done`

---

> **📋 地形材质系统演进路线**
>
> Task 10 按**依赖顺序**递进：
> **10.1（8 层 Splat + 水面动画）→ 10.2（渐变过渡）→ 10.3（更新合并）→ 10.4（真实 Sprite 加载）→ 10.5（Decal 层）→ 10.6（Palette Shader）**

---

## Phase 3: 数据层与规则（Data Layer）

### Task 11: Rules 全局配置模块（翻译 RULES.CPP）
- **目标**：提取 C++ 中的全局常量（建造速度、伤害倍率、资源上限等）到 TS 常量对象。
- **文件**：`src/game/rules/GameRules.ts`, `src/game/rules/UnitDefinitions.ts`, `src/game/rules/BuildingDefinitions.ts`
- **数值来源**：`REDALERT/RULES.CPP`, `TIBERIANDAWN/RULES.CPP`。
- **验收**：打印 `GameRules.Tank.Speed` 能看到与 C++ 源码一致的数值。
- **状态**：[x] `done`

### Task 12: House（阵营/玩家）数据层
- **目标**：翻译 `HOUSE.CPP`，管理玩家、AI、中立阵营的属性（资金、电力、已建造单位列表）。
- **文件**：`src/game/house/House.ts`, `src/game/house/HouseManager.ts`
- **验收**：创建两个 House（GDI 与 Nod），各自拥有独立资金与单位列表。
- **状态**：[x] `done`

> **Task 12 架构升级任务索引**（按实现阶段分布）：
> | 任务 | 阶段 | 内容 | 优先级 |
> |------|------|------|--------|
> | Task 23.32 | Phase 5 | 电力系统自动汇总（建筑自注册） | 🟡 P1 |
> | Task 27.5 | Phase 6 | 外交关系系统（Ally/Enemy/Neutral） | 🔴 P0 |
> | Task 27.6 | Phase 6 | Bot 类型支持（rush/normal/defensive） | 🟢 P2 |
> | Task 100 | Phase 6.5 | House 类拆分（God Class → 子模块） | 🟡 P1 |
> | Task 101 | Phase 6.5 | 科技树 Watcher（自动维护可建造列表） | 🟡 P1 |
> | Task 30.5 | Phase 7 | 经济双轨化（Cash + Resources） | 🔴 P0 |
> | Task 51.5 | Phase 10 | 立场着色（关系着色 UI） | 🟢 P2 |
> | Task 68.5 | Phase 12 | 观战者身份系统 | 🟢 P2 |

### Task 13: 地图加载器与序列化
- **目标**：定义地图数据结构（二维 Cell 数组），支持从 JSON 加载地图。先使用 Dummy 地图数据。
- **参考 C++**：地图文件解析逻辑（简化版）。
- **文件**：`src/game/terrain/MapLoader.ts`, `src/game/terrain/GameMap.ts`
- **Dummy 资源**：`public/maps/dummy_map.json` — 64x64 的 JSON 地形数据。
- **验收**：加载 JSON 后，TerrainGrid 正确渲染对应地形。
- **状态**：[x] `done`

### Task 14: 游戏对象工厂（GameObject Factory）
- **目标**：统一创建 Unit / Building 的工厂，分配唯一 ID，注册到场景与逻辑层。
- **文件**：`src/game/GameObjectFactory.ts`
- **验收**：调用 `Factory.createUnit('MediumTank', owner, cell)` 后，场景中立即出现对应 Dummy 单位。
- **状态**：[x] `done`

---

## Phase 4: 单位系统（Unit System）

### Task 15: UnitClass 核心属性与状态机（翻译 UNIT.CPP）
- **目标**：翻译 `UnitClass` 的核心属性：Health, Speed, Armor, Ammo, Mission（状态）。
- **状态机**：`Idle`, `Moving`, `Attacking`, `Dying`, `TurretTracking`。
- **文件**：`src/game/unit/Unit.ts`, `src/game/unit/UnitState.ts`
- **数值沿用**：直接引用 Task 11 的 `UnitDefinitions`。
- **步兵定义**：`UnitDefinitions.ts` 已扩展 9 种步兵（步枪兵/掷弹兵/火箭兵/喷火兵/工程师/谭雅/间谍/医疗兵/军犬），数值交叉核对 `origin/REDALERT/IDATA.CPP` + `RULES.INI` 默认值。
- **验收**：创建单位后，控制台打印属性与 C++ 默认值一致；场景中可见步兵与载具共存。
- **状态**：[x] `done`

### Task 16: Unit 3D 表现层（Dummy 几何体）
- **目标**：为每种单位类型创建 Babylon.js 程序化几何体组合。
- **Dummy 方案**：
  - 坦克：`Box` 车身 + `Cylinder` 炮塔 + `Box` 炮管，颜色区分阵营。
  - 步兵：`Cylinder` 身体 + `Box` 头部 + `Box` 武器，特殊标记区分工程师/谭雅/医疗兵/狗。
  - 选择环：`Torus` 悬浮于单位底部。
- **文件**：`src/renderer/meshes/UnitMeshFactory.ts`
- **数值来源**：`origin/REDALERT/IDATA.CPP`（步兵外形参考 `HumanShape[32]` 与 `MasterDoControls`）。
- **验收**：场景中生成 4 辆以上不同外形车辆（坦克/轮式）+ 8 名以上不同外形步兵，可见且可按阵营颜色与几何外形区分。
- **状态**：[x] `done`

### Task 17: 单位移动与寻路（A* + 插值动画）
- **目标**：翻译 C++ 寻路逻辑。格子地图使用 A* 算法，世界坐标使用 Babylon `Animation` 或每帧插值移动。
- **参考 C++**：`UNIT.CPP` 中的 `Find_Path()`, `Set_Destination()`, `AI()`；`FINDPATH.CPP` 中 `#define DIAGONAL` 支持八方向。
- **文件**：`src/game/unit/UnitMovement.ts`, `src/game/terrain/Pathfinder.ts`
- **数值沿用**：移动速度直接取自 `UnitDefinitions.Speed`。
- **验收**：右键点击地面，单位沿格子路径平滑移动，避开不可通行地形；支持八方向移动（含对角线），斜向目标不再走 L 形路径。
- **备注**：
  - 八方向 A*：邻居含 4 正交（cost=1）+ 4 对角线（cost=√2≈1.414），启发函数使用切比雪夫距离。
  - 对角线剪枝（Corner Cutting）：沿对角线移动时，必须同时验证两个正交相邻格子可通行，防止穿墙。
- **状态**：[x] `done`

### Task 18: 单位转向与炮塔追踪
- **目标**：移动时车身平滑转向目标；进入攻击范围后炮塔独立旋转追踪敌人。
- **参考 C++**：`UNIT.CPP` 中的 `Rotation` 与 `TurretFacing` 逻辑。
- **文件**：`src/game/unit/UnitRotation.ts`, `src/renderer/meshes/UnitMeshFactory.ts`
- **验收**：坦克移动时车身转向目标；停止后炮塔旋转指向敌人。
- **状态**：[x] `done`

### Task 19: 单位碰撞与避障（简单版）
- **目标**：单位之间保持最小间距，路径被阻挡时重新寻路或等待。
- **文件**：`src/game/unit/UnitCollision.ts`, `src/game/unit/UnitMovement.ts`
- **验收**：两个单位相向而行时，不会重叠，其中一个会暂停或绕行。
- **状态**：[x] `done`

---

## Phase 5: 建筑系统（Building System）

### Task 20: BuildingClass 核心属性（翻译 BUILDING.CPP）
- **目标**：翻译 `BuildingClass`：Health, PowerDrain/Production, Cost, BuildTime, Adjacency 规则。
- **文件**：`src/game/building/BuildingController.ts`, `src/game/building/BuildingState.ts`, `src/game/objects/Building.ts`
- **数值沿用**：引用 `BuildingDefinitions`（新增 `buildTime` 字段）。
- **验收**：创建电厂与兵营，属性与 C++ 默认值一致；建造时从地面生长，受损时发红光。
- **状态**：[x] `done`

### Task 21: Building 3D 表现层（Dummy 几何体 + 建造动画）
- **目标**：建筑用组合几何体表示，建造过程中有从地面"生长"的缩放动画。
- **Dummy 方案**：
  - 建造厂：底座 + 主楼 + 控制塔 + 起重机臂
  - 电厂：厂房 + 烟囱 + 烟囱顶
  - 先进电厂：大厂房 + 双烟囱 + 冷却塔
  - 兵营：营房 + 门 + 旗杆 + 红旗
  - 矿厂：主体 + 双筒仓 + 传送带支架
  - 战车工厂：大厂房 + 车库门 + 天线
  - 雷达：主体 + 支架 + 雷达盘
  - 停机坪：平台 + H 标记 + 灯柱
  - 维修厂：平台 + 维修槽 + 起重机
  - 船坞：建筑 + 船坞平台 + 龙门吊
  - 建造动画：root mesh `scaling` 0→1，底部始终贴地（Y=0）
- **文件**：`src/renderer/meshes/BuildingMeshFactory.ts`, `src/game/objects/Building.ts`
- **验收**：放置建筑时，看到从地底升起的动画，且每种建筑外形可区分。
- **状态**：[x] `done`

### Task 22: 建造队列与 Sidebar UI
- **目标**：翻译 C++ 建造队列逻辑。Babylon.GUI 侧边栏显示可建造项，点击后进入"准备放置"状态，再点击地面确认建造。
- **参考 C++**：`BUILDING.CPP` 中的 `Begin_Construction()`, `Place()`。
- **文件**：`src/game/building/ConstructionQueue.ts`, `src/game/building/BuildingPlacer.ts`, `src/renderer/ui/Sidebar.ts`
- **实现细节**：
  - `ConstructionQueue`：每个 House 一个队列，一次一项。资金在点击时扣除，取消建造全额退款。
  - `BuildingPlacer`：半透明 Ghost Box 跟随鼠标，合法=绿色/非法=红色，验证地形+建筑重叠+地图边界。
  - `Sidebar`：Babylon.GUI 右侧面板，显示建筑名称/价格/进度条。按钮状态：可用(绿)/资金不足(红)/锁定(灰)/建造中(进度条)/就绪(闪烁金)。
- **验收**：点击 Sidebar 的"电厂"，资金扣除并显示进度；就绪后点击进入放置预览；左键空地确认建造，右键取消放置。
- **状态**：[x] `done`

### Task 23: 电力与基地依赖系统
- **目标**：电力不足时部分建筑停摆；建造兵营后才能造步兵；建造战车工厂后才能造坦克。
- **参考 C++**：`BUILDING.CPP` 中的 `Powered()` 与 `Can_Make()`。
- **文件**：`src/game/building/PowerManager.ts`, `src/game/building/TechTree.ts`
- **验收**：卖掉所有电厂后，雷达与防御塔停止工作；未建兵营时 Sidebar 步兵图标灰色不可点。
- **状态**：[x] `done`

### Task 23.32: 电力系统自动汇总重构 🟡 P1
- **目标**：当前电力由外部显式调用 `house.updatePower(production, consumption)` 更新，容易遗漏导致电力显示不同步。改为建筑自注册模式，由 `HousePower` 模块自动追踪每个建筑的电力贡献。
- **文件**：`src/game/house/HousePower.ts`, `src/game/building/Building.ts`
- **OpenRA 对标**：`OpenRA.Mods.Common/Traits/Power/Player/PowerManager.cs`
- **关键变更**：
  - `HousePower` 模块：维护 `Map<buildingId, {provide, drain}>`，自动计算总电力
  - 建筑 `onPlaced()` 时自注册电力贡献到所属 House
  - 建筑 `onDestroyed()` / `onSold()` 时自动注销
  - 低电力状态变化时触发事件，通知受影响的建筑（雷达、防御塔等）
- **依赖**：Task 20–23（建筑系统已稳定）
- **验收**：建造电厂后电力自动增加；卖掉电厂后电力自动减少；整个过程无需外部手动调用 `updatePower()`。
- **状态**：[ ] `done`

---

## Phase 5.5: 寻路碰撞系统重构（OpenRA 对齐）

> 本 Phase 为**插入式重构任务**，目标是将当前简化版寻路/碰撞系统（Task 17/19 的临时实现）逐步替换为与 OpenRA 功能对齐的可靠架构。完成后 Phase 6 及后续功能将建立在可靠的移动底层之上。
>
> **本轮重构已完成（Task 102–112）**：
> - ActorMap 格子占用映射、UnitCollision 四级阻塞检测、双格占用（fromCell/toCell）
> - 完整 fallback 链（Wait→CellIsEvacuating→Repath→Nudge→Backup→GiveUp）
> - Locomotor 配置层 + TerrainSpeeds + SubCell 步兵共享 + NotifyBlocker 响应
> - 密集场景压力测试（桥梁交叉、Corner Cutting、60s 无死锁）
> - 框选 + 群体移动（Task 111 + 24 合并）
> - evaluateNearestMovableCell + close-enough 到达容忍度（Task 112）
>
> **OpenRA 参考**（仅借鉴核心概念，不直译 C# trait 系统）：
> - `OpenRA.Mods.Common/Traits/World/ActorMap.cs` — 格子占用映射
> - `OpenRA.Mods.Common/Traits/World/Locomotor.cs` — `BlockedByActor` 分级 + CellFlag 缓存
> - `OpenRA.Mods.Common/Pathfinder/HierarchicalPathFinder.cs` — 分层寻路与 DomainIndex
> - `OpenRA.Mods.Common/Activities/Move/Move.cs` — `PopPath()` 阻塞 fallback 链
> - `OpenRA.Mods.Common/Activities/Move/Nudge.cs` — 空闲单位避让
> - `OpenRA.Mods.Common/Activities/Move/MoveWithinRange.cs` + `Follow.cs` — 移动活动变体

### Task 102: ActorMap — 格子占用映射
- **目标**：实现一个极简的格子级单位占用映射。key = `"x,y"`，value = 该格子内的单位 ID 集合。每个单位只在其当前 `Math.round(x), Math.round(y)` 位置注册。
- **文件**：`src/game/world/ActorMap.ts`
- **接口**：`occupy(id, x, y)` / `vacate(id, x, y)` / `move(id, fx, fy, tx, ty)` / `getOccupants(x, y)` / `isOccupied(x, y)` / `getAllOccupiedCells()`
- **验收**：创建 5 辆坦克，ActorMap 查询每个坦克所在格子返回正确 ID；移动后旧格子清空、新格子有记录。
- **状态**：[x] `done`

### Task 103: UnitCollision 重构 — 格子级阻塞查询
- **目标**：彻底替换当前浮点距离检测。`isPositionBlocked` 和 `getBlockedCells` 改为查询 ActorMap 的格子占用状态。移除 `MIN_SEPARATION` 浮点阈值。
- **文件**：`src/game/unit/UnitCollision.ts`
- **关键变更**：
  - `isPositionBlocked(x, y, excludeId)` → 查询 `Math.round(x), Math.round(y)` 是否被其他单位占用
  - `getBlockedCells(excludeId)` → 返回 ActorMap 中所有被占格子的 `"x,y"` 集合
  - 建筑阻塞仍由 Pathfinder 的动态回调处理，此处不再包含建筑
- **验收**：两辆坦克相距 1 格，各自朝对方移动；第一步 A* 就把对方位置视为阻塞，路径自动绕开。
- **状态**：[x] `done`

### Task 104: UnitMovement 重构 — 自驱阻塞 fallback 链
- **目标**：实现自驱式阻塞处理基础链：暂停 → 等待 → 重寻路 → Nudge → GiveUp。保留 `fromCell`/`toCell` 占位用于后续双格升级。
- **文件**：`src/game/unit/UnitMovement.ts`
- **阻塞处理逻辑**：
  1. 移动中检测到下一步目标格被占 → 暂停（不前进）
  2. 等待 `WAIT_DURATION_MS`（400ms + unitId 哈希偏移），期间面朝目标
  3. 重寻路到**原始目标** `controller.moveTarget`（起点 = 当前 `Math.round(x), Math.round(y)`）
  4. 如果找到路径 → 走新路径，重置等待状态
  5. 如果 3 次重寻路都失败 → 找相邻空闲格（nudge），朝该格移动一步后回到 Idle
  6. 如果连 nudge 也找不到 → GiveUp，停止，进入 Idle
- **关键约束**：重寻路终点**必须是原始目标**，绝不使用当前被阻塞的路径节点。
- **验收**：两辆坦克相向而行碰撞后，等待片刻自动绕开对方，最终都到达目标点。
- **状态**：[x] `done`

### Task 105: 双格占用（Dual-Cell Occupancy）
- **目标**：将 ActorMap 占用从单格升级为双格（OpenRA FromCell + ToCell）。移动中单位同时注册当前格和下一格，解决交叉移动穿透问题。
- **文件**：`src/game/unit/Unit.ts`, `src/game/unit/UnitMovement.ts`, `src/game/objects/Unit.ts`
- **关键变更**：
  - `UnitController` 新增 `fromCellX/Y`、`toCellX/Y`、`isMovingBetweenCells`
  - `UnitMovement.moveTo()` 初始化双格占用；`update()` 到达节点时更新 `fromCell = toCell`
  - `Unit.update()` 使用 diff-based ActorMap 同步（`lastOccupiedCells` vs `getOccupiedCells()`）
- **验收**：两辆车交叉移动（A: (30,30)→(32,30)，B: (32,30)→(30,30)）不会穿透。
- **状态**：[x] `done`

### Task 106: BlockedByActor 四级阻塞分级
- **目标**：引入 OpenRA 风格的四级阻塞分级：`All` → `Stationary` → `Immovable` → `None`。Pathfinder 和 UnitCollision 支持按级别过滤阻塞者。
- **文件**：`src/game/unit/BlockedByActor.ts`, `src/game/unit/UnitCollision.ts`, `src/game/terrain/Pathfinder.ts`
- **关键变更**：
  - 新增 `BlockedByActor` 枚举
  - `UnitCollision.isPositionBlocked()` 和 `getBlockedCells()` 支持 `check` 参数
  - `Pathfinder.findPath()` 支持 `check` 参数，根据级别决定是否将某格视为阻塞
- **验收**：`Stationary` 级别忽略移动中单位；`None` 级别完全忽略所有单位阻塞。
- **状态**：[x] `done`

### Task 107: Fallback 链完整实现
- **目标**：实现 OpenRA 风格的完整阻塞处理链：Wait → CellIsEvacuating → Repath(四级回退) → Nudge → Backup → GiveUp。解决 head-on 相向而行死锁。
- **文件**：`src/game/unit/UnitMovement.ts`, `src/game/terrain/Pathfinder.ts`
- **关键变更**：
  - `cellIsEvacuating()`：检查格子内所有 occupants 是否都在离开（`isMovingBetweenCells && toCell ≠ 当前格`）
  - `Pathfinder` 新增 `allowBlockedEnd` 参数：终点允许被移动中的单位暂时占用，因为对方可能正在离开
  - Repath 时拒绝与当前路径完全相同的结果，避免无限循环
  - `notifyBlockersAt` / `onNotifyBlockingMove` 骨架预埋（Task 109 实现响应）
- **验收**：
  1. CellIsEvacuating：B 离开 (31,30) 时，A 等待而非 repath
  2. Repath fallback：静止阻塞者挡住路径时，A 自动绕路
  3. Head-on：两车相向而行，最终都到达目标无死锁
- **状态**：[x] `done`

### Task 108: Locomotor 配置层 + TerrainSpeeds
- **目标**：建立 OpenRA 风格的 Locomotor 配置层，将移动属性从"硬编码/全局统一"改为"按单位类型配置"。
- **文件**：`src/game/rules/Locomotor.ts`, `src/game/terrain/Pathfinder.ts`, `src/game/unit/UnitMovement.ts`
- **OpenRA 对标**：`LocomotorInfo`（`WaitAverage`、`WaitSpread`、`SharesCell`、`TerrainSpeeds`）
- **关键变更**：
  - 新建 `Locomotor` 配置类，按 `UnitDefinitions.locomotion`（Foot/Track/Wheel）映射不同移动规则
  - `Foot`：步兵，`SharesCell: true`，可穿过岩石缝隙（`TerrainSpeeds` 中岩石代价 > 0）
  - `Track`/`Wheel`：车辆，`SharesCell: false`，不可穿过岩石（`TerrainSpeeds` 中岩石代价 = 0 / 不可通行）
  - `UnitMovement` 的 `WAIT_DURATION_MS` / `WAIT_SPREAD_MS` 改为从 Locomotor 读取
  - `Pathfinder` 的 A* 边代价从固定值改为按 Locomotor `TerrainSpeeds` 计算：`cost = distance / terrainSpeed`
- **验收**：同一地图，步兵路径穿过岩石缝隙，车辆路径自动绕开岩石；步兵与车辆的寻路代价不同。
- **状态**：[x] `done`

### Task 109: SubCell 步兵共享 + NotifyBlocker 完整实现
- **目标**：基于 Locomotor 的 `SharesCell` 实现步兵共享格子，并完成阻塞者的主动避让响应。
- **文件**：`src/game/world/ActorMap.ts`, `src/game/unit/UnitCollision.ts`, `src/game/unit/Unit.ts`
- **OpenRA 对标**：`LocomotorInfo.SharesCell` + `Mobile.OnNotifyBlockingMove` → `Nudge`
- **关键变更**：
  - `UnitCollision.isCellBlockedByActor`：检查 occupants，若**全是步兵**（所有 occupant 的 `Locomotor.SharesCell === true`）则放行
  - `Pathfinder.getBlockedCells`：同上，全是步兵的格子不加入阻塞集合
  - `UnitController.onNotifyBlockingMove`：从骨架变为完整实现。若阻塞者 `IsIdle`，向旁边移动一格（Nudge/Scatter）
- **验收**：5 名步枪兵站在同一格子，互相不阻塞；1 辆坦克驶入该格时，步兵被推开（或坦克绕开）。
- **状态**：[x] `done`

### Task 110: 密集场景压力测试
- **目标**：在狭窄地形（如桥梁、峡谷）中测试 10+ 单位交叉移动，验证无死锁、无穿透、无异常漂移。
- **文件**：`src/main.ts`（测试场景）、`src/game/unit/UnitMovement.ts`、`src/game/terrain/Pathfinder.ts`
- **关键变更**：
  - **桥梁场景**：北侧 10 辆 Nod + 南侧 1 辆 GDI，通过 2 格宽桥梁交叉过桥
  - **对角线剪枝（Corner Cutting）**：`Pathfinder.ts` 和 `UnitMovement.ts` 中对角线移动时检查 `getTerrainCost <= 0`，防止 Track 车辆穿过 Rock 墙角
  - **Nudge/Backup 剪枝**：`findNudgeCell` 和 `findBackupCell` 中对角线方向增加 Corner Cutting 检查
  - **阻塞弹回平滑化**：车辆移动被阻塞时不再弹回 `fromCell + 0.1`，而是限制在 `fromCell` 边界内（maxOffset=0.499），消除视觉抖动
  - **GameConsole 增强**：`cnc.pathfind` 支持指定 `locomotion` 参数
  - **e2e 测试**：`task-110-crossBridge.spec.ts`（60s 过桥验证）+ `task-110-cornerCutting.spec.ts`（A* 对角线剪枝 + 60s Rock 压力测试）
- **验收**：10 辆坦克分别从地图两侧出发前往对侧，所有单位最终到达目标或合理停止（无死锁）；60s 压力测试无车辆进入 Rock 格子；A* Track 路径不切割 Rock 墙角。
- **状态**：[x] `done`

### Task 111 + 24: 框选多单位 + 群体移动
- **目标**：将鼠标输入层（框选/点击/群体移动）与重构后的寻路碰撞系统对接。左键框选，右键对每个选中单位独立下达移动命令。
- **文件**：`src/core/InputManager.ts`, `src/core/RTSCamera.ts`, `src/core/SelectionBox.ts`, `src/game/SelectionManager.ts`, `src/main.ts`
- **OpenRA 对标**：`MoveOrderGenerator` — 为每个选中单位生成独立的 `Move` 活动，各单位独立寻路到目标附近；`World.Selection` 不随移动命令清空
- **关键变更**：
  - `InputManager` 集中管理输入分发：`pickUnitAt`（1.5 格半径命中）、`handleLeftDragEnd`（框选 AABB）、`handleRightClick`（群体移动/攻击）
  - `RTSCamera` 提供 `onLeftDragStart/Move/End` 回调 + `rightButtonPressedDuringLeftDrag` 组合键保护
  - `SelectionBox`：Babylon.GUI Rectangle，锚点 LEFT/TOP，内部自动处理 DPR 转换
  - 右键移动后**保留选中**（OpenRA Modern 模式）
- **验收**：框选 3+ 单位命中正确；右键移动命令同步下达给所有选中单位；40 个 e2e 测试全部通过。
- **状态**：[x] `done`

### Task 112: evaluateNearestMovableCell + close-enough 到达容忍度
- **目标**：解决"多单位被命令到同一目标格子时，后到达者无限重试/抖动"的问题。
- **文件**：`src/game/unit/UnitMovement.ts`
- **OpenRA 对标**：`Mobile.NearestMoveableCell` + `Move.PopPath` 中 `nearEnough` 判定
- **关键变更**：
  - `findNearestMovableCell`：移动前在目标周围半径 1-10 环形搜索第一个可用格子，使用 `BlockedByActor.Immovable`（与 OpenRA 一致）
  - `hasStationaryVehicleBlocker`：只在阻塞者包含**静止车辆**时触发 close-enough，保护 CellIsEvacuating（移动中阻塞者）和 Nudge（步兵阻塞者）
  - close-enough 条件：`isFinalDestination && chebDist <= 2 && canStayInCell`
- **验收**：3 辆坦克右键同一空地，先到者占中心，后到者自动分散到相邻空闲格；CellIsEvacuating / Head-on / SubCell Nudge 测试无回归。
- **状态**：[x] `done`

---

## Phase 5.5 续：寻路碰撞系统深度对齐（OpenRA 核心能力缺口）

> 以下任务基于 OpenRA 源码 Cross Check 结果，将当前项目尚未实现的寻路/移动核心能力补齐。按**优先级**排序：性能层（113–116）→ 机动性层（117–118）→ 活动变体层（119–120）→ **OpenRA 核心能力缺口回填（121–132）**。
> 参考：`harness/05_OPENRA_ANALYSIS.md` §移动系统深度分析、§地形系统深度分析。
>
> **缺口回填优先级**：🔴 P0（性能/数据核心，100+单位或地图数据瓶颈）→ 🟡 P1（架构/表现，50+单位体验或地形真实感）→ 🟢 P2（细节优化/渲染升级）→ ⚪ P3（扩展性/调参/编辑器）。

### Task 113: Locomotor Cache / CellFlag — 阻塞状态缓存层
- **目标**：将每格阻塞状态从 O(occupants) ActorMap 查询改为 O(1) CellFlag 位域缓存。每个格子维护 `HasMovingActor | HasStationaryActor | HasCrushableActor | HasTemporaryBlocker` 标志，单位状态变更时标记 dirty，延迟重建。
- **文件**：`src/game/world/LocomotorCache.ts`（或扩展 `ActorMap.ts`）
- **OpenRA 对标**：`OpenRA.Mods.Common/Traits/World/Locomotor.cs` 中 `CellFlag` enum + `blockingCache` + `UpdateCellBlocking`
- **关键变更**：
  - 新建 `CellFlag` 位域（byte 大小）：`HasFreeSpace=0`, `HasMovingActor=1`, `HasStationaryActor=2`, `HasMovableActor=4`, `HasCrushableActor=8`, `HasTemporaryBlocker=16`
  - `LocomotorCache`：二维数组 `CellCache[][]`，每个 cell 存储 `CellFlag` + `Immovable` bitset
  - 延迟更新：`dirtyCells` Set，首次查询时重建
  - `UnitCollision` 和 `Pathfinder` 优先查缓存，缓存无法裁决时回退 ActorMap
- **依赖**：Task 118（Crush Logic）需要 `HasCrushableActor` 标志
- **验收**：50+ 单位同屏时，`getBlockedCells` 和 `findPath` 耗时降低 > 50%（Chrome DevTools Performance 验证）
- **状态**：[x] `done`

### Task 114: Hierarchical Pathfinding / DomainIndex — 分层寻路与区域索引
- **目标**：将地图划分为 10×10 网格，构建抽象图。通过 flood-fill 为每个连通区域分配 domain ID。寻路前 O(1) 判断起点与终点是否在同一 domain，不可达时直接返回 null，避免 A* 遍历整张地图。
- **文件**：`src/game/terrain/HierarchicalPathfinder.ts`
- **OpenRA 对标**：`OpenRA.Mods.Common/Pathfinder/HierarchicalPathFinder.cs`
- **关键变更**：
  - 抽象图构建：每个 10×10 网格内 flood-fill 找到连通区域，每个区域为一个抽象节点
  - 抽象边：相邻网格的连通区域之间建立边（含跨层边）
  - Domain 索引：`abstractDomains: Map<abstractNode, domainId>`，通过 flood-fill 赋值
  - 快速拒绝：`sourceDomain !== targetDomain` 时直接返回 `NoPath`
  - 两层缓存：terrain-only（BlockedByActor.None）和 terrain+immovable（BlockedByActor.Immovable）
- **验收**：128×128 地图中，起点与终点被水域/悬崖隔开时，寻路在 <1ms 内返回 null，A* openSet 为空
- **状态**：[x] `done`

### Task 115: Bidirectional A* + Predicate Search — 双向寻路与条件目标搜索
- **目标**：1) 实现双向 A*（从起点和终点同时扩展），在大地图上减少搜索空间。2) 实现 Predicate Search：给定条件函数（如"找到最近的可达敌方单位"），A* 搜索到第一个满足条件的格子即停止。
- **文件**：`src/game/terrain/Pathfinder.ts` 扩展或 `src/game/terrain/BidirectionalPathSearch.ts`
- **OpenRA 对标**：`PathSearch.FindBidiPath` + `ToTargetCellByPredicate`
- **关键变更**：
  - 双向 A*：维护两个 openSet（正向/反向），交替扩展，相遇时 reconstruct
  - Predicate Search：`findPathToPredicate(startX, startY, predicate, maxDistance?)`，遇到满足 `predicate(x,y)` 的节点即返回路径
  - 保持现有 `findPath` API 不变，新增重载
- **验收**：256×256 大地图上双向 A* 比单向快 30%+；Predicate Search 能在 10 步内找到"距离起点最近的敌方可见单位"
- **状态**：[x] `done`

### Task 116: MoveCooldownHelper — 重寻路频率限制
- **目标**：为 `Move` 和 `Follow` 活动引入冷却机制，防止追逐移动目标时频繁 repath。冷却时间按距离动态调整（越近冷却越短）。
- **文件**：`src/game/unit/MoveCooldownHelper.ts`
- **OpenRA 对标**：`OpenRA.Mods.Common/Activities/Move/MoveCooldownHelper.cs`
- **关键变更**：
  - 冷却公式：`cooldown = base + distance * factor`，单位越近冷却越短（快速响应），越远冷却越长（避免 spam）
  - 与 `handleBlocked` 的 repath 整合：repath 前检查冷却，未冷却时继续等待而非立即重寻路
  - 强制刷新：收到新移动命令时重置冷却
- **验收**：单位跟随移动目标时，repath 频率从每帧 1 次降至每秒 2-5 次，移动轨迹平滑无抖动
- **状态**：[x] `done`

### Task 117: Turn Speed / Pre-movement Turn — 转向机制
- **目标**：为每个 Locomotor 定义 `TurnSpeed`（每 tick 最大转向角度）。支持 `TurnsWhileMoving` 模式：false 时单位必须在格子边界停下来完成转向后才能进入下一格；true 时边走边转，使用 `TickFacing` 逐步插值。非连续方向变化（如 U-turn）使用弧线轨迹。
- **文件**：`src/game/rules/Locomotor.ts`, `src/game/unit/UnitRotation.ts`, `src/game/unit/UnitMovement.ts`
- **OpenRA 对标**：`MobileInfo.TurnSpeed` + `Turn` activity + `MoveFirstHalf.IsTurn`
- **关键变更**：
  - `LocomotorInfo` 新增 `turnSpeed: number`（角度/秒）和 `turnsWhileMoving: boolean`
  - `Turn` 活动：单位在格子边界停下，逐 tick 旋转 `TurnSpeed`，完成后恢复移动
  - 弧线轨迹：当方向变化 > 90° 且 `TurnsWhileMoving=false` 时，使用椭圆弧插值替代直线移动
  - 插值转向：`TurnsWhileMoving=true` 时，`UnitRotation.updateBodyFacing` 改为 `TickFacing` 逐步逼近
- **验收**：重型坦克（TurnsWhileMoving=false）从北转向东时，会在格子边界停下、车身旋转 90° 后再前进；轻坦（TurnsWhileMoving=true）边移动边平滑转向，无滑步感
- **状态**：[x] `done`

### Task 118: Crush Logic — 碾压逻辑
- **目标**：为 Locomotor 添加 `Crushes` 类别（如 `"infantry"`）。车辆进入格子前 `WarnCrush` 通知可碾压单位（触发 `Nudge` 躲避）；进入后 `OnCrush` 直接击杀。`CellFlag` 缓存加速可碾压判定。
- **文件**：`src/game/rules/Locomotor.ts`, `src/game/unit/Crushable.ts`, `src/game/unit/UnitMovement.ts`
- **OpenRA 对标**：`Locomotor.Crushes` + `Crushable` trait + `EnteringCell`/`FinishedMoving`
- **关键变更**：
  - `LocomotorInfo` 新增 `crushes: string[]`（如 `["infantry"]`）
  - `Crushable` 接口/类：定义 `crushableBy(crusher, crushClasses): boolean` + `onCrushWarn` + `onCrush`
  - `WarnCrush`：进入格子前通知 occupant，75% 概率触发 Nudge 躲避
  - `OnCrush`：`UnitMovement.update` 中到达目标格后，对未被 Nudge 的 crushable 单位执行击杀
  - `CellFlag.HasCrushableActor`：Locomotor Cache 中标记该格有可被碾压单位
- **依赖**：Task 113（Locomotor Cache 提供 `HasCrushableActor` 标志）
- **验收**：坦克驶入步兵格子时，步兵有 75% 概率被警告并 Nudge 躲开；若未躲开则被碾压击杀，步兵状态变为 `Dying`
- **状态**：[x] `done`

### Task 119: MoveWithinRange + Follow — 范围移动与跟随活动
- **目标**：实现 `MoveWithinRange`：在目标 min/max 环形范围内寻找可达格子停止（用于远程单位攻击就位）。实现 `Follow`：持续跟随目标，使用 MoveCooldownHelper 防 spam-repath。
- **文件**：`src/game/unit/activities/MoveWithinRange.ts`, `src/game/unit/activities/Follow.ts`
- **OpenRA 对标**：`MoveWithinRange.cs` + `Follow.cs`
- **关键变更**：
  - `MoveWithinRange`：继承/复用 `UnitMovement`，目标变为"任意满足 `minRange <= distance <= maxRange` 的可达格子"，A* 在到达容忍范围内即可停止
  - `Follow`：每 tick 检测目标位置，超出跟随距离时触发 `MoveWithinRange(target, 0, followRange)`；使用 MoveCooldownHelper 限制 repath
  - `UnitController` 扩展：支持 `moveWithinRange(target, minRange, maxRange)` 和 `follow(target, range)` API
- **依赖**：Task 116（MoveCooldownHelper）
- **验收**：火箭兵被命令攻击移动时，在距目标 5 格处停下并进入攻击状态；跟随友方 MCV 时保持 3 格距离平滑跟随，MCV 停下后火箭兵也停下
- **状态**：[x] `done`

### Task 120: PathGraph 抽象与 ICustomMovementLayer 预留 — 寻路图与多层移动架构
- **目标**：1) 抽象 `IPathGraph` 接口，支持不同移动层的邻居生成和代价计算。2) 预留 `ICustomMovementLayer` 接口（Entry/Exit 代价、层索引），为隧道、地下、跳跃喷气、高架桥、空军/海军层做准备。3) 当前仅实现 GroundLayer，其他层为骨架。
- **文件**：`src/game/terrain/IPathGraph.ts`, `src/game/terrain/ICustomMovementLayer.ts`, `src/game/terrain/GroundPathGraph.ts`
- **OpenRA 对标**：`IPathGraph.cs` + `ICustomMovementLayer.cs` + `DensePathGraph.cs`
- **关键变更**：
  - `IPathGraph`：接口定义 `getConnections(source, targetPredicate)` + `getCost(node)`
  - `GroundPathGraph`：当前 `Pathfinder` 的核心邻居生成逻辑迁移至此
  - `ICustomMovementLayer`：接口定义 `index`, `enabledForLocomotor`, `entryCost`, `exitCost`, `centerOfCell`
  - `Pathfinder` 重构：从直接管理邻居生成改为持有 `IPathGraph` 实例，支持多层切换
- **状态**：[x] `done`
  - 预留层类型：`Tunnel=1`, `Subterranean=2`, `Jumpjet=3`, `ElevatedBridge=4`
- **验收**：代码结构支持未来添加 `SubterraneanLayer`、`JumpjetLayer`、`TerrainTunnelLayer` 而不修改 `Pathfinder` 核心 A* 逻辑；现有所有 e2e 测试通过

### Task 121: A* 优先队列（Binary Heap）— 寻路 Open 集合优化 🔴 P0
- **目标**：将 `Pathfinder` 中线性数组扫描找最小 `f`（O(n)）替换为二叉堆（O(log n)）。解决 100+ 单位同屏时寻路性能瓶颈。
- **文件**：`src/game/terrain/BinaryHeap.ts`, `src/game/terrain/Pathfinder.ts`
- **OpenRA 对标**：`PathSearch.cs` 中的 `PriorityQueue` + `GraphConnection.CostComparer`
- **关键变更**：
  - 新建 `BinaryHeap<T>` 泛型类：支持 `push(item, priority)` / `pop()` / `peek()` / `remove(item)` / `updatePriority(item, newPriority)`
  - `AStarNode` 需实现 `equals` 或持有唯一 key，支持堆内定位（decrease-key 或 lazy deletion）
  - `Pathfinder.findPath` / `findPathBidirectional` / `findPathToPredicate` 中 `openSet` 从 `AStarNode[]` 改为 `BinaryHeap<AStarNode>`
  - 保持 `closedSet` 为 `Set<string>`（`"x,y"` key）不变
- **验收**：100×100 地图随机起点终点寻路 1000 次，`openSet` 操作总耗时降低 > 50%；e2e 回归测试全部通过
- **状态**：[ ] `done`

### Task 122: HPF 抽象图 + 抽象启发式引导 — 分层寻路完整实现 🔴 P0
- **目标**：在当前地形 flood-fill domain（Task 114）基础上，构建完整的 10×10 grid 抽象图（抽象节点 + 抽象边），并用抽象路径的反向 A* 预计算结果引导局部搜索的启发值，实现"先上高速再下匝道"的分层策略。
- **文件**：`src/game/terrain/HierarchicalPathfinder.ts`, `src/game/terrain/AbstractPathGraph.ts`
- **OpenRA 对标**：`HierarchicalPathFinder.cs` 中 `AbstractEdge` / `AbstractNode` / `Heuristic` 生成 + `AbstractNodeForCost`
- **关键变更**：
  - 抽象节点：每个 10×10 grid 内的连通区域为一个抽象节点（grid 内 flood-fill）；单连通区域 grid 做轻量级表示
  - 抽象边：在相邻 grid 的边界上检查局部格子可达性，建立抽象节点之间的边（含跨层边）
  - 反向抽象 A*：从目标抽象节点出发反向搜索抽象图，得到每个抽象节点到目标的代价
  - 局部启发值 = 当前格子到下一抽象节点的直线代价 + 抽象路径剩余代价
  - `AbstractNodeForCost`：延迟跟随抽象路径——只有当抽象路径确实需要绕开障碍时才跟随，否则允许单位直接直线走向目标
  - 双向分层搜索：单源单目标时用双向；多源或不可达源时用单向
- **依赖**：Task 114（已有 domain 索引），Task 121（优先队列提升抽象图搜索效率）
- **验收**：128×128 地图含水域/悬崖障碍，长距离（>50格）寻路搜索节点数比纯 A* 减少 60%+；路径质量（长度）与纯 A* 差异 <5%
- **状态**：[ ] `done`

### Task 123: HPF 动态更新 — 脏 Grid 增量重建与建筑监听 🔴 P0
- **目标**：`HierarchicalPathfinder` 不再仅在构造时一次性 build，而是在地形变化或建筑建造/销毁/受损时自动延迟标记脏 grid，在下次寻路时增量重建受影响的抽象节点和边。
- **文件**：`src/game/terrain/HierarchicalPathfinder.ts`, `src/game/building/Building.ts`, `src/game/terrain/TerrainGrid.ts`
- **OpenRA 对标**：`HierarchicalPathFinder.cs` 中 `dirtyGridIndexes` + `RebuildDirtyGrids` + `ActorMap.CellUpdated` 监听
- **关键变更**：
  - `dirtyGridIndexes: Set<number>`：受地形/建筑变动影响的 grid 索引集合
  - 监听事件：`TerrainGrid.setCellLandType`（地形变化）、`Building.onPlaced` / `onDestroyed`（建筑变动）、`ActorMap.move`/`occupy`/`vacate`（单位大规模变动）
  - 增量重建：仅重建 dirty grid 内的抽象节点和与相邻 grid 的抽象边，非全图重建
  - 两层缓存：terrain-only（`BlockedByActor.None`）和 terrain+immovable（`BlockedByActor.Immovable`），分别维护抽象图
  - `areConnected` 查询前先 flush dirty grids
- **依赖**：Task 122（完整抽象图实现后才有可增量更新的结构）
- **验收**：建筑建造后 1 秒内，该 grid 的 domain 和抽象边自动更新；寻路结果正确反映新阻塞状态；增量重建耗时 < 全图重建的 10%
- **状态**：[ ] `done`

### Task 124: SubCell 精确位置 — 步兵同格子位移 🟡 P1
- **目标**：将步兵的 `sharesCell` 从布尔值升级为 `SubCell` 枚举（`FullCell` + 4~5 个精确偏移位置），同格步兵自动分配到不同子位置，解决多步兵同格视觉重叠问题。
- **文件**：`src/game/terrain/SubCell.ts`, `src/game/unit/Unit.ts`, `src/game/terrain/ActorMap.ts`, `src/renderer/UnitRenderer.ts`
- **OpenRA 对标**：`MapGrid.cs` 中 `SubCell` 枚举 + `Mobile.cs` 中 `GetAvailableSubCell`
- **关键变更**：
  - `SubCell` 枚举：`Invalid=255`, `Any=254`, `FullCell=0`, `TopLeft=1`, `TopRight=2`, `Center=3`, `BottomLeft=4`, `BottomRight=5`
  - `ActorMap` 存储结构从 `Map<string, Set<string>>` 升级为 `Map<string, Map<string, SubCell>>`（格子 key → 单位 id → subCell）
  - `GetAvailableSubCell`：步兵进入格子时自动分配第一个空闲子位置；载具始终占 `FullCell`
  - 渲染层：步兵模型位置按 `SubCell` 偏移微调（如 TL = (-0.3, -0.3), TR = (0.3, -0.3) 等）
  - `UnitCollision` 和 `Pathfinder`：SubCell 级别不影响通行性判定（保持格子级），仅影响视觉和精确碰撞
- **依赖**：Task 113（LocomotorCache 需兼容 subCell 信息）
- **验收**：5 名步兵进入同一格子时，视觉上分散在 5 个不同子位置，不重叠；载具进入步兵格子时按原有 crush/warn 逻辑处理
- **状态**：[ ] `done`

### Task 125: Activity 树重构 — 从扁平状态机到嵌套活动系统 🟡 P1
- **目标**：将当前扁平的 `UnitStateMachine`（Idle/Moving/Attacking/Dying）重构为 OpenRA 风格的 Activity 树（嵌套子活动 + 链表队列 + 取消机制 + 生命周期钩子），使复杂行为组合（攻击移动、巡逻、进入载具）成为可能。
- **文件**：`src/game/activities/Activity.ts`, `src/game/activities/MoveActivity.ts`, `src/game/activities/AttackMoveActivity.ts`, `src/game/unit/Unit.ts`
- **OpenRA 对标**：`Activity.cs`（`TickOuter` / `ChildActivity` / `NextActivity` / `ChildHasPriority` / `IsInterruptible`）+ `Move.cs` + `MoveAdjacentTo.cs`
- **关键变更**：
  - `Activity` 基类：`Tick()` 返回 `ActivityStatus`（`Running` / `Done` / `Canceling`）；`OnFirstRun()` / `OnLastRun()` 钩子；`ChildActivity` 嵌套子活动；`NextActivity` 链表后续活动；`IsInterruptible` 标记；`QueueChild()` / `Queue()` 构建活动链
  - `MoveActivity`：拆分 `MoveFirstHalf`（当前格子中心 → 两格中点）和 `MoveSecondHalf`（中点 → 目标格子中心），均继承 `Activity`
  - `MoveWithinRangeActivity` / `FollowActivity`：从 `UnitController` 中的方法迁移为独立 `Activity` 子类
  - `AttackMoveActivity`：父活动持有 `Move` 子活动 + 定期 `ScanForTarget`；发现敌人时取消当前 Move、排队 `AttackActivity`，攻击完成后恢复 Move
  - `UnitController`：`CurrentActivity` 驱动每 tick 状态；`QueueActivity()` / `CancelActivity()` 管理活动队列；原有 `stateMachine` 字段逐步废弃
- **依赖**：Task 119（MoveWithinRange/Follow 需先稳定运行后迁移），Task 129（MovePart 拆分后 MoveActivity 更精细）
- **验收**：坦克移动时内部活动链可观测为 `AttackMove → Move → [MoveFirstHalf → MoveSecondHalf]`；收到新命令时旧 Activity 正确取消并调用 `OnLastRun`；支持嵌套（如 `AttackMove` 包含 `Move` + `ScanForTarget` + `Attack`）
- **状态**：[ ] `done`

### Task 126: CustomMovementLayer 实现 — 多层移动（隧道/地下/飞行/桥梁）🟡 P1
- **目标**：基于 Task 120 预留的 `ICustomMovementLayer` 接口，完整实现 `TerrainTunnelLayer`（隧道）、`SubterraneanLayer`（地下）、`JumpjetLayer`（跳跃喷气）、`ElevatedBridgeLayer`（高架桥）四层；`MapPathGraph` 支持按 layer 索引的 `CellInfo` 数组；`Pathfinder` 在搜索中自动处理层间过渡。
- **文件**：`src/game/terrain/layers/TerrainTunnelLayer.ts`, `src/game/terrain/layers/SubterraneanLayer.ts`, `src/game/terrain/layers/JumpjetLayer.ts`, `src/game/terrain/layers/ElevatedBridgeLayer.ts`, `src/game/terrain/MapPathGraph.ts`, `src/game/terrain/Pathfinder.ts`
- **OpenRA 对标**：`TerrainTunnelLayer.cs` + `SubterraneanActorLayer.cs` + `JumpjetActorLayer.cs` + `ElevatedBridgeLayer.cs` + `MapPathGraph.cs` + `DensePathGraph.GetConnections` 层过渡逻辑
- **关键变更**：
  - `MapPathGraph`：替代当前 `GroundPathGraph` 作为默认图实现，管理多层 `CellInfo` 数组（`cellInfos[layerIndex][y][x]`）
  - `TerrainTunnelLayer`（Tunnel=1）：仅 portal 格子（地图预定义的隧道入口/出口）可进入/退出；`interactsWithDefaultLayer=false`；空闲时自动返回地面层
  - `SubterraneanLayer`（Subterranean=2）：仅特定地形/非斜坡格可过渡；使用独立 `SubterraneanLocomotorInfo`；地下移动无视地面障碍
  - `JumpjetLayer`（Jumpjet=3）：高空层，高度经平滑处理；`interactsWithDefaultLayer=true`（可被地面防空攻击）；起飞/降落动画过渡
  - `ElevatedBridgeLayer`（ElevatedBridge=4）：桥两端可上下桥；桥面上移动不受下方水域/地形影响；桥可炸毁（层失效）
  - 层间过渡：`entryCost` / `exitCost` 控制切换代价；`DensePathGraph.GetConnections` 在 layer 0 时检查所有启用的自定义层的入口；在自定义层时检查返回地面的出口
  - `ActorMap` 按 layer 索引存储占用（`Map<layer, Map<cellKey, Set<id>>>`）
- **依赖**：Task 120（接口预留），Task 123（HPF 动态更新需支持多层抽象图），Task 130（高度系统用于判断桥/斜坡过渡）
- **验收**：钻地坦克从 A 点潜入地下层、地下移动至 B 点、钻出地面，全程路径正确；火箭兵跳跃跨越悬崖；桥梁层可正常上下通行且炸毁后不可通行
- **状态**：[ ] `done`

### Task 127: Lane Bias + 方向邻居裁剪 — A* 邻居优化 🟢 P2
- **目标**：1) **Lane Bias**：同向移动单位在 A* 边代价上增加 ±1 偏移，让同向单位自然分流到不同"车道"，减少拥堵。2) **Directed Neighbors**：利用父节点信息裁剪邻居集合，避免重复搜索可从父节点更便宜到达的格子。
- **文件**：`src/game/terrain/GroundPathGraph.ts`
- **OpenRA 对标**：`DensePathGraph.cs` 中 `CalculateCellPathCost`（Lane Bias）+ `DirectedNeighbors` / `DirectedNeighborsConservative`
- **关键变更**：
  - Lane Bias：基于当前移动方向，在 `CalculateCellPathCost` 中对特定方向的邻居代价 ±1；同向单位代价略减（鼓励保持方向），逆向略增（鼓励让路）
  - Directed Neighbors：水平/垂直移动时只考虑前方 3 格（排除父节点方向及侧后方）；对角移动时考虑前方 3 格 + 侧方 2 格
  - Conservative 模式：当存在高度不连续（Task 130）时，使用保守裁剪（仅排除父节点），因为高度差可能导致原本被父节点阻挡的格子从当前格子可达
  - 与 `biasSeed`（Task 102–132 系列已完成的寻路基础任务）配合：Lane Bias 提供确定性分流，biasSeed 提供随机性分流
- **验收**：10 辆坦克同向移动时，自然形成 2-3 条车道而非挤成一团；搜索节点数减少 10-20%；e2e 回归测试通过
- **状态**：[ ] `done`

### Task 128: Path Cache / CellInfoLayerPool — 搜索层对象池 🟢 P2
- **目标**：为 `Pathfinder` 引入搜索层对象池，避免每次 A* 搜索都分配新的 `CellInfo`（g/h/parent）大数组。按 World 实例隔离池，池大小上限 4，搜索结束后归还。
- **文件**：`src/game/terrain/CellInfoLayerPool.ts`, `src/game/terrain/Pathfinder.ts`
- **OpenRA 对标**：`CellInfoLayerPool.cs` + `ConditionalWeakTable<World, CellInfoLayerPool>` + `PooledCellInfoLayer`
- **关键变更**：
  - `CellInfoLayerPool`：管理 `PooledCellInfoLayer` 对象数组（maxPoolSize = 4）
  - `PooledCellInfoLayer`：包含 `CellInfo[][]` 数组 + `dispose()` 归还方法；获取时自动重置（fill default values）
  - `Pathfinder` 搜索前调用 `pool.GetLayer()` 获取层，搜索完成后 `layer.dispose()` 归还
  - 按 `World`（或 `GameLoop`）实例隔离池，避免不同游戏实例间数据污染
  - `lock` 保护池的出入操作（为未来多线程并行寻路预留线程安全基础）
- **验收**：连续 100 次寻路，内存分配曲线平稳，无大数组分配导致的 GC 锯齿峰值；Chrome DevTools Memory 面板验证
- **状态**：[ ] `done`

### Task 129: MovePart 拆分 + 弧线移动 + 倒车 — 移动表现精细化 🟢 P2
- **目标**：将当前连续插值移动拆分为 `MoveFirstHalf`（从当前格子中心到两格中点）和 `MoveSecondHalf`（从中点到目标格子中心），支持弧线轨迹转向、倒车移动、进度延续，使重型坦克转向和矿车短距调头更自然。
- **文件**：`src/game/unit/UnitMovement.ts`, `src/game/unit/UnitRotation.ts`, `src/game/unit/activities/MoveFirstHalf.ts`, `src/game/unit/activities/MoveSecondHalf.ts`
- **OpenRA 对标**：`Move.cs` 中 `MoveFirstHalf` / `MoveSecondHalf` + elliptical arc + backwards movement + `carryoverProgress`
- **关键变更**：
  - `MoveFirstHalf`：从 `fromCell` 中心沿当前 facing 方向移动到 `fromCell→toCell` 中点；若需要转向且 `TurnsWhileMoving=false`，在此阶段使用椭圆弧插值而非直线
  - `MoveSecondHalf`：从中点沿新 facing 方向移动到 `toCell` 中心；支持 `carryoverProgress`（上一段未用完的移动进度带入本段）
  - 弧线轨迹（elliptical arc）：方向变化 > 90° 时，计算旋转中心，单位沿椭圆弧移动而非直角折线
  - 倒车（backwards movement）：角度差 > 256°（约 180°）且路径较短时，单位面向不变、倒行进入目标格（典型：矿车）
  - 地形倾斜（terrain orientation）：斜坡（Task 130）上移动时，模型 Z 轴根据两端高度差插值倾斜
  - `carryoverProgress`：如果一 tick 内 `MoveFirstHalf` 已完成但剩余移动距离未用完，将剩余距离带入 `MoveSecondHalf`，保证速度视觉连续性
- **依赖**：Task 117（TurnSpeed / TurnsWhileMoving 已实现），Task 125（Activity 树拆分后 MoveFirstHalf/MoveSecondHalf 为子 Activity）
- **验收**：重型坦克从北向东转向时走弧线而非直角折线；矿车接到后方短距命令时直接倒行；移动速度 tick 间连续无跳变
- **状态**：[ ] `done`

### Task 130: 高度系统（Cell Height）— 悬崖与斜坡 🟢 P2
- **目标**：为每个 Cell 定义高度值（0~N），相邻格高度差 >1 时不可直接通行（悬崖），高度差 =1 时为斜坡（可通行且视觉上车身倾斜）。为 HPF 保守模式和桥梁层提供高度基础。
- **文件**：`src/game/terrain/TerrainGrid.ts`, `src/game/terrain/GroundPathGraph.ts`, `src/renderer/terrain/TerrainMesh.ts`
- **OpenRA 对标**：`Map.cs` 中 `Height` 定义 + `Locomotor.cs` 中 `MovementCostForCell` 高度检查
- **关键变更**：
  - `CellData` 新增 `height: number`（默认 0）
  - `TerrainGrid.setCellHeight(x, y, height)`：支持运行时修改高度（如桥梁炸毁后下方变为水域+高度变化）
  - `GroundPathGraph` 邻居生成：检查 `|height[src] - height[dst]| > 1` 时该邻居不可达；`= 1` 时视为斜坡，正常通行
  - 渲染层：TerrainMesh 根据四角的 `height` 调整顶点 Z 坐标，实现斜坡视觉倾斜；单位在斜坡上时模型根据两端高度差插值倾斜
  - `HierarchicalPathfinder`：高度不连续影响抽象边建立（相邻 grid 边界上若存在高度差 >1 则不可建立抽象边）
- **依赖**：Task 127（Directed Neighbors Conservative 模式需要高度信息）
- **验收**：悬崖（高度差 ≥2）不可直接跨越，单位绕行；斜坡（高度差 =1）可通行且视觉上车身倾斜；高度变化后 HPF domain 正确更新
- **状态**：[ ] `done`

### Task 131: ActorMap Bin 划分 + 触发器系统 ⚪ P3
- **目标**：在格子精确查询基础上，增加 **Bin 空间划分**（`BoxSize=10` 世界单位）加速任意世界坐标范围查询；支持 `CellTrigger`（格子进入/离开事件）和 `ProximityTrigger`（圆形/盒形邻近事件）。
- **文件**：`src/game/terrain/ActorMap.ts`, `src/game/world/TriggerSystem.ts`
- **OpenRA 对标**：`ActorMap.cs` 中 `Bin` 系统 + `CellTrigger` / `ProximityTrigger`
- **关键变更**：
  - Bin 二维数组：每格 10×10 世界单位，存储落入该区域的 actor 引用集合；actor 移动时动态更新所属 bin
  - `ActorsInBox(minX, minY, maxX, maxY)`：基于 bin 快速筛选候选，再精确检查 AABB
  - `ActorsInCircle(centerX, centerY, radius)`：基于 bin 快速筛选候选，再精确检查距离
  - `CellTrigger`：注册"当任意 actor 进入/离开指定格子"时的回调；用于触发器脚本、地雷、区域占领判定
  - `ProximityTrigger`：注册"当任意 actor 进入/离开指定圆形/盒形区域"时的回调；用于核弹爆炸范围、心灵控制、修理光环
  - `TriggerSystem` 管理所有触发器的注册/注销/触发回调
- **验收**：100×100 地图范围查询比遍历全图快 10 倍+；CellTrigger 在步兵进入地雷格时正确触发爆炸；ProximityTrigger 在核弹落点 5 格范围内正确选中所有单位
- **状态**：[ ] `done`

### Task 132: 启发式权重可调 — 次优路径换性能 ⚪ P3
- **目标**：`Pathfinder` 支持 `heuristicWeightPercentage` 参数（默认 100% = 严格可采纳，可调至 125% 换取更快计算但允许路径次优）。在性能敏感场景（如大量单位同时寻路）下动态降低路径精度换取响应速度。
- **文件**：`src/game/terrain/Pathfinder.ts`
- **OpenRA 对标**：`PathSearch.cs` 中 `heuristicWeightPercentage`（默认 125）
- **关键变更**：
  - `findPath` 新增可选参数 `heuristicWeight: number`（默认 1.0，最大 1.25）
  - `f = g + h * weight`：weight > 1 时 A* 更倾向于朝向目标直线搜索（类似 Greedy Best-First），减少探索节点数
  - `weight = 1.0`：严格可采纳，保证最短路径
  - `weight = 1.25`：OpenRA 默认值，节点数减少 30-50%，路径长度增加通常 <5%
  - 可在 `GameRules.ts` 中全局配置，或在 `Pathfinder` 构造时按场景设置（如 `MoveWithinRange` 可用较低 weight，`MoveTo` 精确目标保持 1.0）
- **验收**：`heuristicWeight=1.25` 时，128×128 地图长距离寻路节点数减少 30-50%，路径长度与纯 A* 差异 <5%；`heuristicWeight=1.0` 时路径严格最短
- **状态**：[ ] `done`

---

## Phase 6: 交互与输入（Interaction）

### Task 24: 鼠标输入层（框选 + 点击 + 群体移动）
- **目标**：翻译 `MOUSE.CPP`。左键框选单位/建筑，右键对选中单位下达移动/攻击指令。将框选与重构后的移动系统对接。
- **文件**：`src/core/InputManager.ts`, `src/core/RTSCamera.ts`, `src/core/SelectionBox.ts`, `src/game/SelectionManager.ts`, `src/main.ts`
- **OpenRA 对标**：`MoveOrderGenerator` — 为每个选中单位生成独立的 `Move` 活动，各单位独立寻路到目标附近
- **关键变更**：
  - **InputManager 抽离**：将鼠标输入逻辑从 `RTSCamera` 和 `main.ts` 集中到 `InputManager.ts`，职责分离：RTSCamera 负责相机控制（平移/缩放/旋转），InputManager 负责输入分发（选择/框选/命令）
  - **SelectionManager 多选支持**：`selectMultiple(units)` 批量选中 + 多选择环渲染；`toggleSelect(unit)` Shift+切换选择
  - **SelectionBox**：HTML div 绿色半透明矩形框，fixed 定位，零 Babylon mesh 开销
  - **RTSCamera 左键拖动检测**：`mousedown` 启动拖动，`mousemove` 计算 dragDist，`mouseup` 区分 click 与 drag；新增 `updateMousePositionFromEvent` 解决 Playwright headless 中 mousemove 不触发导致坐标旧值问题
  - **框选命中测试**：`worldToScreen` 将单位世界坐标转为屏幕坐标，与框选矩形做 AABB 相交测试
  - **群体移动**：右键点击地面时，遍历 `selectionManager.getSelected()` 为每个单位调用 `moveTo(targetX, targetY)`；步兵（SharesCell=true）可共享目标格子，车辆由阻塞 fallback 链自动分散
  - **攻击指令**：右键点击敌方单位时，设置 `attackTarget`，有炮塔的单位进入 `TurretTracking`
  - **Shift 追加选择**：`Shift+框选` = 追加模式，`Shift+点击` = 单单位切换
  - **默认测试场景**：`main.ts` 默认在地图东南角 (45-50, 45-50) 生成 6 辆 GDI MediumTank + 2 辆 Nod LightTank，方便手动测试框选与群体移动
- **验收**：框选多单位（3辆坦克）命中正确；右键移动命令同步下达给所有选中单位；右键敌人下达攻击指令；toggleSelect / selectMultiple API 正确。
- **状态**：[x] `done`

### Task 25: 选择系统（单选、框选、编队）
- **目标**：支持 Ctrl+数字编队，双击选中同屏同类单位，Shift 追加选择。
- **文件**：`src/game/SelectionManager.ts`
- **验收**：选中坦克后按 `Ctrl+1`，之后按 `1` 恢复选中；双击选中所有可见坦克。
- **状态**：[ ] `done`

### Task 26: 命令分发器（Move / Attack / Guard / Stop）
- **目标**：翻译 C++ 中的 `Mission` 分配逻辑。根据鼠标点击目标（地面/敌人/友方）分发不同命令。
- **文件**：`src/game/CommandDispatcher.ts`
- **验收**：右键空地 = 移动；右键敌人 = 攻击移动；右键友方 = 跟随/保护。
- **状态**：[ ] `done`

### Task 27: HUD / UI 覆盖层（资源、小地图、单位信息）
- **目标**：Babylon.GUI 显示顶部资源栏、底部选中单位信息、右下角小地图（先占位）。
- **文件**：`src/renderer/ui/HUD.ts`
- **Dummy 资源**：小地图先用纯色方块表示地形，单位用点表示。
- **验收**：选中单位后，底部面板显示血量、速度、装甲类型。
- **状态**：[ ] `done`

### Task 27.5: 外交关系系统 🔴 P0
- **目标**：当前只有 `isHuman` 布尔值区分人机，无法实现"盟友/敌人/中立"判定。攻击指令、框选高亮、小地图颜色、迷雾共享都依赖外交信息。
- **文件**：`src/game/house/HouseDiplomacy.ts`, `src/game/house/HouseRelationship.ts`
- **OpenRA 对标**：`OpenRA.Game/Player.cs` 中 `AlliedPlayersMask` / `EnemyPlayersMask` / `RelationshipWith()`
- **关键变更**：
  - `HouseRelationship` 枚举：`Ally` / `Enemy` / `Neutral`
  - `HouseDiplomacy`：维护 `alliedMask: Set<HouseType>` + `enemyMask: Set<HouseType>`
  - `getRelationshipWith(other: HouseType): HouseRelationship`
  - `isAlliedWith(other: HouseType): boolean`
  - `getEnemies(): House[]` — 替代当前简单过滤 `id !== type`
  - 初始关系：同 Team = Ally，不同 Team = Enemy，Neutral 需显式设置
  - 支持运行时变更（任务中临时结盟/背叛）
- **依赖**：Task 12（House 系统已存在）
- **验收**：GDI 与 Nod 关系为 Enemy；框选时友方显示绿色光环、敌方显示红色；右键点击盟友单位不会触发攻击。
- **状态**：[ ] `done`

### Task 27.6: Bot 类型支持 🟢 P2
- **目标**：将 `isHuman: boolean` 扩展为 `controller: 'human' | 'bot-rush' | 'bot-normal' | 'bot-defensive'`，预留 AI 逻辑挂载点。
- **文件**：`src/game/house/House.ts`, `src/game/ai/BotController.ts`
- **OpenRA 对标**：`OpenRA.Game/Player.cs` 中 `IsBot` + `BotType`
- **关键变更**：
  - `House.controller: string` 替代 `isHuman: boolean`
  - `BotController` 接口：`activate(house: House)` / `tick()` / `deactivate()`
  - `BotRegistry`：显式注册 Bot 类型（`register('rush', RushBot)`）
  - `HouseManager` 根据 `controller` 自动激活对应 Bot
- **依赖**：Task 27.5（外交关系先就位，Bot 需要知道谁是敌人）
- **验收**：创建一个 `controller='bot-rush'` 的 House，游戏开始后该 House 自动建造兵营并生产步兵攻击最近敌人。
- **状态**：[ ] `done`

---

## Phase 6.5: Rules 系统与架构升级（Architecture Upgrade）

> **定位**：核心循环（Phase 4–6）已稳定运行后，将硬编码常量架构升级为 YAML 驱动 + Trait 组合的 Mod 友好架构。本 Phase 不新增游戏功能，只重构数据层和对象模型。

### Task 95: YAML 规则解析基础设施 🔴 P0
- **目标**：将当前硬编码的 `UNIT_DEFINITIONS` / `BUILDING_DEFINITIONS` / `GameRules` 外置为 YAML 文件，建立从 YAML → TS 对象的加载管道。
- **文件**：`src/game/rules/YamlLoader.ts`, `src/game/rules/RuleRegistry.ts`, `public/rules/defaults.yaml`, `public/rules/units.yaml`, `public/rules/buildings.yaml`
- **OpenRA 对标**：`OpenRA.Game/MiniYaml.cs` + `FieldLoader.cs` + `Ruleset.cs`
- **关键变更**：
  - `MiniYaml` 解析器：支持 YAML 子节点、继承（`Inherits:`）、删除（`-TraitName:`）语法
  - `RuleRegistry`：显式注册表模式（`register('Unit', UnitDefinition)`），替代 OpenRA 的 C# 反射
  - 加载管道：启动时 `fetch('/rules/*.yaml')` → 解析 → 合并 → 生成运行时定义对象
  - 回退机制：YAML 加载失败时回退到内置 TS 常量（保证离线可用）
- **依赖**：Phase 4–6 核心循环稳定（Unit / Building / Input 系统已能独立运行）
- **备注**：本任务原编号 Task 11.1，因跨 Phase 编号不符合层级规范，改为独立编号 Task 95。
- **验收**：删除 `UNIT_DEFINITIONS` 中一个单位的 TS 定义，改为 `public/rules/units.yaml` 中同名条目，游戏启动后该单位属性与之前完全一致。
- **状态**：[ ] `done`

### Task 96: 轻量 Trait/Component 系统 🟡 P1
- **目标**：将当前内聚的 `Unit` / `Building` 类拆分为数据容器 + 可组合的行为组件（Trait），实现 OpenRA Actor + Trait 架构的 Web 端适配。
- **文件**：`src/game/traits/Trait.ts`, `src/game/traits/HealthTrait.ts`, `src/game/traits/MobileTrait.ts`, `src/game/traits/ArmamentTrait.ts`, `src/game/actors/Actor.ts`
- **OpenRA 对标**：`OpenRA.Game/Actor.cs` + `TraitDictionary.cs` + `Traits/` 目录
- **关键变更**：
  - `Actor` 空容器：仅持有 `id`, `owner`, `info`（`ActorInfo` 引用），所有行为由挂载的 `Trait` 提供
  - `Trait` 基类：`Tick()` / `OnCreated()` / `OnRemoved()` 生命周期钩子
  - `HealthTrait`：从 `Unit` / `Building` 的 HP 逻辑迁移
  - `MobileTrait`：从 `UnitMovement` 迁移，管理位置、路径、阻塞处理
  - `ArmamentTrait`：从 `Unit` 的炮塔/武器逻辑迁移，管理武器引用、冷却、开火角度
  - `TraitRegistry`：显式注册（`register('Health', HealthTrait)`），避免 Web 端反射性能问题
  - 与 YAML 对接：`units.yaml` 中 `Traits: [Health, Mobile, Armament]` 列表定义单位能力组合
- **依赖**：Task 95（YAML 基础设施先就位）；Phase 4–6 核心循环稳定（确保迁移前行为基线通过 e2e）
- **备注**：原编号 Task 11.3，改为独立编号 Task 96。
- **验收**：创建一个只有 `Health` 和 `Render` 两个 Trait 的测试 Actor，它不能移动也不能攻击，但可以被选中、显示血条、被摧毁。原有全部 e2e 测试通过，无回归。
- **状态**：[ ] `done`

### Task 97: 规则继承与抽象 Actor 🟡 P1
- **目标**：在 YAML 规则中支持 `Inherits:` 语法，减少重复定义；支持 `^` 前缀的抽象 Actor 模板。
- **文件**：`src/game/rules/YamlLoader.ts`（扩展继承解析）
- **OpenRA 对标**：`ActorInfo.cs` 中 `Inherits:` 处理 + `^` 抽象 Actor 过滤
- **关键变更**：
  - YAML 继承解析：`Inherits: ^Vehicle` → 将 `^Vehicle` 的 Trait 列表合并到当前 Actor，当前可覆盖父级字段
  - 抽象 Actor：`^Vehicle`、`^Infantry`、`^Building` 等模板不生成实际游戏对象，仅被继承
  - Trait 删除语法：`-Mobile:` 表示继承后移除该 Trait
  - 循环继承检测：加载时检测并报错
- **依赖**：Task 95（YAML 基础设施）+ Task 96（Trait 系统）
- **备注**：原编号 Task 11.4，改为独立编号 Task 97。
- **验收**：定义 `^Vehicle`（含 Mobile + Health + Render），`LightTank` 继承 `^Vehicle` 并只覆盖 `speed` 和 `primaryWeapon`，`Harvester` 继承 `^Vehicle` 并移除 `Armament`。
- **状态**：[ ] `done`

### Task 100: House 类拆分（God Class 治理）🟡 P1
- **目标**：当前 `House.ts` 是 293 行的上帝类，聚合经济/电力/计数/难度/统计/状态等 50+ 字段，违反 SRP。在不引入完整 Trait 系统的前提下，先拆分为组合式子模块。
- **领域归属**：本任务属于 Task 12（House 系统）的架构升级，因实现阶段在核心循环稳定后，故放在 Phase 6.5。
- **文件**：`src/game/house/House.ts`, `src/game/house/HouseEconomy.ts`, `src/game/house/HousePower.ts`, `src/game/house/HouseTechTree.ts`, `src/game/house/HouseStatistics.ts`, `src/game/house/HouseDiplomacy.ts`
- **OpenRA 对标**：`OpenRA.Game/Player.cs`（轻量容器）+ `PlayerResources` / `PowerManager` / `TechTree` Traits
- **关键变更**：
  - `House` 变为轻量容器：保留 `id`, `name`, `color`, `controller` 及状态标志
  - `HouseEconomy`：Cash + Resources + Capacity + Earned/Spent（为未来双轨化做准备）
  - `HousePower`：电力提供/消耗/余额（从 Task 23.32 迁移）
  - `HouseTechTree`：可建造类型集合 + 前提条件检查（从 Task 23 的 TechTree 迁移）
  - `HouseStatistics`：摧毁/建造/击杀统计
  - `HouseDiplomacy`：盟友/敌人/中立关系（从 Task 27.5 迁移）
  - 向后兼容：`House.addCredits()` 代理到 `HouseEconomy.addCredits()`
- **依赖**：Task 23.32（电力模块先独立）+ Task 27.5（外交模块先独立）
- **备注**：原编号 Task 11.6（错误归属于 Rules 系统），改为独立编号 Task 100，明确归属 House 系统。
- **验收**：`House.ts` 行数 < 100；每个子模块可独立单元测试；原有全部 e2e 通过。
- **状态**：[ ] `done`

### Task 101: 科技树 Watcher 机制 🟡 P1
- **目标**：当前 `availableBuildings` 是静态 `Set<string>`，需手动 `addBuilding(typeId)` 维护。改为监听 `GameObjectManager` 的 Actor 增删事件，自动计算可建造列表。
- **领域归属**：本任务属于 Task 12（House 系统）的自动化升级，建立在 Task 100（House 拆分）基础上。
- **文件**：`src/game/house/HouseTechTree.ts`
- **OpenRA 对标**：`OpenRA.Mods.Common/Traits/Player/TechTree.cs`
- **关键变更**：
  - `TechTreeWatcher`：监听 `GameObjectManager` 的 `onActorAdded` / `onActorRemoved`
  - 自动维护 `ownedPrerequisites: Map<string, number>`（某建筑拥有数量）
  - `hasPrerequisites(prereqs: string[]): boolean` — 检查是否满足建造前提
  - `buildLimitReached(typeId: string): boolean` — 检查是否达到建造上限
  - 建筑出售/被摧毁/被占领时自动重新计算
- **依赖**：Task 100（HouseTechTree 模块先拆分出来）
- **备注**：原编号 Task 11.7（错误归属于 Rules 系统），改为独立编号 Task 101。
- **验收**：建造兵营后，Sidebar 自动解锁步枪兵；卖掉兵营后，步枪兵图标自动变灰。
- **状态**：[ ] `done`

---

## Phase 7: 战斗与经济（Combat & Economy）

### Task 98: Weapon 规则系统（WeaponInfo + Projectile + Warheads）🔴 P0
- **目标**：当前单位定义中只有简单的 `range` 字段，没有完整的武器系统。建立与 OpenRA 对标的 `WeaponInfo` 规则层，作为 Task 28 弹道渲染的数据前置。
- **文件**：`src/game/rules/WeaponInfo.ts`, `src/game/rules/ProjectileInfo.ts`, `src/game/rules/WarheadInfo.ts`, `public/rules/weapons.yaml`
- **OpenRA 对标**：`OpenRA.Game/GameRules/WeaponInfo.cs` + `ProjectileArgs` + `WarheadArgs`
- **关键变更**：
  - `WeaponInfo`：range, burst, reloadDelay, burstDelays, validTargets, invalidTargets, minRange
  - `ProjectileInfo`：即时命中（Bullet） vs 抛射体（Missile）两种类型，初速、转向率、重力
  - `WarheadInfo`：伤害值、伤害衰减（距离）、对装甲修正表（vs None/Wood/Aluminum/Steel/Concrete）、延迟触发
  - 与 `UnitDefinitions` 对接：单位定义中的 `range` 废弃，改为引用 `primaryWeapon: string`（指向 weapons.yaml 中的键）
- **依赖**：Task 95（YAML 基础设施先就位，或如 YAML 未就绪则先硬编码在 TS 中）
- **备注**：原编号 Task 11.2，改为独立编号 Task 98。
- **验收**：`weapons.yaml` 中定义 `105mm` 武器，坦克引用后，开火时可见抛射体飞行、命中后按装甲类型计算伤害。
- **状态**：[ ] `done`

### Task 28: 武器与弹道系统（翻译 WEAPON.CPP / BULLET.CPP）
- **目标**：武器定义（射程、射速、伤害、弹道类型），子弹飞行逻辑。
- **弹道类型**：即时命中（步枪） vs 抛射体（炮弹、火箭）。
- **文件**：`src/game/weapon/Weapon.ts`, `src/game/weapon/Bullet.ts`, `src/game/weapon/BallisticArc.ts`
- **Dummy 资源**：子弹用细长 `Cylinder` + 发光材质；火箭用 `Box` + 粒子尾焰（简易版）。
- **验收**：坦克开火后，可见炮弹从炮管飞向目标，命中后爆炸。
- **状态**：[ ] `done`

### Task 29: 伤害计算与装甲系统
- **目标**：完全沿用 C++ 伤害公式：`Damage = Weapon.Damage * (1 - ArmorModifier)`，支持穿甲/高爆/火焰等不同弹头类型对轻/中/重装甲的修正。
- **参考 C++**：`UNIT.CPP` / `BUILDING.CPP` 中的 `Take_Damage()`。
- **文件**：`src/game/combat/DamageCalculator.ts`
- **验收**：中型坦克（重甲）被火箭筒攻击时伤害低于被步枪攻击（符合 C++ 设定）。
- **状态**：[ ] `done`

### Task 30: 采矿与经济系统
- **目标**：矿车自动寻找矿场（Tiberium/ Ore），采矿后返回矿厂卸货，资金增长。
- **参考 C++**：`UNIT.CPP` 中矿车 AI 与 `BUILDING.CPP` 中矿厂逻辑。
- **文件**：`src/game/economy/HarvesterAI.ts`, `src/game/economy/EconomyManager.ts`
- **Dummy 资源**：矿场用绿色/金色发光 `Ground` 贴片表示；矿车用黄色 Box。
- **验收**：矿车自动往返于矿场与矿厂，资金数字随卸货增长。
- **状态**：[ ] `done`

### Task 30.5: 经济双轨化（Cash + Resources）🔴 P0
- **目标**：当前只有单轨 `credits`，矿石直接变现金，矿厂"存储容量"机制形同虚设。拆分为 Cash（可花费资金）+ Resources（矿石储量，受容量限制），与 OpenRA `PlayerResources` 对齐。
- **文件**：`src/game/house/HouseEconomy.ts`
- **OpenRA 对标**：`OpenRA.Mods.Common/Traits/Player/PlayerResources.cs`
- **关键变更**：
  - `Cash`：可立即用于建造/训练的资金
  - `Resources`：矿石储量，矿车卸货时先增加 Resources
  - `ResourceCapacity`：存储上限，由矿厂/筒仓数量决定
  - `GiveResources(num)`：矿车卸货，增加 Resources（不超过 Capacity）
  - `TakeCash(num)`：花费时先扣 Resources（矿石），不足再扣 Cash
  - `ChangeCash(amount)`：统一入口，正数=收入，负数=支出
  - 低资金通知：余额不足时触发语音/文字提示（带冷却间隔）
- **依赖**：Task 100（HouseEconomy 模块先拆分出来）
- **验收**：矿车卸货 500 矿石 → Resources=500；建造电厂花费 300 → Resources=200（先扣矿石）；Resources 满后矿车继续采矿但无法卸货。
- **状态**：[ ] `done`

### Task 31: 战争迷雾（Fog of War）
- **目标**：已探索区域显示地形但单位不可见；当前视野内显示一切；未探索区域为黑色。
- **实现方案**：Babylon.js 使用 `ShaderMaterial` 或动态顶点颜色，在 TerrainGrid 上叠加迷雾纹理。
- **文件**：`src/renderer/effects/FogOfWar.ts`
- **Dummy 资源**：迷雾用黑白网格纹理，单位视野半径固定 10 格。
- **验收**：单位移动后，周围圆形区域变为"已探索"，离开后不显示敌方单位。
- **状态**：[ ] `done`

---

## Phase 7.5: Mod 支持与地图规则（Modding & Map Rules）

> **定位**：核心游戏功能已完备后，开放 Mod 和自定义地图的能力。本 Phase 依赖 Phase 6.5 的 YAML + Trait 架构。

### Task 99: 地图级规则覆盖 🟢 P2
- **目标**：支持地图内嵌 `map.yaml` 覆盖默认规则，实现单图自定义规则（如特殊武器伤害、单位属性调整）。
- **文件**：`src/game/rules/Ruleset.ts`（或扩展 `YamlLoader.ts`）
- **OpenRA 对标**：`Ruleset.Load()` 中 `MergeOrDefault` 的 `mapRules` 覆盖逻辑
- **关键变更**：
  - 加载顺序：默认 rules → 地图 mapRules（合并覆盖）
  - 安全白名单：仅允许覆盖数值字段（damage、speed、cost），禁止添加/删除 Trait（防止地图注入逻辑）
  - `IRulesetLoaded` 回调：规则合并完成后，通知所有 Trait 做二次解析（如武器引用校验）
- **依赖**：Task 95 + Task 97
- **备注**：原编号 Task 11.5，改为独立编号 Task 99。
- **验收**：某地图的 `map.yaml` 将 `MediumTank.speed` 从 6 改为 9，加载该地图后 MediumTank 明显移动更快，其他地图不受影响。
- **状态**：[ ] `done`

---

## Phase 8: 游戏循环与发布（Loop & Release）

### Task 32: 游戏主循环与 Tick 系统
- **目标**：固定 60FPS 游戏步长（Lock-step），每 Tick 更新所有 Unit / Building / Bullet 状态。
- **参考 C++**：主消息循环中的 `AI()` 调用链。
- **文件**：`src/game/GameLoop.ts`
- **验收**：100 个单位同时移动 + 10 个建筑建造 + 20 发子弹飞行，帧率稳定 60FPS。
- **状态**：[ ] `done`

### Task 33: 存档 / 读档系统
- **目标**：将当前游戏状态（地图、单位、建筑、资金）序列化为 JSON，支持下载与上传恢复。
- **文件**：`src/save/GameSerializer.ts`, `src/save/SaveManager.ts`
- **验收**：点击"保存"下载 `.cncsave` 文件；刷新页面后"加载"恢复完全相同的战场状态。
- **状态**：[ ] `done`

### Task 34: 音效事件系统（Dummy 音频占位）
- **目标**：架构预留音频通道，所有游戏事件（选中、移动、开火、建造完成）触发事件，但播放 Dummy 音效（Web Audio API 生成的蜂鸣声）。
- **文件**：`src/core/AudioManager.ts`
- **Dummy 资源**：不同事件用不同频率的 `OscillatorNode` 蜂鸣代替。
- **验收**：选中单位时听到短蜂鸣，开火时听到长蜂鸣。
- **状态**：[ ] `done`

### Task 35: 性能优化与发布检查
- **目标**：实例化渲染（相同模型用 `InstancedMesh`）、对象池（子弹/爆炸复用）、视锥剔除、LOD 占位。
- **文件**：`src/core/PerformanceManager.ts`
- **验收**：场景内 200+ 单位时仍保持 60FPS；GitHub Pages 部署后线上可访问。
- **状态**：[ ] `done`

---

## Phase 9: UI Shell 与页面导航（Game Shell）

> 参考 OpenRA：`mods/*/chrome/*.yaml` + `ChromeLogic` 分离布局与逻辑。  
> 我们的方案：Babylon.GUI 实现所有交互 UI（Shell 页面、HUD、侧边栏、主菜单、设置等）。

### Task 36: 主菜单页面（Main Menu）
- **目标**：游戏启动后显示主菜单：背景滚动地图/视频、Logo、Singleplayer / Multiplayer / Settings / Exit 按钮。
- **参考 OpenRA**：`mods/cnc/chrome/mainmenu.yaml` + `MainMenuLogic.cs`
- **文件**：`src/ui/shell/MainMenu.ts`
- **验收**：启动游戏后看到主菜单，点击按钮有视觉反馈，背景不是黑屏。
- **状态**：[ ] `done`

### Task 37: 页面路由与过渡动画
- **目标**：主菜单 → 子页面（战役选择、遭遇战设置、多人游戏、设置）的切换动画（淡入淡出/滑动）。
- **文件**：`src/ui/shell/ShellRouter.ts`
- **验收**：页面切换流畅，无白屏闪烁，浏览器前进/后退不影响游戏状态。
- **状态**：[ ] `done`

### Task 38: 战役选择页面（Campaign）
- **目标**：列出所有战役（GDI / Nod / Allies / Soviet），显示任务缩略图、名称、完成状态（锁定/解锁/已完成）。
- **参考 OpenRA**：`mods/cnc/maps/` 目录结构 + 战役配置
- **文件**：`src/ui/shell/CampaignMenu.ts`, `src/game/campaign/CampaignData.ts`
- **验收**：点击战役展开任务列表，未完成任务显示锁定图标，已完成显示星星。
- **状态**：[ ] `done`

### Task 39: 遭遇战设置页面（Skirmish Setup）
- **目标**：选择地图、玩家数（含 AI）、起始资金、游戏速度、科技等级、胜利条件。AI 难度下拉框。
- **参考 OpenRA**：遭遇战大厅 UI
- **文件**：`src/ui/shell/SkirmishSetup.ts`
- **验收**：配置完成后点击"开始"进入游戏，配置参数传入 `GameLoop`。
- **状态**：[ ] `done`

### Task 40: 多人游戏大厅（Multiplayer Lobby）
- **目标**：房间列表（显示主机、地图、玩家数/最大数）、创建房间、加入房间、聊天框。
- **参考 OpenRA**：`OpenRA.Game/Network/Connection.cs` + Lobby UI
- **文件**：`src/ui/shell/MultiplayerLobby.ts`, `src/network/LobbyClient.ts`
- **验收**：能创建房间并显示在列表中，其他客户端可见。
- **状态**：[ ] `done`

### Task 41: 设置/选项页面（Settings）
- **目标**：Tab 分组：Display（分辨率/全屏/画质）、Audio（主音量/音乐/音效）、Controls（快捷键绑定）、Game（滚动速度/难度）。
- **参考 OpenRA**：`mods/*/chrome/settings.yaml`
- **文件**：`src/ui/shell/SettingsMenu.ts`, `src/core/SettingsManager.ts`
- **验收**：修改设置后即时生效，刷新页面后设置持久化（localStorage）。
- **状态**：[ ] `done`

### Task 42: 加载画面（Load Screen）
- **目标**：显示进度条、加载提示文字、Mod Logo。加载完成后淡入到游戏场景。
- **文件**：`src/ui/shell/LoadScreen.ts`
- **验收**：加载地图资源时进度条平滑增长，加载完成后无卡顿进入游戏。
- **状态**：[ ] `done`

---

## Phase 10: 游戏交互增强（Interaction Polish）

> 参考 OpenRA：`IOrderGenerator` 输入模式切换、`UnitOrders` 命令分发。  
> 当前已实现：左键选择、右键移动。本 Phase 补充所有 RTS 标准交互。

### Task 43: 鼠标光标系统（Cursors）
- **目标**：根据上下文切换光标：默认、选择（悬停友方）、移动（悬停地面）、攻击（悬停敌方）、建造（放置建筑时）、加载（悬停运输载具）。
- **参考 OpenRA**：`mods/*/cursors.yaml` + `HardwareCursor`
- **文件**：`src/core/CursorManager.ts`
- **Dummy 资源**：CSS `cursor: url(...)` 指向自定义 PNG 光标（32×32）。
- **验收**：光标在不同目标上正确变化，无系统默认光标闪烁。
- **状态**：[ ] `done`

### Task 44: Sidebar 生产队列 UI
- **目标**：右侧/左侧边栏显示可建造的建筑和单位，带图标、价格、冷却遮罩。点击后进入"准备放置"状态（建筑）或立即开始生产（单位）。
- **参考 OpenRA**：`mods/*/chrome/ingame-*.yaml` + `ProductionPaletteWidget.cs`
- **文件**：`src/renderer/ui/Sidebar.ts`
- **验收**：点击电厂图标，图标变灰并显示进度条；完成后图标高亮，再次点击进入放置预览。
- **状态**：[ ] `done`

### Task 45: 建筑放置预览与合法性检查
- **目标**：选择建筑后，鼠标跟随显示建筑幽灵轮廓（半透明）。合法位置绿色，非法位置红色（地形不可建造、与其他建筑重叠、距离不足）。
- **参考 OpenRA**：`PlaceBuildingOrderGenerator.cs`
- **文件**：`src/game/building/BuildingPlacement.ts`
- **验收**：在水上放置电厂显示红色；在合法平地显示绿色；点击后扣除资金并开始建造。
- **状态**：[ ] `done`

### Task 46: 命令队列（Shift Queue）
- **目标**：按住 Shift 下达多个移动/攻击命令，单位按顺序执行，路径点用虚线和小圆点显示。
- **参考 OpenRA**：`Order.Queued` 字段 + `UnitOrderGenerator`
- **文件**：`src/game/CommandQueue.ts`
- **验收**：Shift+右键点击 3 个不同位置，单位依次经过，地面上显示 3 个虚线路径点。
- **状态**：[ ] `done`

### Task 47: 攻击移动（Attack-Move）
- **目标**：A + 左键 或 右键点击敌方单位/地面时，单位向目标移动，途中自动攻击遇到的敌人。
- **参考 OpenRA**：`AttackMove` Activity
- **文件**：`src/game/unit/AttackMoveBehavior.ts`
- **验收**：坦克攻击移动到地图另一端，途中遇到敌方步兵会自动停下开火，消灭后继续前进。
- **状态**：[ ] `done`

### Task 48: 巡逻（Patrol）
- **目标**：Shift+Z 或右键点击两个点之间来回巡逻，自动攻击遇到的敌人。
- **文件**：`src/game/unit/PatrolBehavior.ts`
- **验收**：设置巡逻路径后，单位在两点之间循环移动，遇敌则攻击。
- **状态**：[ ] `done`

### Task 49: 单位编组（Ctrl+Number）
- **目标**：Ctrl+1~0 将选中单位编组，按数字键恢复选中。双击数字键将视角跳到编组中心。
- **参考 OpenRA**：`Selection` Trait 中的编组逻辑
- **文件**：`src/game/SelectionManager.ts` 扩展
- **验收**：选中 5 辆坦克按 Ctrl+1，之后按 1 恢复选中；双击 1 视角跳到坦克群。
- **状态**：[ ] `done`

### Task 50: 双击选中同类单位 + 框选优化
- **目标**：双击一个单位选中屏幕上所有可见的同类单位。框选时显示半透明绿色矩形。
- **文件**：`src/core/InputManager.ts`
- **验收**：双击一个步枪兵，选中屏幕内所有步枪兵；框选时矩形不闪烁。
- **状态**：[ ] `done`

### Task 51: Sell / Repair / Power 工具按钮
- **目标**：Sidebar 底部添加 Sell（$ 光标，点击建筑卖出）、Repair（扳手光标，点击建筑维修）、Power（闪电，开关电力）。
- **参考 OpenRA**：`SupportPowerManager` + `RepairOrderGenerator`
- **文件**：`src/game/building/BuildingTools.ts`
- **验收**：点击 Sell 后光标变 $，点击兵营获得一半资金，兵营消失。
- **状态**：[ ] `done`

### Task 51.5: 立场着色（Player Relationship Colors）🟢 P2
- **目标**：UI 层根据外交关系渲染不同颜色，而非固定阵营色。自己=绿、盟友=蓝、敌人=红、中立=灰。
- **文件**：`src/renderer/ui/RelationshipColors.ts`, `src/core/SelectionManager.ts`
- **OpenRA 对标**：`OpenRA.Game/Player.cs` 中 `PlayerRelationshipColor()` + `SetupRelationshipColors()`
- **关键变更**：
  - `RelationshipColor` 配置：Self/Allies/Neutrals/Enemies 四色映射
  - 选择环：盟友单位显示蓝色环、敌人显示红色环
  - 小地图：按关系着色（而非固定 GDI 黄/Nod 红）
  - 血条：敌人血条始终红色，友方血条绿色
  - 建筑幽灵：放置预览时按所属关系着色
- **依赖**：Task 27.5（外交关系系统先就位）
- **验收**：同一辆中坦，GDI 玩家看自己是黄色+绿色选择环；Nod 玩家看该中坦是黄色+红色选择环；盟军看它是蓝色选择环。
- **状态**：[ ] `done`

---

## Phase 11: 战役系统（Campaign & Scripting）

> 参考 OpenRA：`ScriptContext.cs`（Lua 沙箱）+ `mods/*/maps/*/*.lua`。  
> 我们的方案：`fengari-web`（Lua 5.3 WASM）或直接用 JS 脚本引擎。

### Task 52: 战役数据层
- **目标**：定义 `CampaignData`（战役列表）和 `MissionData`（单个任务：地图、简报、目标、脚本路径、解锁条件）。
- **文件**：`src/game/campaign/CampaignData.ts`, `src/game/campaign/MissionData.ts`
- **验收**：JSON 配置加载后，CampaignMenu 正确显示任务列表和完成状态。
- **状态**：[ ] `done`

### Task 53: 战役进度保存
- **目标**：localStorage 保存每个战役的完成状态、最佳时间、困难度通关标记。
- **文件**：`src/game/campaign/CampaignProgress.ts`
- **验收**：通关第一个任务后刷新页面，该任务显示"已完成"，下一个任务解锁。
- **状态**：[ ] `done`

### Task 54: 任务简报页面
- **目标**：进入战役前显示简报：背景图、任务描述文字（打字机效果）、语音旁白、目标列表。
- **参考 OpenRA**：`BriefingLogic.cs` + `Media.PlaySoundNotification`
- **文件**：`src/ui/shell/BriefingScreen.ts`
- **验收**：文字逐字显示，语音同步播放，点击 Skip 跳过。
- **状态**：[ ] `done`

### Task 55: 脚本运行时集成（Lua 或 JS）
- **目标**：集成脚本引擎。推荐 `fengari-web`（Lua 5.3 的 WASM 实现），或自建轻量 JS 脚本系统。
- **参考 OpenRA**：`ScriptContext.cs` + `MemoryConstrainedLuaRuntime`
- **文件**：`src/game/scripting/ScriptRuntime.ts`
- **验收**：引擎能加载并执行 `mission01.lua`，调用 `console.log` 输出测试字符串。
- **状态**：[ ] `done`

### Task 56: 脚本全局 API（ScriptGlobals）
- **目标**：向脚本暴露引擎 API：`Map`（地图信息）、`Player`（玩家属性/资金）、`Actor`（创建/销毁/查找单位）、`Media`（播放语音/音效/音乐）、`UI`（显示消息/倒计时）、`Trigger`（触发器）。
- **参考 OpenRA**：`ScriptGlobal` 子类（`MediaGlobal`, `MapGlobal`, `PlayerGlobal`）
- **文件**：`src/game/scripting/ScriptGlobals.ts`
- **验收**：Lua 脚本中可调用 `Map.Reveal(Player, CPos, radius)` 揭示地图黑雾。
- **状态**：[ ] `done`

### Task 57: 触发器系统（Triggers）
- **目标**：支持区域触发（单位进入/离开区域）、时间触发（N 秒后）、条件触发（资金达到 X / 单位死亡 / 建筑被摧毁）。
- **参考 OpenRA**：`Trigger.OnEnteredFootprint`, `Trigger.AfterDelay`, `Trigger.OnKilled`
- **文件**：`src/game/scripting/TriggerSystem.ts`
- **验收**：Lua 脚本中 `Trigger.OnEnteredFootprint(cells, callback)` 在 MCV 进入目标区域时触发胜利。
- **状态**：[ ] `done`

### Task 58: 任务目标系统（Objectives）
- **目标**：主要目标（必须完成）和次要目标（可选）。HUD 右上角显示目标列表，完成时打勾，失败时红叉。
- **参考 OpenRA**：`MissionObjectives` Trait
- **文件**：`src/game/campaign/ObjectiveSystem.ts`
- **验收**：战役开始时显示 2 个主要目标 + 1 个次要目标；摧毁敌方建造厂后主要目标 1 打勾。
- **状态**：[ ] `done`

### Task 59: 胜利/失败条件与结算
- **目标**：检测胜利/失败条件（全灭、目标达成、超时、关键单位死亡），弹出结算画面（胜利/失败动画 + 统计：时间、损失、击杀）。
- **文件**：`src/game/campaign/MissionEndScreen.ts`
- **验收**：摧毁所有敌方建筑后弹出"Mission Accomplished"，点击返回战役选择。
- **状态**：[ ] `done`

### Task 60: 战役过场动画（Video Playback）
- **目标**：支持播放战役开场/结尾视频。优先 WebM/MP4（HTML5 `<video>`），远期支持 VQA 解码。
- **参考 OpenRA**：`VqaLoader.cs`
- **文件**：`src/ui/shell/VideoPlayer.ts`
- **验收**：简报前自动播放 10 秒测试视频，可 Skip。
- **状态**：[ ] `done`

---

## Phase 12: 网络对战（Multiplayer & Networking）

> 参考 OpenRA：`OrderManager.cs` + `Server.cs` + `Connection.cs`（Lockstep 确定性模拟）。  
> 我们的方案：WebSocket（客户端↔服务器）+ 确定性模拟 + SyncHash。

### Task 61: 网络架构设计与协议定义
- **目标**：设计客户端-服务器协议：Handshake、RoomState、GameStart、OrderFrame、SyncHash、Chat、Disconnect。
- **文件**：`docs/NETWORK_PROTOCOL.md`, `src/network/NetworkProtocol.ts`
- **验收**：文档包含完整的消息格式（TypeScript interface + 二进制序列化方案）。
- **状态**：[ ] `done`

### Task 62: Order 序列化与反序列化
- **目标**：定义 `GameOrder` 接口（Move / Attack / Build / Sell / Stop / Deploy 等），支持二进制序列化（紧凑、版本兼容）。
- **参考 OpenRA**：`Order.cs` + `Order.Serialize` / `Order.Deserialize`
- **文件**：`src/network/GameOrder.ts`, `src/network/OrderSerializer.ts`
- **验收**：一个 MoveOrder 序列化后 < 32 字节，反序列化后字段完全还原。
- **状态**：[ ] `done`

### Task 63: 本地服务器（Headless Relay Server）
- **目标**：Node.js 实现的轻量中继服务器：接收客户端 Order，按帧广播给所有客户端。不运行游戏逻辑。
- **参考 OpenRA**：`OpenRA.Game/Server/Server.cs`
- **文件**：`server/src/GameServer.ts`, `server/src/PlayerSlot.ts`
- **验收**：2 个客户端连接后，服务器每帧转发 Order，无游戏逻辑计算。
- **状态**：[ ] `done`

### Task 64: 客户端连接与房间管理
- **目标**：客户端通过 WebSocket 连接服务器，加入/创建房间，选择阵营/颜色/起始位置，Ready/Unready，房主点击 Start。
- **文件**：`src/network/RoomClient.ts`, `src/network/NetworkManager.ts`
- **验收**：客户端 A 创建房间，客户端 B 加入并 Ready，房主开始游戏，双方同时进入加载画面。
- **状态**：[ ] `done`

### Task 65: Lockstep 确定性模拟
- **目标**：游戏开始后，所有客户端固定 timestep 模拟。每帧收集本地输入，发送 Order 到服务器，等待服务器返回该帧所有玩家的 Order 后再推进下一帧。
- **参考 OpenRA**：`OrderManager.TryTick()`
- **文件**：`src/game/GameLoop.ts` 扩展
- **验收**：2 个客户端同时运行 60 秒，双方单位位置完全一致（SyncHash 匹配）。
- **状态**：[ ] `done`

### Task 66: 同步检测与防作弊（SyncHash）
- **目标**：每 N 帧（如 30 帧）计算世界状态的哈希值（单位位置、血量、随机种子），客户端上报服务器比对。不匹配则标记 Desync。
- **参考 OpenRA**：`OrderManager` 中的 `SyncHash`
- **文件**：`src/game/SyncHash.ts`
- **验收**：故意修改一个客户端的随机种子，30 帧内服务器检测到 SyncHash 不匹配。
- **状态**：[ ] `done`

### Task 67: 断线重连与观战
- **目标**：玩家掉线后可重新连接，服务器发送完整世界快照（或从最近 checkpoint 重放 Order）。支持观战者加入。
- **文件**：`src/network/ReconnectHandler.ts`, `src/network/SpectatorManager.ts`
- **验收**：客户端断线 10 秒后重连，恢复到当前游戏状态，无可见卡顿。
- **状态**：[ ] `done`

### Task 68: 回放系统（Replay）
- **目标**：游戏开始时录制所有 `GameOrder[]` + 初始种子 + 地图信息到 `.cncreplay` 文件。回放时加载地图并按 Order 重新模拟。
- **参考 OpenRA**：`ReplayConnection.cs`
- **文件**：`src/replay/ReplayRecorder.ts`, `src/replay/ReplayPlayer.ts`
- **验收**：保存回放文件后，刷新页面加载回放，战斗过程与原始完全一致。
- **状态**：[ ] `done`

### Task 68.5: 观战者身份系统（Spectator Support）🟢 P2
- **目标**：在 House 层完整支持观战者身份。观战者不拥有单位、不参与胜负判定、可查看全图（无迷雾限制）。
- **文件**：`src/game/house/House.ts`, `src/game/house/HouseDiplomacy.ts`
- **OpenRA 对标**：`OpenRA.Game/Player.cs` 中 `Spectating` 属性
- **关键变更**：
  - `House.isSpectating`：观战者标志
  - 观战者视为所有活跃玩家的盟友（用于渲染和同步）
  - `UnlockedRenderPlayer`：观战者可自由切换观察视角（任意玩家视角）
  - 不占用 HouseType 枚举槽位（使用独立 Spectator 列表）
  - 聊天消息：观战者消息标记为 [Observer]
- **依赖**：Task 27.5（外交关系）+ Task 31（战争迷雾）
- **验收**：创建一个 `isSpectating=true` 的观察者，可看到全地图单位和建筑，不显示战争迷雾；游戏胜负不影响观察者状态。
- **状态**：[ ] `done`

---

## Phase 13: 资源与内容系统（Assets & Content）

> 参考 OpenRA：`ISpriteLoader` / `ISoundLoader` 插件系统 + `mods/*/mod.yaml` 资源清单。  
> 目标：支持加载原始 C&C 资源（MIX/SHP/AUD/VQA），并支持 Mod 覆盖。

### Task 69: 资源包加载系统（MIX/MPR 解析）
- **目标**：浏览器端解析 Westwood MIX 包格式，提取内部文件列表。支持 `CONQUER.MIX`, `GENERAL.MIX`, `SCORES.MIX` 等。
- **参考 OpenRA**：`OpenRA.Mods.Cnc/FileSystem/MixFile.cs`
- **文件**：`src/assets/loaders/MixLoader.ts`
- **验收**：上传一个 `.mix` 文件，控制台列出内部所有文件名和大小。
- **状态**：[ ] `done`

### Task 70: 精灵序列系统（SHP 解析与 Sprite Sheet）
- **目标**：解析 Westwood SHP 格式（帧动画、32/64 方向、调色板映射），构建时预处理为 PNG sprite sheet + JSON metadata。运行时按 actor + sequence + frame 索引。
- **参考 OpenRA**：`ShpTSLoader.cs` + `SequenceProvider.cs`
- **文件**：`tools/shp-to-spritesheet/`（Node.js CLI 工具）, `src/assets/loaders/ShpLoader.ts`
- **验收**：一个坦克 SHP 转换为 sprite sheet 后，Babylon.js 正确显示 32 方向行走动画。
- **状态**：[ ] `done`

### Task 71: 调色板系统（Palette & Remap）
- **目标**：加载 DOS/Win `.pal` 调色板文件。支持 remap（将调色板中的特定索引替换为阵营色，如 GDI 黄、Nod 红）。
- **参考 OpenRA**：`PaletteFromFile.cs` + `PlayerColorPalette.cs`
- **文件**：`src/assets/PaletteManager.ts`
- **验收**：同一辆坦克的 sprite，GDI 玩家显示为黄色，Nod 玩家显示为红色。
- **状态**：[ ] `done`

### Task 72: 语音与通知系统
- **目标**：将 AUD 格式语音预转换为 OGG/MP3。`AudioManager` 按分类（UnitVoice / Notification / Weapon / Ambient）播放。支持队列（通知不重叠）。
- **参考 OpenRA**：`Sound.cs` + `ISoundLoader`
- **文件**：`src/core/AudioManager.ts`, `tools/aud-converter/`
- **验收**：选中中坦播放 "Medium tank reporting"，建造完成播放 "Building"。
- **状态**：[ ] `done`

### Task 73: 背景音乐系统
- **目标**：战役/遭遇战背景音乐播放列表，支持淡入淡出，按游戏节奏切换（平静时慢节奏，战斗时快节奏）。
- **参考 OpenRA**：`MusicPlaylist.cs`
- **文件**：`src/core/MusicManager.ts`
- **验收**：游戏开始时播放 Act on Instinct，进入战斗后平滑切换到 Target。
- **状态**：[ ] `done`

### Task 74: 视频播放（VQA 或 WebM）
- **目标**：优先支持 WebM/MP4（预转换），远期支持浏览器端 VQA 解码。HTML5 `<video>` 全屏播放，可 Skip。
- **参考 OpenRA**：`VqaLoader.cs`
- **文件**：`src/ui/shell/VideoPlayer.ts`
- **验收**：战役开始前播放 15 秒 briefing 视频，Skip 后直接进入游戏。
- **状态**：[ ] `done`

### Task 75: 本地化系统（i18n）
- **目标**：所有 UI 文本、单位名称、提示语音支持多语言。初期中英文，远期扩展。使用 `i18next` + JSON 翻译文件，或 Fluent 格式。
- **参考 OpenRA**：`mods/*/fluent/*.ftl`（Mozilla Fluent）
- **文件**：`src/core/LocalizationManager.ts`, `public/locales/zh-CN.json`, `public/locales/en-US.json`
- **验收**：设置中切换语言后，主菜单所有文字即时变为中文/英文。
- **状态**：[ ] `done`

---

## Phase 14: 性能优化（Performance）

> 目标：200+ 单位 + 50+ 建筑 + 100+ 子弹仍保持 60FPS。
>
> **寻路性能子系统**：Phase 5.5 续中 Task 121（Binary Heap）、122（HPF 抽象图）、123（HPF 动态更新）、128（CellInfoLayerPool）专门负责寻路算法性能优化，与本 Phase 的渲染/逻辑优化形成互补。

### Task 76: 地形 LOD 与动态细分
- **目标**：远距离地形降低顶点密度，近景保持高细节。Babylon.js `LOD` 系统或自定义 shader。
- **文件**：`src/game/terrain/TerrainLOD.ts`
- **验收**：相机 zoom 到 100 时，地形 mesh 顶点数减少 50% 以上，视觉无明显差异。
- **状态**：[ ] `done`

### Task 77: 单位实例化渲染（InstancedMesh）
- **目标**：相同模型（如大量步兵、坦克）使用 `InstancedMesh` 批量渲染，减少 draw call。
- **文件**：`src/renderer/InstancedUnitRenderer.ts`
- **验收**：200 辆相同坦克的 draw call 从 200 降至 1，帧率提升 > 30%。
- **状态**：[ ] `done`

### Task 78: 视锥剔除（Frustum Culling）
- **目标**：Babylon.js 自动视锥剔除已启用，但自定义逻辑（如 UI 元素、特效）需手动剔除。确保屏幕外单位不更新逻辑（可选）。
- **文件**：`src/core/PerformanceManager.ts`
- **验收**：相机只显示地图 1/4 区域时，剩余 3/4 单位的逻辑更新可跳过（如果不影响网络同步）。
- **状态**：[ ] `done`

### Task 79: 对象池（Object Pool）
- **目标**：子弹、爆炸粒子、伤害数字等高频创建/销毁的对象使用对象池复用，避免 GC 抖动。
- **文件**：`src/core/ObjectPool.ts`
- **验收**：连续发射 100 发子弹，内存曲线平稳，无锯齿状 GC 峰值。
- **状态**：[ ] `done`

### Task 80: 特效合批与 GPU 粒子
- **目标**：爆炸、烟雾等特效使用 Babylon.js `ParticleSystem` 或 `GPUParticleSystem`，而非独立 Mesh。
- **文件**：`src/renderer/effects/ParticleManager.ts`
- **验收**：50 个同时爆炸的特效帧率 > 55FPS。
- **状态**：[ ] `done`

### Task 81: 纹理图集（Texture Atlas）
- **目标**：将大量小纹理（UI 图标、单位图标、地形贴图）合并为少数几张大 texture atlas，减少纹理切换。
- **文件**：`tools/texture-atlas-builder/`
- **验收**：UI 渲染 draw call 从 50+ 降至 5 以下。
- **状态**：[ ] `done`

---

## Phase 15: AI 与高级系统（AI & Advanced）

### Task 82: 基础 AI Bot（建造与扩张）
- **目标**：AI 自动建造基地（电厂→兵营→矿厂→战车工厂→防御），派出侦察单位，发现玩家后组织攻击。
- **参考 OpenRA**：`OpenRA.Mods.Common/Traits/BotModules/`
- **文件**：`src/game/ai/BaseBuilderAI.ts`, `src/game/ai/AttackAI.ts`
- **验收**：AI 在 5 分钟内建成完整基地并派出第一波攻击部队。
- **状态**：[ ] `done`

### Task 83: AI 难度等级
- **目标**：Easy / Normal / Hard / Brutal。影响：建造速度、资源作弊、微操精度、是否预瞄。
- **文件**：`src/game/ai/DifficultyScaler.ts`
- **验收**：Brutal AI 在 3 分钟内发起攻击，Easy AI 在 10 分钟后才发起。
- **状态**：[ ] `done`

### Task 84: 超级武器（Nuke / Ion Cannon）
- **目标**：核弹/离子炮蓄力倒计时（10 分钟），UI 显示倒计时，发射时全屏震动 + 特效 + 大范围伤害。
- **参考 OpenRA**：`NukePower.cs`, `IonCannonPower.cs`
- **文件**：`src/game/combat/SupportPowers.ts`
- **验收**：点击超级武器按钮，选择目标区域，10 秒倒计时后蘑菇云特效 + 中心区域建筑全毁。
- **状态**：[ ] `done`

### Task 85: 间谍/渗透系统
- **目标**：间谍进入敌方建筑窃取科技（显示敌方建造队列）、进入矿厂偷资金、进入电厂断电。
- **文件**：`src/game/unit/InfiltrationSystem.ts`
- **验收**：间谍进入敌方战车工厂后，玩家 Sidebar 可建造敌方单位。
- **状态**：[ ] `done`

### Task 86: 空军与运输系统
- **目标**：飞机从地图边缘飞入（非实体，不可选中），投弹后飞出。运输直升机装载/卸载步兵。空域不受地形阻挡。
- **参考 OpenRA**：`Aircraft` Trait + `Cargo` Trait
- **文件**：`src/game/unit/AircraftMovement.ts`, `src/game/unit/CargoSystem.ts`
- **验收**：A10 空袭从屏幕顶部飞入，投弹后飞出；运输直升机悬停卸载 5 名步兵。
- **状态**：[ ] `done`

### Task 87: 桥梁系统
- **目标**：桥梁可炸毁（断裂，下方变为水域/不可通行），可修复（工程师进入后重建）。
- **参考 OpenRA**：`BridgeHut.cs` + `Bridge.cs`
- **文件**：`src/game/terrain/BridgeSystem.ts`
- **验收**：坦克炸毁桥梁后，桥断裂，水面可见；工程师修复后恢复通行。
- **状态**：[ ] `done`

### Task 88: 中立单位与野生动物
- **目标**：地图上的中立建筑（医院、加油站，占领后提供增益）、野生动物（自动游走，被攻击后反击或逃跑）。
- **文件**：`src/game/neutral/NeutralBuilding.ts`, `src/game/neutral/WildlifeAI.ts`
- **验收**：占领医院后，所有步兵自动缓慢回血；奶牛在地图上随机游走。
- **状态**：[ ] `done`

---

## Phase 16: 编辑器与工具（Editor & Tools）

### Task 89: 内置地图编辑器（Tile Brush）
- **目标**：浏览器内置地图编辑器：选择地形笔刷（草地/道路/水域/悬崖），在网格上绘制。支持多层（地形层、覆盖层、资源层）。
- **参考 OpenRA**：`OpenRA.Mods.Common/EditorBrushes/`
- **文件**：`src/editor/MapEditor.ts`, `src/editor/TileBrush.ts`
- **验收**：编辑器中绘制 64×64 混合地形地图，导出 JSON 后 `MapLoader` 可直接加载。
- **状态**：[ ] `done`

### Task 90: 编辑器 Actor 放置与触发器编辑
- **目标**：在编辑器中放置单位、建筑、资源矿场。可视化编辑触发器（区域框选、目标配置）。
- **文件**：`src/editor/ActorPlacer.ts`, `src/editor/TriggerEditor.ts`
- **验收**：放置 5 辆敌方坦克 + 1 个 MCV，设置触发器"MCV 进入区域则胜利"。
- **状态**：[ ] `done`

### Task 91: 单位测试/平衡工具
- **目标**：沙盒模式：自由放置任意单位，测试对打，实时显示 DPS、伤害统计。
- **文件**：`src/game/sandbox/SandboxMode.ts`
- **验收**：放置 10 辆中坦 vs 10 辆轻坦，自动统计击杀时间和剩余血量。
- **状态**：[ ] `done`

---

## Phase 17: 发布与跨平台（Release & Platform）

### Task 92: 桌面应用打包（Electron / Tauri）
- **目标**：将 Web 应用打包为 Windows / macOS / Linux 桌面应用。支持全屏、无边框窗口、本地文件读取（直接加载 MIX 资源）。
- **文件**：`desktop/electron-main.js` 或 `desktop/src-tauri/`
- **验收**：双击 `.exe` 启动全屏游戏，无需浏览器，可直接读取 `C:\CNC\*.MIX`。
- **状态**：[ ] `done`

### Task 93: 移动端触控适配
- **目标**：支持触控操作：单指拖拽平移、双指缩放、点击选择、长按弹出命令菜单、框选手势。
- **文件**：`src/core/TouchInputManager.ts`
- **验收**：在 iPad Safari 上流畅运行，所有核心操作可用触控完成。
- **状态**：[ ] `done`

### Task 94: Steam 集成（远期）
- **目标**：Steam API 集成：成就、排行榜、云存档、多人匹配（Steam P2P）。
- **文件**：`src/platform/SteamIntegration.ts`
- **验收**：通过 Steam 启动游戏，解锁"First Blood"成就，云存档同步。
- **状态**：[ ] `done`

---

## 附录 A：预留模块（WIP）

> 以下模块不在 35 个核心 Task 之内，但已在代码结构中预留入口，Phase 8 后视需求开发。

### WIP-1: Tiberian Dawn 游戏模式
- **文件**：`remake/src/game/tiberiandawn/TiberianDawnGame.ts`
- **来源**：`origin/TIBERIANDAWN/`
- **状态**：WIP — 仅含占位类与接口，Console 输出提示
- **开发时机**：Phase 8 后
- **关联 Task**：Task 11（Rules 提取）、Task 13（地图加载）需同步支持 TiberianDawn 数据分支

### WIP-2: CnCTDRAMapEditor 地图编辑器
- **文件**：`remake/src/editor/MapEditor.ts`
- **来源**：`origin/CnCTDRAMapEditor/`
- **状态**：WIP — 仅含 JSON 导出格式接口与占位类
- **设计要点**：
  - 导出 JSON 与 `MapLoader.ts` 直接兼容
  - 保留原始编辑器的 Cell 坐标系、模板/图标索引、触发器结构
- **开发时机**：Phase 8 后，或作为独立 feature 迭代

---

## 附录 B：快速状态看板

| Phase | 任务数 | 完成数 | 备注 |
|-------|--------|--------|------|
| Phase 0 预研 | 6 | 6 | |
| Phase 1 基建 | 5 | 5 | |
| Phase 2 3D核心 | 5 | 5 | |
| Phase 3 数据层 | 4 | 4 | |
| Phase 4 单位系统 | 5 | 5 | |
| Phase 5 建筑系统 | 5 | 4 | Task 20–23 完成；23.32 电力自动汇总（P1）待开发 |
| Phase 5.5 寻路碰撞深度对齐 | 31 | 19 | Task 102–120 完成；Task 121–132 为 OpenRA 核心能力缺口回填（P0–P3）|
| Phase 6 交互 | 5 | 0 | Task 24 已合并到 111；25–27 待开发；27.5 外交、27.6 Bot 类型 |
| Phase 6.5 架构升级 | 5 | 0 | 95 YAML、96 Trait、97 规则继承、100 House 拆分、101 科技树 Watcher |
| Phase 7 战斗经济 | 6 | 0 | 含 98 Weapon 规则（Task 28 前置）；30.5 经济双轨化（P0） |
| Phase 7.5 Mod 支持 | 1 | 0 | 99 地图级规则覆盖 |
| Phase 8 循环发布 | 4 | 0 | |
| Phase 9 UI Shell | 7 | 0 | 主菜单、战役、遭遇战、多人、设置、加载 |
| Phase 10 交互增强 | 10 | 0 | 光标、Sidebar、Shift队列、攻击移动、编组；51.5 立场着色 |
| Phase 11 战役系统 | 9 | 0 | Lua脚本、触发器、目标、过场 |
| Phase 12 网络对战 | 9 | 0 | Lockstep、WebSocket、房间、回放；68.5 观战者身份 |
| Phase 13 资源内容 | 7 | 0 | MIX/SHP解析、音频、视频、本地化 |
| Phase 14 性能优化 | 6 | 0 | LOD、实例化、视锥剔除、对象池 |
| Phase 15 AI高级 | 7 | 0 | Bot、超级武器、空军、桥梁 |
| Phase 16 编辑器 | 3 | 0 | 地图编辑器、触发器编辑、沙盒 |
| Phase 17 发布平台 | 3 | 0 | 桌面打包、移动端、Steam |
| **总计** | **143** | **47** | |

---

*本文档随开发进度更新，新增任务或调整顺序时直接在此文件修改。*
