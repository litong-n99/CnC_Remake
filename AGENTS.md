# C&C Remastered → Babylon.js 3D 重构项目

> 本文档供 AI Coding Agent 阅读。若你是首次接触本项目，请完整阅读本文后再进行任何代码操作。

---

## 项目概述

本项目目标是将 EA 开源的《命令与征服：重制版》原始 C++ 源码（`TiberianDawn.dll` / `RedAlert.dll`）中的数值与游戏规则迁移至 Web 平台，使用 Babylon.js 渲染、Vite 构建、TypeScript 开发，最终通过 GitHub Pages 发布为浏览器可运行的单页 RTS 应用。

**核心原则**：我们只从 `origin/` 获取数值数据和规则参数，不对其进行直接代码移植。`origin/` 是参考来源，而不是实现目标。

OpenRA 和 `ra2-web` 项目提供了必要的性能优化、浏览器适配和实际运行经验，是我们实现稳定 Web 端交付的关键参考。

**当前阶段**：项目已进入 `remake/` 开发阶段。任何编码工作应优先参考 `harness/` 和 `docs/` 中的分析与任务文档。

---

## 技术栈

| 层级 | 技术 | 版本 | 备注 |
|------|------|------|------|
| 3D 引擎 | Babylon.js | ^9 | 替代原始商业引擎的渲染、输入、音频层 |
| 构建工具 | Vite | ^8 | `base: '/CnC_Remake/'` 已预定，适配 GitHub Pages |
| 语言 | TypeScript | strict mode | `noImplicitAny: true`，路径别名已规划 |
| UI 覆盖层 | HTML5 + CSS3 | - | HUD、Sidebar、小地图等 |
| 状态管理 | 轻量级 Observable / EventBus | 自建 | 替代原始消息队列 |
| 网络 | WebSocket | Phase 8 预留 | 替代原始网络层 |
| CI/CD | GitHub Actions | - | 类型检查 + Lint + 自动部署 |
| 部署 | GitHub Pages | - | `main` 分支合并后自动发布 |

---

## 目录结构与职责边界

```
CnC_Remake/                          ← GitHub 仓库根目录
├── .github/                         ← CI/CD 工作流（尚未创建）
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docs/                            ← 额外文档与分析（`docs/bugs.md` 仅可阅读，不可修改）
│   ├── bugs.md
│   └── tasks.md                    ← 后续任务文档
├── harness/                         ← 设计文档与 Harness（只读参考，编码前必读）
│   ├── PROJECT_HARNESS.md        ← 项目总览与技术栈
│   ├── NETWORK_PROTOCOL.md          ← 网络协议设计文档
│   ├── TASK_BREAKDOWN.md         ← 归档任务分解表，已不再作为当前主流程
│   ├── RESOURCE_REQUIREMENTS.md  ← 资源需求清单（Dummy / 真实）
│   ├── SETUP_AND_DEPLOYMENT.md   ← 环境搭建、CI/CD、部署指南
│   ├── CPP_TO_TS_MAPPING.md      ← TS 实现映射与规范
│   ├── OPENRA_ANALYSIS.md        ← OpenRA 优化与实现分析
│   ├── RA2WEB_ANALYSIS.md       ← ra2-web 网页适配分析
│   ├── DEBUG_CONSOLE.md         ← 调试控制台设计
│   ├── DEPTH0_OPENRA_GAP_ANALYSIS.md ← OpenRA 改进差距分析
│   ├── PATHFINDING_OPENRA_GAP_ANALYSIS.md ← 路径寻路改进分析
├── origin/                          ← 原始 C++ 源码（仅用于数值与规则参数参考）
│   ├── REDALERT/                    ← 红警 DLL 完整源码
│   ├── TIBERIANDAWN/                ← 泰伯利亚黎明 DLL 完整源码
│   ├── CnCTDRAMapEditor/            ← C# 地图编辑器源码
│   ├── SCRIPTS/                     ← 辅助脚本
│   ├── CnCRemastered.sln
│   └── CnCTDRAMapEditor.sln
└── remake/                          ← 新生成的 Web 端代码
    ├── src/
    ├── public/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── ...（Vite + TypeScript 工程）
```

**绝对禁止**：
- 修改 `origin/` 中的任何文件。
- 在 `harness/` 中放置可执行代码。

---

## 构建与开发命令

> 以下命令需在 `remake/` 目录下执行。

