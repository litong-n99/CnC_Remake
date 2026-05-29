# 寻路碰撞系统与 OpenRA 对比分析报告

> 本文档为 Batch 12（Task 127/128/132）完成后对寻路碰撞系统的全面 cross-check。
> 分析时间：2026-05-27
> 对标版本：OpenRA `bleed` 分支（`HierarchicalPathFinder.cs`, `DensePathGraph.cs`, `Locomotor.cs`, `PathSearch.cs`）

---

## 一、已对齐能力（Complete ✅）

| 能力 | 我们的实现 | OpenRA 实现 | 差异说明 |
|------|-----------|------------|---------|
| **ActorMap 格子占用** | `Map<string, Set<string>>` | `Map<string, Set<Actor>>` | 我们用 ID 字符串，OpenRA 用 Actor 引用；功能等价 |
| **BlockedByActor 四级分级** | `All/Stationary/Immovable/None` | 同名枚举 | 完全对齐 |
| **双格占用** | `fromCell/toCell` | `FromCell/ToCell` | 完全对齐 |
| **Fallback 阻塞链** | Notify→Wait→Evacuating→Repath→Nudge→Backup→GiveUp | 由 `Mobile` activity 处理 | 我们的链更显式，OpenRA 更隐式 |
| **Locomotor 配置层** | `LocomotorInfo` + `TerrainSpeeds` | `LocomotorInfo` | 完全对齐 |
| **SubCell 步兵共享** | `sharesCell: boolean` | `SubCell` 枚举 | 我们只有布尔值，OpenRA 有精确子位置 |
| **Binary Heap 优先队列** | `BinaryHeap<T>` 泛型 | `PriorityQueue` | 完全对齐，O(log n) |
| **HPF DomainIndex** | `areConnected()` 快速拒绝 | `HierarchicalPathFinder` domain | 我们只做了快速拒绝，未做引导 |
| **Bidirectional A/*** | `findPathBidirectional()` | `FindBidiPath` | 完全对齐 |
| **Predicate Search** | `findPathToPredicate()` | `ToTargetCellByPredicate` | 完全对齐 |
| **MoveCooldownHelper** | 冷却公式 `base + distance * factor` | 同名类 | 完全对齐 |
| **Turn Speed** | `turnSpeed` + `turnsWhileMoving` | `MobileInfo.TurnSpeed` | 完全对齐 |
| **Crush Logic** | WarnCrush → OnCrush | `Locomotor.Crushes` | 完全对齐 |
| **MoveWithinRange/Follow** | `MoveWithinRange.ts` / `Follow.ts` | 同名 Activity | 完全对齐 |
| **IPathGraph 抽象** | `IPathGraph` + `GroundPathGraph` | `IPathGraph` + `DensePathGraph` | 接口对齐，实现待扩展 |
| **Lane Bias** | 坐标奇偶性 ±cost | `CalculateCellPathCost` | 完全对齐 |
| **Directed Neighbors** | `DIRECTED_NEIGHBORS` 8 方向表 | `DirectedNeighbors` | 我们增加了保守回退检查 |
| **Heuristic Weight** | `heuristicWeight` 参数 | `HeuristicWeightPercentage` | 完全对齐 |
| **CellInfoLayerPool** | 骨架（预留接口） | `ConditionalWeakTable` + pool | 池子存在但未接入 A* |

---

## 二、OpenRA 有而我们没有的（Gap Analysis）

### 🔴 P0 — 必须补齐（影响核心体验或性能）

#### 1. HPF 抽象图 + 抽象启发式引导（Task 122）

**OpenRA 做法**：
- 10×10 grid 分解 → 抽象节点（连通区域）→ 抽象边（跨 grid 边界）
- 反向抽象 A*：从目标抽象节点出发，预计算每个抽象节点到目标的代价
- 局部 A* 的启发值 = 当前格子到下一抽象节点的代价 + 抽象路径剩余代价
- 效果：长距离寻路节点数减少 60%+

**我们现状**：
- 只有 domain flood-fill（快速拒绝），没有抽象图引导
- A* 启发函数仍是对角线距离（obstacle-unaware）

**折中建议**：
> **必须实现**。这是 100+ 单位场景下的核心性能保障。可以先做简化版：不处理 immovable actor 在抽象图中的反映（只做地形），不做 `AbstractNodeForCost` 延迟跟随。基础版实现后，路径质量提升 >50% 即可接受。

#### 2. 高度系统 / 地形不连续检查（Task 130）

**OpenRA 做法**：
- `CellData.Height: byte`，相邻格 `|h1-h2| > 1` 时不可通行（悬崖）
- `DirectedNeighborsConservative`：高度不连续时只排除父节点
- 斜坡（`|h1-h2| == 1`）可通行，视觉上车身倾斜

**我们现状**：
- 完全没有高度概念，地形是纯 2D 平面
- Directed Neighbors 无 height-aware conservative 模式

**折中建议**：
> **必须实现**。高度是 C&C 地图的核心特征（悬崖、斜坡、桥梁）。实现上：
> - `CellData` 新增 `height: number`（默认 0）
> - `GroundPathGraph` 邻居生成时检查高度差
> - `TerrainMesh` 根据四角高度调整顶点 Z
> - 单位在斜坡上时模型根据高度差插值倾斜
> - **暂不实现**：高度对 HPF 抽象边的影响（可在 Task 123 中补充）

#### 3. CellInfoLayerPool 真正接入 A*（Task 128 续）

**OpenRA 做法**：
- A* 搜索完全基于 `CellLayer<CellInfo>` 存储：`Graph[neighbor]` 直接读/写 `CellInfo`
- 无 `AStarNode` 对象、无 `Set<string>` closedSet、无字符串 key 哈希
- `CellInfo` 含 `g`, `h`, `parent`（`CPos` 或索引），`status`（未访问/在 Open/在 Closed）

**我们现状**：
- `CellInfoLayerPool` 是骨架，`getLayer()` 仍新建数组
- A* 使用 `AStarNode` 对象 + `BinaryHeap` + `Set<string>` closedSet
- 每次搜索都分配大量对象和字符串 key

**折中建议**：
> **建议实现，但非阻塞**。当前 Binary Heap + Set 方案在 1000 次寻路 7.2ms/次 的性能下可接受。Pool 的真正价值在于：
> - 消除 GC 锯齿（对 60FPS 稳定很重要）
> - 为后续 `GridPathGraph`（有界局部搜索）提供存储基础
> - 实现上需重构 `Pathfinder` 内部存储，风险较高，建议放在 Task 122 之后

---

### 🟡 P1 — 应该补齐（提升体验或架构健康度）

#### 4. HPF 动态更新（Task 123）

**OpenRA 做法**：
- `dirtyGridIndexes: Set<number>` — 建筑建造/销毁/地形变化时标记脏 grid
- 下次寻路前 `RebuildDirtyGrids()` — 仅重建受影响 grid 的抽象节点和边
- 增量重建耗时 < 全图重建的 10%

**我们现状**：
- `HierarchicalPathfinder.rebuild()` 全图重建
- 无增量更新机制

**折中建议**：
> 依赖 Task 122（完整抽象图实现后才有可增量更新的结构）。实现上：
> - 监听 `TerrainGrid.setCellLandType` / `Building.onPlaced` / `onDestroyed`
> - 脏 grid 标记 + 延迟重建（下次 `areConnected` 或 `findPath` 时 flush）
> - 先做 terrain-only 层，actor 层因移动单位变化太频繁，暂不做增量

#### 5. SubCell 精确位置（Task 124）

**OpenRA 做法**：
- `SubCell` 枚举：`Invalid=255, Any=254, FullCell=0, TopLeft=1, TopRight=2, Center=3, BottomLeft=4, BottomRight=5`
- `ActorMap` 存储结构：`Map<cellKey, Map<actorId, SubCell>>`
- 步兵进入格子时自动分配第一个空闲子位置
- 渲染层按 `SubCell` 偏移微调模型位置

**我们现状**：
- `sharesCell: boolean` — 只能判断"是否可共享"，无精确位置
- 5 名步兵同格时视觉上完全重叠

**折中建议**：
> 视觉体验问题，非阻塞。实现上：
> - `SubCell` 枚举定义
> - `ActorMap` 存储升级到 `Map<string, Map<string, SubCell>>`
> - `GetAvailableSubCell` 自动分配
> - 渲染层按子位置偏移（±0.3 世界单位）
> - **注意**：SubCell 不影响通行性判定，只影响视觉

#### 6. Activity 树重构（Task 125）

**OpenRA 做法**：
- `Activity` 基类：`Tick()` 返回 `Running/Done/Canceling`
- `ChildActivity` 嵌套 + `NextActivity` 链表
- `Move` = `MoveFirstHalf` → `MoveSecondHalf`（均为子 Activity）
- `AttackMove` = `Move` + 定期 `ScanForTarget` → 发现敌人时取消 Move、排队 `Attack`

**我们现状**：
- 扁平状态机：`Idle/Moving/Attacking/Dying`
- `MoveWithinRange` 和 `Follow` 是 `UnitController` 上的方法，非独立 Activity
- 难以支持复合行为（如"攻击移动到 A，途中遇敌攻击，完成后继续到 A"）

**折中建议**：
> 架构级重构，影响面广。建议：
> - 先做轻量版：保留当前 `UnitStateMachine`，在其上包装 `Activity` 接口
> - `MoveActivity` 内部仍复用现有 `UnitMovement`，只是外层用 Activity 生命周期管理
> - 不追求完整 OpenRA 嵌套树，先支持一层子 Activity（`Move → [MoveFirstHalf, MoveSecondHalf]`）

---

### 🟢 P2 — 可以暂缓（高级功能）

#### 7. Custom Movement Layer 实现（Task 126）

**OpenRA 做法**：
- `TerrainTunnelLayer`, `SubterraneanActorLayer`, `JumpjetActorLayer`, `ElevatedBridgeLayer`
- `MapPathGraph` 管理多层 `CellInfo` 数组
- 层间过渡：`entryCost/exitCost`

**我们现状**：
- `ICustomMovementLayer` 接口已预留
- 只有 `GroundPathGraph`（layer 0）

**折中建议**：
> 隧道/地下/飞行是 C&C 的高级机制，Phase 8 前不是核心循环必需。预留接口已足够，等核心循环稳定后再实现。

#### 8. ActorMap Bin 划分（Task 131）

**OpenRA 做法**：
- 10×10 世界单位的 Bin 二维数组
- `ActorsInBox/ActorInCircle` 基于 Bin 快速筛选
- `CellTrigger/ProximityTrigger` 基于 Bin 的事件系统

**我们现状**：
- 纯格子级 `ActorMap`
- 范围查询需遍历全图

**折中建议**：
> 100+ 单位时范围查询才成为瓶颈。当前 50 单位内性能可接受。建议等需要触发器系统（地雷、区域占领）时再实现。

#### 9. MovePart 拆分 + 弧线移动 + 倒车（Task 129）

**OpenRA 做法**：
- `MoveFirstHalf`（当前格中心 → 两格中点）+ `MoveSecondHalf`（中点 → 目标格中心）
- 方向变化 >90° 时走椭圆弧
- 角度差 >180° 且路径短时倒车
- `carryoverProgress` 保证速度连续性

**我们现状**：
- 连续插值移动，无分段
- 转向是瞬间完成的（或简单的 `TickFacing` 插值）

**折中建议**：
> 视觉表现优化，不影响游戏逻辑。建议 Activity 树重构（Task 125）完成后再做，因为 MovePart 拆分天然适合 Activity 子任务。

---

## 三、我们做得比 OpenRA 好的地方

| 能力 | 我们的优势 |
|------|-----------|
| **Fallback 链完整性** | 7 步完整链（Notify→Wait→Evacuating→Repath→Nudge→Backup→GiveUp），OpenRA 大量委托给 Mobile Trait |
| **Crush 系统集成** | Warn → Nudge → Crush 三阶段与 fallback 链显式整合 |
| **Repath 冷却** | `MoveCooldownHelper` 防止追逐时 spam repath |
| **Close-enough 容忍度** | 终点被占时自动分散到相邻格，避免无限重试 |
| **Directed Neighbors 安全回退** | 被裁剪邻居额外检查 parent→neighbor 可达性，保证路径正确性 |

---

## 四、折中决策总结

### 必须做（近期 Sprint）
1. **Task 122** — HPF 抽象图引导（P0，性能核心）
2. **Task 130** — 高度系统（基础地形能力，影响后续 Task 126/130+）

### 应该做（中期待办）
3. **Task 123** — HPF 动态更新（依赖 122）
4. **Task 124** — SubCell 精确位置（P1，视觉体验）
5. **Task 125** — Activity 树重构（P1，架构健康）
6. **Task 128 续** — CellInfoLayerPool 真正接入 A*

### 可以缓（远期或按需）
7. **Task 126** — 多层移动（隧道/飞行/桥梁）
8. **Task 129** — MovePart 拆分 + 弧线
9. **Task 131** — ActorMap Bin 划分
10. **Player-relationship bitsets** — 等联盟机制完善后

### 不需要对齐
11. **多线程寻路** — OpenRA 也是单线程 A*，Web Workers 引入复杂度不值得
12. **Fixed-point Sqrt(2)** — JS 浮点性能已足够
13. **完整 Trait 系统** — Task 96 是独立大重构，不强制与寻路系统同步

### 默认值调整建议
- `heuristicWeight` 默认值从 `1.0` 改为 `1.25`（与 OpenRA 一致）
- `Lane Bias` 默认关闭改为默认开启（`laneBias = true`）
