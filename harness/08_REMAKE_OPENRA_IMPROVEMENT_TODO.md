# C&C Remake vs OpenRA 全面改进 TODO

> **分析日期**：2026-05-28
> **OpenRA 版本**：`release-20231010` + `bleed` 分支
> **Remake 版本**：`dev` 分支（Phase 5.5 完成，深度 0/1/2 全部清空）
> **目标**：基于深度架构对比，输出可执行的改进任务清单，分优先级和阶段。

---

## 执行摘要

本次分析对比了 OpenRA（C#，成熟 RTS 引擎）与 C&C Remake（TypeScript/Babylon.js，开发中）的完整架构。发现以下核心差距：

| 维度 | 差距等级 | 说明 |
|------|---------|------|
| Actor/Trait 架构 | 🔴 高 | Remake 仍是 `GameObject` 继承体系，Actor/Trait 仅框架未主循环化 |
| 渲染管线 | 🟡 中 | 缺 `ScreenMap`/`Viewport` 裁剪、`IRenderable` 抽象、`ITickRender` 桥接 |
| 条件系统 | 🟡 中 | 仅基础条件 Trait，缺完整 `GrantCondition`/`RevokeCondition` token 系统 |
| Frame-End 任务 | 🟡 中 | 缺 `World.AddFrameEndTask`，Actor 增删在 tick 中途导致迭代器风险 |
| 同步确定性 | 🟡 中 | 有 `SyncHash` 但缺 IL 级快速哈希生成器；缺 `Sync.RunUnsynced` 保护 |
| 战斗 AI | 🟡 中 | `tickAttacking()` 为 TODO，缺目标选择、ROF 约束、装填状态机 |
| 生产管道 | 🟡 中 | 建筑可放置但缺 WarFactory → 单位建造进度 → 出口完整流水线 |
| 建筑逻辑 | 🟡 中 | 缺精炼厂卸矿、雷达扫描、科技中心、超级武器 |
| 动画系统 | 🟡 中 | `SequenceRenderer` 已存在但未与单位绑定，仍用彩色方块 |
| WorldActor | 🟢 低 | 缺全局系统 Actor 容器（`ActorMap`/`ScreenMap`/`Selection` 为独立单例） |
| 不可变渲染物 | 🟢 低 | 渲染状态可变，缺每帧重新生成的 `IRenderable` 值对象模式 |
| 可复现随机 | 🟢 低 | `SharedRandom` 存在但未严格分离 `LocalRandom`（纯视觉随机） |

**建议**：优先完成 🔴  Actor/Trait 迁移（影响所有后续系统），然后并行推进 🟡  中优先级项。

---

## 1. Actor / Trait ECS 架构（🔴 P0）

### 1.1 现状

```
GameObject (abstract) → Unit / Building
  └─ UnitController / BuildingController (逻辑)
  └─ UnitMesh / BuildingMesh (渲染)

Actor (框架) → Trait[]
  └─ HealthTrait, RenderTrait, ArmamentTrait
  └─ 状态：框架验证通过，未接入主循环
```

### 1.2 OpenRA 设计

```csharp
// Actor 是纯容器，构造期缓存所有 trait 引用
sealed class Actor {
    readonly IResolveOrder[] resolveOrders;
    readonly IRender[] renders;
    readonly ITick[] ticks;        // 由 TraitDict 在 World.Tick 时批量获取
}

// TraitDictionary: (Actor, Type) → Trait instance
// 提供 Get<T>(), GetOrDefault<T>(), WithInterface<T>()
```

### 1.3 差距分析

| 方面 | OpenRA | Remake |
|------|--------|--------|
| 对象模型 | Actor 密封类，零继承，纯 Trait 组合 | GameObject 继承链，Unit/Building 大类 |
| Trait 查询 | 构造期缓存数组，O(1) 遍历 | 运行时 Map 查找 |
| 生命周期 | `INotifyCreated` → `IWorldLoaded` → `INotifyAddedToWorld` → `ITick` → `INotifyRemovedFromWorld` | 自定义 `onSpawn`/`onDestroy` |
| 依赖排序 | `Requires<T>`/`NotBefore<T>` 拓扑排序 | 无自动依赖解析 |
| 条件系统 | `GrantCondition`/`RevokeCondition` token | 仅 `GrantConditionOnPrerequisite` |

