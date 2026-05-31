# C++ → TypeScript 代码翻译规范与映射指南

> **路径说明**：本文档中所有 `src/` 路径均指 `CnC_Remake/remake/src/`，即新代码的工程内部路径。原始 C++ 源码位于 `CnC_Remake/origin/`。

> **目标**：确保从 C&C 原始 C++ 源码翻译到 Babylon.js 项目时，逻辑一致、数值不变、架构清晰。  
> **原则**：C++ 是设计文档，TS 是重新实现，不是语法直译。`origin/` 仅作为数值与规则参考，必要时应优先参考 OpenRA / ra2-web 的架构实现经验。

---

## 1. 类结构映射

### 1.1 单位系统（UNIT.CPP / UNIT.H）

> **Task 0.1 提取记录**（2026-05-10）

#### 继承链

```
AbstractClass
  └── ObjectClass        (origin/REDALERT/OBJECT.H, Line 55)
        └── RadioClass
              └── TechnoClass    (origin/REDALERT/TECHNO.H, Line 51)
                    └── FootClass  (origin/REDALERT/FOOT.H, Line 51)
                          └── DriveClass (origin/REDALERT/DRIVE.H, Line 44)
                                └── UnitClass  (origin/REDALERT/UNIT.H, Line 50)
```

**TS 翻译策略**：不使用多继承，改用组合 + Mixin 模式。`TechnoClass` 混入了 `FlasherClass`、`StageClass`、`CargoClass`、`DoorClass` 的能力，在 TS 中拆分为独立组件（如 `CloakComponent`、`CargoComponent`）。

---

#### UnitClass 核心字段列表

| 字段 | 类型 | 来源文件 | 行号 | TS 映射 | 备注 |
|------|------|----------|------|---------|------|
| `Class` | `CCPtr<UnitTypeClass>` | UNIT.H | 57 | `definition: UnitDefinition` | 指向静态类型配置 |
| `Flagged` | `HousesType` | UNIT.H | 62 | `carriedFlag?: HouseType` | 携带的旗帜 |
| `IsDumping` | `unsigned:1` | UNIT.H | 68 | `isDumping: boolean` | 矿车卸货动画标志 |
| `Gold` | `unsigned:5` | UNIT.H | 74 | `goldLoad: number` | 金矿负载计数 |
| `Gems` | `unsigned:5` | UNIT.H | 75 | `gemsLoad: number` | 宝石负载计数 |
| `IsToScatter` | `unsigned:1` | UNIT.H | 82 | `shouldScatter: boolean` | 到达后散开 |
| `Tiberium` | `int` | UNIT.H | 88 | `tiberiumLoad: number` | 泰伯利亚负载 |
| `ShroudBits` | `unsigned long` | UNIT.H | 94 | `shroudBits: number` | 移动Gap生成器遮蔽值 |
| `ShroudCenter` | `CELL` | UNIT.H | 100 | `shroudCenter: Cell` | 遮蔽中心格子 |
| `Reload` | `CDTimerClass<FrameTimerClass>` | UNIT.H | 106 | `reloadTimer: number` | 重装倒计时（Tick） |
| `SecondaryFacing` | `FacingClass` | UNIT.H | 112 | `turretFacing: number` | 炮塔朝向（0-255） |
| `TiberiumUnloadRefinery` | `TARGET` | UNIT.H | 117 | `unloadRefineryTarget?: Target` | 目标精炼厂 |

**从父类继承的关键字段**：

| 字段 | 来源类 | 来源文件 | 行号 | TS 映射 |
|------|--------|----------|------|---------|
| `Strength` | `ObjectClass` | OBJECT.H | 129 | `currentHealth: number` |
| `Coord` | `ObjectClass` | (继承) | — | `cellPosition: Cell` / `worldPosition: Vector3` |
| `IsSelected` / `IsSelectedMask` | `ObjectClass` | OBJECT.H | 94, 99 | `isSelected: boolean` |
| `House` | `TechnoClass` | TECHNO.H | 193 | `owner: House` |
| `TarCom` | `TechnoClass` | TECHNO.H | 206 | `attackTarget?: Target` |
| `SuspendedTarCom` | `TechnoClass` | TECHNO.H | 207 | `suspendedAttackTarget?: Target` |
| `PrimaryFacing` | `TechnoClass` | TECHNO.H | 212 | `bodyFacing: number` |
| `Ammo` | `TechnoClass` | TECHNO.H | 225 | `currentAmmo: number` |
| `ArmorBias` | `TechnoClass` | TECHNO.H | 158 | `armorBias: number` |
| `FirepowerBias` | `TechnoClass` | TECHNO.H | 159 | `firepowerBias: number` |
| `Cloak` | `TechnoClass` | TECHNO.H | 198 | `cloakState: CloakType` |
| `NavCom` | `FootClass` | FOOT.H | 183 | `moveTarget?: Target` |
| `SuspendedNavCom` | `FootClass` | FOOT.H | 184 | `suspendedMoveTarget?: Target` |
| `Speed` | `FootClass` | FOOT.H | 161 | `speed: number` |
| `SpeedBias` | `FootClass` | FOOT.H | 167 | `speedBias: number` |
| `Path` | `FootClass` | FOOT.H | 225 | `path: FacingType[]` |
| `PathThreshhold` | `FootClass` | FOOT.H | 234 | `pathThreshold: MoveType` |
| `IsDriving` | `FootClass` | FOOT.H | 120 | `isDriving: boolean` |
| `IsFiring` | `FootClass` | FOOT.H | 104 | `isFiring: boolean` |
| `IsRotating` | `FootClass` | FOOT.H | 111 | `isRotating: boolean` |
| `IsDeploying` | `FootClass` | FOOT.H | 98 | `isDeploying: boolean` |
| `Team` | `FootClass` | FOOT.H | 199 | `team?: Team` |
| `Group` | `FootClass` | FOOT.H | 206 | `group: number` (-1 = 无编队) |
| `TrackNumber` | `DriveClass` | DRIVE.H | 174 | `trackNumber: number` |
| `TrackIndex` | `DriveClass` | DRIVE.H | 175 | `trackIndex: number` |
| `IsHarvesting` | `DriveClass` | DRIVE.H | 52 | `isHarvesting: boolean` |
| `IsTurretLockedDown` | `DriveClass` | DRIVE.H | 80 | `isTurretLockedDown: boolean` |

---

#### UnitTypeClass 关键属性（静态配置）

```cpp
// origin/REDALERT/TYPE.H, Line 846
class UnitTypeClass : public TechnoTypeClass {
    unsigned IsCrateGoodie:1;      // 可出现在箱子中
    unsigned IsCrusher:1;          // 可碾压步兵
    unsigned IsToHarvest:1;        // 可采集（矿车）
    unsigned IsRadarEquipped:1;    // 有旋转雷达盘
    unsigned IsFireAnim:1;         // 有开火动画
    unsigned IsLockTurret:1;       // 移动时锁定炮塔
    unsigned IsGigundo:1;          // 超大尺寸（矿车/MCV）
    unsigned IsAnimating:1;        // 持续动画（如Visceroid）
    unsigned IsJammer:1;           // 干扰雷达
    unsigned IsGapper:1;           // 移动Gap生成器
    unsigned IsNoFireWhileMoving:1;// 移动时不能开火
    UnitType Type;                 // 单位类型枚举
    signed char TurretOffset;      // 炮塔偏移（leptons）
    MissionType Mission;           // 默认任务
    AnimType Explosion;            // 默认爆炸动画
    int MaxSize;                   // 最大尺寸
};
```

---

#### MissionType 完整枚举

```cpp
// origin/REDALERT/DEFINES.H, Line 1010
typedef enum MissionType : char {
    MISSION_NONE=-1,
    MISSION_SLEEP,           // 什么都不做
    MISSION_ATTACK,          // 攻击最近敌人
    MISSION_MOVE,            // 移动到指定位置
    MISSION_QMOVE,           // 队列移动
    MISSION_RETREAT,         // 撤退回家
    MISSION_GUARD,           // 原地守卫（默认空闲状态）
    MISSION_STICKY,          // 原地守卫（永不招募）
    MISSION_ENTER,           // 进入目标（如精炼厂）
    MISSION_CAPTURE,         // 占领
    MISSION_HARVEST,         // 采集泰伯利亚
    MISSION_GUARD_AREA,      // 区域巡逻守卫
    MISSION_RETURN,          // 返回精炼厂
    MISSION_STOP,            // 停止
    MISSION_AMBUSH,          // 伏击（直到被发现）
    MISSION_HUNT,            // 主动搜索并摧毁
    MISSION_UNLOAD,          // 卸载货物/乘客
    MISSION_SABOTAGE,        // 破坏
    MISSION_CONSTRUCTION,    // 建造动画
    MISSION_DECONSTRUCTION,  // 拆除动画
    MISSION_REPAIR,          // 维修
    MISSION_RESCUE,
    MISSION_MISSILE,
    MISSION_HARMLESS,        // 不具威胁（静坐）
    MISSION_COUNT,
    MISSION_FIRST=0
} MissionType;
```

---

#### 状态机分析

**1. 主 AI 循环（`UnitClass::AI()`）**
- **来源**：`origin/REDALERT/UNIT.CPP`, Line 421
- **调用频率**：每 Tick 一次（60 FPS 固定步长）
- **核心流程**：
  1. 若静止且未卸货且门已关 → `Commence()`（执行待处理命令）
  2. 调用 `DriveClass::AI()`（处理移动/路径）
  3. 若当前任务非采集 → 清除 `IsHarvesting`
  4. `Firing_AI()` — 战斗逻辑（目标选择、开火判定）
  5. `Rotation_AI()` — 炮塔/车身旋转
  6. 守卫模式下站在建筑上 → `Scatter()`（强制散开）
  7. `Edge_Of_World_AI()` — 世界边缘检测
  8. `Reload_AI()` — 弹药重装倒计时
  9. 运输载具逻辑（开关门）
  10. 静止时再次 `Commence()`
  11. 移动Gap生成器遮蔽再生

**2. 空闲任务分配（`UnitClass::Enter_Idle_Mode()`）**
- **来源**：`origin/REDALERT/UNIT.CPP`, Line 1366
- **决策树**：
  ```
  if (IsToScatter) → Scatter() → MISSION_GUARD
  if (有 NavCom) → MISSION_MOVE
  else if (!Is_Weapon_Equipped):
      if (IsToHarvest):
          if (初始 或 AI 或站在矿上) → MISSION_HARVEST
          else → MISSION_GUARD
      else if (是运输载具 且有乘客 无队伍) → MISSION_UNLOAD
      else → MISSION_GUARD
  else (有武器):
      if (MISSION_GUARD / GUARD_AREA / 瘫痪 / 僵尸状态) → 保持当前
      if (IQ < IQGuardArea 或 有队伍) → MISSION_GUARD
      else → MISSION_GUARD_AREA
  ```

**3. 采集任务子状态机（`Mission_Harvest()`）**
- **来源**：`origin/REDALERT/UNIT.CPP`, Line 2886
- **子状态**：
  - `LOOKING` → 寻找泰伯利亚（`Goto_Tiberium()`）
  - `HARVESTING` → 采集中（设置动画速率）
  - `FINDHOME` → 寻找精炼厂
  - `HEADINGHOME` → 返回精炼厂
  - `GOINGTOIDLE` → 无矿可采，进入空闲

**4. 狩猎任务（`Mission_Hunt()`）**
- **来源**：`origin/REDALERT/UNIT.CPP`, Line 3081
- MCV 特殊处理：子状态机 `FIND_SPOT` → `Try_To_Deploy()` → `WAITING`
- 其他单位：委托 `DriveClass::Mission_Hunt()`

**5. 守卫任务（`Mission_Guard()`）**
- **来源**：`origin/REDALERT/UNIT.CPP`, Line 3779
- AI 采集单位有精炼厂时 → 自动转为 `MISSION_HARVEST`
- MCV 且基地建造中 → `MISSION_UNLOAD`（寻找部署位置）
- 其他 → `DriveClass::Mission_Guard()`

**6. 移动任务（`Mission_Move()`）**
- **来源**：`origin/REDALERT/UNIT.CPP`, Line 3814
- 清除 `IsHarvesting`
- 关闭运输门
- 委托 `DriveClass::Mission_Move()`

---

#### TypeScript 映射（更新版）

