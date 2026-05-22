# C&C Remastered → Babylon.js 3D 重构项目

> 本文档供 AI Coding Agent 阅读。若你是首次接触本项目，请完整阅读本文后再进行任何代码操作。

---

## 项目概述

本项目目标是将 EA 开源的《命令与征服：重制版》原始 C++ 源码（`TiberianDawn.dll` / `RedAlert.dll`）中的**游戏逻辑层**迁移至 Web 平台，使用 Babylon.js 作为 3D 渲染引擎，Vite 作为构建工具，TypeScript 作为开发语言，最终通过 GitHub Pages 发布为浏览器可运行的单页 RTS 应用。

**核心原则**：数值与设定 100% 沿用 C++ 版本，仅做 3D 化呈现与 Web 平台适配。

**当前阶段**：项目处于 **Phase 0（Pre-coding）**。`harness/` 设计文档已完备，`origin/` 原始 C++ 源码已就位，但 **`remake/` 目录尚未创建**。任何编码工作都必须先阅读对应 harness 文档，再创建 `remake/` 中的文件。

---

## 技术栈

| 层级 | 技术 | 版本 | 备注 |
|------|------|------|------|
| 3D 引擎 | Babylon.js | ^9 | 替代原始商业引擎的渲染、输入、音频层 |
| 构建工具 | Vite | ^8 | `base: '/CnC_Remake/'` 已预定，适配 GitHub Pages |
| 语言 | TypeScript | strict mode | `noImplicitAny: true`，路径别名已规划 |
| UI 覆盖层 | HTML5 + CSS3 | - | HUD、Sidebar、小地图等 |
| 状态管理 | 轻量级 Observable / EventBus | 自建 | 替代 C++ 消息队列 |
| 网络 | WebSocket | Phase 8 预留 | 替代 `IPXCONN.CPP` |
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
├── harness/                         ← 设计文档与 Harness（只读参考，编码前必读）
│   ├── 00_PROJECT_HARNESS.md        ← 项目总览与技术栈
│   ├── 01_TASK_BREAKDOWN.md         ← 35 个任务的分解表与状态看板
│   ├── 02_RESOURCE_REQUIREMENTS.md  ← 资源需求清单（Dummy / 真实）
│   ├── 03_SETUP_AND_DEPLOYMENT.md   ← 环境搭建、CI/CD、部署指南
│   └── 04_CPP_TO_TS_MAPPING.md      ← C++ → TS 代码翻译规范与映射指南
├── origin/                          ← 原始 C++ 源码（学习用，禁止修改）
│   ├── REDALERT/                    ← 红警 DLL 完整源码
│   ├── TIBERIANDAWN/                ← 泰伯利亚黎明 DLL 完整源码
│   ├── CnCTDRAMapEditor/            ← C# 地图编辑器源码
│   ├── SCRIPTS/                     ← 辅助脚本
│   ├── CnCRemastered.sln
│   └── CnCTDRAMapEditor.sln
└── remake/                          ← 【尚未创建】新生成的 Web 端代码
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

> 以下命令需在 `remake/` 目录下执行（该目录尚不存在，创建后才能使用）。

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
```

**关键约束**：
- 日常开发只需 `npm run dev` + `npm run type-check`，**不强制每次 build**。
- 但**提交前必须 `npm run type-check` 通过**，CI 会阻断合并。
- `build` 仅在 CI/CD 流水线中自动执行。

---

## 代码组织与模块划分

`remake/src/` 的架构分层（对应 C++ 结构）：

```
src/
├── core/                    ← 引擎封装（替代 WIN32LIB/）
│   ├── EngineManager.ts     ← 引擎初始化
│   ├── SceneManager.ts      ← 场景生命周期
│   ├── InputManager.ts      ← 鼠标/键盘（替代 MOUSE.CPP / KEYBOARD.CPP）
│   ├── RTSCamera.ts         ← RTS 俯视角相机（替代 DISPLAY.CPP 视角逻辑）
│   ├── AudioManager.ts      ← 音效事件系统（预留）
│   └── EventBus.ts          ← 轻量级事件总线
├── game/                    ← 游戏逻辑层（核心翻译区）
│   ├── rules/               ← RULES.CPP 数值配置
│   ├── house/               ← HOUSE.CPP 阵营管理
│   ├── terrain/             ← TERRAIN.CPP / CELL.CPP 地形格子
│   ├── unit/                ← UNIT.CPP 单位系统
│   ├── building/            ← BUILDING.CPP 建筑系统
│   ├── weapon/              ← WEAPON.CPP / BULLET.CPP 弹道与伤害
│   ├── economy/             ← 采矿与经济系统
│   ├── combat/              ← 伤害计算与装甲系统
│   ├── tiberiandawn/        ← TIBERIANDAWN 模式入口（WIP，Phase 8 后开发）
│   │   └── TiberianDawnGame.ts
│   ├── GameLoop.ts          ← 60FPS 固定步长主循环
│   ├── GameObjectFactory.ts ← 统一工厂
│   ├── SelectionManager.ts  ← 选择系统
│   └── CommandDispatcher.ts ← 命令分发器
├── renderer/                ← 3D 表现层（新增）
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

## C++ → TypeScript 开发规范

### 1. 翻译原则
- **C++ 是设计文档**：不直接编译 C++，而是阅读其逻辑后，用 TS 重新实现。
- **Dummy 优先**：所有美术资源先用 Babylon.js 程序化几何体（Box/Sphere/Cylinder）替代，功能跑通后再替换为真实模型。
- **类型即文档**：所有从 C++ 翻译的类必须保留原始注释与数值来源，例如：
  ```typescript
  // Source: REDALERT/UNIT.CPP, Line 412
  ```
