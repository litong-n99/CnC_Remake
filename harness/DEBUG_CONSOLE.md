# Debug Console 调试控制台

> 本文档维护浏览器 DevTools Console 中可用的 `window.cnc` 调试命令。  
> 对应代码：`remake/src/debug/GameConsole.ts`

---

## 概述

Debug Console 是一个**开发环境专用**的运行时调试工具，通过在浏览器 Console 中输入命令即可快速生成单位/建筑、修改经济、查看状态等。所有命令均挂载在全局 `window.cnc` 对象上，游戏初始化后自动注册。

**注意**：Console 命令绕过正常的建造队列与前提条件检查，仅用于开发调试，不应出现在生产构建中。

---

## 命令速查表

| 命令 | 签名 | 说明 |
|------|------|------|
| `cnc.unit` | `(type, house='gdi', x?, y?)` | 生成单位；省略 `x,y` 时在相机中心最近可用地面生成 |
| `cnc.building` | `(type, house='gdi')` | 启动建筑放置模式（ghost 跟随鼠标，左键放置，右键取消） |
| `cnc.money` | `(house?, amount?)` | 查看或增加资金 |
| `cnc.power` | `(house?)` | 查看电力状态 |
| `cnc.kill` | `(type?)` | 杀死对象 |
| `cnc.clear` | `()` | 清除所有对象 |
| `cnc.list` | `()` | 列出所有单位与建筑 |
| `cnc.actorMap` | `(x?, y?)` | 查看 ActorMap 格子占用；省略参数时列出所有被占格子 |
| `cnc.collision` | `(x, y, excludeId?)` | 检查指定格子是否被其他单位阻塞 |
| `cnc.pathfind` | `(sx, sy, ex, ey, check?)` | A* 寻路测试；`check` 可选 `All`/`Stationary`/`Immovable`/`None` |
| `cnc.moveUnit` | `(unitId, targetX, targetY)` | 命令指定单位移动到目标格子 |
| `cnc.distance` | `(idA, idB)` | 计算两个单位之间的欧几里得距离 |
| `cnc.debugState` | `()` | 返回所有单位的运行时状态（位置、双格占用、状态机等） |
| `cnc.help` | `()` | 显示帮助信息 |

---

## 命令详解

### `cnc.unit(type, house, x?, y?)`

在指定坐标生成一个单位。若省略 `x` 和 `y`，则自动在**当前相机中心点**附近搜索最近的可用地面（BFS 螺旋搜索），避开建筑 footprint 与不可通行地形。

**参数：**
- `type` — `UNIT_DEFINITIONS` 的键名（见下方「可用单位类型」）
- `house` — `'gdi'` 或 `'nod'`（默认 `'gdi'`）
- `x` — 格子 X 坐标（可选）
- `y` — 格子 Y 坐标（可选）

**示例：**
```javascript
// 在相机中心附近自动生成一辆 GDI 中坦
cnc.unit('MediumTank', 'gdi')

// 在指定坐标生成 Nod 轻坦
cnc.unit('LightTank', 'nod', 30, 30)

// 简写：省略 house 时默认为 'gdi'
cnc.unit('Jeep')
```

---

### `cnc.building(type, house)`

启动建筑放置模式。屏幕会显示一个半透明的 ghost 预览跟随鼠标移动：
- **合法位置** → 绿色
- **非法位置** → 红色
- **左键点击** → 在目标格子放置建筑
- **右键点击** → 取消放置

**参数：**
- `type` — `BUILDING_DEFINITIONS` 的键名（见下方「可用建筑类型」）
- `house` — `'gdi'` 或 `'nod'`（默认 `'gdi'`）

**示例：**
```javascript
// 启动 GDI 电厂放置模式
cnc.building('PowerPlant', 'gdi')

// 启动 Nod 兵营放置模式
cnc.building('Barracks', 'nod')
```

**与 Sidebar 建造流程的区别：**
- Console 模式**绕过 ConstructionQueue**，不扣款、不等待建造时间
- Sidebar 的正常建造流程（排队 → 倒计时 → 就绪 → 放置）不受影响

---

### `cnc.money(house?, amount?)`

查看或修改阵营资金。

**参数：**
- `house` — `'gdi'` / `'nod'` / 省略（省略时显示所有阵营）
- `amount` — 要增加的资金数；省略时仅显示当前余额

**示例：**
```javascript
cnc.money()              // 显示所有阵营资金
cnc.money('gdi')         // 显示 GDI 资金
cnc.money('gdi', 5000)   // 给 GDI 增加 5000 资金
cnc.money('nod', -1000)  // 扣除 Nod 1000 资金（支持负数）
```

---

### `cnc.power(house?)`

查看阵营电力状态。

**参数：**
- `house` — `'gdi'` / `'nod'` / 省略（省略时显示所有阵营）

**示例：**
```javascript
cnc.power()        // 显示所有阵营电力
cnc.power('gdi')   // 显示 GDI 电力详情
```

输出格式：`production/drain (balance)`，例如 `200/150 (+50)` 表示盈余 50。

---

### `cnc.kill(type?)`

批量销毁对象。

**参数：**
- `type` — `'units'`（仅单位） / `'buildings'`（仅建筑） / 省略（全部）

**示例：**
```javascript
cnc.kill()           // 杀死所有对象
cnc.kill('units')    // 杀死所有单位
cnc.kill('buildings') // 杀死所有建筑
```

---

### `cnc.clear()`

