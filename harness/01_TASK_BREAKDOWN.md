# 项目任务分解表（100 Tasks）

> **调试约定**：每个 Task 完成后，请在右侧 `[ ]` 打勾，并在对应行末尾追加 `ready` 表示资源到位或 `done` 表示代码完成。  
> **类型检查**：每个 Task 提交前运行 `npm run type-check`，通过即可，不强制 `build`。

---

## Phase 0: 原始代码学习与 Harness 更新（Pre-coding）

> **参考文档**：
> - `harness/04_CPP_TO_TS_MAPPING.md` — C++ → TS 代码翻译规范
> - `harness/05_OPENRA_ANALYSIS.md` — OpenRA 架构分析
> - `harness/05_RA2WEB_ANALYSIS.md` — RA2-Web（React + Three.js 红警2网页版）架构与组件分析，含数据解析器、渲染系统、音频系统、Trait/ECS 设计、触发器系统、任务系统、虚拟文件系统的详细映射

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
- **状态**：[ ] `done`

---

## Phase 6: 交互与输入（Interaction）

### Task 24: 鼠标输入层（框选 + 点击）
- **目标**：翻译 `MOUSE.CPP`。左键框选单位/建筑，右键对选中单位下达移动/攻击指令。
- **文件**：`src/core/InputManager.ts`, `src/core/SelectionBox.ts`
- **Dummy 资源**：框选用 Babylon.GUI 矩形，颜色为绿色（友方）/红色（敌方）。
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
- **目标**：Babylon.GUI 显示顶部资源栏、底部选中单位信息、右下角小地图（先占位）。
- **文件**：`src/renderer/ui/HUD.ts`
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
| Phase 5 建筑系统 | 4 | 2 | Task 22–23 待开发 |
| Phase 6 交互 | 4 | 0 | 选择环已存在（SelectionManager.ts），框选/编队待开发 |
| Phase 7 战斗经济 | 4 | 0 | |
| Phase 8 循环发布 | 4 | 0 | |
| Phase 9 UI Shell | 7 | 0 | 主菜单、战役、遭遇战、多人、设置、加载 |
| Phase 10 交互增强 | 9 | 0 | 光标、Sidebar、Shift队列、攻击移动、编组 |
| Phase 11 战役系统 | 9 | 0 | Lua脚本、触发器、目标、过场 |
| Phase 12 网络对战 | 8 | 0 | Lockstep、WebSocket、房间、回放 |
| Phase 13 资源内容 | 7 | 0 | MIX/SHP解析、音频、视频、本地化 |
| Phase 14 性能优化 | 6 | 0 | LOD、实例化、视锥剔除、对象池 |
| Phase 15 AI高级 | 7 | 0 | Bot、超级武器、空军、桥梁 |
| Phase 16 编辑器 | 3 | 0 | 地图编辑器、触发器编辑、沙盒 |
| Phase 17 发布平台 | 3 | 0 | 桌面打包、移动端、Steam |
| **总计** | **100** | **27** | |

---

*本文档随开发进度更新，新增任务或调整顺序时直接在此文件修改。*