```typescript
// src/game/unit/Unit.ts

/**
 * 对应 C++ MissionType（DEFINES.H, Line 1010）
 */
export enum UnitMission {
    NONE = -1,
    SLEEP = 0,
    ATTACK = 1,
    MOVE = 2,
    QMOVE = 3,
    RETREAT = 4,
    GUARD = 5,         // 默认空闲状态
    STICKY = 6,
    ENTER = 7,
    CAPTURE = 8,
    HARVEST = 9,
    GUARD_AREA = 10,
    RETURN = 11,
    STOP = 12,
    AMBUSH = 13,
    HUNT = 14,
    UNLOAD = 15,
    SABOTAGE = 16,
    CONSTRUCTION = 17,
    DECONSTRUCTION = 18,
    REPAIR = 19,
    RESCUE = 20,
    MISSILE = 21,
    HARMLESS = 22,
}

/**
 * 对应 C++ UnitTypeClass（TYPE.H, Line 846）
 * 数值从 RULES.CPP / UDATA.CPP 提取
 */
export interface UnitDefinition {
    readonly type: string;
    readonly speed: number;               // 对应 C++ Speed
    readonly maxHealth: number;            // 对应 C++ MaxStrength
    readonly armor: ArmorType;             // 对应 C++ Armor
    readonly primaryWeapon?: string;       // 对应 C++ PrimaryWeapon
    readonly secondaryWeapon?: string;    // 对应 C++ SecondaryWeapon
    readonly maxAmmo: number;             // 对应 C++ MaxAmmo
    readonly cost: number;                // 从 RULES 提取
    readonly sight: number;               // 对应 C++ SightRange
    readonly isCrusher: boolean;          // 对应 C++ IsCrusher
    readonly isToHarvest: boolean;        // 对应 C++ IsToHarvest
    readonly isTurretEquipped: boolean;   // 对应 C++ IsTurretEquipped
    readonly isRadarEquipped: boolean;    // 对应 C++ IsRadarEquipped
    readonly isLockTurret: boolean;       // 对应 C++ IsLockTurret
    readonly isNoFireWhileMoving: boolean;// 对应 C++ IsNoFireWhileMoving
    readonly isCloakable: boolean;        // 对应 C++ IsCloakable
    readonly isAnimating: boolean;        // 对应 C++ IsAnimating
    readonly isGapper: boolean;           // 对应 C++ IsGapper
    readonly turretOffset: number;        // 对应 C++ TurretOffset
    readonly defaultMission: UnitMission; // 对应 C++ Mission
    readonly explosion: string;           // 对应 C++ Explosion
    readonly maxPassengers: number;       // 对应 C++ MaxPassengers
}

export class GameUnit {
    // 逻辑层属性（完全沿用 C++ 数值）
    readonly definition: UnitDefinition;
    currentHealth: number;
    currentAmmo: number;
    mission: UnitMission = UnitMission.GUARD;
    owner: House;

    // 继承自 FootClass / DriveClass 的移动状态
    moveTarget?: Target;
    path: FacingType[] = [];
    isDriving: boolean = false;
    isHarvesting: boolean = false;
    speedBias: number = 0x0100; // fixed point, 256 = 1.0

    // 继承自 TechnoClass 的战斗状态
    attackTarget?: Target;
    bodyFacing: number = 0;      // 0-255
    turretFacing: number = 0;    // 0-255
    armorBias: number = 0x0100;
    firepowerBias: number = 0x0100;
    cloakState: CloakType = CloakType.UNCLOAKED;
    reloadTimer: number = 0;

    // 3D 表现层（Babylon.js 特有）
    mesh: BABYLON.Mesh;
    turretMesh?: BABYLON.Mesh;
    selectionRing?: BABYLON.Mesh;

    // 坐标映射
    cellPosition: Cell;
    worldPosition: BABYLON.Vector3;

    constructor(def: UnitDefinition, owner: House, startCell: Cell, scene: BABYLON.Scene) {
        this.definition = def;
        this.currentHealth = def.maxHealth;
        this.currentAmmo = def.maxAmmo;
        this.owner = owner;
        this.cellPosition = startCell;
        this.worldPosition = TerrainGrid.cellToWorld(startCell);

        // 3D 表现初始化
        this.mesh = UnitMeshFactory.create(def.type, owner.faction, scene);
        this.mesh.position = this.worldPosition.clone();
    }

    /**
     * 对应 C++ UnitClass::AI()
     * Source: REDALERT/UNIT.CPP, Line 421
     * 每 Tick 调用一次
     */
    tick(deltaTime: number): void {
        // 1. 执行待处理命令（Commence 逻辑）
        if (!this.isDriving && !this.isDumping && this.isDoorClosed()) {
            this.commence();
        }

        // 2. 父类 AI（DriveClass::AI）—— 处理移动/路径步进
        this.processDriveAI(deltaTime);

        // 3. 非采集任务时清除采集标志
        if (this.mission !== UnitMission.HARVEST) {
            this.isHarvesting = false;
        }

        // 4. 战斗 AI（Firing_AI）
        this.firingAI();

        // 5. 旋转 AI（Rotation_AI）
        this.rotationAI();

        // 6. 守卫模式下站在建筑上 → 散开
        if (this.isInGuardMode() && this.isOnBuilding()) {
            this.scatter();
        }

        // 7. 世界边缘检测
        if (this.edgeOfWorldAI()) return;

        // 8. 重装倒计时
        this.reloadAI();

        // 9. 静止时再次执行命令
        if (!this.isDriving && !this.isDumping && this.isDoorClosed()) {
            this.commence();
        }
    }

    /**
     * 对应 C++ UnitClass::Enter_Idle_Mode()
     * Source: REDALERT/UNIT.CPP, Line 1366
     */
    enterIdleMode(initial: boolean = false): void {
        let order = UnitMission.GUARD;

        if (this.shouldScatter) {
            this.shouldScatter = false;
            this.scatter();
        }

        if (this.mission === UnitMission.MOVE && !this.moveTarget) {
            // 移动任务无目标时断开无线电
            this.transmitMessage(RadioMessage.OVER_OUT);
        }

        // 处理导航队列
        this.handleNavigationList();

        if (this.moveTarget) {
            order = UnitMission.MOVE;
        } else if (!this.isWeaponEquipped) {
            if (this.definition.isToHarvest) {
                if (!this.inRadioContact() && this.mission !== UnitMission.HARVEST) {
                    if (initial || !this.owner.isHuman || this.isOnTiberium()) {
                        order = UnitMission.HARVEST;
                        this.attackTarget = undefined;
                        this.moveTarget = undefined;
                    } else {
                        order = UnitMission.GUARD;
                    }
                } else {
                    return; // 保持当前状态
                }
            } else {
                order = UnitMission.GUARD;
                this.attackTarget = undefined;
                this.moveTarget = undefined;
            }
        } else {
            // 有武器的单位
            if (this.isInGuardMode() || this.isMissionParalyzed() || this.isMissionZombie()) {
                return;
            }
            if (this.owner.iq < GameRules.IQGuardArea || this.team) {
                order = UnitMission.GUARD;
            } else {
                order = UnitMission.GUARD_AREA;
            }
        }

        this.assignMission(order);
    }

    /**
     * 对应 C++ UnitClass::Take_Damage()
     * Source: REDALERT/UNIT.CPP, Line 1035
     */
    takeDamage(damage: number, warhead: WarheadType, source?: TechnoClass): void {
        // 委托父类处理基础伤害（含 ArmorBias）
        const result = this.driveTakeDamage(damage, warhead, source);

        if (result === DamageResult.DESTROYED) {
            this.deathAnnouncement(source);

            // 播放爆炸动画
            if (this.definition.explosion) {
                EffectManager.spawn(this.definition.explosion, this.worldPosition);
            }

            // 矿车携带矿石时爆炸（Wide_Area_Damage）
            if (this.tiberiumLoad > 0 && GameRules.isExplosiveHarvester) {
                const blastDamage = this.creditLoad() + this.definition.maxHealth;
                DamageCalculator.wideAreaDamage(
                    this.cellPosition, 1.5, blastDamage, this, WarheadType.HE
                );
            }

            // 高血量单位死亡时屏幕震动
            if (this.definition.maxHealth > 400) {
                ScreenShaker.shake(3, this.owner);
            }
        }
    }

    private processDriveAI(deltaTime: number): void { /* ... */ }
    private firingAI(): void { /* ... */ }
    private rotationAI(): void { /* ... */ }
    private reloadAI(): void { /* ... */ }
    private commence(): void { /* ... */ }
    private scatter(): void { /* ... */ }
    private edgeOfWorldAI(): boolean { return false; }
    private isDoorClosed(): boolean { return true; }
    private isWeaponEquipped(): boolean { /* 检查 PrimaryWeapon */ return false; }
    private isInGuardMode(): boolean { /* MISSION_GUARD / GUARD_AREA */ return false; }
    private isOnBuilding(): boolean { return false; }
    private isOnTiberium(): boolean { return false; }
    private inRadioContact(): boolean { return false; }
    private isMissionParalyzed(): boolean { return false; }
    private isMissionZombie(): boolean { return false; }
    private handleNavigationList(): void { /* ... */ }
    private assignMission(mission: UnitMission): void { /* ... */ }
    private transmitMessage(msg: RadioMessage): void { /* ... */ }
    private driveTakeDamage(damage: number, warhead: WarheadType, source?: TechnoClass): DamageResult { /* ... */ return DamageResult.NONE; }
    private deathAnnouncement(source?: TechnoClass): void { /* ... */ }
    private creditLoad(): number { return this.goldLoad + this.gemsLoad + this.tiberiumLoad; }
}
```

---

### 1.2 建筑系统（BUILDING.CPP / BUILDING.H）

> **Task 0.2 提取记录**（2026-05-10）

#### 继承链

```
AbstractClass
  └── ObjectClass
        └── RadioClass
              └── TechnoClass    (BUILDING.H, Line 55)
                    └── BuildingClass
```

**注意**：BuildingClass 直接继承自 `TechnoClass`，不像 `UnitClass` 那样经过 `FootClass` / `DriveClass`。建筑不可移动，因此不包含任何移动/路径相关字段。

---

#### BuildingClass 核心字段列表

| 字段 | 类型 | 来源文件 | 行号 | TS 映射 | 备注 |
|------|------|----------|------|---------|------|
| `Class` | `CCPtr<BuildingTypeClass>` | BUILDING.H | 62 | `definition: BuildingDefinition` | 静态类型配置 |
| `Factory` | `CCPtr<FactoryClass>` | BUILDING.H | 68 | `factory?: Factory` | 生产管理器（工厂建筑） |
| `ActLike` | `HousesType` | BUILDING.H | 75 | `actLike: HouseType` | 原始所属阵营 |
| `IsToRebuild` | `unsigned:1` | BUILDING.H | 81 | `shouldRebuild: boolean` | 摧毁后重建 |
| `IsToRepair` | `unsigned:1` | BUILDING.H | 86 | `autoRepair: boolean` | 允许自动修复 |
| `IsAllowedToSell` | `unsigned:1` | BUILDING.H | 93 | `canSell: boolean` | 允许出售 |
| `IsReadyToCommence` | `unsigned:1` | BUILDING.H | 99 | `readyToCommence: boolean` | 可执行新命令 |
| `IsRepairing` | `unsigned:1` | BUILDING.H | 107 | `isRepairing: boolean` | 正在修复 |
| `IsWrenchVisible` | `unsigned:1` | BUILDING.H | 113 | `wrenchVisible: boolean` | 显示扳手图标 |
| `IsGoingToBlow` | `unsigned:1` | BUILDING.H | 120 | `hasBombPlanted: boolean` | 被安放炸弹 |
| `IsCharging` / `IsCharged` | `unsigned:1` | BUILDING.H | 132-133 | `isCharging: boolean` | 光棱塔/特斯拉充能 |
| `IsCaptured` | `unsigned:1` | BUILDING.H | 139 | `isCaptured: boolean` | 已被占领过 |
| `IsJamming` | `unsigned:1` | BUILDING.H | 144 | `isJamming: boolean` | Gap 生成器干扰中 |
| `IsJammed` | `unsigned:1` | BUILDING.H | 150 | `isJammed: boolean` | 被敌方干扰 |
| `HasFired` | `unsigned:1` | BUILDING.H | 156 | `hasFired: boolean` | GPS 卫星已发射 |
| `HasOpened` | `unsigned:1` | BUILDING.H | 163 | `hasOpened: boolean` | Grand_Opening 已调用 |
| `BState` | `BStateType` | BUILDING.H | 176 | `animState: BuildingAnimState` | 当前动画状态 |
| `QueueBState` | `BStateType` | BUILDING.H | 177 | `queuedAnimState?: BuildingAnimState` | 待切换动画状态 |
| `CountDown` | `CDTimerClass` | BUILDING.H | 170 | `destructionTimer: number` | 销毁倒计时 |
| `LastStrength` | `int` | BUILDING.H | 196 | `lastStrength: number` | 上次强度（电力更新用） |
| `PlacementDelay` | `CDTimerClass` | BUILDING.H | 209 | `placementDelay: number` | 工厂出口阻塞重试计时 |

**从 TechnoClass 继承的关键字段**（同 UnitClass）：
- `Strength`（生命值）、`House`（所属阵营）、`TarCom`（攻击目标）、`PrimaryFacing`（朝向）、`Ammo`（弹药）、`ArmorBias` / `FirepowerBias`（增益）、`Cloak`（隐身状态）

---

#### BuildingTypeClass 关键属性（静态配置）

```cpp
// origin/REDALERT/TYPE.H, Line 593
class BuildingTypeClass : public TechnoTypeClass {
    unsigned IsBase:1;           // 可用于建筑邻接检查
    unsigned IsFake:1;           // 假建筑
    unsigned IsBibbed:1;         // 有底座（Bib）
    unsigned IsWall:1;           // 墙类型（放置时转为 Overlay）
    unsigned IsSimpleDamage:1;   // 简单伤害状态（2帧）
    unsigned IsCaptureable:1;    // 可被工程师占领
    unsigned IsRegulated:1;      // 动画匀速运行
    unsigned IsPowered:1;        // 需要电力才能运作
    unsigned IsUnsellable:1;     // 不可出售
    FacingType FoundationFace;   // 地基朝向
    int Adjacent;                // 建筑邻接距离
    RTTIType ToBuild;            // 可生产对象类型（RTTI_NONE = 非工厂）
    COORDINATE ExitCoordinate;   // 出口坐标
    short const * ExitList;      // 出口方向优先级列表
    StructType Type;             // 建筑类型枚举
    DirType StartFace;           // 初始朝向
    int Capacity;                // 泰伯利亚存储容量
    int Power;                   // 电力产出
    int Drain;                   // 电力消耗
    BSizeType Size;              // 建筑尺寸（BSIZE_1x1 ~ BSIZE_4x3）
    AnimControlType Anims[BSTATE_COUNT]; // 各状态动画控制
};
```

---

#### BStateType 建筑动画状态

```cpp
// origin/REDALERT/DEFINES.H, Line 1047
typedef enum BStateType : char {
    BSTATE_NONE=-1,
    BSTATE_CONSTRUCTION,    // 建造动画（从地底升起）
    BSTATE_IDLE,            // 空闲动画
    BSTATE_ACTIVE,          // 工作状态动画
    BSTATE_FULL,            // 满负荷/特殊状态
    BSTATE_AUX1,            // 辅助动画 1
    BSTATE_AUX2,            // 辅助动画 2
    BSTATE_COUNT
} BStateType;
```

---

#### 状态机与核心逻辑分析

**1. 主 AI 循环（`BuildingClass::AI()`）**
- **来源**：`origin/REDALERT/BUILDING.CPP`, Line 834
- **核心流程**：
  1. `Animation_AI()` — 处理动画帧推进与状态转换
  2. 若 `IsReadyToCommence` 且非建造中 → `Commence()`（执行待处理命令）
  3. `TechnoClass::AI()` — 父类 AI（战斗、目标选择等）
  4. 建筑弹药即时重装（`Ammo = Class->MaxAmmo`）
  5. 再次 `Commence()`（处理 AI 触发的新命令）
  6. `QueueBState` 动画状态切换（建造完成→空闲等）
  7. 强度变化时更新阵营电力 `Power_Output()`

**2. 建造任务（`Mission_Construction()`）**
- **来源**：`origin/REDALERT/BUILDING.CPP`, Line 3589
- **子状态机**：
  - `INITIAL` → `Begin_Mode(BSTATE_CONSTRUCTION)`（播放建造动画）→ 发送 `RADIO_BUILDING` → `DURING`
  - `DURING` 且 `IsReadyToCommence`（动画完成）→ 发送 `RADIO_COMPLETE` / `RADIO_OVER_OUT` → `Begin_Mode(BSTATE_IDLE)` → `Grand_Opening()` → `MISSION_GUARD`

**3. 拆除/出售任务（`Mission_Deconstruction()`）**
- **来源**：`origin/REDALERT/BUILDING.CPP`, Line 3649
- **流程**：
  - 强制停止修复 `Repair(0)`
  - 维修厂特殊处理：优先出售停在上面的单位
  - 船坞/潜艇坞特殊处理：通知附着舰船停止维修
  - 子状态机：`INITIAL` → `HOLDING` → `DURING`（反向播放建造动画）
  - 完成时返还资金并删除建筑

**4. 守卫任务（`Mission_Guard()`）**
- **来源**：`origin/REDALERT/BUILDING.CPP`, Line 3492
- **武装建筑**：
  - 设置 `IsReadyToCommence = true`
  - 无目标 → `Greatest_Threat()` 搜索 → `Assign_Target()`
  - 有目标 → `MISSION_ATTACK`
- **无武装建筑**：
  - `INITIAL_ENTRY` → `Begin_Mode(BSTATE_IDLE)` → `IDLE`
  - 维修厂有等待客户 → `MISSION_REPAIR`

**5. 启用/开业（`Grand_Opening()`）**
- **来源**：`origin/REDALERT/BUILDING.CPP`, Line 2544
- **首次启用时调用**：
  - `House->Adjust_Drain(Class->Drain)` — 增加电力消耗
  - `House->Adjust_Capacity(Class->Capacity)` — 增加存储容量
  - `House->IsRecalcNeeded = true` — 标记重新计算科技树
  - 精炼厂附赠矿车（`UNIT_HARVESTER`）
  - 直升机坪附赠直升机（Hind / Longbow，根据阵营）

**6. 修复控制（`Repair(control)`）**
- **来源**：`origin/REDALERT/BUILDING.CPP`, Line 2647
- `control`: `-1`=切换, `0`=关闭, `1`=开启
- 满血时开启 → 播放错误提示音
- 开启修复 → 显示扳手图标 `IsWrenchVisible = true`

**7. 出售控制（`Sell_Back(control)`）**
- **来源**：`origin/REDALERT/BUILDING.CPP`, Line 2712
- 检查 `Class->Get_Buildup_Data()` — 无建造动画则不能出售
- `decon = true` → `Assign_Mission(MISSION_DECONSTRUCTION)` → `Commence()`

**8. 工厂 AI（`Factory_AI()`）**
- **来源**：`origin/REDALERT/BUILDING.CPP`, Line 5529
- **生产完成处理**：
  - `Factory->Has_Completed()` 且 `PlacementDelay == 0`
  - `Exit_Object(product)` 尝试释放产品：
    - `0` → 放弃生产，退款
    - `1` → 出口阻塞，`PlacementDelay = 3秒`
    - `2` → 释放成功，记录 `JustBuiltXxx`，清理 Factory
- **AI 自动生产**：
  - 非建造/拆除中、`Class->ToBuild != RTTI_NONE`
  - 资金 > 10 时，`House->Suggest_New_Object()` 选择类型 → 创建 `FactoryClass` → `Factory->Set()` 启动生产

**9. 修复 AI（`Repair_AI()`）**
- **来源**：`origin/REDALERT/BUILDING.CPP`, Line 5761
- **条件**：`IQ >= IQRepairSell`、非建造/拆除中、`Can_Repair()`
- **自动开启修复**：
  - 资金 ≥ `RepairThreshhold`
  - 未修复过（`!House->DidRepair`）
  - 已占领 / 标记修复 / AI 控制 / 非普通对战
- **资金不足且被攻击**：可能自动出售（`Sell_Back`）
- **修复中每 `RepairRate` 分钟**：
  - 扣除 `Repair_Cost()` 资金
  - 恢复 `Repair_Step()` 生命
  - 满血停止，资金不足停止

