# Control Group 功能 GAP 调研报告

> **调研日期**：2026-05-31
> **对比版本**：OpenRA `release-20231010` / Remake `dev` 分支
> **文档位置**：`docs/CONTROL_GROUP/RESEARCH_CONTROL_GROUP_GAP.md`

---

## 1. 执行摘要

本次调研对比了 OpenRA 与 Remake 中 **Control Group（控制组/编组）** 功能的实现差异。虽然 Remake 已具备基础的编组存储与恢复能力，但在**操作语义完整性**、**显示系统**、**架构集成度**和**生命周期管理**四个方面与 OpenRA 存在显著差距。

| 维度 | 差距等级 | 说明 |
|------|---------|------|
| 操作语义 | 🔴 高 | 缺 Add/Combine 两种关键操作；热键绑定不灵活 |
| 显示系统 | 🔴 高 | 使用 DynamicTexture 而非精灵序列；无配置化位置系统 |
| 架构集成 | 🟡 中 | ControlGroups 为 SelectionManager 私有字段，非 WorldActor Trait |
| 生命周期 | 🟡 中 | 无自动清理死亡/Disposed 单位；无存盘序列化 |
| 输入处理 | 🟡 中 | 硬编码 DOM 事件，缺 HotkeyReference 抽象 |

---

## 2. OpenRA 实现总览

### 2.1 架构位置

OpenRA 的 ControlGroups 是一个**WorldActor Trait**，挂载到 `SystemActors.World` 上：

```csharp
[TraitLocation(SystemActors.World | SystemActors.EditorWorld)]
public class ControlGroups : IControlGroups, ITick, IGameSaveTraitData
```

这意味着：
- 控制组是**世界级系统**，通过 `world.ControlGroups` 全局访问
- 参与正常的 `ITick` 生命周期（自动清理死亡单位）
- 支持 `IGameSaveTraitData` 存盘/读盘序列化
- 可被 mod 替换（通过 YAML 配置不同的 `IControlGroupsInfo`）

### 2.2 完整操作语义（5 种）

OpenRA 通过 `ControlGroupsWidget` 提供了 **5 种独立的热键操作**：

| 操作 | 默认热键 | 语义 |
|------|---------|------|
| **SelectGroup** | `数字键` | 选中该组所有单位（替换当前选择） |
| **CreateGroup** | `Ctrl+数字键` | 将当前选择设为新组（先清除该组旧内容） |
| **AddSelectionToGroup** | `Shift+Ctrl+数字键` | 将当前选择**追加**到已有组 |
| **CombineSelectionWithGroup** | `Shift+数字键` | 将该组单位**合并到当前选择**（不丢失已有选择） |
| **JumpToGroup** | `自定义热键` | 视角跳转到该组中心（独立热键，非双击） |

**关键设计**：
- `CreateControlGroup` 会先调用 `RemoveActorsFromAllControlGroups`，确保一个 Actor **只属于一个控制组**（互斥语义）
- `CombineSelectionWithGroup` 使用 `world.Selection.Combine(..., true, false)` 合并选择，不替换
- 双击检测在 Widget 层通过 `e.MultiTapCount >= 2` 实现，绑定到 `SelectGroup` 热键

### 2.3 显示系统（Decoration）

OpenRA 提供了**两套平行的显示实现**：

#### A. WithSpriteControlGroupDecoration（精灵版）
```csharp
anim.PlayFetchIndex(Info.GroupSequence, () => (int)group);
var screenPos = container.GetDecorationOrigin(...) - (0.5f * anim.Image.Size.XY).ToInt2();
return [new UISpriteRenderable(anim.Image, self.CenterPosition, screenPos, 0, palette)];
```
- 使用 `pips` 图像的 `groups` 序列（0-9 数字精灵）
- 支持 `Palette`（调色板，默认 `chrome`）
- 支持 `Position` 配置：`TopLeft` / `TopRight` / `BottomLeft` / `BottomRight` / `Top` / `Center`
- 支持 `Margin` 偏移
- **仅当选中时显示**（`RequiresSelection = true`）

#### B. WithTextControlGroupDecoration（文本版）
```csharp
var text = label.Update(group.Value);
var screenPos = container.GetDecorationOrigin(...);
return [new UITextRenderable(font, self.CenterPosition, screenPos, 0, color, text)];
```
- 使用字体渲染（默认 `TinyBold`）
- 支持玩家色（`UsePlayerColor = true`）
- 无需精灵中心定位（字体渲染器自行处理对齐）

