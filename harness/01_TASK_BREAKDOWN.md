# 项目任务分解表（35 Tasks）

> **调试约定**：每个 Task 完成后，请在右侧 `[ ]` 打勾，并在对应行末尾追加 `ready` 表示资源到位或 `done` 表示代码完成。  
> **类型检查**：每个 Task 提交前运行 `npm run type-check`，通过即可，不强制 `build`。

---

## Phase 0: 原始代码学习与 Harness 更新（Pre-coding）

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

### Task 10: 地形材质与纹理系统
- **目标**：支持多材质混合（草地、道路、水域、悬崖）。
- **参考 C++**：`TERRAIN.CPP` 中的地形类型枚举。
- **文件**：`src/renderer/materials/TerrainMaterial.ts`
- **Dummy 资源**：纯色材质 + 网格线框，真实纹理待 `ready` 后替换。
- **验收**：同一地图中三种地形同时可见，边界清晰。
- **状态**：[x] `done`

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
- **验收**：创建单位后，控制台打印属性与 C++ 默认值一致。
- **状态**：[x] `done`

### Task 16: Unit 3D 表现层（Dummy 几何体）
- **目标**：为每种单位类型创建 Babylon.js 程序化几何体组合。
- **Dummy 方案**：
  - 坦克：`Box` 车身 + `Cylinder` 炮塔 + `Box` 炮管，颜色区分阵营。
  - 步兵：`Capsule` 身体 + `Sphere` 头部。
  - 选择环：`Torus` 悬浮于单位底部。
- **文件**：`src/renderer/meshes/UnitMeshFactory.ts`
- **验收**：场景中生成 5 辆坦克与 10 个步兵，可见且可区分阵营。
- **状态**：[x] `done`

### Task 17: 单位移动与寻路（A* + 插值动画）
- **目标**：翻译 C++ 寻路逻辑。格子地图使用 A* 算法，世界坐标使用 Babylon `Animation` 或每帧插值移动。
- **参考 C++**：`UNIT.CPP` 中的 `Find_Path()`, `Set_Destination()`, `AI()`。
- **文件**：`src/game/unit/UnitMovement.ts`, `src/game/terrain/Pathfinder.ts`
- **数值沿用**：移动速度直接取自 `UnitDefinitions.Speed`。
- **验收**：右键点击地面，单位沿格子路径平滑移动，避开不可通行地形。
- **状态**：[ ] `done`

### Task 18: 单位转向与炮塔追踪
- **目标**：移动时车身平滑转向目标；进入攻击范围后炮塔独立旋转追踪敌人。
- **参考 C++**：`UNIT.CPP` 中的 `Rotation` 与 `TurretFacing` 逻辑。
- **文件**：`src/game/unit/UnitRotation.ts`
- **验收**：坦克移动时车身转向目标；停止后炮塔旋转指向敌人。
- **状态**：[ ] `done`

### Task 19: 单位碰撞与避障（简单版）
- **目标**：单位之间保持最小间距，路径被阻挡时重新寻路或等待。
- **文件**：`src/game/unit/UnitCollision.ts`
- **验收**：两个单位相向而行时，不会重叠，其中一个会暂停或绕行。
- **状态**：[x] `done`

---

## Phase 5: 建筑系统（Building System）

### Task 20: BuildingClass 核心属性（翻译 BUILDING.CPP）
- **目标**：翻译 `BuildingClass`：Health, PowerDrain/Production, Cost, BuildTime, Adjacency 规则。
- **文件**：`src/game/building/Building.ts`, `src/game/building/BuildingState.ts`
- **数值沿用**：引用 `BuildingDefinitions`。
- **验收**：创建电厂与兵营，属性与 C++ 默认值一致。
- **状态**：[ ] `done`

### Task 21: Building 3D 表现层（Dummy 几何体 + 建造动画）
- **目标**：建筑用组合几何体表示，建造过程中有从地面"生长"的缩放动画。
- **Dummy 方案**：
  - 电厂：`Box` 主体 + `Cylinder` 烟囱。
  - 矿厂：`Box` 主体 + `Torus` 传送带。
  - 建造动画：从 `scaling = Vector3.Zero()` 插值到 `Vector3.One()`。
- **文件**：`src/renderer/meshes/BuildingMeshFactory.ts`
- **验收**：放置建筑时，看到从地底升起的动画。
- **状态**：[ ] `done`

### Task 22: 建造队列与 Sidebar UI
- **目标**：翻译 C++ 建造队列逻辑。HTML Overlay 侧边栏显示可建造项，点击后进入"准备放置"状态，再点击地面确认建造。
- **参考 C++**：`BUILDING.CPP` 中的 `Begin_Construction()`, `Place()`。
- **文件**：`src/game/building/ConstructionQueue.ts`, `src/renderer/ui/Sidebar.tsx`（或纯 HTML）
- **验收**：点击 Sidebar 的"电厂"，鼠标变为放置预览，点击空地后扣除资金并开始建造。
- **状态**：[ ] `done`

### Task 23: 电力与基地依赖系统
- **目标**：电力不足时部分建筑停摆；建造兵营后才能造步兵；建造战车工厂后才能造坦克。
- **参考 C++**：`BUILDING.CPP` 中的 `Powered()` 与 `Can_Make()`。
- **文件**：`src/game/building/PowerManager.ts`, `src/game/building/TechTree.ts`
- **验收**：卖掉所有电厂后，雷达与防御塔停止工作；未建兵营时 Sidebar 步兵图标灰色不可点。
- **状态**：[ ] `done`

---

## Phase 6: 交互与输入（Interaction）

### Task 24: 鼠标输入层（框选 + 点击）
- **目标**：翻译 `MOUSE.CPP`。左键框选单位/建筑，右键对选中单位下达移动/攻击指令。
- **文件**：`src/core/InputManager.ts`, `src/core/SelectionBox.ts`
- **Dummy 资源**：框选用 HTML div 或 Babylon.GUI 矩形，颜色为绿色（友方）/红色（敌方）。
- **验收**：按住左键拖动出现绿色矩形，松开时框内单位被选中；右键点击地面单位移动。
- **状态**：[ ] `done`

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
- **目标**：HTML Overlay 显示顶部资源栏、底部选中单位信息、右下角小地图（先占位）。
- **文件**：`src/renderer/ui/HUD.css`, `src/renderer/ui/HUD.ts`
- **Dummy 资源**：小地图先用纯色方块表示地形，单位用点表示。
- **验收**：选中单位后，底部面板显示血量、速度、装甲类型。
- **状态**：[ ] `done`

---

## Phase 7: 战斗与经济（Combat & Economy）

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

### Task 31: 战争迷雾（Fog of War）
- **目标**：已探索区域显示地形但单位不可见；当前视野内显示一切；未探索区域为黑色。
- **实现方案**：Babylon.js 使用 `ShaderMaterial` 或动态顶点颜色，在 TerrainGrid 上叠加迷雾纹理。
- **文件**：`src/renderer/effects/FogOfWar.ts`
- **Dummy 资源**：迷雾用黑白网格纹理，单位视野半径固定 10 格。
- **验收**：单位移动后，周围圆形区域变为"已探索"，离开后不显示敌方单位。
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
| Phase 4 单位系统 | 5 | 2 | |
| Phase 5 建筑系统 | 4 | 0 | |
| Phase 6 交互 | 4 | 0 | |
| Phase 7 战斗经济 | 4 | 0 | |
| Phase 8 循环发布 | 4 | 0 | |
| **总计** | **41** | **22** | |

---

*本文档随开发进度更新，新增任务或调整顺序时直接在此文件修改。*