**10. 放置验证（`Can_Enter_Cell()` / `Unlimbo()`）**
- **来源**：`origin/REDALERT/BUILDING.CPP`, Line 3405 / 1074
- **墙类型**：转换为对应 `OverlayType`（沙袋→OVERLAY_SANDBAG_WALL 等）
- **MCV 部署**：`Map[cell].Is_Clear_To_Build(Class->Speed)`
- **正常建筑**：`Class->Legal_Placement(cell)`（检查地形、邻接、重叠）
- **Unlimbo**：
  - 更新阵营建筑扫描位 `BScan` / `ActiveBScan`
  - 重新计算基地中心 `Recalc_Center()`
  - 激活生产追踪 `Active_Add()`

**11. 可出售检查（`Can_Demolish()`）**
- **来源**：`origin/REDALERT/BUILDING.CPP`, Line 3439
- **不可出售条件**：
  - `IsUnsellable`（如矿厂）
  - 无建造动画数据
  - 正在建造/拆除中
  - 精炼厂有附着的矿车

---

#### FactoryClass 生产管理器

```cpp
// origin/REDALERT/FACTORY.H, Line 40
class FactoryClass : private StageClass {
    bool IsSuspended;       // 生产暂停
    bool IsDifferent;       // 进度变化（用于 UI 更新）
    bool IsBlocked;         // 出口阻塞
    int Balance;            // 剩余欠款（逐期扣款）
    int OriginalBalance;    // 原始总价
    TechnoClass * Object;   // 正在生产的对象（limbo 状态）
    int SpecialItem;        // 特殊项目（非对象生产时）
    HouseClass * House;     // 生产方阵营

    bool Set(TechnoTypeClass const & object, HouseClass & house); // 启动生产
    bool Start(void);       // 开始/恢复
    bool Suspend(void);     // 暂停
    bool Abandon(void);     // 放弃（退款）
    bool Completed(void);   // 标记完成
    bool Has_Completed(void); // 是否已完成
    bool Is_Building(void); // 是否正在生产
    int Completion(void);   // 完成百分比（0~54）
    TechnoClass * Get_Object(void); // 获取产品
};
```

**生产机制**：
- 总价分为 54 步（`STEP_COUNT = 54`）
- 每步扣除 `Cost_Per_Tick()` 资金
- 产品对象在启动时即创建，处于 limbo 状态
- 完成后通过 `Exit_Object()` 放置到地图

---

#### TypeScript 映射（更新版）

```typescript
// src/game/building/Building.ts

/**
 * 对应 C++ BStateType（DEFINES.H, Line 1047）
 */
export enum BuildingAnimState {
    NONE = -1,
    CONSTRUCTION = 0,  // 建造动画（从地底升起）
    IDLE = 1,          // 空闲动画
    ACTIVE = 2,        // 工作状态
    FULL = 3,          // 满负荷/特殊状态
    AUX1 = 4,          // 辅助动画 1
    AUX2 = 5,          // 辅助动画 2
}

/**
 * 对应 C++ BuildingTypeClass（TYPE.H, Line 593）
 * 数值从 RULES.CPP / BDATA.CPP 提取
 */
export interface BuildingDefinition {
    readonly type: string;
    readonly maxHealth: number;           // 对应 C++ MaxStrength
    readonly armor: ArmorType;             // 对应 C++ Armor
    readonly powerDrain: number;           // 对应 C++ Drain
    readonly powerProduction: number;      // 对应 C++ Power
    readonly capacity: number;             // 对应 C++ Capacity（泰伯利亚存储）
    readonly cost: number;                 // 对应 C++ Cost
    readonly buildTime: number;            // 对应 C++ BuildTime（Tick 数）
    readonly width: number;                // 对应 C++ Size 宽度
    readonly height: number;               // 对应 C++ Size 高度
    readonly prerequisites: string[];      // 科技树前置建筑
    readonly isBase: boolean;              // 对应 C++ IsBase（邻接检查）
    readonly isBibbed: boolean;            // 对应 C++ IsBibbed
    readonly isWall: boolean;              // 对应 C++ IsWall
    readonly isCaptureable: boolean;       // 对应 C++ IsCaptureable
    readonly isPowered: boolean;           // 对应 C++ IsPowered
    readonly isUnsellable: boolean;        // 对应 C++ IsUnsellable
    readonly isFake: boolean;              // 对应 C++ IsFake
    readonly toBuild?: string;             // 对应 C++ ToBuild（工厂类型）
    readonly exitCoordinate?: Vector3;     // 对应 C++ ExitCoordinate
    readonly startFace: number;            // 对应 C++ StartFace
    readonly adjacent: number;             // 对应 C++ Adjacent
    readonly explosion?: string;           // 对应 C++ Explosion
}

export class GameBuilding {
    // 逻辑层属性
    readonly definition: BuildingDefinition;
    currentHealth: number;
    owner: House;
    cellPosition: Cell;
    actLike: HouseType;

    // 状态标志（对应 C++ BuildingClass 位域）
    isReadyToCommence: boolean = false;
    isRepairing: boolean = false;
    wrenchVisible: boolean = false;
    hasBombPlanted: boolean = false;
    isCharging: boolean = false;
    isCharged: boolean = false;
    isCaptured: boolean = false;
    isJamming: boolean = false;
    isJammed: boolean = false;
    hasOpened: boolean = false;

    // 动画状态（对应 C++ BState / QueueBState）
    animState: BuildingAnimState = BuildingAnimState.NONE;
    queuedAnimState?: BuildingAnimState;

    // 生产状态（对应 C++ Factory）
    factory?: Factory;
    placementDelay: number = 0;  // Tick 计数

    // 倒计时
    destructionTimer: number = 0; // 对应 C++ CountDown

    // 3D 表现层
    mesh: BABYLON.Mesh;
    placementPreview?: BABYLON.Mesh;
    bibMesh?: BABYLON.Mesh;      // 底座（对应 C++ Bib）

    constructor(def: BuildingDefinition, owner: House, cell: Cell, scene: BABYLON.Scene) {
        this.definition = def;
        this.currentHealth = def.maxHealth;
        this.owner = owner;
        this.cellPosition = cell;
        this.actLike = owner.faction;

        // 3D 表现初始化（建造中缩放为 0）
        this.mesh = BuildingMeshFactory.create(def.type, owner.faction, scene);
        this.mesh.position = TerrainGrid.cellToWorld(cell);
        this.mesh.scaling = new BABYLON.Vector3(0, 0, 0);
        this.animState = BuildingAnimState.CONSTRUCTION;
    }

    /**
     * 对应 C++ BuildingClass::AI()
     * Source: REDALERT/BUILDING.CPP, Line 834
     * 每 Tick 调用一次
     */
    tick(deltaTime: number): void {
        // 1. 动画状态机推进
        this.animationAI();

        // 2. 执行待处理命令
        if (this.isReadyToCommence && this.animState !== BuildingAnimState.CONSTRUCTION) {
            if (this.commence()) {
                this.isReadyToCommence = false;
            }
        }

        // 3. 父类 AI（TechnoClass::AI — 战斗、目标选择）
        this.technoAI();

        // 4. 建筑弹药即时重装
        if (this.currentAmmo === 0) {
            this.currentAmmo = this.definition.maxAmmo;
        }

        // 5. 再次执行命令（AI 可能触发新任务）
        if (this.isReadyToCommence) {
            if (this.commence()) {
                this.isReadyToCommence = false;
            }
        }

        // 6. 处理待切换动画状态
        if (this.queuedAnimState !== undefined) {
            if (this.animState !== this.queuedAnimState) {
                this.animState = this.queuedAnimState;
                this.setAnimationRate(this.getAnimControl(this.animState).rate);
                this.setAnimationStage(this.getAnimControl(this.animState).start);
            }
            this.queuedAnimState = undefined;
        }

        // 7. 强度变化时更新电力
        if (this.currentHealth !== this.lastStrength) {
            this.owner.adjustPowerOutput(this.powerOutput());
            this.lastStrength = this.currentHealth;
        }
    }

    /**
     * 对应 C++ BuildingClass::Grand_Opening()
     * Source: REDALERT/BUILDING.CPP, Line 2544
     */
    grandOpening(captured: boolean = false): void {
        if (this.hasOpened && !captured) return;
        this.hasOpened = true;

        // 调整阵营电力与存储
        this.owner.adjustDrain(this.definition.powerDrain);
        this.owner.adjustCapacity(this.definition.capacity);
        this.owner.isRecalcNeeded = true;

        // 精炼厂附赠矿车
        if (this.definition.type === 'REFINERY' && !captured) {
            GameObjectFactory.createUnit('HARVESTER', this.owner, this.getFreeExitCell());
        }

        // 直升机坪附赠直升机
        if (this.definition.type === 'HELIPAD' && !captured) {
            const aircraftType = this.owner.faction === 'USSR' ? 'HIND' : 'LONGBOW';
            GameObjectFactory.createAircraft(aircraftType, this.owner, this.dockingCoord());
        }
    }

    /**
     * 对应 C++ BuildingClass::Repair()
     * Source: REDALERT/BUILDING.CPP, Line 2647
     */
    repair(control: -1 | 0 | 1): void {
        switch (control) {
            case -1:
                this.isRepairing = !this.isRepairing;
                break;
            case 1:
                if (this.isRepairing) return;
                this.isRepairing = true;
                break;
            case 0:
                if (!this.isRepairing) return;
                this.isRepairing = false;
                break;
        }

        if (this.isRepairing) {
            if (this.currentHealth === this.definition.maxHealth) {
                AudioManager.play('SCOLD'); // 满血修复提示
            } else {
                this.wrenchVisible = true;
            }
        }
    }

    /**
     * 对应 C++ BuildingClass::Sell_Back()
     * Source: REDALERT/BUILDING.CPP, Line 2712
     */
    sellBack(control: -1 | 0 | 1): void {
        if (!this.definition.canSell) return;

        let decon = false;
        switch (control) {
            case -1:
                decon = (this.mission !== BuildingMission.DECONSTRUCTION);
                break;
            case 1:
                if (this.mission === BuildingMission.DECONSTRUCTION) return;
                if (this.hasBombPlanted) return;
                decon = true;
                break;
            case 0:
                if (this.mission !== BuildingMission.DECONSTRUCTION) return;
                decon = false;
                break;
        }

        if (decon) {
            this.assignMission(BuildingMission.DECONSTRUCTION);
            this.commence();
        }
    }

    /**
     * 对应 C++ BuildingClass::Mission_Construction()
     * Source: REDALERT/BUILDING.CPP, Line 3589
     */
    missionConstruction(): void {
        enum SubState { INITIAL, DURING }

        switch (this.constructionStatus) {
            case SubState.INITIAL:
                this.beginMode(BuildingAnimState.CONSTRUCTION);
                this.transmitMessage(RadioMessage.BUILDING);
                AudioManager.play('CONSTRUCTION');
                this.constructionStatus = SubState.DURING;
                break;

            case SubState.DURING:
                if (this.isReadyToCommence) {
                    // 建造完成
                    this.transmitMessage(RadioMessage.COMPLETE);
                    this.transmitMessage(RadioMessage.OVER_OUT);
                    this.beginMode(BuildingAnimState.IDLE);
                    this.grandOpening();
                    this.assignMission(BuildingMission.GUARD);
                    this.bodyFacing = this.definition.startFace;
                }
                break;
        }
    }

    /**
     * 对应 C++ BuildingClass::Mission_Guard()
     * Source: REDALERT/BUILDING.CPP, Line 3492
     */
    missionGuard(): void {
        if (this.isWeaponEquipped()) {
            // 武装建筑：寻找目标并攻击
            this.isReadyToCommence = true;
            if (!this.attackTarget) {
                this.attackTarget = this.greatestThreat(ThreatType.NORMAL);
            }
            if (this.attackTarget) {
                this.assignMission(BuildingMission.ATTACK);
                this.commence();
            }
        } else {
            // 无武装建筑：进入空闲动画
            switch (this.guardSubState) {
                case GuardSubState.INITIAL_ENTRY:
                    this.beginMode(BuildingAnimState.IDLE);
                    this.guardSubState = GuardSubState.IDLE;
                    break;
                case GuardSubState.IDLE:
                    // 维修厂有等待客户 → 开始维修
                    if (this.definition.type === 'REPAIR' && this.hasWaitingCustomer()) {
                        this.assignMission(BuildingMission.REPAIR);
                    }
                    break;
            }
        }
    }

    /**
     * 对应 C++ BuildingClass::Factory_AI()
     * Source: REDALERT/BUILDING.CPP, Line 5529
     */
    factoryAI(): void {
        if (this.factory && this.factory.hasCompleted() && this.placementDelay === 0) {
            const product = this.factory.getObject();
            const exitResult = this.exitObject(product);

            switch (exitResult) {
                case 0: // 无法释放
                    this.factory.abandon();
                    this.factory = undefined;
                    break;
                case 1: // 出口阻塞
                    this.placementDelay = TICKS_PER_SECOND * 3;
                    break;
                case 2: // 释放成功
                    this.owner.recordBuilt(product.type);
                    this.factory.completed();
                    this.factory = undefined;
                    break;
            }
        }

        // AI 自动选择新生产
        if (this.owner.isStarted
            && this.mission !== BuildingMission.CONSTRUCTION
            && this.mission !== BuildingMission.DECONSTRUCTION
            && this.definition.toBuild
            && !this.factory
            && this.owner.availableMoney > 10) {
            const suggested = this.owner.suggestNewObject(this.definition.toBuild);
            if (suggested) {
                this.factory = new Factory(suggested, this.owner);
            }
        }
    }

    /**
     * 对应 C++ BuildingClass::Repair_AI()
     * Source: REDALERT/BUILDING.CPP, Line 5761
     */
    repairAI(): void {
        if (this.owner.iq >= GameRules.IQRepairSell
            && this.mission !== BuildingMission.CONSTRUCTION
            && this.mission !== BuildingMission.DECONSTRUCTION) {

            if (this.canRepair()) {
                if (this.owner.availableMoney >= GameRules.repairThreshhold) {
                    if (!this.owner.didRepair) {
                        if (!this.isRepairing && (this.isCaptured || this.autoRepair || !this.owner.isHuman)) {
                            this.owner.didRepair = true;
                            this.repair(1);
                        }
                    }
                } else if (this.isTickedOff && this.owner.control.techLevel >= GameRules.IQSellBack) {
                    // 资金不足且被攻击 → 可能自动出售
                    if (Math.random() * 50 < this.owner.control.techLevel) {
                        this.sellBack(1);
                    }
                }
            }
        }

        // 修复中效果
        if (this.isRepairing && (GameLoop.frame % (GameRules.repairRate * TICKS_PER_MINUTE)) === 0) {
            this.wrenchVisible = !this.wrenchVisible;
            const cost = this.definition.repairCost;
            const step = this.definition.repairStep;
            if (this.owner.availableMoney >= cost) {
                this.owner.spendMoney(cost);
                this.currentHealth = Math.min(this.definition.maxHealth, this.currentHealth + step);
                if (this.currentHealth >= this.definition.maxHealth) {
                    this.isRepairing = false;
                }
            } else {
                this.isRepairing = false;
            }
        }
    }

    /**
     * 对应 C++ BuildingClass::Can_Enter_Cell() / Unlimbo()
     * 放置验证与初始化
     */
    canPlaceAt(cell: Cell): boolean {
        if (this.definition.isWall) {
            return Map.isClearToBuild(cell, this.definition.speed);
        }
        return this.definition.legalPlacement(cell);
    }

    unlimbo(cell: Cell, facing: number = 0): boolean {
        if (this.definition.isWall) {
            // 墙类型转换为 Overlay
            return this.convertToOverlay(cell);
        }
        // 更新阵营扫描位
        this.owner.buildingScan |= (1 << this.definition.type);
        this.owner.activeBuildingScan |= (1 << this.definition.type);
        this.owner.recalcCenter();
        this.owner.activeAdd(this);
        this.owner.isRecalcNeeded = true;
        this.lastStrength = 0;
        return true;
    }

    private powerOutput(): number {
        return Math.floor(
            (this.definition.powerProduction - this.definition.powerDrain)
            * (this.currentHealth / this.definition.maxHealth)
        );
    }

    private animationAI(): void { /* ... */ }
    private commence(): boolean { /* ... */ return false; }
    private technoAI(): void { /* ... */ }
    private beginMode(state: BuildingAnimState): void { /* ... */ }
    private getAnimControl(state: BuildingAnimState): { start: number; rate: number } { return { start: 0, rate: 0 }; }
    private setAnimationRate(rate: number): void { /* ... */ }
    private setAnimationStage(stage: number): void { /* ... */ }
    private isWeaponEquipped(): boolean { /* ... */ return false; }
    private greatestThreat(threat: ThreatType): Target | undefined { return undefined; }
    private hasWaitingCustomer(): boolean { return false; }
    private getFreeExitCell(): Cell { return this.cellPosition; }
    private dockingCoord(): Vector3 { return this.mesh.position; }
    private convertToOverlay(cell: Cell): boolean { return false; }
    private assignMission(mission: BuildingMission): void { /* ... */ }
    private transmitMessage(msg: RadioMessage): void { /* ... */ }
    private exitObject(product: GameObject): number { return 0; }
    private canRepair(): boolean { return false; }
}
```