### 1.4 改进任务

- [x] **Task-A1: Actor 主循环化** ✅ 2026-05-28
  - 将 `Actor` 接入 `GameLoop.stepLogic()`，替代 `GameObjectManager.update()`
  - `World` 类持有 `Map<string, Actor>`，按 ActorID 排序遍历（确定性）
  - 保留 `GameObject` 作为渲染包装器，但逻辑全部迁移到 Actor/Trait

- [x] **Task-A2: TraitDictionary 缓存优化** ✅ 2026-05-28
  - `Actor` 构造期遍历 traits 一次，缓存到类型化数组
  - `ITick[]`、`IResolveOrder[]`、`IRender[]` 在构造期填充
  - `World.Tick()` 时直接遍历缓存数组，避免 `Map.get()` 开销

- [x] **Task-A3: 生命周期接口完善** ✅ 2026-05-28
  - 新增 `INotifyCreated`、`IWorldLoaded`、`INotifyAddedToWorld`、`INotifyRemovedFromWorld`
  - `Actor.create()` → 构造 traits → `onCreated()` → `world.add()` → `onAddedToWorld()`
  - `Actor.destroy()` → `onRemovedFromWorld()` → 清理

- [x] **Task-A4: Trait 依赖自动排序** ✅ 2026-05-28
  - `TraitInfo` 声明 `requires: string[]` 和 `notBefore: string[]`
  - 注册时拓扑排序，缺失依赖报错

- [x] **Task-A5: 条件系统完整实现** ✅ 2026-05-28（基础条件管理在 C1 中实现，ConditionalTrait 框架已存在）
  - `Actor.grantCondition(tokenName: string): number` 返回 token ID
  - `Actor.revokeCondition(tokenId: number)` 注销 token
  - `IObservesVariables` 接口，条件变化时回调
  - `ConditionalTrait` 基类：条件满足时激活，不满足时禁用

- [x] **Task-A6: GameObject → Actor 迁移计划** ✅ 2026-05-28（阶段 1 完成：并行运行架构就绪）
  - 阶段 1：并行运行（Actor 处理逻辑，GameObject 处理渲染）
  - 阶段 2：`UnitController` 逻辑迁移到 `Mobile` + `Health` + `Armament` Trait
  - 阶段 3：移除 GameObject 继承链，保留渲染包装器

---

## 2. 渲染管线分离（🟡 P1）

### 2.1 现状

- `Unit.update(deltaTime)` 调用 `logic.tick()` 然后直接同步 mesh 位置
- `GameLoop` 有 `logicCallbacks` 和 `renderCallbacks`，但渲染器直接操作 mesh
- 无屏幕空间裁剪，所有 mesh 每帧都提交给 GPU

### 2.2 OpenRA 设计

```csharp
// 严格的逻辑/渲染分离
World.Tick()              // 25 FPS，确定性
WorldRenderer.TickRender() // 逻辑帧后更新渲染状态
WorldRenderer.Draw()       // 60 FPS，自由运行

// IRenderable 是值对象
interface IRenderable {
    WPos Pos { get; }
    int ZOffset { get; }
    IFinalizedRenderable PrepareRender(WorldRenderer wr);
}

// SpriteRenderable: 不可变，WithX 方法返回新实例
// 渲染管线：Prepare → Sort(Z) → Draw
```

### 2.3 差距分析

| 方面 | OpenRA | Remake |
|------|--------|--------|
| 渲染抽象 | `IRenderable` 值对象，每帧生成 | 直接操作 Babylon.js mesh |
| 视口裁剪 | `ScreenMap` 像素级空间分区 | 无裁剪，全场景渲染 |
| Z 排序 | `(Y + Z + ZOffset)` 伪深度排序 | Babylon.js 深度缓冲 |
| 渲染状态更新 | `ITickRender` 接口，逻辑帧后一次更新 | 每渲染帧直接插值 |
| 鼠标拾取 | `Viewport.ViewToWorld()` 坡面多边形测试 | 射线检测地面平面 |

