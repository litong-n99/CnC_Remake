# C&C Remastered → Babylon.js 3D 重构项目总览

> **角色设定**：高级游戏开发工程师，精通《命令与征服：重制版》原始 C++ 源码（TiberianDawn.dll / RedAlert.dll）与 Babylon.js ^9 最新特性。
> **核心原则**：数值与设定 100% 沿用 C++ 版本，仅做 3D 化呈现与 Web 平台适配。

---

## 1. 项目定位

将 EA 开源的 `CnC_Remastered_Collection` 中的**游戏逻辑层**（非引擎/非素材）迁移至 Web 平台，使用 Babylon.js 作为 3D 渲染引擎，Vite 作为构建工具，TypeScript 作为开发语言，最终通过 GitHub Pages 发布。

- **原始代码角色**：作为设计蓝图与数值圣经，提供状态机、伤害公式、寻路算法、建造队列等逻辑参考。
- **Babylon.js 角色**：替代原始商业引擎的渲染、输入、音频、网络层。
- **输出目标**：浏览器可运行的单页 RTS 应用，支持鼠标框选、俯视角相机、单位移动、建筑建造、战斗弹道。

---

## 2. 技术栈

| 层级 | 技术 | 版本 | 文档 |
|------|------|------|------|
| 3D 引擎 | Babylon.js | ^9 | https://doc.babylonjs.com/ |
| 构建工具 | Vite | ^8 | https://cn.vitejs.dev/config/ |
| 语言 | TypeScript | ^6 (strict mode) | |
| UI 覆盖层 | Babylon.GUI | - | |
| 状态管理 | 轻量级 Observable / EventBus | 自建 | |
| 网络 | WebSocket (Phase 8 预留) | - | |
| CI/CD | GitHub Actions | - | |
| 部署 | GitHub Pages | - | |

---

## 2.5 项目目录结构（三层隔离）

所有文件按职责隔离在三个顶层目录中：

```
CnC_Remake/                          ← GitHub 仓库根目录
├── .github/
│   └── workflows/                     ← CI/CD 工作流（仓库级）
├── harness/                           ← 设计文档与 Harness
│   ├── 00_PROJECT_HARNESS.md
│   ├── 01_TASK_BREAKDOWN.md
│   ├── 02_RESOURCE_REQUIREMENTS.md
│   ├── 03_SETUP_AND_DEPLOYMENT.md
│   └── 04_CPP_TO_TS_MAPPING.md
├── origin/                            ← 原始 C++ 源码（学习用，不修改）
│   ├── REDALERT/
│   ├── TIBERIANDAWN/
│   ├── CnCTDRAMapEditor/
│   └── ...（EA 开源仓库原始结构）
├── ra2-web/                           ← RA2-Web 参考源码（本地保留，不纳入 git）
│   └── ...（React + Three.js 红警2网页版，仅作架构参考）
└── remake/                            ← 新生成的 Babylon.js + TS 项目
    ├── src/
    ├── public/
    ├── package.json
    ├── vite.config.ts
    └── ...（Vite + TypeScript 工程）
```

**职责边界**：
- `harness/`：只存放设计文档、任务清单、资源清单。编码前必须先阅读并更新此处文档。
- `origin/`：只存放原始 C++ 源码。开发前需先查看对应 `.CPP/.H` 文件，理解逻辑后，将提取的数值、状态机、算法更新到 `harness/04_CPP_TO_TS_MAPPING.md`，再开始 `remake/` 的编码。
- `remake/`：只存放新生成的 Web 端代码。所有路径、配置、CI 均以此目录为工程根目录。


## 3. 架构分层（对应 C++ 结构）

```
src/
├── core/                    ← 引擎封装（替代 WIN32LIB/）
│   ├── EngineManager.ts     ← 对应引擎初始化
│   ├── SceneManager.ts      ← 场景生命周期
│   ├── InputManager.ts      ← 鼠标/键盘（替代 MOUSE.CPP / KEYBOARD.CPP）
│   └── RTSCamera.ts         ← RTS 俯视角相机（替代 DISPLAY.CPP 视角逻辑）
├── game/                    ← 游戏逻辑层（核心翻译区）
│   ├── rules/               ← RULES.CPP 数值配置
│   ├── house/               ← HOUSE.CPP 阵营管理
│   ├── terrain/             ← TERRAIN.CPP / CELL.CPP 地形格子
│   ├── unit/                ← UNIT.CPP 单位系统
│   ├── building/            ← BUILDING.CPP 建筑系统
│   ├── weapon/              ← WEAPON.CPP / BULLET.CPP 弹道与伤害
│   └── economy/             ← 采矿与经济系统
├── renderer/                ← 3D 表现层（新增）
│   ├── meshes/              ← Dummy / 真实模型加载
│   ├── materials/           ← 地形/单位/建筑材质
│   ├── effects/             ← 粒子、弹道轨迹、爆炸
│   └── ui/                  ← Babylon.GUI
├── network/                 ← 网络抽象层（预留，替代 IPXCONN.CPP）
├── save/                    ← 存档序列化
└── main.ts                  ← 入口
```

---

## 4. 开发原则

1. **C++ 为设计文档**：不直接编译 C++，而是阅读其逻辑后，用 TS 重新实现。
2. **Dummy 优先**：所有美术资源先用 Babylon.js 程序化几何体（Box/Sphere/Cylinder）替代，功能跑通后再替换为真实模型。
3. **类型即文档**：所有从 C++ 翻译的类必须保留原始注释与数值来源（如 `// Source: REDALERT/UNIT.CPP:Line 412`）。
4. **增量验证**：每个 Task 完成后应可独立运行调试，无需等待后续 Task。
5. **Type-Check 优先**：开发阶段执行 `npm run type-check`（`tsc --noEmit`）即可，不强制每次 `build`，但最终合并前必须通过 CI 类型检查。

## 4.5 Task 完成工作流程（强制）

> 每个 Task 完成后必须严格按以下顺序执行，缺一不可。

1. **更新任务看板** — 修改 `harness/01_TASK_BREAKDOWN.md`：
   - 将对应 Task 的 `- **状态**：[ ] done` 改为 `[x] done`；
   - 更新附录 B「快速状态看板」的完成数与总计。
2. **请求审核** — 向用户提交完整的变更摘要（新增/修改文件、设计要点、`type-check`/`lint`/`build` 结果），等待用户显式回复「**审核通过**」。
3. **Git 提交** — 仅在用户审核通过后执行 `git add -A && git commit`。

**禁止行为**：未经审核直接提交；忘记更新 `01_TASK_BREAKDOWN.md`。

---

## 5. C++ → TS 映射速查表

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

## 6. 如何阅读 C++ 源码（给开发者的指引）

1. **先看头文件**：`REDALERT/UNIT.H`、`BUILDING.H` 等，快速理解类结构与继承关系。
2. **提取常量**：关注 `.CPP` 文件顶部的 `#define` 与 `const` 数值（如 `ARMOR_LIGHT=1`）。
3. **理解坐标系**：C&C 原始逻辑使用**格子坐标 (Cell X,Y)**，Babylon 使用**世界坐标 (Vector3)**，需在 `Terrain` 层做双向映射。
4. **状态机模式**：C++ 中大量 `if (State == STATE_IDLE)` 的写法，在 TS 中改用 `StatePattern` 或 `Behavior` 组件。
5. **忽略平台代码**：`WIN32LIB/`、`IPXCONN.CPP` 中的 Win32 API 调用无需翻译，由 Babylon.js 引擎层替代。

---

*本文档为活文档，开发过程中随需求更新。*