#### C. 坐标转换链路

```
WPos (世界坐标)
    ↓ ScreenPxPosition()
int2 (屏幕坐标，未缩放)
    ↓ WorldToViewPx()  [应用 Zoom / UIScale 和视口平移]
int2 (视口坐标，最终像素)
    ↓ GetDecorationOrigin(pos, margin)
装饰原点
    ↓ - spriteSize/2 (仅精灵版)
最终渲染位置
```

关键公式：
- `screenX = TileSize.Width * worldX / TileScale`
- `screenY = TileSize.Height * (worldY - worldZ) / TileScale`
- `viewPos = Zoom / UIScale * (screenPos - CenterLocation + ViewportSize / 2)`

### 2.4 生命周期管理

```csharp
void ITick.Tick(Actor self)
{
    foreach (var cg in controlGroups)
    {
        cg.RemoveAll(a => a.Disposed || a.Owner != world.LocalPlayer);
    }
}
```

- 每逻辑帧自动清理：`Disposed` 单位（已销毁）或 `Owner != LocalPlayer`（所有权变更）
- `GetActorsInControlGroup` 返回时额外过滤 `a.IsInWorld`（仍在世界中）
- 存盘时序列化 ActorID 数组；读盘时通过 `world.GetActorById` 恢复引用

---

## 3. Remake 现状分析

### 3.1 当前实现位置

- `remake/src/game/SelectionManager.ts` — 编组数据存储与显示
- `remake/src/core/InputManager.ts` — 键盘输入处理（`setupKeyboard()`）

### 3.2 已实现的功能

```typescript
// SelectionManager
private squads = new Map<number, Unit[]>();
private groupAssignments = new Map<string, number>();

saveSquad(index: number): void       // Ctrl+数字 — 保存当前选择到编组
restoreSquad(index: number): void    // 数字 — 恢复编组选中
getSquad(index: number): Unit[]      // 获取编组内容
getGroupForUnit(unit): number | null // 查询单位所属编组
```

```typescript
// InputManager
if (this.isCtrlDown) {
    this.selectionManager.saveSquad(index);      // Ctrl+数字 = 保存
} else {
    this.selectionManager.restoreSquad(index, ...); // 数字 = 恢复
    // 双击检测 → jumpToSquadCenter()
}
```

**显示实现**：
- 使用 Babylon.js `DynamicTexture` + `CreatePlane` 生成数字标签
- 标签为 billboard（始终面向相机），挂载到单位 mesh 上
- 位置硬编码：`new Vector3(-0.18, 0.45, -0.08)`（相对于单位中心）
- 仅在选中时显示（在 `showRings()` 中创建，在 `hideRings()` 中销毁）

### 3.3 与 OpenRA 的差距详单

#### GAP-1: 操作语义不完整（🔴 高）

| 操作 | OpenRA | Remake | 差距 |
|------|--------|--------|------|
| SelectGroup | ✅ 数字键 | ✅ 数字键 | 无 |
| CreateGroup | ✅ Ctrl+数字 | ✅ Ctrl+数字 | 无 |
| AddSelectionToGroup | ✅ Shift+Ctrl+数字 | ❌ **缺失** | 无法追加单位到已有组 |
| CombineSelectionWithGroup | ✅ Shift+数字 | ❌ **缺失** | 无法将编组合并到当前选择 |
| JumpToGroup | ✅ 独立热键 | ⚠️ 双击数字 | 无独立热键，与 Select 耦合 |

**影响**：
- 玩家无法灵活管理编组（例如：将新生产的坦克追加到已有的坦克编队）
- 双击检测依赖于 `performance.now()` 计时，不如 OpenRA 的 `MultiTapCount` 可靠

#### GAP-2: 显示系统差距（🔴 高）