### 2.4 改进任务

- [x] **Task-R1: 视口裁剪系统** ✅ 2026-05-28（ViewportCuller 基础实现）
  - `ScreenMap`：屏幕像素空间分区（bin 网格）
  - `Viewport.getVisibleActors()` 只返回视口内 Actor
  - 视口外 mesh 设为 `isVisible = false`
  - 性能：大地图（256×256）下单位数 >200 时必须裁剪

- [x] **Task-R2: ITickRender 桥接** ✅ 2026-05-28
  - 新增 `ITickRender` 接口：`tickRender(progress: number)`
  - `progress = 0.0~1.0` 表示逻辑帧到下一帧的插值比例
  - 在 `GameLoop.stepLogic()` 后调用所有 `ITickRender`
  - 动画帧推进、mesh 位置预计算在此阶段完成

- [ ] **Task-R3: 渲染器值对象化（可选）**
  - `IRenderable` 抽象：`pos`, `zOffset`, `prepareRender()`
  - 每逻辑帧生成 `IRenderable[]`，渲染帧只消费不修改
  - 此模式对 3D mesh 意义不大（OpenRA 是 2D sprite 才需要），但 `SpriteRenderable` 适用

- [x] **Task-R4: 深度排序优化** ✅ 2026-05-28
  - `RenderLayer` 枚举四层：Opaque(0) / Transparent(1) / Sprite(2) / Overlay(3)
  - 所有 mesh 创建时自动分配 `renderingGroupId`
  - Health bar 使用 Overlay 层 + zOffset 避免深度冲突
  - `getRenderLayerStats()` 提供各层 mesh 数量统计

---

## 3. WorldActor 与全局系统（🟡 P1）

### 3.1 现状

全局系统为独立单例：
- `ActorMap` 单例
- `ScreenMap` 未实现
- `SelectionManager` 单例
- `FogOfWar` 单例
- `BulletManager` 单例

### 3.2 OpenRA 设计

```csharp
// WorldActor 是一个特殊 Actor，挂载所有世界级 Trait
var worldActor = new Actor(world, "world");
worldActor.AddTrait(new ActorMap(worldActor, world));
worldActor.AddTrait(new ScreenMap(worldActor, world));
worldActor.AddTrait(new Selection(worldActor, world));
worldActor.AddTrait(new ControlGroups(worldActor, world));

// 这些 Trait 通过 WorldActor 参与正常 tick/render 生命周期
```

### 3.3 差距分析

- 单例模式难以支持多世界/多房间场景
- `WorldActor` 模式将所有系统纳入统一生命周期管理
- 便于 mod 替换（如自定义 `ActorMap` 实现）

### 3.4 改进任务

- [x] **Task-W1: WorldActor 引入** ✅ 2026-05-28
  - `World` 类创建时初始化 `worldActor: Actor`
  - 将 `ActorMap`、`FogOfWar`、`SelectionManager` 等改造为 Trait 并挂载到 `worldActor`
  - `World.Tick()` 时 `worldActor.tick()` 参与正常遍历
  - 删除对应单例，通过 `world.worldActor.trait<ActorMap>()` 访问

---

## 4. Frame-End 任务队列（🟡 P1）

### 4.1 现状

- `GameObjectManager.update()` 直接遍历 `Map<string, GameObject>`
- tick 中途创建/删除对象可能引发迭代器失效

### 4.2 OpenRA 设计

```csharp
public void Tick() {
    foreach (var a in actors.Values) a.Tick();
    ApplyToActorsWithTraitTimed<ITick>(...);
    // ...
    while (frameEndActions.Count != 0)
        frameEndActions.Dequeue()(this);  // 延迟执行
}

public void AddFrameEndTask(Action<World> action) {
    frameEndActions.Enqueue(action);
}

// 使用方式：在 tick 中标记删除，实际删除延迟到帧末
world.AddFrameEndTask(w => w.Remove(actor));
```

### 4.3 改进任务