```bash
# 启动开发服务器（带实时类型检查）
npm run dev

# 手动类型检查（日常开发核心命令）
npm run type-check

# 构建生产包
npm run build

# 代码检查与自动修复
npm run lint
npm run lint:fix

# 本地预览生产构建
npm run preview

# 代码格式化
npm run format

# 端到端验证
npm run test:e2e
```

**关键约束**：
- 日常开发首要命令是 `npm run dev` 和 `npm run type-check`。
- 但**提交前必须 `npm run type-check` 通过**，CI 会阻断合并。
- `build` 主要用于 CI/CD 和生产验证。

---

## 代码组织与模块划分

`remake/src/` 的架构分层：

```
src/
├── core/                    ← 引擎封装与平台适配
│   ├── EngineManager.ts     ← 引擎初始化
│   ├── SceneManager.ts      ← 场景生命周期
│   ├── InputManager.ts      ← 鼠标/键盘输入与事件处理
│   ├── RTSCamera.ts         ← RTS 俯视角相机与视角控制
│   ├── AudioManager.ts      ← 音效事件系统（预留）
│   └── EventBus.ts          ← 轻量级事件总线
├── game/                    ← 游戏逻辑层
│   ├── rules/               ← 数值配置与规则定义
│   ├── house/               ← 阵营与玩家管理
│   ├── terrain/             ← 地形与格子系统
│   ├── unit/                ← 单位行为与状态机
│   ├── building/            ← 建筑系统与建造逻辑
│   ├── weapon/              ← 武器、弹道与伤害计算
│   ├── economy/             ← 采矿与经济系统
│   ├── combat/              ← 伤害与装甲交互
│   ├── tiberiandawn/        ← Tiberian Dawn 模式入口（WIP，Phase 8 后开发）
│   │   └── TiberianDawnGame.ts
│   ├── GameLoop.ts          ← 60FPS 固定步长主循环
│   ├── GameObjectFactory.ts ← 统一工厂
│   ├── SelectionManager.ts  ← 选择系统
│   └── CommandDispatcher.ts ← 命令分发器
├── renderer/                ← 3D 表现层
│   ├── meshes/              ← Dummy / 真实模型加载
│   ├── materials/           ← 地形/单位/建筑材质
│   ├── effects/             ← 粒子、弹道轨迹、爆炸
│   └── ui/                  ← Babylon.GUI + HTML Overlay
├── network/                 ← 网络抽象层（预留）
├── save/                    ← 存档序列化
├── editor/                  ← 地图编辑器（WIP，Phase 8 后开发，导出 JSON 格式）
│   └── MapEditor.ts
├── types/                   ← 全局类型定义
└── main.ts                  ← 入口
```

---

## 代码规范

### 1. 实现原则
- `origin/` 提供数值、规则和行为参考，但不做直接代码移植。
- `OpenRA` 和 `ra2-web` 提供浏览器适配、性能优化和运行经验，是实现稳定 Web 端交付的重要参考。
- Dummy 资源优先：先用 Babylon.js 程序化几何体（Box/Sphere/Cylinder）替代真实模型，功能跑通后再替换。
- 类型即文档：所有规则和数据结构应保持清晰、严格的 TypeScript 类型。
- 增量验证：每个 Task 完成后应可独立运行调试，无需等待后续 Task。

### 2. 禁止直译清单

| 禁止做法 | 正确做法 |
|---------|---------|
| 手动内存管理模式 | 使用 TS 对象引用，依赖 GC |
| 任何 Win32 API 调用 | 由 Babylon.js 引擎与浏览器平台替代 |
| 原生 Socket 代码 | 使用 WebSocket / WebRTC 或浏览器网络层 |
| 直接移植 MFC 界面 | 使用 HTML/CSS 覆盖层 |
| 内联汇编或平台专用指令 | 删除或改用可移植 TS/Shader |
| 直接使用 `#define` 宏 | 使用 `const` / `enum` / `readonly` |
| 多继承直译 | 使用 Mixin 模式或组合替代 |

### 3. 坐标系统映射
- C&C 游戏逻辑使用 **Cell 格子坐标** (x, y) 作为内部地图单位。
- Babylon.js 在世界空间中使用 **Vector3** (x, y, z)。
- 双向映射由 `TerrainGrid.cellToWorld()` 与 `TerrainGrid.worldToCell()` 负责。
- `CELL_SIZE` 预定为 `1.5`（世界单位），需根据模型比例校准。