- **增量验证**：每个 Task 完成后应可独立运行调试，无需等待后续 Task。

### 2. 禁止直译清单

| C++ 特性 | 禁止做法 | 正确做法 |
|---------|---------|---------|
| `new/delete` 手动内存管理 | 直译 `new` | 使用 TS 对象引用，依赖 GC |
| `Win32 API` (`CreateWindow`, `BitBlt`) | 任何 Win32 调用 | 由 Babylon.js Engine/Scene 替代 |
| `IPX/TCP Socket` 原生网络 | 直译 Socket 代码 | 使用 WebSocket / WebRTC |
| `MFC` 界面 | 直译对话框/菜单 | 使用 HTML/CSS 覆盖层 |
| `__asm` 内联汇编 | 直译 | 删除，Babylon.js 用 Shader |
| `union` 内存共用体 | 直译 | 使用 TS Discriminated Union 类型 |
| 多继承 | 直译 | 使用 Mixin 模式或组合替代 |
| `#define` 宏常量 | 直译 | 使用 `const` / `enum` / `readonly` |

### 3. 坐标系统映射
- C++ 使用 **Cell 格子坐标** (x, y)。
- Babylon.js 使用 **Vector3 世界坐标** (x, y, z)。
- 双向映射由 `TerrainGrid.cellToWorld()` 与 `TerrainGrid.worldToCell()` 负责。
- `CELL_SIZE` 预定为 `1.5`（世界单位），需根据模型比例校准。

### 4. 代码注释规范
翻译时必须保留原始 C++ 源码引用：
```typescript
/**
 * 计算对目标的伤害值
 * Source: REDALERT/UNIT.CPP, Line ~1840
 * Original: int UnitClass::Take_Damage(int damage, WarheadType warhead, ...)
 */
```

---

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
| `cnc.pathfind` | `(sx, sy, ex, ey, check?)` | A* 寻路测试；`check` 可选 `All`/`Stationary`/`Immovable`/`None` | `cnc.pathfind(30, 30, 40, 30)` |
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

### GitHub Actions 工作流（尚未创建，配置见 `harness/03_SETUP_AND_DEPLOYMENT.md`）

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

## 如何阅读 C++ 源码（给 AI Agent 的指引）

1. **先看头文件**：`REDALERT/UNIT.H`、`BUILDING.H` 等，快速理解类结构与继承关系。
2. **提取常量**：关注 `.CPP` 文件顶部的 `#define` 与 `const` 数值（如 `ARMOR_LIGHT=1`）。
3. **理解坐标系**：C&C 原始逻辑使用格子坐标 (Cell X,Y)，Babylon 使用世界坐标 (Vector3)，需在 `Terrain` 层做双向映射。
4. **状态机模式**：C++ 中大量 `if (State == STATE_IDLE)` 的写法，在 TS 中改用 `StatePattern` 或 `Behavior` 组件。
5. **忽略平台代码**：`WIN32LIB/`、`IPXCONN.CPP` 中的 Win32 API 调用无需翻译，由 Babylon.js 引擎层替代。

### 关键 C++ 源码文件速查

| C++ 源码文件 | 核心类/概念 | TS 对应模块 | 备注 |
|-------------|------------|------------|------|
| `UNIT.CPP` | `UnitClass` | `src/game/unit/Unit.ts` | 状态机、移动、寻路 |
| `BUILDING.CPP` | `BuildingClass` | `src/game/building/Building.ts` | 建造队列、电力 |
| `TERRAIN.CPP` | `CellClass` | `src/game/terrain/Cell.ts` | 格子属性、通行性 |
| `RULES.CPP` | `RulesClass` | `src/game/rules/GameRules.ts` | 全局常量配置 |
| `HOUSE.CPP` | `HouseClass` | `src/game/house/House.ts` | 玩家/AI 阵营 |
| `WEAPON.CPP` | `WeaponTypeClass` | `src/game/weapon/Weapon.ts` | 武器参数 |
| `BULLET.CPP` | `BulletClass` | `src/game/weapon/Bullet.ts` | 弹道飞行、碰撞 |
| `DISPLAY.CPP` | 视角/渲染 | `src/core/RTSCamera.ts` | 相机控制 |
| `MOUSE.CPP` | 鼠标输入 | `src/core/InputManager.ts` | 框选、点击 |

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

1. **阅读 Harness**：先读 `harness/00_PROJECT_HARNESS.md` 和 `harness/01_TASK_BREAKDOWN.md`，确认当前 Task 编号。
2. **阅读映射规范**：再读 `harness/04_CPP_TO_TS_MAPPING.md`，理解如何从 C++ 翻译到 TS。
3. **查阅 C++ 源码**：到 `origin/REDALERT/` 或 `origin/TIBERIANDAWN/` 找到对应的 `.CPP/.H` 文件。
4. **创建/修改 remake/ 文件**：在 `remake/` 中编写 TS 代码，遵循本文件中的风格指南。
5. **运行类型检查**：`cd remake && npm run type-check`。
6. **更新 Harness**：在 `harness/01_TASK_BREAKDOWN.md` 中标记任务完成状态。

---

*本文档为活文档，随项目进展更新。最后更新：2026-05-10*

> **本次更新记录**：
> - 新增 `src/game/tiberiandawn/` 与 `src/editor/` 目录结构说明
> - 新增「多模块入口预留说明」章节，记录 Tiberian Dawn 与 MapEditor 的 WIP 设计原则