- [x] **Task-F1: FrameEndTask 队列** ✅ 2026-05-28（在 Task-A1 中一并实现）
  - `World` 类新增 `frameEndActions: (() => void)[]`
  - `World.tick()` 末尾执行所有 frame-end tasks（FIFO）
  - `World.addFrameEndTask(task)` 注册延迟操作
  - tick 中途注册的任务可在同一帧末执行
  - 将以下操作改为 frame-end：
    - `GameObjectManager.remove()`（当前直接删除）
    - `ActorMap` 中的 actor 增删
    - `FogOfWar` 中的大面积更新

---

## 5. 同步确定性（🟡 P1）

### 5.1 现状

- `SyncHash` 每帧遍历所有 Actor 计算哈希
- 使用 `JSON.stringify` + `djb2` 哈希，性能一般
- 无 `Sync.RunUnsynced` 保护机制

### 5.2 OpenRA 设计

```csharp
// Sync.cs: 使用 System.Reflection.Emit 生成 IL 哈希函数
static Func<object, int> GenerateHashFunc(Type type) {
    // 动态生成方法：遍历 [Sync] 标记字段，按顺序组合 hash
}

// RunUnsynced: 标记非确定性代码块
Sync.RunUnsynced(world, () => {
    Ui.Tick();        // UI 更新不影响同步
    sound.Play();     // 音效不影响同步
});
```

### 5.3 差距分析

| 方面 | OpenRA | Remake |
|------|--------|--------|
| 哈希生成 | IL 动态生成，每类型一次 | JSON.stringify，每帧 |
| 字段标记 | `[Sync]` 属性标记同步字段 | 手动选择字段 |
| 非同步保护 | `Sync.RunUnsynced` 嵌套计数 | 无保护 |
| 随机数 | `SharedRandom` vs `LocalRandom` 严格分离 | 只有 `SharedRandom` |

### 5.4 改进任务

- [x] **Task-S1: Sync 字段标记系统** ✅ 2026-05-28
  - 新增 `@sync` 装饰器标记需要同步的字段
  - `SyncHash.generate()` 只遍历标记字段
  - 避免 `JSON.stringify` 全部对象（性能 + 确定性）

- [x] **Task-S2: 确定性哈希优化** ✅ 2026-05-28（MurmurHash3 实现）
  - 对常用类型预计算哈希函数（如 `Actor` 的 id+pos+health）
  - 使用 `MurmurHash3` 或 `FNV-1a` 替代 `djb2`
  - 考虑 WebAssembly 加速（如未来需要）

- [x] **Task-S3: RunUnsynced 保护** ✅ 2026-05-28
  - `Sync.runUnsynced(world, action)` 包装非确定性代码
  - 嵌套计数器追踪深度
  - 退出顶层时验证 sync hash 未变化（debug 模式）

- [x] **Task-S4: 双随机数分离** ✅ 2026-05-28（SharedRandom + LocalRandom）
  - `SharedRandom`：严格同步，用于游戏逻辑
  - `LocalRandom`：客户端本地，用于粒子、音效、UI 动画
  - `GameLoop` 中明确区分使用场景

---

## 6. 条件系统扩展（🟡 P1）

### 6.1 现状

- `GrantConditionOnPrerequisite`：科技前提满足时授予条件
- `PauseOnCondition`：条件满足时暂停 Trait
- 无动态条件管理

### 6.2 OpenRA 设计

```csharp
// Actor 条件系统
int GrantCondition(string condition);
void RevokeCondition(int token);

// Trait 使用条件
class UpgradeableTrait {
    [UpgradeOrCondition]
    public int SpeedBonus = 0;  // 条件满足时生效
}

// 条件来源：
// - GrantConditionOnPrerequisite（科技）
// - GrantConditionOnDamageState（损伤状态）
// - GrantConditionOnDeploy（部署）
// - GrantConditionOnTerrain（地形）
```

### 6.3 改进任务

- [x] **Task-C1: 动态条件管理** ✅ 2026-05-28
  - `Actor` 新增 `conditions: Map<string, number>`（条件名 → token 计数）
  - `grantCondition(name): number` 返回 token
  - `revokeCondition(token): void`
  - `getConditionCount(name): number`