## 代码风格指南

### TypeScript 配置
- `strict: true`
- `noImplicitAny: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

### 路径别名
```json
{
  "@/*": ["src/*"],
  "@core/*": ["src/core/*"],
  "@game/*": ["src/game/*"],
  "@renderer/*": ["src/renderer/*"]
}
```

### 提交规范（Commit Message）
```
feat(task-09): 地形网格系统基础实现
type(task-11): 修复 Rules 模块中坦克血量类型错误
docs(harness): 更新任务分解表，标记 task-1 完成
asset(resource): 添加 u_mtank.glb 真实模型，替换 Dummy
```

### 分支策略
```
main        ← 仅接受 PR，自动部署到 GitHub Pages
  ↑
dev         ← 日常开发分支
  ↑
feature/xx  ← 单个 Task 分支（如 feature/task-09-terrain-grid）
```

---

## 测试策略

本项目以**静态类型检查**和**增量可运行验证**为核心测试手段：

1. **类型检查**：`npm run type-check`（`tsc --noEmit`）是日常开发的首要质量门控。
2. **Lint 检查**：`npm run lint` 确保代码风格一致。
3. **构建验证**：`npm run build` 在 CI 中执行，确保无构建错误。
4. **运行时验证**：每个 Task 完成后应能在浏览器中独立运行调试（如"生成 5 辆坦克可见且可区分阵营"）。

**注意**：目前无单元测试框架计划，如需引入，应在 `remake/` 初始化时讨论决定。

---

## 调试控制台（Debug Console）

为方便运行时快速验证功能，项目提供了一个浏览器 DevTools 调试控制台，通过 `window.cnc` 暴露一组命令。该控制台**仅在开发环境可用**，不应出现在生产构建中。

### 安装位置

`remake/src/debug/GameConsole.ts` 由 `main.ts` 在场景初始化后自动 `install()`，将命令注册到全局 `window.cnc` 对象。

### 可用命令

| 命令 | 签名 | 说明 | 示例 |
|------|------|------|------|
| `cnc.unit` | `(type, house='gdi', x?, y?)` | 生成单位；省略 `x,y` 时在相机中心最近可用地面生成 | `cnc.unit('MediumTank', 'gdi')` / `cnc.unit('MediumTank', 'nod', 30, 30)` |
| `cnc.building` | `(type, house='gdi')` | 启动建筑放置模式（ghost 跟随鼠标，左键放置，右键取消） | `cnc.building('PowerPlant', 'gdi')` |
| `cnc.money` | `(house?, amount?)` | 查看或增加资金 | `cnc.money('gdi', 5000)` |
| `cnc.power` | `(house?)` | 查看电力状态 | `cnc.power('nod')` |
| `cnc.kill` | `(type?)` | 杀死对象 | `cnc.kill('units')` / `cnc.kill()` |
| `cnc.clear` | `()` | 清除所有对象 | `cnc.clear()` |
| `cnc.list` | `()` | 列出所有单位/建筑 | `cnc.list()` |
| `cnc.actorMap` | `(x?, y?)` | 查看 ActorMap 格子占用；省略参数时列出所有被占格子 | `cnc.actorMap(30, 30)` |
| `cnc.collision` | `(x, y, excludeId?)` | 检查指定格子是否被其他单位阻塞 | `cnc.collision(30, 30, 'unit-id')` |
| `cnc.pathfind` | `(sx, sy, ex, ey, check?, locomotion?)` | A* 寻路测试；`check` 可选 `All`/`Stationary`/`Immovable`/`None`；`locomotion` 可选 `Foot`/`Track`/`Wheel`/`Winged`/`Float`（默认 `Track`） | `cnc.pathfind(30, 30, 40, 30, 'All', 'Track')` |
| `cnc.moveUnit` | `(unitId, targetX, targetY)` | 命令指定单位移动到目标格子 | `cnc.moveUnit('unit-abc', 40, 30)` |
| `cnc.distance` | `(idA, idB)` | 计算两个单位之间的欧几里得距离 | `cnc.distance('unit-a', 'unit-b')` |
| `cnc.debugState` | `()` | 返回所有单位的运行时状态（位置、双格占用、状态机等） | `cnc.debugState()` |
| `cnc.help` | `()` | 显示帮助信息 | `cnc.help()` |

### 单位类型（`cnc.unit` 的 `type` 参数）

取自 `UNIT_DEFINITIONS` 的键名：

`LightTank`, `MediumTank`, `HeavyTank`, `MammothTank`, `Harvester`, `MCV`, `Jeep`, `APC`, `Artillery`, `V2Rocket`, `RifleInfantry`, `Grenadier`, `RocketSoldier`, `Flamethrower`, `Engineer`, `Tanya`, `Spy`, `Medic`, `AttackDog`

### 建筑类型（`cnc.building` 的 `type` 参数）

取自 `BUILDING_DEFINITIONS` 的键名：

`ConstructionYard`, `PowerPlant`, `AdvancedPower`, `OreRefinery`, `Barracks`, `WarFactory`, `Radar`, `Helipad`, `RepairFacility`, `Shipyard`, `TeslaCoil`, `GapGenerator`, `SAMSite`, `Silo`, `Turret`

### 阵营（`house` 参数）

- `'gdi'` — 对应 `HouseType.GDI`
- `'nod'` — 对应 `HouseType.Nod`

---

## CI/CD 与部署

### GitHub Actions 工作流（尚未创建，配置见 `harness/SETUP_AND_DEPLOYMENT.md`）

1. **CI 工作流** (`ci.yml`)：
   - 触发条件：`push` 到 `main` / `dev`，或 `pull_request` 到 `main`
   - 执行：安装依赖 → `npm run type-check` → `npm run lint` → `npm run build`
   - 工作目录：`remake/`
   - Node 版本：20

2. **CD 工作流** (`deploy.yml`)：
   - 触发条件：`push` 到 `main`，或手动触发
   - 执行：build → 上传 `./remake/dist` → 部署到 GitHub Pages
   - 访问地址：`https://<user>.github.io/CnC_Remake/`