---

### 1.3 弹道系统（BULLET.CPP / WEAPON.H / WARHEAD.H / FLY.CPP）

> **Task 0.5 提取记录**（2026-05-10）

#### 继承链

```
ObjectClass
  └── FlyClass  (origin/REDALERT/FLY.H, Line 38)
        └── FuseClass
              └── BulletClass  (origin/REDALERT/BULLET.H, Line 43)
```

**TS 翻译策略**：`BulletClass` 在 TS 中拆分为 `GameProjectile`（游戏逻辑）+ `ProjectileRenderer`（Babylon.js 可视化）。飞行物理独立为 `FlyPhysics` 组件。

---

#### WeaponTypeClass 结构

**来源**: `origin/REDALERT/WEAPON.H`, Line 45-157

| 字段 | 类型 | 来源文件 | 行号 | TS 映射 | 说明 |
|------|------|----------|------|---------|------|
| `Burst` | `int` | WEAPON.H | 107 | `burst: number` | 连发次数（如双管炮 = 2） |
| `Attack` | `int` | WEAPON.H | 120 | `damage: number` | 单次伤害值（负值 = 治疗） |
| `MaxSpeed` | `MPHType` | WEAPON.H | 125 | `maxSpeed: number` | 弹体速度 |
| `ROF` | `int` | WEAPON.H | 138 | `rateOfFire: number` | 射击间隔（帧） |
| `Range` | `LEPTON` | WEAPON.H | 146 | `range: number` | 射程（leptons） |
| `Bullet` | `BulletTypeClass*` | WEAPON.H | 114 | `projectileType: BulletType` | 弹体类型 |
| `WarheadPtr` | `WarheadTypeClass*` | WEAPON.H | 130 | `warhead: WarheadType` | 弹头类型 |
| `IsTurboBoosted` | `unsigned:1` | WEAPON.H | 78 | `isTurboBoosted: boolean` | 对空加速 |
| `IsSupressed` | `unsigned:1` | WEAPON.H | 85 | `isSuppressed: boolean` | 附近友军建筑时抑制开火 |
| `IsCamera` | `unsigned:1` | WEAPON.H | 91 | `isCamera: boolean` | 发射后开视野 |
| `IsElectric` | `unsigned:1` | WEAPON.H | 99 | `isElectric: boolean` | 需要充能（磁暴线圈） |
| `Sound` | `VocType` | WEAPON.H | 151 | `fireSound: string` | 开火音效 |
| `Anim` | `AnimType` | WEAPON.H | 156 | `fireAnim: string` | 开火动画 |

---

#### BulletTypeClass 结构（弹体类型配置）

**来源**: `origin/REDALERT/TYPE.H`, Line 1366-1462+

| 字段 | 类型 | 说明 |
|------|------|------|
| `IsHigh` | `unsigned:1` | 飞越墙体 |
| `IsShadow` | `unsigned:1` | 绘制阴影 |
| `IsArcing` | `unsigned:1` | 弹道弧线（手雷、炮弹） |
| `IsDropping` | `unsigned:1` | 垂直下落（炸弹、空投） |
| `IsInvisible` | `unsigned:1` | 不可见（子弹、火焰） |
| `IsProximityArmed` | `unsigned:1` | 接近目标即爆 |
| `IsFlameEquipped` | `unsigned:1` | 尾焰效果（导弹） |
| `IsFueled` | `unsigned:1` | 燃料限制飞行距离 |
| `IsFaceless` | `unsigned:1` | 无方向性贴图 |
| `IsInaccurate` | `unsigned:1` | 天然不精确（火炮） |
| `IsTranslucent` | `unsigned:1` | 半透明像素 |
| `IsAntiAircraft` | `unsigned:1` | 可对空 |
| `IsAntiGround` | `unsigned:1` | 可对地 |
| `IsAntiSub` | `unsigned:1` | 可对潜艇 |
| `IsDegenerate` | `unsigned:1` | 飞行中衰减伤害 |
| `ROT` | `int` | 转向速率（`0` = 不转向 = 直线，`>0` = 制导） |

---

#### BulletClass 核心字段

**来源**: `origin/REDALERT/BULLET.H`, Line 43-103

| 字段 | 类型 | TS 映射 | 说明 |
|------|------|---------|------|
| `Class` | `CCPtr<BulletTypeClass>` | `definition: BulletDefinition` | 弹体类型 |
| `Payback` | `TechnoClass*` | `source: GameEntity` | 发射者 |
| `PrimaryFacing` | `FacingClass` | `facing: number` | 飞行朝向（0-255） |
| `TarCom` | `TARGET` | `target: Target` | 目标 |
| `Strength` | `int` | `strength: number` | 当前伤害值 |
| `Warhead` | `WarheadType` | `warhead: WarheadType` | 弹头 |
| `MaxSpeed` | `int` | `maxSpeed: number` | 实际速度 |
| `Height` | `int` | `height: number` | 当前高度（leptons） |
| `Riser` | `int` | `riser: number` | 垂直速度（弧线弹） |
| `IsFalling` | `bool` | `isFalling: boolean` | 是否在下落阶段 |
| `IsInaccurate` | `bool` | `isInaccurate: boolean` | 是否偏移目标 |

---

#### 弹道路径类型

**来源**: `origin/REDALERT/BULLET.CPP`, Line 342-498 (`AI`), Line 700-820 (`Unlimbo`)

C++ 中通过 `BulletTypeClass` 的标志组合决定弹道路径：

| 路径类型 | 条件 | 运动特征 | TS 实现要点 |
|---------|------|---------|------------|
| **Arcing（弹道弧线）** | `IsArcing = true` | 抛物线：初始 `Height = 1`，`Riser` 根据距离和重力计算，到达顶点后下落 | 使用抛体运动公式 `y = v0·t - 0.5·g·t²` |
| **Dropping（垂直下落）** | `IsDropping = true` | 从 `FLIGHT_LEVEL` 高度垂直下落，无视墙体碰撞 | 直接设置目标 XY，Z 轴线性递减 |
| **Homing（制导）** | `ROT != 0` | 每帧调整朝向目标，`PrimaryFacing.Set_Desired(Direction256(Coord, Target))` | 每帧重新计算朝向，Babylon.js 用 `lookAt` |
| **Straight（直线）** | `ROT == 0 && !IsDropping` | 固定朝向直线飞行 | 匀速直线运动 |

**弧线弹初始参数计算**（BULLET.CPP:770-802）：

```typescript
// 速度随距离增加
speed = maxSpeed + (distanceToTarget / 32);
speed = Math.max(speed, 25);

// 垂直初速度
riser = ((distanceToTarget / 2) / (speed + 1)) * gravity;
riser = Math.max(riser, 10);
```

---

#### 散射（Inaccuracy）算法

**来源**: `origin/REDALERT/BULLET.CPP`, Line 723-744

触发条件：`IsInaccurate` 为真，或目标为步兵/格子且弹头为 `WARHEAD_AP` 或 `IsFueled`。

- **弧线弹 / 低速弹**：CEP（Circular Error Probable）算法
  ```typescript
  scatterDist = Math.min(Math.max(distanceToTarget / 16 - 0x0040, 0), rule.homingScatter);
  facing += Random(-5, +5);
  targetCoord = scatter(targetCoord, Random(0, scatterDist));
  ```
- **高速直线弹**：过冲算法
  ```typescript
  scatterDist = Math.min(Math.max(distanceToTarget / 16 - 0x0040, 0), rule.ballisticScatter);
  targetCoord = move(targetCoord, facing, Random(0, scatterDist));
  ```

---

#### FlyClass::Physics 移动逻辑

**来源**: `origin/REDALERT/FLY.CPP`, Line 59-103

```typescript
/**
 * 执行向量物理移动
 * Source: REDALERT/FLY.CPP, Line 59
 * Original: ImpactType FlyClass::Physics(COORDINATE & coord, DirType facing)
 */
function physics(
  coord: Coordinate,
  facing: number,
  speedAdd: number,
  speedAccum: number
): { coord: Coordinate; impact: ImpactType; speedAccum: number } {
  if (speedAdd === MPH_IMMOBILE) {
    return { coord, impact: ImpactType.NONE, speedAccum };
  }

  const actual = speedAdd + speedAccum;
  const quotient = Math.floor(actual / PIXEL_LEPTON_W);  // 每像素 24 leptons
  const remainder = actual % PIXEL_LEPTON_W;

  if (quotient === 0) {
    return { coord, impact: ImpactType.NONE, speedAccum: remainder };
  }

  const newCoord = coordMove(coord, facing, actual - remainder);
  if (newCoord === coord) {
    return { coord, impact: ImpactType.NONE, speedAccum: remainder };
  }

  // 边界检测
  if (newCoord & HIGH_COORD_MASK) {
    return { coord: oldCoord, impact: ImpactType.EDGE, speedAccum: remainder };
  }

  return { coord: newCoord, impact: ImpactType.NORMAL, speedAccum: remainder };
}
```

---

#### BulletClass::AI 每帧流程

**来源**: `origin/REDALERT/BULLET.CPP`, Line 342-498

```typescript
/**
 * 弹体每帧逻辑
 * Source: REDALERT/BULLET.CPP, Line 342
 * Original: void BulletClass::AI(void)
 */
tick(): void {
  // 1. 弧线弹未进入下落前强制爆炸标记
  let forced = (definition.isArcing || definition.isDropping) && !this.isFalling;

  // 2. 制导弹每帧调整朝向（隔帧执行，降低精度也降低 CPU 消耗）
  if ((gameFrame & 0x01) && definition.rot !== 0 && targetLegal) {
    this.desiredFacing = direction256(this.coord, targetCoord);
  }

  // 3. 平滑旋转
  if (this.isRotating) {
    this.adjustRotation(definition.rot);
  }

  // 4. 物理移动
  const { coord: newCoord, impact } = physics(this.coord, this.facing);

  switch (impact) {
    case ImpactType.EDGE:
      // 飞出地图边界，直接删除
      this.deleteProjectile();
      break;

    case ImpactType.NORMAL:
    case ImpactType.NONE:
      this.coord = newCoord;

      // 5. 检查强制爆炸（撞墙等）
      if (!forced) forced = this.isForcedToExplode(this.coord);

      // 6. 引信检查或直接下落弹
      if (!forced && (definition.isDropping || !this.fuseCheckup(this.coord))) {
        // 衰减弹每帧减 1 伤害
        if (definition.isDegenerate && this.strength > 5) {
          this.strength--;
        }
      } else {
        this.explode(forced);
        this.deleteProjectile();
      }
      break;
  }
}
```

---

#### Bullet_Explodes 爆炸流程

**来源**: `origin/REDALERT/BULLET.CPP`, Line 987-1027

```typescript
/**
 * 弹体爆炸处理
 * Source: REDALERT/BULLET.CPP, Line 987
 * Original: void BulletClass::Bullet_Explodes(bool forced)
 */
explode(forced: boolean): void {
  // 非弧线非制导弹：坐标对齐到目标位置（补偿直线飞行误差）
  if (!forced && !definition.isArcing && definition.rot === 0 && fuseTarget) {
    this.coord = fuseTargetCoord;
  }

  // 对地 / 对空伤害分支
  if (!isAircraftTarget || aircraft.layer === Layer.GROUND) {
    explosionDamage(this.coord, this.strength, this.source, this.warhead);
  } else {
    // SAM 导弹对空特殊处理：近距离直接伤害
    if (distanceToTarget < 0x0080) {
      target.takeDamage(this.strength, 0, this.warhead, this.source);
    }
  }

  // 不可见弹体允许爆炸动画小幅偏移
  if (definition.isInvisible) {
    this.coord = scatter(this.coord, 0x0020);
  }

  // 播放爆炸动画
  const anim = combatAnim(this.strength, this.warhead, landType);
  playAnimation(anim, this.coord);
}
```

---

#### TS 类设计草案

```typescript
// src/game/combat/ProjectileSystem.ts
export enum ImpactType {
  NONE = 0,
  NORMAL = 1,
  EDGE = 2
}

export interface BulletDefinition {
  isHigh: boolean;
  isArcing: boolean;
  isDropping: boolean;
  isInvisible: boolean;
  isFlameEquipped: boolean;
  isFueled: boolean;
  isInaccurate: boolean;
  isDegenerate: boolean;
  isAntiAircraft: boolean;
  isAntiGround: boolean;
  rot: number;          // 转向速率
  arming: number;       // 引信延迟
}

export class GameProjectile {
  definition: BulletDefinition;
  source: GameEntity;
  target: Target;
  coord: Coordinate;
  facing: number;
  strength: number;
  warhead: WarheadType;
  maxSpeed: number;
  height: number;
  riser: number;
  isFalling: boolean;

  tick(): void { /* AI 逻辑 */ }
  explode(forced: boolean): void { /* 爆炸逻辑 */ }

  // 渲染由 Babylon.js 场景节点处理
  mesh?: BABYLON.Mesh;
}
```

---

## 2. 数值与常量映射表

### 2.1 装甲类型（ArmorType）

> **来源**: `origin/REDALERT/DEFINES.H`, Line ~2758

| C++ 枚举 | 值 | TS 枚举 | 典型适用 |
|---------|----|---------|---------|
| `ARMOR_NONE` | 0 | `ArmorType.NONE` | 步兵、无装甲单位 |
| `ARMOR_WOOD` | 1 | `ArmorType.WOOD` | 木质结构、轻型载具 |
| `ARMOR_ALUMINUM` | 2 | `ArmorType.ALUMINUM` | 飞机、直升机 |
| `ARMOR_STEEL` | 3 | `ArmorType.STEEL` | 坦克、装甲载具 |
| `ARMOR_CONCRETE` | 4 | `ArmorType.CONCRETE` | 混凝土建筑、防御工事 |

`ARMOR_COUNT = 5`。`WarheadTypeClass.Modifier` 数组长度为 5，下标直接对应该枚举值。**注意**：早期占位符中的 `LIGHT` / `MEDIUM` / `HEAVY` 不存在于 RA 源码，实际装甲分级为 `WOOD` / `ALUMINUM` / `STEEL`。

---

### 2.2 弹头类型（WarheadType）与伤害计算

> **Task 0.5 提取记录**（2026-05-10）  
> **来源文件**: `origin/REDALERT/WARHEAD.H`, `origin/REDALERT/WARHEAD.CPP`, `origin/REDALERT/COMBAT.CPP`

#### WarheadTypeClass 结构

| 字段 | 类型 | 来源文件 | 行号 | TS 映射 | 说明 |
|------|------|----------|------|---------|------|
| `Modifier[ARMOR_COUNT]` | `fixed[5]` | WARHEAD.H | 102 | `modifiers: number[]` | 对 5 种装甲的伤害倍率，默认值全为 `1` |
| `SpreadFactor` | `int` | WARHEAD.H | 76 | `spreadFactor: number` | 距离衰减因子，默认 `1`，越大衰减越慢；`0` 表示极快衰减 |
| `IsWallDestroyer` | `bool:1` | WARHEAD.H | 81 | `isWallDestroyer: boolean` | 能否摧毁墙体 |
| `IsWoodDestroyer` | `bool:1` | WARHEAD.H | 86 | `isWoodDestroyer: boolean` | 能否摧毁木质墙体 |
| `IsTiberiumDestroyer` | `bool:1` | WARHEAD.H | 91 | `isTiberiumDestroyer: boolean` | 是否伤害泰伯利亚 |
| `IsOrganic` | `bool:1` | WARHEAD.H | 96 | `isOrganic: boolean` | 是否只对步兵有效 |
| `ExplosionSet` | `int` | WARHEAD.H | 107 | `explosionSet: number` | 爆炸动画组 (`1`–`6`) |
| `InfantryDeath` | `int` | WARHEAD.H | 113 | `infantryDeath: number` | 步兵死亡动画类型 |