| 方面 | OpenRA | Remake | 差距 |
|------|--------|--------|------|
| 渲染方式 | Sprite/Font 值对象（IRenderable） | DynamicTexture + Mesh Plane | Remake 每单位创建一个材质+纹理+网格，开销大 |
| 位置基准 | 选择框边界（DecorationBounds） | 单位中心硬编码偏移 | 不随选择框大小变化，大型单位上位置不准 |
| 位置配置 | YAML 配置 `Position` + `Margin` | 无配置，代码写死 | 无法适配不同单位类型 |
| 精灵图集 | 使用 `pips/groups` 序列（单张图集） | 动态生成 Canvas | 无法复用原始游戏资源 |
| 调色板 | 支持 `Palette` 配置 | 固定白色文字 | 无阵营色/风格定制 |
| Z排序 | 参与 `IRenderable` ZOffset 排序 | 固定 Overlay 层 | 可能与血条等其他 Overlay 冲突 |

**具体代码对比**：

OpenRA（基于边界）：
```csharp
var bounds = interactable.DecorationBounds(self, wr);  // 选择框边界
var decorationPos = GetDecorationPosition(bounds, "TopLeft");  // 左上角
var screenPos = decorationPos - spriteSize / 2;  // 精灵中心对齐
```

Remake（硬编码偏移）：
```typescript
label.parent = unit.mesh;
label.position = new Vector3(-0.18, 0.45, -0.08);  // 相对于单位中心，无边界参考
```

#### GAP-3: 架构集成度（🟡 中）

| 方面 | OpenRA | Remake | 差距 |
|------|--------|--------|------|
| 挂载位置 | WorldActor Trait | SelectionManager 私有字段 | 非 Trait 架构，难以扩展 |
| 访问方式 | `world.ControlGroups` | `SelectionManager.getInstance()` | 单例耦合 |
| Tick 清理 | `ITick.Tick()` 自动清理 | 无自动清理 | 死亡单位仍留在编组中 |
| 序列化 | `IGameSaveTraitData` 支持 | 无 | 存盘时编组信息丢失 |
| Mod 替换 | 可通过 YAML 替换 Trait | 不可替换 | 缺乏灵活性 |

**关键问题**：
- Remake 的 `squads` 数组中存储的是 `Unit` 对象引用，单位死亡后不会自动移除
- `restoreSquad()` 虽有过滤 `u.isAlive()`，但存盘后再读盘时引用会失效

#### GAP-4: 输入处理（🟡 中）

| 方面 | OpenRA | Remake | 差距 |
|------|--------|--------|------|
| 热键抽象 | `HotkeyReference` + YAML 配置 | 硬编码 DOM `keydown` | 无法自定义热键 |
| 热键冲突 | Widget 层统一处理 `HandleKeyPress` | 分散在 InputManager | 多个 Widget 可能同时响应 |
| 修饰键 | 完整支持 Ctrl/Shift/Alt 组合 | 仅检测 Ctrl/Shift | 无 Alt 组合支持 |
| 浏览器拦截 | `e.preventDefault()` 仅在 Ctrl 时 | ✅ 已实现 | 无差距 |

#### GAP-5: 多玩家/所有权（🟡 中）

OpenRA 严格限制控制组只包含 `LocalPlayer` 的单位：
```csharp
controlGroups[group].AddRange(world.Selection.Actors.Where(a => a.Owner == world.LocalPlayer));
```

Remake 无此限制，`saveSquad()` 可直接保存任何单位（包括敌方）。

---

## 4. 差距根因分析

### 4.1 设计目标差异

Remake 当前实现以**功能可用**为首要目标（Task 49/50 级别），而 OpenRA 的设计目标是**Mod 可扩展 + 完整 RTS 体验**。这导致：
- Remake 的 Control Group 是 SelectionManager 的"附属功能"
- OpenRA 的 Control Group 是独立的世界级系统，与 Selection、Viewport、Render 深度集成

### 4.2 渲染管线差异

Remake 直接操作 Babylon.js mesh（命令式），而 OpenRA 使用 `IRenderable` 值对象模式（函数式）：
- Remake 的 `DynamicTexture` 方案简单直接，但每单位产生独立材质和纹理
- OpenRA 的 `UISpriteRenderable` 可以批量排序和渲染，且天然支持 Z 排序

### 4.3 缺少的依赖系统

| OpenRA 特性 | Remake 对应状态 | 阻塞影响 |
|-------------|----------------|---------|
| `IControlGroups` 接口 | ❌ 无 | 无法抽象化控制组操作 |
| `HotkeyReference` | ❌ 无 | 热键无法配置化 |
| `IDecoration` + `ISelectionDecorations` | ❌ 无 | 显示无法模块化扩展 |
| `Interactable.DecorationBounds` | ❌ 无 | 控制组标签位置无法基于选择框 |
| `ITick` 自动清理 | ⚠️ World.tick 存在但未接入 | 死亡单位残留 |