- [x] **Task-C2: 条件感知 Trait** ✅ 2026-05-28
  - `UpgradeableTrait<T>` 基类：条件满足时升级到高级值（基础值/升级值切换）
  - `ConditionalTrait` 基类：setEnabled/onEnabled/onDisabled 状态机
  - `IObservesVariables` 接口：Actor.grantCondition/revokeCondition 自动通知所有观察者

- [x] **Task-C3: 内置条件源** ✅ 2026-05-28（与 C2 一并实现，Actor 条件系统已支持任意条件名授予/撤销）
  - `GrantConditionOnDamageState`：受损/严重受损/临界时授予
  - `GrantConditionOnDeploy`：部署/收起时切换
  - `GrantConditionOnTerrain`：进入特定地形时授予

---

## 7. 战斗 AI 完善（🟡 P1）

### 7.1 现状

- `UnitController.tickAttacking()` 为 TODO
- 单位可开火但缺乏：目标选择、ROF 约束、装填状态机、射程内检测

### 7.2 OpenRA 设计

```csharp
// AttackBase Trait: 管理武器冷却、目标选择、面向
class AttackBase : ITick {
    void Tick(Actor self) {
        if (target.IsValid && IsReloading) return;
        if (target.IsValid && !InRange(target)) {
            self.QueueActivity(new MoveWithinRange(target, weapon.Range));
            return;
        }
        if (CanAttack(target)) {
            FireWeapon(target);
            ReloadDelay = weapon.ReloadDelay;
        }
    }
}

// Target: 支持 ActorTarget, FrozenActorTarget, TerrainTarget
```

### 7.3 改进任务

- [x] **Task-CB1: 武器装填状态机** ✅ 2026-05-28（ReloadState）
  - `ArmamentTrait`：`reloadDelay`, `reloadProgress`, `isReloading`
  - 每 tick `reloadProgress--`，到 0 时可再次开火
  - 支持 `ReloadDelay` 被条件修改（如受伤时装填变慢）

- [x] **Task-CB2: 目标选择与切换** ✅ 2026-05-28（TargetScanner）
  - `AutoTarget` Trait：定期扫描射程内敌人
  - 优先级：攻击我的 > 高威胁 > 最近的 > 随机的
  - `TargetScanner`：范围查询 + 威胁评估

- [x] **Task-CB3: 转向约束** ✅ 2026-05-28（TurnConstraint）
  - 开火前检查炮塔/车身是否对准目标
  - `turnSpeed` 限制每 tick 最大转向角度
  - 未对准时先转向，对准后开火

- [x] **Task-CB4: 射程内检测** ✅ 2026-05-28（RangeCheck）
  - `MoveWithinRange` Activity：自动移动到射程内
  - 支持最小/最大射程（如迫击炮有最小射程）
  - 目标移动时重新评估是否需要追击

---

## 8. 建筑生产管道（🟡 P1）

### 8.1 现状

- 建筑通过控制台或 Sidebar 直接生成（`cnc.building()`）
- Sidebar 有建造按钮但无真实生产队列
- WarFactory / Barracks 等生产建筑不产出单位

### 8.2 OpenRA 设计

```csharp
// ProductionQueue Trait: 管理建造队列
class ProductionQueue : ITick {
    List<ProductionItem> queue;
    void Tick(Actor self) {
        if (queue.Count > 0 && !queue[0].Done) {
            queue[0].Progress += GetBuildSpeed();
        }
    }
}

// Production Trait: 实际产出单位
class Production : ITick {
    void Tick(Actor self) {
        if (readyUnit != null && CanExit()) {
            SpawnUnit(readyUnit);
            readyUnit = null;
        }
    }
}

// RallyPoint: 单位生成后自动移动到的位置
```

### 8.3 改进任务

- [x] **Task-B1: ProductionQueue Trait** ✅ 2026-05-28
  - 队列管理：`ProductionItem` 列表，含 `progress`, `totalCost`, `unitType`
  - 每 tick 推进进度，受电力/资金影响
  - 支持暂停、取消、插队（多工厂时负载均衡）

- [x] **Task-B2: Production Trait** ✅ 2026-05-28
  - WarFactory / Barracks 挂载 `Production` Trait
  - 队列完成后单位进入 "就绪" 状态
  - 检查出口是否被阻塞，阻塞时等待
  - 单位生成后沿 `RallyPoint` 移动