INI 覆盖：`Verses=` 字符串格式如 `"100%,100%,100%,100%,100%"` 对应 5 种装甲倍率（WARHEAD.CPP:66-80）。百分比转换为 `fixed` 定点数（`100% = 1.0`）。

#### Modify_Damage 伤害公式

**来源**: `origin/REDALERT/COMBAT.CPP`, Line 69-126

```typescript
/**
 * 计算实际伤害值
 * Source: REDALERT/COMBAT.CPP, Line 69
 * Original: int Modify_Damage(int damage, WarheadType warhead, ArmorType armor, int distance)
 */
function modifyDamage(
  rawDamage: number,
  warhead: WarheadTypeClass,
  armor: ArmorType,
  distance: number  // 单位：lepton
): number {
  if (rawDamage === 0 || warhead.id === WarheadType.NONE) return 0;

  // 负伤害（治疗）仅在极近距离对特定装甲生效
  if (rawDamage < 0) {
    // CS 扩展：WARHEAD_MECHANICAL 只治疗有装甲单位，其他只治疗无装甲
    if (distance < 0x008) {
      if (warhead.id !== WarheadType.MECHANICAL && armor === ArmorType.NONE) return rawDamage;
      if (warhead.id === WarheadType.MECHANICAL && armor !== ArmorType.NONE) return rawDamage;
    }
    return 0;
  }

  // 1. 装甲倍率修正（C++ 中为 fixed point 乘法）
  let damage = rawDamage * warhead.modifiers[armor];

  // 2. 距离衰减
  if (damage !== 0) {
    const PIXEL_LEPTON_W = 24;  // 1 像素 = 24 leptons

    if (warhead.spreadFactor === 0) {
      distance /= PIXEL_LEPTON_W / 4;  // distance /= 6
    } else {
      distance /= warhead.spreadFactor * (PIXEL_LEPTON_W / 2);  // distance /= spreadFactor * 12
    }

    distance = Math.max(0, Math.min(distance, 16));

    if (distance > 0) {
      damage = Math.floor(damage / distance);
    }

    // 近距离保底伤害（距离 < 4 时至少造成 MinDamage）
    if (distance < 4) {
      damage = Math.max(damage, gameRules.minDamage);
    }
  }

  // 3. 上限截断
  damage = Math.min(damage, gameRules.maxDamage);

  return Math.floor(damage);
}
```

#### Explosion_Damage 范围伤害

**来源**: `origin/REDALERT/COMBAT.CPP`, Line 159-269

- **影响半径**：`range = ICON_LEPTON_W + (ICON_LEPTON_W >> 1)` ≈ 1.5 cells（36 leptons）
- **收集范围**：中心格 + 8 个相邻格的所有对象（最多 32 个）
- **建筑特殊规则**：命中建筑占用的任意一格，视为直接命中该建筑中心（`distance = 0`）
- **墙体伤害**：若 `IsWallDestroyer` 或 (`IsWoodDestroyer` && 墙为木质)，调用 `Reduce_Wall(strength)`
- **泰伯利亚**：若 `IsTiberiumDestroyer`，调用 `Reduce_Tiberium(strength / 10)`
- **桥梁**：若弹头为 `WARHEAD_AP` 或 `WARHEAD_HE`，且 `Random(1, Rule.BridgeStrength) < strength`，摧毁桥梁

#### Combat_Anim 爆炸动画选择

**来源**: `origin/REDALERT/COMBAT.CPP`, Line 293-364

根据 `ExplosionSet` (`1`–`6`) 和 `LandType` 选择动画：

| ExplosionSet | 说明 | 动画选择逻辑 |
|-------------|------|-------------|
| 1 | 小型 | `ANIM_PIFF` |
| 2 | 轻武器 | `damage > 15 ? ANIM_PIFFPIFF : ANIM_PIFF` |
| 3 | 火焰 | 空中 → `ANIM_FLAK`；水面 → 水爆列表；陆地 → 火焰列表（napalm） |
| 4 | AP（穿甲） | 空中 → `ANIM_FLAK`；水面 → 水爆列表；陆地 → 穿甲碎片列表 |
| 5 | HE（高爆） | 空中 → `ANIM_FLAK`；水面 → 水爆列表；陆地 → 高爆碎片列表 |
| 6 | 核爆 | `ANIM_ATOM_BLAST` |

动画列表索引通过 `fixed(min(damage, cap), cap)` 按比例映射到数组长度。

### 2.3 全局规则常量（RULES.CPP / RULES.H）

> **Task 0.3 提取记录**（2026-05-10）

**来源文件**：`origin/REDALERT/RULES.H`（类声明） / `origin/REDALERT/RULES.CPP`（默认值，Line 95~272）

`RulesClass` 是全局单例（`Rule`），所有游戏行为控制常量均从此读取。INI 文件（`RULES.INI`）可在运行时覆盖这些默认值。

---

#### 构造函数默认值对照表

| 常量 | C++ 默认值 | 来源行号 | TS 映射 | 说明 |
|------|-----------|---------|---------|------|
| **AI 行为** |
| `AttackInterval` | `3` | RULES.CPP:97 | `aiAttackInterval: number` | 电脑攻击间隔（分钟） |
| `AttackDelay` | `5` | RULES.CPP:98 | `aiAttackDelay: number` | 首次攻击延迟（分钟） |
| `PowerEmergencyFraction` | `fixed::_3_4` (0.75) | RULES.CPP:99 | `powerEmergencyFraction: number` | 电力紧急阈值比例 |
| `BaseDefenseDelay` | `fixed::_1_4` (0.25) | RULES.CPP:171 | `baseDefenseDelay: number` | 基地防御响应延迟（分钟） |
| `AutocreateTime` | `5` | RULES.CPP:176 | `autocreateTime: number` | 自动编队间隔（分钟） |
| `BaseSizeAdd` | `3` | RULES.CPP:117 | `baseSizeAdd: number` | AI 基地规模 surplus |
| `PowerSurplus` | `50` | RULES.CPP:118 | `powerSurplus: number` | AI 建造电厂的电力盈余阈值 |
| `InfantryReserve` | `2000` | RULES.CPP:119 | `infantryReserve: number` | AI 造兵资金储备阈值 |
| `InfantryBaseMult` | `2` | RULES.CPP:120 | `infantryBaseMult: number` | 步兵数量 = 建筑数 × 此倍数 |
| `SuspendPriority` | `20` | RULES.CPP:172 | `suspendPriority: number` | 队伍暂停优先级阈值 |
| `SuspendDelay` | `2` | RULES.CPP:173 | `suspendDelay: number` | 队伍暂停延迟（分钟） |
| `PatrolTime` | `".016"` | RULES.CPP:126 | `patrolTime: number` | 巡逻目标扫描间隔（分钟） |
| `TeamDelay` | `".6"` | RULES.CPP:127 | `teamDelay: number` | 队伍创建检查间隔（分钟） |
| **建造比例/上限（AI）** |
| `AirstripRatio` | `".12"` | RULES.CPP:101 | `airstripRatio: number` | 机场占基地比例 |
| `AirstripLimit` | `5` | RULES.CPP:102 | `airstripLimit: number` | 机场数量上限 |
| `HelipadRatio` | `".12"` | RULES.CPP:103 | `helipadRatio: number` | 直升机坪比例 |
| `HelipadLimit` | `5` | RULES.CPP:104 | `helipadLimit: number` | 直升机坪上限 |
| `TeslaRatio` | `".16"` | RULES.CPP:105 | `teslaRatio: number` | 特斯拉线圈比例 |
| `TeslaLimit` | `10` | RULES.CPP:106 | `teslaLimit: number` | 特斯拉上限 |
| `AARatio` | `".14"` | RULES.CPP:107 | `aaRatio: number` | 防空建筑比例 |
| `AALimit` | `10` | RULES.CPP:108 | `aaLimit: number` | 防空上限 |
| `DefenseRatio` | `".5"` | RULES.CPP:109 | `defenseRatio: number` | 防御建筑比例 |
| `DefenseLimit` | `40` | RULES.CPP:110 | `defenseLimit: number` | 防御上限 |
| `WarRatio` | `".1"` | RULES.CPP:111 | `warRatio: number` | 战车工厂比例 |
| `WarLimit` | `2` | RULES.CPP:112 | `warLimit: number` | 战车工厂上限 |
| `BarracksRatio` | `".16"` | RULES.CPP:113 | `barracksRatio: number` | 兵营比例 |
| `BarracksLimit` | `2` | RULES.CPP:114 | `barracksLimit: number` | 兵营上限 |
| `RefineryRatio` | `".16"` | RULES.CPP:116 | `refineryRatio: number` | 精炼厂比例 |
| `RefineryLimit` | `4` | RULES.CPP:115 | `refineryLimit: number` | 精炼厂上限 |
| **IQ 等级控制** |
| `MaxIQ` | `5` | RULES.CPP:140 | `maxIQ: number` | 最大 IQ 等级 |
| `IQSuperWeapons` | `4` | RULES.CPP:141 | `iqSuperWeapons: number` | 自动使用超级武器 |
| `IQProduction` | `5` | RULES.CPP:142 | `iqProduction: number` | 自动控制生产 |
| `IQGuardArea` | `4` | RULES.CPP:143 | `iqGuardArea: number` | 默认区域守卫 |
| `IQRepairSell` | `3` | RULES.CPP:144 | `iqRepairSell: number` | 自动修复/出售 |
| `IQCrush` | `2` | RULES.CPP:145 | `iqCrush: number` | 自动碾压 |
| `IQScatter` | `3` | RULES.CPP:146 | `iqScatter: number` | 受威胁时散开 |
| `IQContentScan` | `4` | RULES.CPP:147 | `iqContentScan: number` | 扫描运输载具内容 |
| `IQAircraft` | `4` | RULES.CPP:148 | `iqAircraft: number` | 自动补充飞机 |
| `IQHarvester` | `3` | RULES.CPP:149 | `iqHarvester: number` | 自动补充矿车 |
| `IQSellBack` | `2` | RULES.CPP:150 | `iqSellBack: number` | 受损时出售建筑 |
| **修复参数** |
| `RepairStep` | `5` | RULES.CPP:224 | `repairStep: number` | 建筑每 Tick 修复生命 |
| `RepairPercent` | `fixed::_1_4` (0.25) | RULES.CPP:225 | `repairPercent: number` | 修复总花费 = 造价 × 此比例 |
| `URepairStep` | `5` | RULES.CPP:226 | `unitRepairStep: number` | 单位每 Tick 修复生命 |
| `URepairPercent` | `fixed::_1_4` (0.25) | RULES.CPP:227 | `unitRepairPercent: number` | 单位修复花费比例 |
| `RepairRate` | `".016"` | RULES.CPP:228 | `repairRate: number` | 修复间隔（分钟） |
| `RepairThreshhold` | `1000` | RULES.CPP:266 | `repairThreshhold: number` | AI 开始修复的资金门槛 |
| `PathDelay` | `".016"` | RULES.CPP:267 | `pathDelay: number` | 寻路失败重试延迟（分钟） |
| **状态颜色阈值** |
| `ConditionGreen` | `1` | RULES.CPP:229 | `conditionGreen: number` | 满血 = 绿色 |
| `ConditionYellow` | `fixed::_1_2` (0.5) | RULES.CPP:230 | `conditionYellow: number` | ≤50% = 黄色 |
| `ConditionRed` | `fixed::_1_4` (0.25) | RULES.CPP:231 | `conditionRed: number` | ≤25% = 红色 |
| **经济/矿石** |
| `BailCount` | `28` | RULES.CPP:233 | `bailCount: number` | 矿车最大负载次数 |
| `GoldValue` | `35` | RULES.CPP:234 | `goldValue: number` | 每车金矿价值 |
| `GemValue` | `110` | RULES.CPP:235 | `gemValue: number` | 每车宝石价值 |
| `GrowthRate` | `2` | RULES.CPP:201 | `growthRate: number` | 泰伯利亚生长间隔（分钟） |
| `OreDumpRate` | `2` | RULES.CPP:178 | `oreDumpRate: number` | 矿车卸货速度 |
| `SoloCrateMoney` | `2000` | RULES.CPP:123 | `soloCrateMoney: number` | 单人模式金钱箱金额 |
| `RefundPercent` | `fixed::_1_2` (0.5) | RULES.CPP:261 | `refundPercent: number` | 出售返还比例 |
| **超级武器/特殊** |
| `ChronoDuration` | `3` | RULES.CPP:121 | `chronoDuration: number` | 超时空传送持续时间（分钟） |
| `IronCurtainDuration` | `fixed::_1_2` (0.5) | RULES.CPP:262 | `ironCurtainDuration: number` | 铁幕持续时间（分钟） |
| `SonarTime` | `14` | RULES.CPP:206 | `sonarTime: number` | 声纳脉冲充能（分钟） |
| `ChronoTime` | `3` | RULES.CPP:207 | `chronoTime: number` | 超时空充能（分钟） |
| `ParaBombTime` | `14` | RULES.CPP:208 | `paraBombTime: number` | 伞炸弹充能（分钟） |
| `ParaInfantryTime` | `2` | RULES.CPP:209 | `paraInfantryTime: number` | 伞兵充能（分钟） |
| `SpyTime` | `2` | RULES.CPP:211 | `spyTime: number` | 间谍飞机充能（分钟） |
| `IronCurtainTime` | `14` | RULES.CPP:212 | `ironCurtainTime: number` | 铁幕充能（分钟） |
| `GPSTime` | `1` | RULES.CPP:213 | `gpsTime: number` | GPS 充能（分钟） |
| `NukeTime` | `14` | RULES.CPP:214 | `nukeTime: number` | 核弹充能（分钟） |
| `AtomDamage` | `1000` | RULES.CPP:179 | `atomDamage: number` | 原子弹伤害（单人模式） |
| `C4Delay` | `".03"` | RULES.CPP:265 | `c4Delay: number` | C4 炸弹引爆延迟（分钟） |
| **战场效果** |
| `ExplosionSpread` | `fixed::_1_2` (0.5) | RULES.CPP:135 | `explosionSpread: number` | 爆炸伤害扩散系数 |
| `SupressRadius` | `CELL_LEPTON_W` | RULES.CPP:136 | `supressRadius: number` | 友军建筑附近停火半径 |
| `VortexRange` | `10*CELL_LEPTON_W` | RULES.CPP:131 | `vortexRange: number` | 时空漩涡半径 |
| `VortexSpeed` | `10` | RULES.CPP:132 | `vortexSpeed: number` | 时空漩涡速度 |
| `VortexDamage` | `200` | RULES.CPP:133 | `vortexDamage: number` | 时空漩涡伤害 |
| `VortexChance` | `".2"` | RULES.CPP:134 | `vortexChance: number` | 时空漩涡触发概率 |
| `QuakeDamagePercent` | `".33"` | RULES.CPP:199 | `quakeDamagePercent: number` | 时间震荡伤害比例 |
| `QuakeChance` | `".2"` | RULES.CPP:200 | `quakeChance: number` | 时间震荡触发概率 |
| `ProneDamageBias` | `fixed::_1_2` (0.5) | RULES.CPP:198 | `proneDamageBias: number` | 匍匐/逃跑状态伤害减免 |
| `Gravity` | `3` | RULES.CPP:217 | `gravity: number` | 弹道重力常数 |
| `Incoming` | `MPH_IMMOBILE` | RULES.CPP:221 | `incoming: number` | 弹道低于此速度目标会散开 |
| `MinDamage` | `1` | RULES.CPP:222 | `minDamage: number` | 最小伤害 |
| `MaxDamage` | `1000` | RULES.CPP:223 | `maxDamage: number` | 最大伤害 |
| **迷雾/扫描** |
| `ShroudRate` | `4` | RULES.CPP:202 | `shroudRate: number` | 迷雾再生间隔（分钟） |
| `GapShroudRadius` | `10` | RULES.CPP:218 | `gapShroudRadius: number` | Gap 生成器遮蔽半径（格） |
| `GapRegenInterval` | `".1"` | RULES.CPP:219 | `gapRegenInterval: number` | Gap 遮蔽刷新间隔（分钟） |
| `RadarJamRadius` | `10*CELL_LEPTON_W` | RULES.CPP:220 | `radarJamRadius: number` | 雷达干扰半径 |
| `TiberiumShortScan` | `0x0600` | RULES.CPP:269 | `tiberiumShortScan: number` | 矿车近程扫描（leptons） |
| `TiberiumLongScan` | `0x2000` | RULES.CPP:270 | `tiberiumLongScan: number` | 矿车远程扫描（leptons） |
| **距离阈值** |
| `CloseEnoughDistance` | `0x0280` | RULES.CPP:255 | `closeEnoughDistance: number` | 被阻时"足够近"判定距离 |
| `StrayDistance` | `0x0200` | RULES.CPP:256 | `strayDistance: number` | 队伍成员散开距离 |
| `CrushDistance` | `0x0180` | RULES.CPP:257 | `crushDistance: number` | 尝试碾压判定距离 |
| `CrateRadius` | `0x0280` | RULES.CPP:258 | `crateRadius: number` | 箱子效果影响半径 |
| `HomingScatter` | `0x0200` | RULES.CPP:259 | `homingScatter: number` | 制导导弹散布 |
| `BallisticScatter` | `0x0100` | RULES.CPP:260 | `ballisticScatter: number` | 弹道武器散布 |
| **地雷** |
| `AVMineDamage` | `1200` | RULES.CPP:168 | `avMineDamage: number` | 反载具地雷伤害 |
| `APMineDamage` | `1000` | RULES.CPP:169 | `apMineDamage: number` | 反步兵地雷伤害 |
| **多人默认** |
| `MPDefaultMoney` | `3000` | RULES.CPP:157 | `mpDefaultMoney: number` | 默认初始资金 |
| `MPMaxMoney` | `10000` | RULES.CPP:158 | `mpMaxMoney: number` | 最大初始资金 |
| `DropZoneRadius` | `4*CELL_LEPTON_W` | RULES.CPP:165 | `dropZoneRadius: number` | 空投区揭示半径 |
| `MessageDelay` | `".6"` | RULES.CPP:166 | `messageDelay: number` | 消息停留时间（分钟） |
| `MaxPlayers` | `8` | RULES.CPP:170 | `maxPlayers: number` | 最大玩家数 |
| **堆上限** |
| `AircraftMax` | `100` | RULES.CPP:236 | `aircraftMax: number` | 飞机最大数量 |
| `BuildingMax` | `500` | RULES.CPP:238 | `buildingMax: number` | 建筑最大数量 |
| `InfantryMax` | `500` | RULES.CPP:241 | `infantryMax: number` | 步兵最大数量 |
| `UnitMax` | `500` | RULES.CPP:249 | `unitMax: number` | 载具最大数量 |
| `BulletMax` | `40` | RULES.CPP:239 | `bulletMax: number` | 子弹最大数量 |
| `FactoryMax` | `20` | RULES.CPP:240 | `factoryMax: number` | 工厂最大数量 |
| **布尔开关** |
| `IsComputerParanoid` | `true` | RULES.CPP:180 | `isComputerParanoid: boolean` | 电脑玩家结盟 |
| `IsFlashLowPower` | `true` | RULES.CPP:182 | `isFlashLowPower: boolean` | 低电力闪烁提示 |
| `IsAllyReveal` | `true` | RULES.CPP:187 | `isAllyReveal: boolean` | 盟友间基地互见 |
| `IsMineAware` | `true` | RULES.CPP:190 | `isMineAware: boolean` | 友军自动识别地雷 |
| `IsTGrowth` | `true` | RULES.CPP:191 | `isTiberiumGrowth: boolean` | 泰伯利亚生长 |
| `IsTSpread` | `true` | RULES.CPP:192 | `isTiberiumSpread: boolean` | 泰伯利亚扩散 |
| `IsChronoKill` | `true` | RULES.CPP:197 | `isChronoKill: boolean` | 超时空杀死乘员 |
| `IsExplosiveHarvester` | `false` | RULES.CPP:185 | `isExplosiveHarvester: boolean` | 矿车携带矿石时爆炸 |
| `IsMCVDeploy` | `false` | RULES.CPP:186 | `isMCVDeploy: boolean` | MCV 可收起 |
| `IsSeparate` | `false` | RULES.CPP:188 | `isSeparateAircraft: boolean` | 飞机与停机坪分开购买 |
| `IsAutoCrush` | `false` | RULES.CPP:194 | `isAutoCrush: boolean` | 玩家自动碾压 |
| `IsSmartDefense` | `false` | RULES.CPP:195 | `isSmartDefense: boolean` | 玩家自动反击 |
| `IsScatter` | `false` | RULES.CPP:196 | `isScatter: boolean` | 玩家自动散开 |
| `IsCurleyShuffle` | `false` | RULES.CPP:181 | `isCurleyShuffle: boolean` | 直升机开火后位移 |
| `IsCompEasyBonus` | `true` | RULES.CPP:183 | `isCompEasyBonus: boolean` | 多人时电脑降难度 |
| `IsFineDifficulty` | `false` | RULES.CPP:184 | `isFineDifficulty: boolean` | 精细难度控制（5档） |
| **显示** |
| `HealthBarDisplayMode` | `HB_SELECTED` (0) | RULES.CPP:271 | `healthBarMode: number` | 0=受损显示, 1=始终, 2=选中 |
| `ResourceBarDisplayMode` | `RB_SELECTED` (0) | RULES.CPP:272 | `resourceBarMode: number` | 0=选中, 1=始终 |
| `RandomAnimateTime` | `".083"` | RULES.CPP:232 | `randomAnimateTime: number` | 步兵随机 idle 动画间隔 |
| `BuildupTime` | `".05"` | RULES.CPP:177 | `buildupTime: number` | 建筑建造动画时长（分钟） |
| `BuildSpeedBias` | `1` | RULES.CPP:264 | `buildSpeedBias: number` | 全局建造速度倍率 |
| `SpeakDelay` | `2` | RULES.CPP:215 | `speakDelay: number` | 语音播放最小间隔（分钟） |
| `DamageDelay` | `1` | RULES.CPP:216 | `damageDelay: number` | 伤害数字显示间隔（分钟） |
| `TimerWarning` | `2` | RULES.CPP:204 | `timerWarning: number` | 计时器变红阈值（分钟） |
| `CrateTime` | `10` | RULES.CPP:203 | `crateTime: number` | 箱子生成间隔（分钟） |
| `ChronoTechLevel` | `1` | RULES.CPP:205 | `chronoTechLevel: number` | 超时空科技等级 |
| **难度修正（DifficultyClass）** |
| `FirepowerBias` | `1` | Difficulty_Get:314 | `diffFirepowerBias: number` | 火力倍率 |
| `GroundspeedBias` | `1` | Difficulty_Get:315 | `diffGroundSpeedBias: number` | 地面速度倍率 |
| `AirspeedBias` | `1` | Difficulty_Get:316 | `diffAirSpeedBias: number` | 空中速度倍率 |
| `ArmorBias` | `1` | Difficulty_Get:317 | `diffArmorBias: number` | 装甲倍率 |
| `ROFBias` | `1` | Difficulty_Get:318 | `diffROFBias: number` | 射速倍率 |
| `CostBias` | `1` | Difficulty_Get:319 | `diffCostBias: number` | 造价倍率 |
| `BuildSpeedBias` | `1` | Difficulty_Get:323 | `diffBuildSpeedBias: number` | 建造速度倍率 |
| `RepairDelay` | `".02"` | Difficulty_Get:320 | `diffRepairDelay: number` | 修复延迟（分钟） |
| `BuildDelay` | `".03"` | Difficulty_Get:321 | `diffBuildDelay: number` | 建造延迟（分钟） |
| `IsBuildSlowdown` | `false` | Difficulty_Get:322 | `diffBuildSlowdown: boolean` | 建造减速 |
| `IsWallDestroyer` | `true` | Difficulty_Get:324 | `diffWallDestroyer: boolean` | 可摧毁围墙 |
| `IsContentScan` | `false` | Difficulty_Get:325 | `diffContentScan: boolean` | 扫描运输内容 |