### 部署注意事项
- `vite.config.ts` 中的 `base` **必须**与仓库名完全一致（区分大小写），否则资源 404。
- GitHub Pages 的 Source 需设置为 **GitHub Actions**（非 Branch）。
- `main` 分支需配置保护规则：要求 PR + CI 通过 + 1 review。

---

## 如何查阅项目参考文档（给 AI Agent 的指引）

1. 阅读 `harness/PROJECT_HARNESS.md` 和 `harness/CPP_TO_TS_MAPPING.md`，确认项目目标与数据/规则映射规范。
2. 阅读 `harness/OPENRA_ANALYSIS.md` 和 `harness/RA2WEB_ANALYSIS.md`，理解 OpenRA 性能优化与 ra2-web 浏览器适配的重要性。
3. `harness/TASK_BREAKDOWN.md` 已归档，不再作为当前主流程；后续任务请参考 `docs/tasks.md`。
4. 查阅 `docs/bugs.md` 与 `harness/NETWORK_PROTOCOL.md`，了解当前已知问题与网络协议设计思路。
5. `origin/` 仅用于查数值和规则参数，不作为直接实现蓝图；避免将其视为完整源码译本。

---

## 安全注意事项

1. **不要修改 `origin/`**：这是 EA 开源的原始代码，仅作参考。任何修改都会破坏其作为"设计蓝图"的可信度。
2. **不要提交真实密钥**：`remake/` 中的任何配置都不应包含 API 密钥、私钥或凭据。本项目为纯前端游戏，理论上不需要敏感凭据。
3. **资源版权**：`origin/` 中的代码受 GPL v3 + 附加条款约束。`remake/` 为全新实现，但如需使用原始游戏的美术/音效资源，需确保用户已拥有正版游戏（见 `origin/LICENSE.md`）。目前阶段全部使用 Dummy 资源，无版权问题。
4. **路径安全**：所有文件操作仅限工作目录 `e:\CnC_Remake` 及其子目录，禁止访问外部路径。

---

## 多模块入口预留说明

本项目在 Phase 8 之前聚焦 **Red Alert（REDALERT/）** 模式的游戏逻辑迁移，但代码结构已为以下两个模块预留入口：

### 1. Tiberian Dawn 模式入口
- **文件**：`remake/src/game/tiberiandawn/TiberianDawnGame.ts`
- **状态**：WIP（Work In Progress）
- **设计原则**：
  - 复用 `core/` 引擎层与 `renderer/` 表现层，不做重复封装。
  - 独立 `rules/`、`unit/`、`building/` 数据定义，从 `origin/TIBERIANDAWN/` 提取常量。
  - 支持 TEMPERATE / DESERT / WINTER 剧场，泰伯利亚矿生长逻辑替代矿石系统。