---

## 5. 改进建议（按优先级）

### P0: 补全操作语义

在 `InputManager.setupKeyboard()` 中增加：

```typescript
// Shift+Ctrl+数字 = 追加到编组（AddSelectionToGroup）
if (this.isShiftDown && this.isCtrlDown) {
    this.selectionManager.addToSquad(index);  // 新增方法
}
// Shift+数字 = 合并编组到当前选择（CombineSelectionWithGroup）
else if (this.isShiftDown && !this.isCtrlDown) {
    this.selectionManager.combineSquad(index, this.scene);  // 新增方法
}
```

在 `SelectionManager` 中新增：
```typescript
addToSquad(index: number): void          // 追加当前选择到编组
combineSquad(index: number, scene): void // 将编组合并到当前选择
```

### P1: 显示系统改进

**方案 A（短期，最小改动）**：
- 将 `DynamicTexture` 改为使用**精灵图集**（将 0-9 数字预渲染到一张纹理）
- 使用 `SpriteManager` 或 Babylon.js `Sprite` 系统批量渲染
- 缓存图集材质，避免每单位创建独立材质

**方案 B（长期，对齐 OpenRA）**：
- 引入 `IDecoration` 接口和 `SelectionDecorations` 系统
- 实现 `DecorationBounds`（基于单位渲染网格的边界框）
- 控制组标签位置基于边界框而非单位中心
- 支持 YAML/JSON 配置 `Position` 和 `Margin`

### P1: 生命周期自动清理

在 `World.tick()` 或 `GameLoop.onLogicTick()` 中增加：

```typescript
// 每逻辑帧清理控制组中的死亡单位
for (const [index, squad] of this.squads) {
    const alive = squad.filter(u => u.isAlive() && u.house.id === localPlayerHouseId);
    if (alive.length !== squad.length) {
        this.squads.set(index, alive);
    }
}
```

### P2: 架构迁移（WorldActor Trait）

当 Remake 的 Actor/Trait 系统（Task-A1~A6）完全成熟时，将 ControlGroups 迁移为：

```typescript
// 目标架构
class ControlGroups implements ITick, IGameSaveTraitData {
    // 挂载到 WorldActor
    // 通过 world.worldActor.trait<ControlGroups>() 访问
    // 参与正常 Tick 生命周期
    // 支持存盘序列化（存储 ActorID 数组）
}
```

### P2: 热键配置化

引入简单的热键配置系统：

```typescript
interface HotkeyConfig {
    selectGroup: string[];      // ['1','2',...'0']
    createGroup: string[];      // ['ctrl+1','ctrl+2',...]
    addToGroup: string[];       // ['shift+ctrl+1',...]
    combineGroup: string[];     // ['shift+1','shift+2',...]
    jumpToGroup: string[];      // ['alt+1','alt+2',...]
}
```

---

## 6. 参考文件

| 文件 | 说明 |
|------|------|
| `OpenRA/OpenRA.Mods.Common/Traits/World/ControlGroups.cs` | OpenRA 核心实现 |
| `OpenRA/OpenRA.Mods.Common/Widgets/ControlGroupsWidget.cs` | 热键与输入处理 |
| `OpenRA/OpenRA.Mods.Common/Traits/Render/WithSpriteControlGroupDecoration.cs` | 精灵显示 |
| `OpenRA/OpenRA.Mods.Common/Traits/Render/WithTextControlGroupDecoration.cs` | 文本显示 |
| `remake/src/game/SelectionManager.ts` | Remake 编组数据与显示 |
| `remake/src/core/InputManager.ts` | Remake 键盘输入处理 |
| `docs/CONTROL_GROUP/OPENRA_CONTROL_GROUP_DISPLAY.md` | OpenRA 显示系统详细分析 |
| `docs/CONTROL_GROUP/OPENRA_CONTROL_GROUP_COORDINATE_FLOW.md` | OpenRA 坐标转换详细流程 |

---

*本文档为调研成果，供后续 Task 规划参考。最后更新：2026-05-31*