- [x] **Task-B3: RallyPoint 系统** ✅ 2026-05-28（在 Production Trait 中实现）
  - 每个生产建筑可设置集结点
  - 默认集结点为建筑前方格子
  - 右键点击地面设置/更改集结点

- [x] **Task-B4: 出口逻辑** ✅ 2026-05-28（exitCellX/Y 在 Production 中预留）
  - `Production.ExitCell`：从哪个格子离开建筑
  - `Production.Facing`：离开时的朝向
  - 阻塞检测：出口格子被占时排队等待

---

## 9. 序列动画与 Sprite 渲染（🟡 P1）

### 9.1 现状

- `SequenceProvider` + `SequenceRenderer` 已实现
- 支持 `start`, `length`, `tick`, `facings`, `loop`, `flipX`
- 但未与单位绑定，单位仍使用彩色方块
- 无 SHP 精灵加载

### 9.2 OpenRA 设计

```csharp
// Animation 驱动序列
class Animation {
    void PlayRepeating(string sequenceName);
    void PlayThen(string sequenceName, Action after);
    void Tick();  // 推进帧
    SpriteRenderable[] Render(WPos pos, ...);  // 返回渲染物
}

// WithSpriteBody Trait: 挂载到 Actor 上
class WithSpriteBody : ITick, IRender {
    Animation anim;
    void Tick(Actor self) { anim.Tick(); }
    IEnumerable<IRenderable> Render(Actor self, WorldRenderer wr) {
        return anim.Render(self.CenterPosition, ...);
    }
}
```

### 9.3 改进任务

- [x] **Task-SPR1: Sprite 渲染管线** ✅ 2026-05-28（SpriteRenderable）
  - `SpriteRenderable`：2D billboard 精灵，支持调色板/阵营色替换
  - `SpriteRenderer`：批量渲染精灵（Babylon.js `Sprite` 或自定义 shader）
  - 与 `SequenceRenderer` 绑定：序列定义 → 精灵帧索引 → 渲染

- [x] **Task-SPR2: 单位序列绑定** ✅ 2026-05-28（ActorSpriteRenderer）
  - `WithSpriteBody` Trait：Actor 挂载，驱动 `SequenceRenderer`
  - `WithTurretSprite` Trait：炮塔独立序列
  - 移动时播放 `move` 序列，空闲时 `idle`，攻击时 `attack`

- [x] **Task-SPR3: SHP 格式解析** ✅ 2026-05-28
  - `ShpTextureBuilder`：JS 解析器，TS/RA1 双格式支持
  - RLE 解压 + 256 色调色板映射 → Canvas 纹理图集
  - UV 坐标生成，与 `SequenceProvider` 帧索引对齐
  - 多行图集自动排列（maxWidth=2048），透明背景

---

## 10. 缺失系统（🟢 P2，远期）

### 10.1 空军与海军

- [ ] **Task-VEH1: Aircraft 集成**
  - `AircraftMovement.ts` 已存在但未接入主循环
  - 需要 `Aircraft` Trait：`CruiseAltitude`, `LandAltitude`, `CanHover`
  - 机场停泊逻辑：`Reservable` Trait，飞机降落后占用停机位

- [ ] **Task-VEH2: 海军**
  - `WaterPathGraph`：仅水格可通行
  - `Ship` Trait：转向慢、惯性大
  - 船坞建筑、登陆艇

### 10.2 战役脚本

- [ ] **Task-SCR1: Lua 运行时**
  - 集成 `fengari`（Lua 5.3 WebAssembly）
  - `ScriptGlobal` API：`Media`, `Map`, `Player`, `Actor`, `Trigger`
  - 沙箱：内存限制、执行时间限制

- [ ] **Task-SCR2: 触发器系统**
  - `Trigger.OnEnteredFootprint`：区域进入
  - `Trigger.OnKilled`：单位死亡
  - `Trigger.OnTimer`：计时器
  - `Trigger.OnDestroyed`：建筑摧毁

### 10.3 高级 AI

- [ ] **Task-AI1: 基础 AI 完善**
  - `BaseBuilderAI`：动态扩张基地
  - `AttackAI`：评估兵力后发动攻击波
  - `DefenseAI`：建造防御建筑、修复受损建筑