---

#### TypeScript 映射

```typescript
// src/game/rules/GameRules.ts

/**
 * 对应 C++ RulesClass（RULES.H, Line 60 / RULES.CPP, Line 95）
 * 所有数值与 C++ 构造函数默认值一致
 */
export interface GameRules {
    // --- AI 行为 ---
    readonly aiAttackInterval: number;        // 3
    readonly aiAttackDelay: number;           // 5
    readonly powerEmergencyFraction: number;  // 0.75
    readonly baseDefenseDelay: number;        // 0.25
    readonly autocreateTime: number;          // 5
    readonly baseSizeAdd: number;             // 3
    readonly powerSurplus: number;            // 50
    readonly infantryReserve: number;         // 2000
    readonly infantryBaseMult: number;        // 2
    readonly suspendPriority: number;         // 20
    readonly suspendDelay: number;            // 2
    readonly patrolTime: number;              // 0.016
    readonly teamDelay: number;               // 0.6

    // --- 建造比例/上限 ---
    readonly airstripRatio: number;   // 0.12
    readonly airstripLimit: number;  // 5
    readonly helipadRatio: number;   // 0.12
    readonly helipadLimit: number;   // 5
    readonly teslaRatio: number;     // 0.16
    readonly teslaLimit: number;     // 10
    readonly aaRatio: number;        // 0.14
    readonly aaLimit: number;        // 10
    readonly defenseRatio: number;   // 0.5
    readonly defenseLimit: number;   // 40
    readonly warRatio: number;       // 0.1
    readonly warLimit: number;       // 2
    readonly barracksRatio: number;  // 0.16
    readonly barracksLimit: number;  // 2
    readonly refineryRatio: number;  // 0.16
    readonly refineryLimit: number;  // 4

    // --- IQ 等级 ---
    readonly maxIQ: number;           // 5
    readonly iqSuperWeapons: number;  // 4
    readonly iqProduction: number;    // 5
    readonly iqGuardArea: number;     // 4
    readonly iqRepairSell: number;    // 3
    readonly iqCrush: number;         // 2
    readonly iqScatter: number;       // 3
    readonly iqContentScan: number;   // 4
    readonly iqAircraft: number;      // 4
    readonly iqHarvester: number;     // 3
    readonly iqSellBack: number;      // 2

    // --- 修复参数 ---
    readonly repairStep: number;        // 5
    readonly repairPercent: number;     // 0.25
    readonly unitRepairStep: number;    // 5
    readonly unitRepairPercent: number; // 0.25
    readonly repairRate: number;        // 0.016
    readonly repairThreshhold: number;  // 1000
    readonly pathDelay: number;         // 0.016

    // --- 状态颜色 ---
    readonly conditionGreen: number;   // 1.0
    readonly conditionYellow: number;  // 0.5
    readonly conditionRed: number;     // 0.25

    // --- 经济 ---
    readonly bailCount: number;       // 28
    readonly goldValue: number;       // 35
    readonly gemValue: number;        // 110
    readonly growthRate: number;      // 2
    readonly oreDumpRate: number;     // 2
    readonly soloCrateMoney: number;  // 2000
    readonly refundPercent: number;   // 0.5

    // --- 超级武器 ---
    readonly chronoDuration: number;      // 3
    readonly ironCurtainDuration: number; // 0.5
    readonly sonarTime: number;          // 14
    readonly chronoTime: number;         // 3
    readonly paraBombTime: number;       // 14
    readonly paraInfantryTime: number;   // 2
    readonly spyTime: number;            // 2
    readonly ironCurtainTime: number;    // 14
    readonly gpsTime: number;            // 1
    readonly nukeTime: number;           // 14
    readonly atomDamage: number;         // 1000
    readonly c4Delay: number;            // 0.03

    // --- 战场效果 ---
    readonly explosionSpread: number;     // 0.5
    readonly supressRadius: number;       // CELL_LEPTON_W (256)
    readonly vortexRange: number;         // 2560 (10 cells)
    readonly vortexSpeed: number;         // 10
    readonly vortexDamage: number;        // 200
    readonly vortexChance: number;        // 0.2
    readonly quakeDamagePercent: number;  // 0.33
    readonly quakeChance: number;         // 0.2
    readonly proneDamageBias: number;     // 0.5
    readonly gravity: number;             // 3
    readonly incoming: number;            // MPH_IMMOBILE
    readonly minDamage: number;           // 1
    readonly maxDamage: number;           // 1000

    // --- 迷雾 ---
    readonly shroudRate: number;           // 4
    readonly gapShroudRadius: number;      // 10
    readonly gapRegenInterval: number;     // 0.1
    readonly radarJamRadius: number;       // 2560 (10 cells)
    readonly tiberiumShortScan: number;    // 0x0600 (1536)
    readonly tiberiumLongScan: number;     // 0x2000 (8192)

    // --- 距离 ---
    readonly closeEnoughDistance: number;  // 0x0280 (640)
    readonly strayDistance: number;        // 0x0200 (512)
    readonly crushDistance: number;        // 0x0180 (384)
    readonly crateRadius: number;          // 0x0280 (640)
    readonly homingScatter: number;        // 0x0200 (512)
    readonly ballisticScatter: number;     // 0x0100 (256)

    // --- 地雷 ---
    readonly avMineDamage: number;  // 1200
    readonly apMineDamage: number;  // 1000

    // --- 多人 ---
    readonly mpDefaultMoney: number;  // 3000
    readonly mpMaxMoney: number;      // 10000
    readonly dropZoneRadius: number;  // 1024 (4 cells)
    readonly messageDelay: number;    // 0.6
    readonly maxPlayers: number;      // 8

    // --- 堆上限 ---
    readonly aircraftMax: number;    // 100
    readonly buildingMax: number;    // 500
    readonly infantryMax: number;    // 500
    readonly unitMax: number;        // 500
    readonly bulletMax: number;      // 40
    readonly factoryMax: number;     // 20

    // --- 布尔开关 ---
    readonly isComputerParanoid: boolean;     // true
    readonly isFlashLowPower: boolean;        // true
    readonly isAllyReveal: boolean;           // true
    readonly isMineAware: boolean;            // true
    readonly isTiberiumGrowth: boolean;       // true
    readonly isTiberiumSpread: boolean;       // true
    readonly isChronoKill: boolean;           // true
    readonly isExplosiveHarvester: boolean;   // false
    readonly isMCVDeploy: boolean;            // false
    readonly isSeparateAircraft: boolean;     // false
    readonly isAutoCrush: boolean;            // false
    readonly isSmartDefense: boolean;         // false
    readonly isScatter: boolean;              // false
    readonly isCurleyShuffle: boolean;        // false
    readonly isCompEasyBonus: boolean;        // true
    readonly isFineDifficulty: boolean;       // false

    // --- 显示 ---
    readonly healthBarMode: number;        // 0 = HB_SELECTED
    readonly resourceBarMode: number;      // 0 = RB_SELECTED
    readonly randomAnimateTime: number;    // 0.083
    readonly buildupTime: number;          // 0.05
    readonly buildSpeedBias: number;       // 1
    readonly speakDelay: number;           // 2
    readonly damageDelay: number;          // 1
    readonly timerWarning: number;         // 2
    readonly crateTime: number;            // 10
    readonly chronoTechLevel: number;      // 1
}

export const DEFAULT_GAME_RULES: GameRules = {
    aiAttackInterval: 3,
    aiAttackDelay: 5,
    powerEmergencyFraction: 0.75,
    baseDefenseDelay: 0.25,
    autocreateTime: 5,
    baseSizeAdd: 3,
    powerSurplus: 50,
    infantryReserve: 2000,
    infantryBaseMult: 2,
    suspendPriority: 20,
    suspendDelay: 2,
    patrolTime: 0.016,
    teamDelay: 0.6,
    airstripRatio: 0.12,
    airstripLimit: 5,
    helipadRatio: 0.12,
    helipadLimit: 5,
    teslaRatio: 0.16,
    teslaLimit: 10,
    aaRatio: 0.14,
    aaLimit: 10,
    defenseRatio: 0.5,
    defenseLimit: 40,
    warRatio: 0.1,
    warLimit: 2,
    barracksRatio: 0.16,
    barracksLimit: 2,
    refineryRatio: 0.16,
    refineryLimit: 4,
    maxIQ: 5,
    iqSuperWeapons: 4,
    iqProduction: 5,
    iqGuardArea: 4,
    iqRepairSell: 3,
    iqCrush: 2,
    iqScatter: 3,
    iqContentScan: 4,
    iqAircraft: 4,
    iqHarvester: 3,
    iqSellBack: 2,
    repairStep: 5,
    repairPercent: 0.25,
    unitRepairStep: 5,
    unitRepairPercent: 0.25,
    repairRate: 0.016,
    repairThreshhold: 1000,
    pathDelay: 0.016,
    conditionGreen: 1.0,
    conditionYellow: 0.5,
    conditionRed: 0.25,
    bailCount: 28,
    goldValue: 35,
    gemValue: 110,
    growthRate: 2,
    oreDumpRate: 2,
    soloCrateMoney: 2000,
    refundPercent: 0.5,
    chronoDuration: 3,
    ironCurtainDuration: 0.5,
    sonarTime: 14,
    chronoTime: 3,
    paraBombTime: 14,
    paraInfantryTime: 2,
    spyTime: 2,
    ironCurtainTime: 14,
    gpsTime: 1,
    nukeTime: 14,
    atomDamage: 1000,
    c4Delay: 0.03,
    explosionSpread: 0.5,
    supressRadius: 256,
    vortexRange: 2560,
    vortexSpeed: 10,
    vortexDamage: 200,
    vortexChance: 0.2,
    quakeDamagePercent: 0.33,
    quakeChance: 0.2,
    proneDamageBias: 0.5,
    gravity: 3,
    incoming: 0, // MPH_IMMOBILE
    minDamage: 1,
    maxDamage: 1000,
    shroudRate: 4,
    gapShroudRadius: 10,
    gapRegenInterval: 0.1,
    radarJamRadius: 2560,
    tiberiumShortScan: 1536,
    tiberiumLongScan: 8192,
    closeEnoughDistance: 640,
    strayDistance: 512,
    crushDistance: 384,
    crateRadius: 640,
    homingScatter: 512,
    ballisticScatter: 256,
    avMineDamage: 1200,
    apMineDamage: 1000,
    mpDefaultMoney: 3000,
    mpMaxMoney: 10000,
    dropZoneRadius: 1024,
    messageDelay: 0.6,
    maxPlayers: 8,
    aircraftMax: 100,
    buildingMax: 500,
    infantryMax: 500,
    unitMax: 500,
    bulletMax: 40,
    factoryMax: 20,
    isComputerParanoid: true,
    isFlashLowPower: true,
    isAllyReveal: true,
    isMineAware: true,
    isTiberiumGrowth: true,
    isTiberiumSpread: true,
    isChronoKill: true,
    isExplosiveHarvester: false,
    isMCVDeploy: false,
    isSeparateAircraft: false,
    isAutoCrush: false,
    isSmartDefense: false,
    isScatter: false,
    isCurleyShuffle: false,
    isCompEasyBonus: true,
    isFineDifficulty: false,
    healthBarMode: 0,
    resourceBarMode: 0,
    randomAnimateTime: 0.083,
    buildupTime: 0.05,
    buildSpeedBias: 1,
    speakDelay: 2,
    damageDelay: 1,
    timerWarning: 2,
    crateTime: 10,
    chronoTechLevel: 1,
};
```