- **开发时机**：Phase 8（Red Alert 核心循环稳定后）

### 2. CnCTDRAMapEditor 地图编辑器入口
- **文件**：`remake/src/editor/MapEditor.ts`
- **状态**：WIP（Work In Progress）
- **设计原则**：
  - 参考 `origin/CnCTDRAMapEditor/`（C# 源码），迁移核心编辑功能至 Web。
  - 地图数据导出为 **JSON 格式**，与 `MapLoader.ts` 直接兼容。
  - 保留原始编辑器的格子坐标系、地形模板枚举、触发器系统。
- **JSON 导出格式**：详见 `MapEditor.ts` 中的 `MapEditorJsonExport` 接口注释。
- **开发时机**：Phase 8 后，或作为独立迭代任务。

---

## 快速上手（Agent 操作清单）

如果你是接到本项目的编码任务，请按以下顺序执行：

1. **阅读 Harness**：先读 `harness/PROJECT_HARNESS.md` 和 `harness/CPP_TO_TS_MAPPING.md`，确认项目目标与映射规范。
2. **理解 Web 端参考**：阅读 `harness/OPENRA_ANALYSIS.md` 和 `harness/RA2WEB_ANALYSIS.md`，理解 OpenRA 性能优化与 ra2-web 浏览器适配的重要性。
3. **查阅辅助文档**：查看 `docs/bugs.md` 与 `harness/NETWORK_PROTOCOL.md`，了解当前已知问题与网络协议设计思路。
4. **注意任务档案**：`harness/TASK_BREAKDOWN.md` 已归档，不再作为当前主流程；后续任务请参考 `docs/tasks.md`。
5. **创建/修改 remake/ 文件**：在 `remake/` 中编写 TS 代码，遵循本文件中的风格指南。
6. **运行类型检查**：`cd remake && npm run type-check`。
7. **更新状态**：在 `docs/tasks.md` 或相关文档中记录任务进展。

---

*本文档为活文档，随项目进展更新。最后更新：2026-05-10*

> **本次更新记录**：
> - 新增 `src/game/tiberiandawn/` 与 `src/editor/` 目录结构说明
> - 新增「多模块入口预留说明」章节，记录 Tiberian Dawn 与 MapEditor 的 WIP 设计原则

## Webwright Skill（新增）

- **目标**：在仓库内支持基于 Microsoft Webwright 的“代码即动作”工作流——生成可重跑的 Python+Playwright 脚本、收集运行产物（trajectory、screenshots、report），并生成可供 Claude Code / Codex 等宿主使用的插件 scaffold。
- **何时使用**：需要把复杂浏览器任务表达为可复现脚本、希望将 LLM 生成的交互封装为参数化 CLI（`craft`）或一次性脚本（`run`）、需要我在工作中帮你调用该 skill 以方便开发验证和测试回测、或需要将运行产物转换为可读报告/issue 描述时。
- **能力要点**：
  - 生成 Webwright 风格的 scaffold（`plan.md`、`final_script.py` / 参数化 wrapper）、并放入指定工作目录（例如 `remake/webwright_runs/<id>/`）。
  - 生成运行命令示例与环境说明（Python 3.10+、Playwright chromium、模型 API key），并给出可复制的本地/CI 步骤。
  - 解析 `outputs/<run>/trajectory.json`、`report.json` 与 screenshots，生成 Markdown 摘要、失败重现步骤和可提交的 issue/PR 草稿。
  - 可生成 `skills/webwright/` 插件结构（manifest、commands），以便在 Claude Code / Codex 中安装并调用。
- **安装/运行参考**（摘自 Webwright README）：

```bash
pip install -e .
playwright install chromium

python -m webwright.run.cli -c base.yaml -c model_openai.yaml \
  -t "Search for flights from SEA to JFK on 2026-08-15" \
  --start-url https://www.google.com/flights \
  --task-id demo_openai -o outputs/default
```

- **注意事项**：运行需要模型 API key（`OPENAI_API_KEY` / `ANTHROPIC_API_KEY` 等），Webwright 会在磁盘写入轨迹与截图，注意清理敏感数据；skill 不会在未授权情况下注入或泄露密钥。

如需我把 scaffold 生成到仓库（例如 `remake/webwright_runs/map_load_demo/`）或将该小节同步回 `skills/` 索引，请告诉我下一个目标。