- [ ] **Task-AI2: 资源 AI**
  - 自动分配 harvester
  - 保护 harvester（派遣护卫）
  - 在矿区不足时扩张

---

## 11. 实施路线图

### Phase 6（当前 → 2 周内）：Actor/Trait 核心迁移

| 任务 | 优先级 | 依赖 | 预估工作量 |
|------|--------|------|-----------|
| Task-A1: Actor 主循环化 | P0 | — | 3 天 |
| Task-A3: 生命周期接口 | P0 | A1 | 1 天 |
| Task-A6: GameObject → Actor 迁移 | P0 | A1, A3 | 5 天 |
| Task-F1: FrameEndTask | P1 | A1 | 1 天 |
| Task-W1: WorldActor | P1 | A1 | 2 天 |

### Phase 7（2–4 周）：渲染与同步

| 任务 | 优先级 | 依赖 | 预估工作量 |
|------|--------|------|-----------|
| Task-R1: 视口裁剪 | P1 | — | 2 天 |
| Task-R2: ITickRender | P1 | A1 | 2 天 |
| Task-S1: Sync 字段标记 | P1 | — | 2 天 |
| Task-S3: RunUnsynced | P1 | S1 | 1 天 |
| Task-A2: TraitDictionary 缓存 | P1 | A1 | 2 天 |

### Phase 8（4–8 周）：战斗与生产

| 任务 | 优先级 | 依赖 | 预估工作量 |
|------|--------|------|-----------|
| Task-CB1: 武器装填 | P1 | A6 | 2 天 |
| Task-CB2: 目标选择 | P1 | CB1 | 3 天 |
| Task-CB3: 转向约束 | P1 | CB1 | 2 天 |
| Task-B1: ProductionQueue | P1 | A6 | 3 天 |
| Task-B2: Production Trait | P1 | B1 | 2 天 |
| Task-B3: RallyPoint | P1 | B2 | 1 天 |
| Task-C1: 动态条件 | P1 | A1 | 2 天 |
| Task-A4: 依赖排序 | P1 | A1 | 1 天 |
| Task-A5: 条件系统 | P1 | C1 | 2 天 |

### Phase 9（8–12 周）：Sprite 与 Polish

| 任务 | 优先级 | 依赖 | 预估工作量 |
|------|--------|------|-----------|
| Task-SPR1: Sprite 管线 | P1 | R2 | 5 天 |
| Task-SPR2: 序列绑定 | P1 | SPR1 | 3 天 |
| Task-CB4: 射程内检测 | P1 | CB2 | 2 天 |
| Task-B4: 出口逻辑 | P1 | B2 | 1 天 |
| Task-S2: 哈希优化 | P2 | S1 | 1 天 |
| Task-S4: 双随机数 | P2 | — | 1 天 |

---

## 12. 参考文件

| 文档 | 内容 |
|------|------|
| `harness/05_OPENRA_ANALYSIS.md` | OpenRA 架构总览与借鉴指南 |
| `harness/07_DEPTH0_OPENRA_GAP_ANALYSIS.md` | 深度 0 任务差距分析 |
| `harness/07_PATHFINDING_OPENRA_GAP_ANALYSIS.md` | 寻路系统详细对比 |
| `OpenRA/OpenRA.Game/Actor.cs` | Actor 容器 |
| `OpenRA/OpenRA.Game/World.cs` | World 类 |
| `OpenRA/OpenRA.Game/TraitDictionary.cs` | Trait 字典 |
| `OpenRA/OpenRA.Game/Graphics/WorldRenderer.cs` | 渲染器 |
| `OpenRA/OpenRA.Game/Network/OrderManager.cs` | 网络同步 |
| `OpenRA/OpenRA.Game/Sync.cs` | 同步哈希 |
| `OpenRA/OpenRA.Mods.Common/Traits/ProductionQueue.cs` | 生产队列 |
| `OpenRA/OpenRA.Mods.Common/Traits/Attack/AttackBase.cs` | 攻击逻辑 |

---

*本文档为活文档，随项目进展更新。最后更新：2026-05-28*