---

### 2.4 单位数值示例（从 UDATA.CPP / BDATA.CPP 提取）

> **注意**：完整单位/建筑定义需在 Task 11 时从 `UDATA.CPP` / `BDATA.CPP` 系统提取。以下为已验证示例。

```typescript
// src/game/rules/UnitDefinitions.ts
export const UNIT_DEFINITIONS: Record<string, UnitDefinition> = {
    'MEDIUM_TANK': {
        type: 'MEDIUM_TANK',
        speed: 8,                    // C++: Speed = 8 (UDATA.CPP)
        maxHealth: 400,              // C++: Strength = 400 (UDATA.CPP)
        armor: ArmorType.HEAVY,    // C++: Armor = ARMOR_HEAVY
        primaryWeapon: '105MM',      // C++: PrimaryWeapon = WEAPON_105MM
        secondaryWeapon: undefined,
        maxAmmo: 99,                 // C++: Ammo = 99（无限弹药标记）
        cost: 800,                   // C++: Cost = 800
        sight: 5,                    // C++: Sight = 5
        isInfantry: false
    },
    'HARVESTER': {
        type: 'HARVESTER',
        speed: 6,                    // C++: Speed = 6
        maxHealth: 600,
        armor: ArmorType.HEAVY,
        primaryWeapon: undefined,
        secondaryWeapon: undefined,
        maxAmmo: 0,
        cost: 1400,
        sight: 4,
        isInfantry: false
    },
    'E1': { // 步枪兵
        type: 'E1',
        speed: 4,                    // C++: Speed = 4
        maxHealth: 50,
        armor: ArmorType.NONE,
        primaryWeapon: 'M1CARBINE',  // C++: PrimaryWeapon = WEAPON_M1CARBINE
        secondaryWeapon: undefined,
        maxAmmo: 99,
        cost: 100,
        sight: 2,
        isInfantry: true
    }
};
```

---

## 3. 坐标系统与地形通行性映射

> **Task 0.4 提取记录**（2026-05-10）

### 3.1 坐标系统

C++ 使用三级坐标系统：**Cell 格子坐标** → **Lepton 子格子坐标** → **Pixel 像素坐标**。Babylon.js 使用 **Vector3 世界坐标**。

#### C++ 坐标结构

```cpp
// origin/REDALERT/DEFINES.H, Line 543
typedef unsigned long COORDINATE;  // 32位：CellX(8) + LeptonX(8) + CellY(8) + LeptonY(8)

typedef signed short CELL;         // 16位：X(8) + Y(8)

// origin/REDALERT/DISPLAY.H, Line 44-49
#define ICON_LEPTON_W     256      // 一个格子 = 256 leptons
#define ICON_LEPTON_H     256
#define CELL_LEPTON_W     ICON_LEPTON_W  // 256
#define CELL_LEPTON_H     ICON_LEPTON_H  // 256

// origin/REDALERT/DEFINES.H, Line 514-516
#define MAP_CELL_W        128      // 最大地图宽度（格子数）
#define MAP_CELL_H        128      // 最大地图高度（格子数）
#define MAP_CELL_TOTAL    (MAP_CELL_W * MAP_CELL_H)  // 16384
```

**坐标转换函数**：

| 函数 | 来源 | 说明 |
|------|------|------|
| `XY_Cell(x, y)` | INLINE.H:224 | 组合 X,Y → CELL |
| `Cell_X(cell)` | INLINE.H:336 | 提取 CELL 的 X 分量 |
| `Cell_Y(cell)` | INLINE.H:356 | 提取 CELL 的 Y 分量 |
| `Cell_Coord(cell)` | INLINE.H:449 | CELL → COORDINATE（格子中心） |
| `Coord_Cell(coord)` | COORD.CPP:69 | COORDINATE → CELL（取整） |
| `Coord_XCell(coord)` | INLINE.H:183 | 取 COORDINATE 的 Cell X |
| `Coord_YCell(coord)` | INLINE.H:203 | 取 COORDINATE 的 Cell Y |
| `Coord_Snap(coord)` | INLINE.H:462 | 强制对齐到格子中心 |

**TS 映射**：

```typescript
// src/game/terrain/TerrainGrid.ts

/**
 * 对应 C++ CELL（DEFINES.H, Line 557）
 * CELL = signed short, 高8位=X, 低8位=Y
 */
export interface Cell {
    x: number;  // 0 ~ 127 (MAP_CELL_W)
    y: number;  // 0 ~ 127 (MAP_CELL_H)
}

/**
 * 对应 C++ COORDINATE（DEFINES.H, Line 543）
 * COORDINATE = unsigned long, CellX(8) + LeptonX(8) + CellY(8) + LeptonY(8)
 * 
 * 在 TS 中简化为：cell + 子格子偏移(0~1)
 */
export interface Coordinate {
    cell: Cell;
    subX: number;  // 0.0 ~ 1.0, 对应 C++ LeptonX / 256
    subY: number;  // 0.0 ~ 1.0, 对应 C++ LeptonY / 256
}

export class TerrainGrid {
    /**
     * 对应 C++ CELL_LEPTON_W = 256 (DISPLAY.H, Line 48)
     * 1 个格子 = 256 leptons
     * 
     * AGENTS.md 预定 CELL_SIZE = 1.5（世界单位）
     * 1 lepton = 1.5 / 256 ≈ 0.00586 世界单位
     */
    static readonly CELL_SIZE = 1.5;
    static readonly LEPTON_PER_CELL = 256;
    static readonly MAX_MAP_WIDTH = 128;   // MAP_CELL_W
    static readonly MAX_MAP_HEIGHT = 128;  // MAP_CELL_H

    /**
     * 对应 C++ Cell_Coord() (INLINE.H, Line 449)
     * CELL → COORDINATE（格子中心）
     */
    static cellToWorld(cell: Cell): BABYLON.Vector3 {
        return new BABYLON.Vector3(
            cell.x * this.CELL_SIZE,
            0, // 地形高度后续从 heightmap 读取
            cell.y * this.CELL_SIZE
        );
    }

    /**
     * 对应 C++ Coord_Cell() (COORD.CPP, Line 69)
     * COORDINATE → CELL（取整）
     */
    static worldToCell(world: BABYLON.Vector3): Cell {
        return {
            x: Math.floor(world.x / this.CELL_SIZE),
            y: Math.floor(world.z / this.CELL_SIZE)
        };
    }

    /**
     * 对应 C++ XY_Cell() (INLINE.H, Line 224)
     */
    static xyCell(x: number, y: number): Cell {
        return { x, y };
    }

    /**
     * 对应 C++ Cell_X() / Cell_Y() (INLINE.H, Line 336/356)
     */
    static cellX(cell: Cell): number { return cell.x; }
    static cellY(cell: Cell): number { return cell.y; }

    /**
     * 对应 C++ Cell_Number() (CELL.H, Line 230)
     * CELL → ID = y * MAP_CELL_W + x
     */
    static cellNumber(cell: Cell): number {
        return cell.y * this.MAX_MAP_WIDTH + cell.x;
    }

    /**
     * ID → CELL
     */
    static numberToCell(id: number): Cell {
        return {
            x: id % this.MAX_MAP_WIDTH,
            y: Math.floor(id / this.MAX_MAP_WIDTH)
        };
    }
}
```

---

### 3.2 地形类型枚举（LandType）

```cpp
// origin/REDALERT/DEFINES.H, Line 2926
typedef enum LandType : char {
    LAND_CLEAR,      // 0 - 平地
    LAND_ROAD,       // 1 - 道路
    LAND_WATER,      // 2 - 水域
    LAND_ROCK,       // 3 - 岩石（不可通行）
    LAND_WALL,       // 4 - 墙（阻挡移动）
    LAND_TIBERIUM,   // 5 - 泰伯利亚矿场
    LAND_BEACH,      // 6 - 沙滩
    LAND_ROUGH,      // 7 - 崎岖地形
    LAND_RIVER,      // 8 - 河床

    LAND_COUNT,
    LAND_NONE=-1,
    LAND_FIRST=0
} LandType;
```

```typescript
// src/game/terrain/TerrainTypes.ts
export enum LandType {
    CLEAR = 0,      // 平地
    ROAD = 1,       // 道路
    WATER = 2,      // 水域
    ROCK = 3,       // 岩石（不可通行）
    WALL = 4,       // 墙（阻挡移动）
    TIBERIUM = 5,   // 泰伯利亚矿场
    BEACH = 6,      // 沙滩
    ROUGH = 7,      // 崎岖地形
    RIVER = 8,      // 河床
    NONE = -1,
}
```

---

### 3.3 移动方式枚举（SpeedType）

```cpp
// origin/REDALERT/DEFINES.H, Line 3135
typedef enum SpeedType : char {
    SPEED_NONE=-1,
    SPEED_FOOT,     // 0 - 步兵
    SPEED_TRACK,    // 1 - 履带
    SPEED_WHEEL,    // 2 - 轮式
    SPEED_WINGED,   // 3 - 飞行
    SPEED_FLOAT,    // 4 - 舰船
    SPEED_COUNT,
    SPEED_FIRST=SPEED_FOOT
} SpeedType;
```

```typescript
export enum SpeedType {
    NONE = -1,
    FOOT = 0,    // 步兵
    TRACK = 1,   // 履带
    WHEEL = 2,   // 轮式
    WINGED = 3,  // 飞行
    FLOAT = 4,   // 舰船
}
```

---

### 3.4 移动区域枚举（MZoneType）

```cpp
// origin/REDALERT/DEFINES.H, Line 679
typedef enum MZoneType : char {
    MZONE_NORMAL,     // 0 - 普通陆地（不能碾压墙）
    MZONE_CRUSHER,    // 1 - 可碾压可碾压墙
    MZONE_DESTROYER,  // 2 - 可破坏墙
    MZONE_WATER,      // 3 - 水上
    MZONE_COUNT,
    MZONE_FIRST=0
} MZoneType;
```

```typescript
export enum MZoneType {
    NORMAL = 0,    // 普通陆地
    CRUSHER = 1,   // 可碾压墙
    DESTROYER = 2, // 可破坏墙
    WATER = 3,     // 水上
}
```

---

### 3.5 地形通行性（GroundType）

```cpp
// origin/REDALERT/DEFINES.H, Line 3520
typedef struct {
    fixed Cost[SPEED_COUNT];  // 每种移动方式的地形消耗（0 = 不可通行）
    bool  Build;              // 是否可建造
} GroundType;

// origin/REDALERT/CONST.CPP, Line 643
GroundType Ground[LAND_COUNT];

// 初始化来源：RULES.CPP Land_Types() 从 INI 读取
// 默认通行性（根据源码推断）：
//   LAND_CLEAR:   Cost[FOOT]=1, Cost[TRACK]=1, Cost[WHEEL]=1, Cost[WINGED]=1, Cost[FLOAT]=0, Build=true
//   LAND_ROAD:    Cost[FOOT]=1, Cost[TRACK]=1, Cost[WHEEL]=1, Cost[WINGED]=1, Cost[FLOAT]=0, Build=true
//   LAND_WATER:   Cost[FOOT]=0, Cost[TRACK]=0, Cost[WHEEL]=0, Cost[WINGED]=1, Cost[FLOAT]=1, Build=false
//   LAND_ROCK:    Cost[*]=0, Build=false
//   LAND_WALL:    Cost[*]=0, Build=false
//   LAND_TIBERIUM:Cost[FOOT]=1, Cost[TRACK]=1, Cost[WHEEL]=1, Cost[WINGED]=1, Cost[FLOAT]=0, Build=true
//   LAND_BEACH:   Cost[FOOT]=1, Cost[TRACK]=1, Cost[WHEEL]=1, Cost[WINGED]=1, Cost[FLOAT]=0, Build=true
//   LAND_ROUGH:   Cost[FOOT]=1, Cost[TRACK]=1, Cost[WHEEL]=0, Cost[WINGED]=1, Cost[FLOAT]=0, Build=false
//   LAND_RIVER:   Cost[FOOT]=0, Cost[TRACK]=0, Cost[WHEEL]=0, Cost[WINGED]=1, Cost[FLOAT]=0, Build=false
```

**TS 映射**：