清除并销毁世界中的所有对象（单位 + 建筑）。相当于 `cnc.kill()` 的强化版，同时清理内部状态。

```javascript
cnc.clear()
```

---

### `cnc.list()`

列出当前世界中所有存活的对象，按单位和建筑分类输出。

```javascript
cnc.list()
// 输出示例：
// Units (4):
//   [GDI] Medium Tank at (42, 14)
//   [Nod] Light Tank at (46, 40)
// Buildings (8):
//   [GDI] Construction Yard at (34, 6)
//   [Nod] Power Plant at (40, 38)
```

---

### `cnc.help()`

在 Console 中打印所有可用命令的格式化帮助信息。

```javascript
cnc.help()
```

---

### `cnc.debugState()`

返回当前世界中**所有单位**的运行时状态数组，用于 E2E 测试和死锁诊断。每个元素包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 单位唯一标识 |
| `x` / `y` | `number` | 当前浮点坐标 |
| `fromCellX` / `fromCellY` | `number` | 已确认的当前格子（OpenRA FromCell） |
| `toCellX` / `toCellY` | `number` | 正在前往的下一格（OpenRA ToCell） |
| `isMoving` | `boolean` | 是否处于双格移动中（`isMovingBetweenCells`） |
| `isBlocking` | `boolean` | 是否被其他单位标记为阻塞者 |
| `state` | `string` | 当前状态机状态（如 `IDLE`、`MOVING`） |

```javascript
cnc.debugState()
// 返回示例：
// [
//   { id: 'go_34', x: 30, y: 30, fromCellX: 30, fromCellY: 30,
//     toCellX: 31, toCellY: 30, isMoving: true, isBlocking: false, state: 'MOVING' },
//   ...
// ]
```

**与 `cnc.list()` 的区别**：`list()` 仅打印人类可读摘要；`debugState()` 返回结构化数据，供 E2E 测试通过 `page.evaluate()` 程序化读取。

---

## 可用单位类型

`cnc.unit` 的 `type` 参数取值（来自 `UNIT_DEFINITIONS`）：

| 键名 | 名称 |
|------|------|
| `LightTank` | Light Tank |
| `MediumTank` | Medium Tank |
| `HeavyTank` | Heavy Tank |
| `MammothTank` | Mammoth Tank |
| `Harvester` | Ore Truck |
| `MCV` | Mobile Construction Vehicle |
| `Jeep` | Ranger |
| `APC` | Armoured Personnel Carrier |
| `Artillery` | Artillery |
| `V2Rocket` | V2 Rocket Launcher |
| `RifleInfantry` | Rifle Infantry |
| `Grenadier` | Grenadier |
| `RocketSoldier` | Rocket Soldier |
| `Flamethrower` | Flamethrower |
| `Engineer` | Engineer |
| `Tanya` | Tanya |
| `Spy` | Spy |
| `Medic` | Field Medic |
| `AttackDog` | Attack Dog |

---

## 可用建筑类型

`cnc.building` 的 `type` 参数取值（来自 `BUILDING_DEFINITIONS`）：

| 键名 | 名称 |
|------|------|
| `ConstructionYard` | Construction Yard |
| `PowerPlant` | Power Plant |
| `AdvancedPower` | Advanced Power Plant |
| `OreRefinery` | Ore Refinery |
| `Barracks` | Barracks |
| `WarFactory` | War Factory |
| `Radar` | Radar Dome |
| `Helipad` | Helipad |
| `RepairFacility` | Service Depot |
| `Shipyard` | Naval Yard |
| `TeslaCoil` | Tesla Coil |
| `GapGenerator` | Gap Generator |
| `SAMSite` | SAM Site |
| `Silo` | Silo |
| `Turret` | Gun Turret |

---

## 阵营参数

所有需要指定阵营的命令均接受以下字符串：

| 值 | 对应 |
|----|------|
| `'gdi'` | `HouseType.GDI` |
| `'nod'` | `HouseType.Nod` |

参数大小写不敏感（内部统一转小写处理）。

---

## 技术说明

### 自动寻地算法（`cnc.unit` 省略坐标时）

1. 取当前相机 `target` 的世界坐标
2. 转换为格子坐标：`floor(worldX + 32), floor(worldZ + 32)`
3. 以该格子为起点进行 **BFS 四邻域搜索**
4. 每个候选格子检查：
   - 地图边界内
   - 地形不是 Water / Rock / Wall / River
   - 不被建筑 footprint 或其他单位占据（复用 `UnitCollision.isPositionBlocked`）
5. 返回第一个满足条件的格子

### 建筑放置的碰撞检测

复用 `BuildingPlacer` 的现有逻辑：
- 建筑 footprint（支持非矩形，如 Refinery 的 L 形）
- 地形类型检查
- 与其他对象重叠检查（`UnitCollision.isPositionBlocked`）

### 与 Sidebar / ConstructionQueue 的互斥

`BuildingPlacer` 同一时间只能处理一个放置预览。若 Sidebar 已启动放置模式，Console 命令会**覆盖**当前的 ghost（调用 `placer.startPlacement()` 会先 `stopPlacement()`）。反之亦然。

---

## 维护记录

| 日期 | 变更 |
|------|------|
| 2026-05-18 | 初始文档 — 覆盖 `unit`, `building`, `money`, `power`, `kill`, `clear`, `list`, `help` 全部命令 |
| 2026-05-20 | 补充 `actorMap`, `collision`, `pathfind`, `moveUnit`, `distance`, `debugState` 命令；新增 `debugState` 用于 E2E 运行时诊断 |