```typescript
// src/game/terrain/TerrainPassability.ts

export interface GroundType {
    readonly cost: Record<SpeedType, number>;  // 0 = 不可通行
    readonly buildable: boolean;
}

export const GROUND_TYPES: Record<LandType, GroundType> = {
    [LandType.CLEAR]: {
        cost: { [SpeedType.FOOT]: 1, [SpeedType.TRACK]: 1, [SpeedType.WHEEL]: 1, [SpeedType.WINGED]: 1, [SpeedType.FLOAT]: 0 },
        buildable: true
    },
    [LandType.ROAD]: {
        cost: { [SpeedType.FOOT]: 1, [SpeedType.TRACK]: 1, [SpeedType.WHEEL]: 1, [SpeedType.WINGED]: 1, [SpeedType.FLOAT]: 0 },
        buildable: true
    },
    [LandType.WATER]: {
        cost: { [SpeedType.FOOT]: 0, [SpeedType.TRACK]: 0, [SpeedType.WHEEL]: 0, [SpeedType.WINGED]: 1, [SpeedType.FLOAT]: 1 },
        buildable: false
    },
    [LandType.ROCK]: {
        cost: { [SpeedType.FOOT]: 0, [SpeedType.TRACK]: 0, [SpeedType.WHEEL]: 0, [SpeedType.WINGED]: 1, [SpeedType.FLOAT]: 0 },
        buildable: false
    },
    [LandType.WALL]: {
        cost: { [SpeedType.FOOT]: 0, [SpeedType.TRACK]: 0, [SpeedType.WHEEL]: 0, [SpeedType.WINGED]: 1, [SpeedType.FLOAT]: 0 },
        buildable: false
    },
    [LandType.TIBERIUM]: {
        cost: { [SpeedType.FOOT]: 1, [SpeedType.TRACK]: 1, [SpeedType.WHEEL]: 1, [SpeedType.WINGED]: 1, [SpeedType.FLOAT]: 0 },
        buildable: true
    },
    [LandType.BEACH]: {
        cost: { [SpeedType.FOOT]: 1, [SpeedType.TRACK]: 1, [SpeedType.WHEEL]: 1, [SpeedType.WINGED]: 1, [SpeedType.FLOAT]: 0 },
        buildable: true
    },
    [LandType.ROUGH]: {
        cost: { [SpeedType.FOOT]: 1, [SpeedType.TRACK]: 1, [SpeedType.WHEEL]: 0, [SpeedType.WINGED]: 1, [SpeedType.FLOAT]: 0 },
        buildable: false
    },
    [LandType.RIVER]: {
        cost: { [SpeedType.FOOT]: 0, [SpeedType.TRACK]: 0, [SpeedType.WHEEL]: 0, [SpeedType.WINGED]: 1, [SpeedType.FLOAT]: 0 },
        buildable: false
    },
};
```

---

### 3.6 CellClass 格子数据结构

```cpp
// origin/REDALERT/CELL.H, Line 46
class CellClass {
    short ID;                          // 格子编号 = y * MAP_CELL_W + x
    unsigned IsPlot:1;                 // 雷达需更新
    unsigned IsCursorHere:1;           // 放置光标在此
    unsigned IsMapped:1;               // 已探索（有迷雾碎片）
    unsigned IsVisible:1;              // 完全可见（无迷雾）
    unsigned IsWaypoint:1;             // 路径点标记
    unsigned IsRadarCursor:1;          // 雷达光标
    unsigned IsFlagged:1;              // 有旗帜
    unsigned IsToShroud:1;             // 待遮蔽
    unsigned char Zones[MZONE_COUNT];  // 移动区域编号
    unsigned short Jammed;             // 被干扰计数
    CCPtr<TriggerClass> Trigger;       // 触发器
    TemplateType TType;                // 模板类型
    unsigned char TIcon;               // 模板图标索引
    OverlayType Overlay;               // 覆盖层类型
    unsigned char OverlayData;         // 覆盖层数据
    SmudgeType Smudge;                 // 污渍类型
    unsigned char SmudgeData;          // 污渍数据
    HousesType Owner;                  // 归属阵营
    HousesType InfType;                // 步兵占据阵营
    ObjectClass * OccupierPtr;         // 占据此格的对象
    ObjectClass * Overlapper[6];       // 重叠此格的对象
    unsigned int IsMappedByPlayerMask; // 各玩家探索掩码
    unsigned int IsVisibleByPlayerMask;// 各玩家可见掩码
    
    // 占据位（union）
    union {
        struct {
            unsigned Center:1;     // 中心位置被占
            unsigned NW:1;         // 西北子位置
            unsigned NE:1;         // 东北子位置
            unsigned SW:1;         // 西南子位置
            unsigned SE:1;         // 东南子位置
            unsigned Vehicle:1;    // 载具占据
            unsigned Monolith:1;   // 不可移动阻挡
            unsigned Building:1;   // 建筑占据
        } Occupy;
        unsigned char Composite;   // 组合位掩码
    } Flag;
    
    LandType Land;                   // 地形类型
    LandType OverrideLand;           // 覆盖地形类型（修复通行性问题）
    AnimClass* CTFFlag;              // CTF 旗帜动画
};
```

**TS 映射**：

```typescript
// src/game/terrain/Cell.ts

export interface CellOccupancy {
    center: boolean;   // 中心被占
    nw: boolean;       // 西北子位置
    ne: boolean;       // 东北子位置
    sw: boolean;       // 西南子位置
    se: boolean;       // 东南子位置
    vehicle: boolean;  // 载具占据
    monolith: boolean; // 不可移动阻挡
    building: boolean; // 建筑占据
}

export class GameCell {
    id: number;                        // 格子编号
    x: number;                         // X 坐标
    y: number;                         // Y 坐标
    landType: LandType = LandType.CLEAR;
    overrideLandType?: LandType;       // 覆盖地形
    
    // 渲染层
    templateType: TemplateType = TemplateType.NONE;
    templateIcon: number = 0;
    overlayType: OverlayType = OverlayType.NONE;
    overlayData: number = 0;
    smudgeType: SmudgeType = SmudgeType.NONE;
    smudgeData: number = 0;
    
    // 占据状态
    occupancy: CellOccupancy = {
        center: false, nw: false, ne: false, sw: false, se: false,
        vehicle: false, monolith: false, building: false
    };
    occupier?: GameObject;            // 占据此格的对象
    overlappers: GameObject[] = [];   // 重叠此格的对象
    
    // 迷雾
    isMapped: boolean = false;        // 已探索
    isVisible: boolean = false;       // 完全可见
    isMappedByPlayerMask: number = 0; // 各玩家探索掩码
    isVisibleByPlayerMask: number = 0;// 各玩家可见掩码
    
    // 其他
    isWaypoint: boolean = false;
    isFlagged: boolean = false;
    owner?: HouseType;
    infType?: HouseType;
    trigger?: Trigger;
    zones: number[] = [0, 0, 0, 0];   // MZONE_COUNT = 4
    jammed: number = 0;
    
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.id = y * TerrainGrid.MAX_MAP_WIDTH + x;
    }

    /**
     * 对应 C++ CellClass::Land_Type() (CELL.H, Line 237)
     */
    getLandType(): LandType {
        return this.overrideLandType !== undefined ? this.overrideLandType : this.landType;
    }

    /**
     * 对应 C++ CellClass::Is_Clear_To_Build() (CELL.CPP, Line 460)
     */
    isClearToBuild(loco: SpeedType = SpeedType.TRACK): boolean {
        if (this.occupier) return false;
        if (this.isFlagged) return false;
        if (this.overlayType !== OverlayType.NONE) return false;
        if (this.smudgeType !== SmudgeType.NONE) return false; // Bib 检查
        if (this.isBridgeHere()) return false;
        return GROUND_TYPES[this.getLandType()].buildable;
    }

    /**
     * 对应 C++ CellClass::Is_Clear_To_Move() (CELL.CPP, Line 2889)
     */
    isClearToMove(
        loco: SpeedType,
        ignoreInfantry: boolean = false,
        ignoreVehicles: boolean = false,
        zone: number = -1,
        check: MZoneType = MZoneType.NORMAL
    ): boolean {
        // 飞行单位始终可通过
        if (loco === SpeedType.WINGED) return true;
        
        // 区域检查
        if (zone !== -1 && zone !== this.zones[check]) return false;
        
        // 占据位检查
        let composite = this.getCompositeOccupancy();
        if (ignoreInfantry) composite &= 0xE0;  // 清除步兵位
        if (ignoreVehicles) composite &= 0x5F;  // 清除载具/建筑位
        if (composite !== 0) return false;
        
        // 墙检查
        const land = this.getLandType();
        if (this.overlayType !== OverlayType.NONE) {
            // 墙特殊处理（可碾压/破坏）
            // ...
        }
        
        // 地形通行性
        return GROUND_TYPES[land].cost[loco] !== 0;
    }

    /**
     * 对应 C++ CellClass::Is_Bridge_Here() (CELL.CPP, Line 2981)
     */
    isBridgeHere(): boolean {
        // 检查模板类型是否为桥梁
        return false; // 具体模板类型需从 TEMPLATE 提取
    }

    private getCompositeOccupancy(): number {
        let mask = 0;
        if (this.occupancy.center) mask |= 0x01;
        if (this.occupancy.nw) mask |= 0x02;
        if (this.occupancy.ne) mask |= 0x04;
        if (this.occupancy.sw) mask |= 0x08;
        if (this.occupancy.se) mask |= 0x10;
        if (this.occupancy.vehicle) mask |= 0x20;
        if (this.occupancy.monolith) mask |= 0x40;
        if (this.occupancy.building) mask |= 0x80;
        return mask;
    }
}
```

---

### 3.7 地图类（MapClass）

```cpp
// origin/REDALERT/MAP.H, Line 41
class MapClass: public GScreenClass {
    int MapCellX;          // 实际地图 X 偏移
    int MapCellY;          // 实际地图 Y 偏移
    int MapCellWidth;      // 实际地图宽度
    int MapCellHeight;     // 实际地图高度
    long TotalValue;       // 地图上所有可采集泰伯利亚总价值
    VectorClass<CellClass> Array;  // 格子数组 [MAP_CELL_TOTAL]
    
    // 泰伯利亚生长/扩散追踪
    CELL TiberiumGrowth[MAP_CELL_W/2];   // 生长候选格子
    int TiberiumGrowthCount;
    CELL TiberiumSpread[MAP_CELL_W/2];   // 扩散候选格子
    int TiberiumSpreadCount;
    CELL TiberiumScan;                   // 当前扫描位置
};
```

**TS 映射**：

```typescript
// src/game/terrain/GameMap.ts

export class GameMap {
    cells: GameCell[][];           // 二维格子数组
    width: number;                 // MapCellWidth
    height: number;                // MapCellHeight
    offsetX: number;               // MapCellX
    offsetY: number;               // MapCellY
    totalValue: number = 0;        // 泰伯利亚总价值
    
    // 泰伯利亚生长/扩散追踪
    tiberiumGrowth: Cell[] = [];
    tiberiumSpread: Cell[] = [];
    tiberiumScan: number = 0;

    constructor(width: number, height: number, offsetX: number = 0, offsetY: number = 0) {
        this.width = width;
        this.height = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.cells = [];
        for (let y = 0; y < height; y++) {
            this.cells[y] = [];
            for (let x = 0; x < width; x++) {
                this.cells[y][x] = new GameCell(x + offsetX, y + offsetY);
            }
        }
    }

    /**
     * 对应 C++ MapClass::operator[] (CELL)
     */
    getCell(cell: Cell): GameCell {
        return this.cells[cell.y - this.offsetY]?.[cell.x - this.offsetX];
    }

    /**
     * 对应 C++ MapClass::operator[] (COORDINATE)
     */
    getCellAtCoord(coord: Coordinate): GameCell {
        const cell = TerrainGrid.worldToCell(
            new BABYLON.Vector3(coord.cell.x * TerrainGrid.CELL_SIZE, 0, coord.cell.y * TerrainGrid.CELL_SIZE)
        );
        return this.getCell(cell);
    }

    /**
     * 对应 C++ MapClass::Sight_From() (MAP.H, Line 70)
     */
    sightFrom(cell: Cell, sightRange: number, house: House, incremental: boolean = false): void {
        // 圆形视野揭示
        const range = Math.ceil(sightRange);
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                if (dx * dx + dy * dy <= range * range) {
                    const target = { x: cell.x + dx, y: cell.y + dy };
                    const c = this.getCell(target);
                    if (c) {
                        c.setVisible(house, true);
                        if (!incremental) c.setMapped(house, true);
                    }
                }
            }
        }
    }

    /**
     * 对应 C++ MapClass::Jam_From() (MAP.H, Line 71)
     */
    jamFrom(cell: Cell, jamRange: number, house: House): void {
        const range = Math.ceil(jamRange);
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                if (dx * dx + dy * dy <= range * range) {
                    const target = { x: cell.x + dx, y: cell.y + dy };
                    const c = this.getCell(target);
                    if (c) c.jammed++;
                }
            }
        }
    }
}
```

---

## 4. 事件与消息系统（替代 C++ 的消息队列）

C++ 中大量使用直接函数调用和消息队列。在 TS 中使用轻量级 EventBus：

```typescript
// src/core/EventBus.ts
export class EventBus {
    private static listeners: Map<string, Set<Function>> = new Map();

    static on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event)!.add(callback);
    }

    static emit(event: string, ...args: any[]): void {
        this.listeners.get(event)?.forEach(cb => cb(...args));
    }

    static off(event: string, callback: Function): void {
        this.listeners.get(event)?.delete(callback);
    }
}

// 使用示例（对应 C++ 中的事件通知）
// Unit.ts 中：
EventBus.emit('unitMoved', this, oldCell, newCell);

// FogOfWar.ts 中：
EventBus.on('unitMoved', (unit, oldCell, newCell) => {
    this.updateVision(unit.owner, newCell, unit.definition.sight);
});
```

---

## 5. 游戏主循环映射（替代 C++ Win32 消息循环）

```typescript
// src/game/GameLoop.ts
export class GameLoop {
    private lastTime: number = 0;
    private fixedTimeStep: number = 1000 / 60; // 60 FPS 固定步长
    private accumulator: number = 0;

    constructor(
        private scene: BABYLON.Scene,
        private units: GameUnit[],
        private buildings: GameBuilding[],
        private bullets: GameBullet[]
    ) {
        // 对应 C++ 中的消息循环 / 主 Timer
        this.scene.onBeforeRenderObservable.add(() => this.tick());
    }

    private tick(): void {
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        this.lastTime = now;

        this.accumulator += deltaTime;

        // 固定步长更新逻辑（对应 C++ 的固定 Tick）
        while (this.accumulator >= this.fixedTimeStep) {
            const dt = this.fixedTimeStep / 1000; // 转为秒

            // 对应 C++ 中遍历所有对象的 AI() 调用
            this.units.forEach(u => u.tick(dt));
            this.buildings.forEach(b => b.tick(dt));
            this.bullets.forEach(b => b.tick(dt));

            // 碰撞检测（对应 C++ 中的碰撞轮询）
            this.processCollisions();

            // 死亡对象清理
            this.cleanupDestroyed();

            this.accumulator -= this.fixedTimeStep;
        }
    }

    private processCollisions(): void {
        // 对应 C++ 中的 Bullet → Unit/Building 命中判定
    }

    private cleanupDestroyed(): void {
        // 对应 C++ 中的对象回收逻辑
    }
}
```

---

## 6. 代码注释规范

翻译时必须保留原始 C++ 源码引用，方便回溯：

```typescript
/**
 * 计算对目标的伤害值
 * 
 * Source: REDALERT/UNIT.CPP, Line ~1840
 * Original: int UnitClass::Take_Damage(int damage, WarheadType warhead, ...)
 * 
 * 原始逻辑：
 * 1. 根据 warhead 与 armor 查表获取修正系数
 * 2. 乘以 damage 向下取整
 * 3. 如果目标为 Tiberium 相关，触发特殊逻辑（此处省略）
 */
public takeDamage(damage: number, warhead: WarheadType): void {
    // ...
}
```

---

## 7. 禁止直译清单

以下 C++ 特性**不可**直接翻译，需改用 Web/TS 方案：

| C++ 特性 | 禁止做法 | 正确做法 |
|---------|---------|---------|
| `new/delete` 手动内存管理 | 直译 `new` | 使用 TS 对象引用，依赖 GC |
| `Win32 API` (`CreateWindow`, `BitBlt`) | 任何 Win32 调用 | 由 Babylon.js Engine/Scene 替代 |
| `IPX/TCP Socket` 原生网络 | 直译 Socket 代码 | 使用 WebSocket / WebRTC |
| `MFC` 界面 | 直译对话框/菜单 | 使用 Babylon.GUI |
| `__asm` 内联汇编 | 直译 | 删除，Babylon.js 用 Shader |
| `union` 内存共用体 | 直译 | 使用 TS Discriminated Union 类型 |
| 多继承（如 `class X : public A, public B`） | 直译 | 使用 Mixin 模式或组合替代 |
| `#define` 宏常量 | 直译 | 使用 `const` / `enum` / `readonly` |

---

*本文档为代码翻译时的权威参考，随源码理解深入持续更新。*
