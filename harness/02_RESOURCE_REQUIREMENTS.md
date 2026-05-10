# 项目资源需求清单（Resource Requirements）

> **版本**: v2.0 — 基于 `origin/REDALERT/DEFINES.H` 完整枚举交叉验证  
> **使用约定**：
> 1. 所有资源在准备好之前，均使用 **Dummy 资源**（Babylon.js 程序化几何体 / 纯色材质 / 合成音效）替代。
> 2. 当你准备好某类资源后，请在本文件对应行末尾追加 `ready`，我会将 Dummy 替换为真实资源。
> 3. 资源文件统一放在 `public/assets/` 目录下，按类型分子文件夹。

---

## 1. 3D 模型资源（Meshes）

> **路径基准**：以下所有 `public/assets/` 路径均相对于 `remake/` 目录，即实际存放位置为 `CnC_Remake/remake/public/assets/`。
>  
> **C++ 源码对应**：所有单位/建筑在游戏内原始使用 `.SHP` 精灵图（带 32 方向朝向），在 3D 重构中需替换为 `.GLB` 模型。

---

### 1.1 载具模型（UnitType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 1612-1652

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `u_htank` | `UNIT_HTANK` | 猛犸坦克 (Mammoth) | GLB | `public/assets/units/htank.glb` | [ ] Dummy: 大 Box + 双炮管 |
> **Promote**: Soviet Mammoth tank, quad treads, dual cannons, massive armored body, boxy cold-war heavy tank aesthetic
> **Poly**: ≤4,000 tris
> **Code**: Turret mesh MUST be separate child node (PrimaryFacing). Body size 48x48 leptons (Gigundo). Dual weapon offsets: pri=[0,0xC0,0x28], sec=[0,0x8,0x40]. 32 rotation stages.
| `u_mtank` | `UNIT_MTANK` | 重型坦克 (Heavy Tank) | GLB | `public/assets/units/mtank.glb` | [ ] Dummy: Box + Cylinder炮塔 |
> **Promote**: Soviet Heavy tank, treaded, single large cannon, angular armor plating
> **Poly**: ≤3,500 tris
> **Code**: Turret mesh MUST be separate child node. Body size 48x48 leptons (Gigundo). Dual weapon offsets: pri=[0,0x80,0x80], sec=[0,0x80,0x80]. 32 rotation stages.
| `u_mtank2` | `UNIT_MTANK2` | 中型坦克 (Medium Tank) | GLB | `public/assets/units/mtank2.glb` | [ ] Dummy: Box + Cylinder炮塔 |
> **Promote**: Allied Medium tank, treaded, medium cannon, compact rounded turret
> **Poly**: ≤3,000 tris
> **Code**: Turret mesh MUST be separate child node. Body size 48x48 leptons (Gigundo). Dual weapon offsets: pri=[0,0xC0,0xC0], sec=[0,0xC0,0xC0]. 32 rotation stages.
| `u_ltank` | `UNIT_LTANK` | 轻型坦克 (Light Tank) | GLB | `public/assets/units/ltank.glb` | [ ] Dummy: 小 Box + Cylinder |
> **Promote**: Allied Light tank (Bradley), small fast treaded vehicle, small turret
> **Poly**: ≤2,500 tris
> **Code**: Turret mesh MUST be separate child node. Body size ~36x36 leptons. Weapon offset: pri=[0,0xC0,0]. 32 rotation stages.
| `u_apc` | `UNIT_APC` | 装甲运兵车 | GLB | `public/assets/units/apc.glb` | [ ] Dummy: Box + 4 Cylinder轮子 |
> **Promote**: Armored Personnel Carrier, wheeled, boxy transport with roof hatches
> **Poly**: ≤2,500 tris
> **Code**: No turret. Body size ~36x36 leptons. Dual weapon offsets: pri=[0,0x30,0], sec=[0,0x30,0]. 32 rotation stages.
| `u_minelayer` | `UNIT_MINELAYER` | 布雷车 | GLB | `public/assets/units/minelayer.glb` | [ ] Dummy: Box + 货舱 |
> **Promote**: Mine-laying truck, flatbed rear with mine dispensers
> **Poly**: ≤2,000 tris
> **Code**: No turret. Body size ~36x36 leptons. No weapon offsets. 32 rotation stages.
| `u_jeep` | `UNIT_JEEP` | 吉普车 / Ranger | GLB | `public/assets/units/jeep.glb` | [ ] Dummy: Box + 4 Cylinder轮子 |
> **Promote**: Humvee-style 4x4 jeep, open top, small roof-mounted machine gun turret
> **Poly**: ≤2,000 tris
> **Code**: Turret mesh MUST be separate child node. Body size ~30x30 leptons. Dual weapon offsets: pri=[0,0x30,0], sec=[0,0x30,0]. 32 rotation stages.
| `u_harvester` | `UNIT_HARVESTER` | 矿车 | GLB | `public/assets/units/harvester.glb` | [ ] Dummy: Box + 大 Container |
> **Promote**: Massive ore harvester, giant container bed, industrial treads, stubby body
> **Poly**: ≤3,500 tris
> **Code**: No turret. Body size 48x48 leptons (Gigundo). No weapon offsets. 32 rotation stages. Needs deploy animation for unloading at refinery.
| `u_arty` | `UNIT_ARTY` | 自行火炮 | GLB | `public/assets/units/arty.glb` | [ ] Dummy: 长 Box + 炮管 |
> **Promote**: Self-propelled artillery, long barrel on tracked chassis, no turret (body rotates to aim)
> **Poly**: ≤2,500 tris
> **Code**: NO turret (body IS the aiming axis). Body size ~36x36 leptons. Weapon offset: pri=[0,0x60,0]. 32 rotation stages.
| `u_mrj` | `UNIT_MRJ` | 移动雷达干扰器 | GLB | `public/assets/units/mrj.glb` | [ ] Dummy: Box + 碟形天线 |
> **Promote**: Mobile Radar Jammer, dish antenna on truck bed, electronic warfare vehicle
> **Poly**: ≤2,500 tris
> **Code**: No turret. Has rotating radar dish mesh (always spins, independent of facing). Body size ~36x36 leptons. No weapon offsets. 32 rotation stages. IsJammer=true.
| `u_mgg` | `UNIT_MGG` | 移动遮蔽发生器 | GLB | `public/assets/units/mgg.glb` | [ ] Dummy: Box + 发生器 |
> **Promote**: Mobile Gap Generator, massive dome/generator on heavy treads
> **Poly**: ≤3,500 tris
> **Code**: No turret. Has rotating radar dish mesh (always spins). Body size 48x48 leptons (Gigundo). No weapon offsets. 32 rotation stages. IsGapper=true.
| `u_mcv` | `UNIT_MCV` | 基地车 | GLB | `public/assets/units/mcv.glb` | [ ] Dummy: 超大 Box + 天线 |
> **Promote**: Mobile Construction Vehicle, enormous boxy command trailer on heavy treads, antenna mast
> **Poly**: ≤4,000 tris
> **Code**: No turret. Body size 48x48 leptons (Gigundo). No weapon offsets. 32 rotation stages. Needs deploy animation to transform into Construction Yard.
| `u_v2` | `UNIT_V2_LAUNCHER` | V2 火箭发射车 | GLB | `public/assets/units/v2.glb` | [ ] Dummy: Box + 导弹架 |
> **Promote**: V2 Rocket Launcher, tall rocket on elevating launch rail, Soviet tracked chassis
> **Poly**: ≤3,000 tris
> **Code**: No turret. Body size 48x48 leptons (Gigundo). No weapon offsets. 32 rotation stages. Needs elevation animation for rocket firing.
| `u_truck` | `UNIT_TRUCK` | 运输卡车 | GLB | `public/assets/units/truck.glb` | [ ] Dummy: 长 Box + 轮子 |
> **Promote**: Convoy truck, simple cargo truck with canvas cover
> **Poly**: ≤1,500 tris
> **Code**: No turret. Body size ~30x30 leptons. No weapon offsets. 32 rotation stages.
| `u_stank` | `UNIT_STANK` | 幻影坦克 / 隐形坦克 | GLB | `public/assets/units/stank.glb` | [ ] Dummy: Box + Cylinder (半透明材质) |
> **Promote**: Phase Transport / Stealth tank, sleek armored vehicle with cloaking capability
> **Poly**: ≤3,000 tris
> **Code**: Turret mesh MUST be separate child node. Body size 48x48 leptons (Gigundo). Dual weapon offsets: pri=[0,0x30,0], sec=[0,0x30,0]. 32 rotation stages. Needs cloaking transparency shader.

---

### 1.2 步兵模型（InfantryType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 1561-1601

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `i_e1` | `INFANTRY_E1` | 步枪兵 (Rifle Infantry) | GLB | `public/assets/infantry/e1.glb` | [ ] Dummy: Capsule + Sphere |
> **Promote**: Rifle infantry, basic soldier with helmet and assault rifle, standing/walking poses
> **Poly**: ≤800 tris
> **Code**: Humanoid rig with 8-direction walking animation. IsCrawling=true (prone animation). Sub-cell positioning (5 sub-positions per cell). Death animation: DO_GUN_DEATH, DO_EXPLOSION_DEATH.
| `i_e2` | `INFANTRY_E2` | 手雷兵 (Grenadier) | GLB | `public/assets/infantry/e2.glb` | [ ] Dummy: Capsule + Box |
> **Promote**: Grenadier, soldier with grenade bandolier and throwing pose
> **Poly**: ≤800 tris
> **Code**: Humanoid rig with 8-direction walking animation. IsCrawling=true. Sub-cell positioning. Death animations.
| `i_e3` | `INFANTRY_E3` | 火箭兵 (Rocket Soldier) | GLB | `public/assets/infantry/e3.glb` | [ ] Dummy: Capsule + Cylinder |
> **Promote**: Rocket soldier, bazooka on shoulder, heavy backpack
> **Poly**: ≤800 tris
> **Code**: Humanoid rig. IsCrawling=true. Sub-cell positioning. Weapon: DRAGON (rocket launcher).
| `i_e4` | `INFANTRY_E4` | 喷火兵 (Flamethrower) | GLB | `public/assets/infantry/e4.glb` | [ ] Dummy: Capsule + 喷嘴 |
> **Promote**: Flamethrower infantry, bulky suit with fuel tanks and flame nozzle
> **Poly**: ≤900 tris
> **Code**: Humanoid rig. IsCrawling=true. Sub-cell positioning. Weapon: FLAMER. Death: DO_FIRE_DEATH.
| `i_e7` | `INFANTRY_RENOVATOR` | 工程师 (Engineer) | GLB | `public/assets/infantry/e7.glb` | [ ] Dummy: Capsule + 工具包 |
> **Promote**: Engineer, technician with tool bag and hard hat
> **Poly**: ≤800 tris
> **Code**: Humanoid rig. IsCrawling=false. Sub-cell positioning. IsCapture=true (can capture buildings). No weapon.
| `i_tanya` | `INFANTRY_TANYA` | 谭雅 (Tanya) | GLB | `public/assets/infantry/tanya.glb` | [ ] Dummy: Capsule + 双枪 |
> **Promote**: Tanya, commando with dual pistols, red bandana, athletic build
> **Poly**: ≤900 tris
> **Code**: Humanoid rig. IsCrawling=true. Sub-cell positioning. Dual pistols. Special death scream (VOC_TANYA_DIE). Bomber capability.
| `i_spy` | `INFANTRY_SPY` | 间谍 (Spy) | GLB | `public/assets/infantry/spy.glb` | [ ] Dummy: Capsule + 西装 |
> **Promote**: Spy, British gentleman in suit and bowler hat
> **Poly**: ≤800 tris
> **Code**: Humanoid rig. IsCrawling=false. Sub-cell positioning. British accent voice lines.
| `i_thief` | `INFANTRY_THIEF` | 小偷 (Thief) | GLB | `public/assets/infantry/thief.glb` | [ ] Dummy: Capsule + 钱袋 |
> **Promote**: Thief, sneaky figure in dark clothes
> **Poly**: ≤800 tris
> **Code**: Humanoid rig. IsCrawling=false. Sub-cell positioning.
| `i_medic` | `INFANTRY_MEDIC` | 医疗兵 (Medic) | GLB | `public/assets/infantry/medic.glb` | [ ] Dummy: Capsule + 红十字 |
> **Promote**: Field medic, white uniform with red cross armband
> **Poly**: ≤800 tris
> **Code**: Humanoid rig. IsCrawling=true. Sub-cell positioning.
| `i_general` | `INFANTRY_GENERAL` | 将军 (Field Marshal) | GLB | `public/assets/infantry/general.glb` | [ ] Dummy: Capsule + 军衔 |
> **Promote**: Field Marshal, officer with peaked cap and medals
> **Poly**: ≤800 tris
> **Code**: Humanoid rig. IsCrawling=true. Sub-cell positioning.
| `i_dog` | `INFANTRY_DOG` | 军犬 (Attack Dog) | GLB | `public/assets/infantry/dog.glb` | [ ] Dummy: 低矮 Box + 头 |
> **Promote**: Soviet attack dog, German Shepherd, aggressive stance
> **Poly**: ≤600 tris
> **Code**: Quadruped rig. IsDog=true. No crawling. Runs to attack. Death: ANIM_DOG_ELECT_DIE for Tesla.
| `i_c1` | `INFANTRY_C1` | 平民 (Civilian) | GLB | `public/assets/infantry/civilian.glb` | [ ] Dummy: Capsule + Sphere |
> **Promote**: Civilian male, casual clothes
> **Poly**: ≤600 tris
> **Code**: Humanoid rig. IsCivilian=true. IsCrawling=false. Flee behavior (IsFraidyCat). No weapon.
| `i_shock` | `INFANTRY_SHOCK` | 磁暴步兵 (Shock Trooper, CS) | GLB | `public/assets/infantry/shock.glb` | [ ] Dummy: Capsule + 线圈 |
> **Promote**: Shock trooper, bulky armored suit with Tesla coils on backpack
> **Poly**: ≤1,000 tris
> **Code**: Humanoid rig. IsCrawling=true. Weapon: PORTATESLA. Special electric death animation.
| `i_mech` | `INFANTRY_MECHANIC` | 机械师 (Mechanic, CS) | GLB | `public/assets/infantry/mech.glb` | [ ] Dummy: Capsule + 扳手 |
> **Promote**: Mechanic, overalls with wrench, Southern US style
> **Poly**: ≤800 tris
> **Code**: Humanoid rig. IsCrawling=true. Repair weapon (GOODWRENCH). Southern accent voice lines.

---

### 1.3 飞机模型（AircraftType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 1709-1721

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `a_transport` | `AIRCRAFT_TRANSPORT` | 运输直升机 (Chinook) | GLB | `public/assets/aircraft/transport.glb` | [ ] Dummy: 双旋翼 Box |
> **Promote**: Chinook transport helicopter, twin rotor, large cargo bay
> **Poly**: ≤3,000 tris
> **Code**: Dual rotor meshes (must spin). IsRotorEquipped=true. IsLandable=true. Can carry infantry. Landing pad: none (can land on ground).
| `a_badger` | `AIRCRAFT_BADGER` | 獾式轰炸机 (Badger) | GLB | `public/assets/aircraft/badger.glb` | [ ] Dummy: 长机翼 Box |
> **Promote**: Badger bomber, large swept-wing Soviet bomber
> **Poly**: ≤3,500 tris
> **Code**: Fixed wing. IsFixedWing=true. Cannot hover. No landing. Drops parabombs.
| `a_u2` | `AIRCRAFT_U2` | U2 侦察机 | GLB | `public/assets/aircraft/u2.glb` | [ ] Dummy: 长 Box + 大翼展 |
> **Promote**: U2 spy plane, long thin wings, high altitude reconnaissance
> **Poly**: ≤2,500 tris
> **Code**: Fixed wing. IsFixedWing=true. Flies across map in straight line. No landing.
| `a_mig` | `AIRCRAFT_MIG` | MiG 战机 | GLB | `public/assets/aircraft/mig.glb` | [ ] Dummy: 三角翼 Box |
> **Promote**: MiG fighter, delta wing Soviet jet
> **Poly**: ≤3,000 tris
> **Code**: Fixed wing. IsFixedWing=true. Lands at AIRSTRIP. Approach speed controlled (LandingSpeed).
| `a_yak` | `AIRCRAFT_YAK` | Yak 攻击机 | GLB | `public/assets/aircraft/yak.glb` | [ ] Dummy: 小三角翼 Box |
> **Promote**: Yak attack plane, small propeller-driven ground attack aircraft
> **Poly**: ≤2,500 tris
> **Code**: Fixed wing. IsFixedWing=true. Lands at AIRSTRIP.
| `a_longbow` | `AIRCRAFT_LONGBOW` | 阿帕奇 (Longbow) | GLB | `public/assets/aircraft/longbow.glb` | [ ] Dummy: 单旋翼 + 短翼 |
> **Promote**: Apache Longbow attack helicopter, single main rotor, missile pods
> **Poly**: ≤3,000 tris
> **Code**: Single rotor mesh (must spin). IsRotorEquipped=true. IsLandable=true. Lands at HELIPAD.
| `a_hind` | `AIRCRAFT_HIND` | 雌鹿直升机 (Hind) | GLB | `public/assets/aircraft/hind.glb` | [ ] Dummy: 单旋翼 + 长机身 |
> **Promote**: Soviet Hind attack helicopter, coaxial rotor, heavy gunship
> **Poly**: ≤3,000 tris
> **Code**: Single rotor mesh (must spin). IsRotorEquipped=true. IsLandable=true. Lands at HELIPAD.

---

### 1.4 舰船模型（VesselType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 1672-1694

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `v_ss` | `VESSEL_SS` | 潜艇 (Submarine) | GLB | `public/assets/vessels/ss.glb` | [ ] Dummy: 流线型 Box |
> **Promote**: Submarine, sleek underwater vessel with conning tower and torpedo tubes
> **Poly**: ≤3,500 tris
> **Code**: Naval unit. Submerges/d surfaces. No turret. Body size ~36×36 leptons. Weapon: TORPEDO. IsSubmersible=true.
| `v_dd` | `VESSEL_DD` | 驱逐舰 (Destroyer) | GLB | `public/assets/vessels/dd.glb` | [ ] Dummy: 长 Box + 炮塔 |
> **Promote**: Destroyer, medium naval patrol craft with naval gun turret
> **Poly**: ≤4,000 tris
> **Code**: Naval unit. HAS ROTATING TURRET (separate mesh). Body size ~48×48 leptons. Anti-submarine capability. Depth charge weapon.
| `v_ca` | `VESSEL_CA` | 巡洋舰 (Cruiser) | GLB | `public/assets/vessels/ca.glb` | [ ] Dummy: 大 Box + 多炮塔 |
> **Promote**: Cruiser, heavy naval vessel with multiple gun turrets
> **Poly**: ≤5,000 tris
> **Code**: Naval unit. Multiple turrets (separate meshes). Body size ~60×60 leptons. Heavy artillery. Anti-air capability.
| `v_transport` | `VESSEL_TRANSPORT` | 运输艇 (Transport) | GLB | `public/assets/vessels/transport.glb` | [ ] Dummy: 平底 Box |
> **Promote**: Transport boat, flat-bottomed landing craft
> **Poly**: ≤3,000 tris
> **Code**: Naval unit. No turret. Body size ~48×48 leptons. Can carry infantry and vehicles. Landing craft ramp.
| `v_pt` | `VESSEL_PT` | 炮艇 (Gunboat) | GLB | `public/assets/vessels/pt.glb` | [ ] Dummy: 小 Box + 单炮 |
> **Promote**: Gunboat, small fast patrol boat with light cannon
> **Poly**: ≤2,500 tris
> **Code**: Naval unit. Light turret (separate mesh). Body size ~36×36 leptons. Fast patrol craft.

---

### 1.5 建筑模型（StructType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 1370-1477

#### 1.5.1 军事建筑

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `b_weap` | `STRUCT_WEAP` | 兵工厂 / 武器工厂 | GLB | `public/assets/buildings/weap.glb` | [ ] Dummy: 宽 Box + 门洞 |
> **Promote**: Weapons factory, large industrial hall with rolling doors, crane, and smokestacks
> **Poly**: ≤6,000 tris
> **Code**: Size: 3x2 cells. Factory building (produces RTTI_UNITTYPE). Exit point at [1.5,1] cells. No turret. Needs buildup animation (FACTMAKE). Remap=ALTERNATE.
| `b_pillbox` | `STRUCT_PILLBOX` | 机枪碉堡 | GLB | `public/assets/buildings/pillbox.glb` | [ ] Dummy: 矮 Cylinder |
> **Promote**: Concrete pillbox, small bunker with machine gun slit
> **Poly**: ≤1,500 tris
> **Code**: Size: 1x1 cell. Simple damage (2 frames). No turret. Facing independent. Defense building.
| `b_camopill` | `STRUCT_CAMOPILLBOX` | 伪装碉堡 | GLB | `public/assets/buildings/camopill.glb` | [ ] Dummy: 矮 Cylinder + 伪装纹理 |
> **Promote**: Camouflaged pillbox, concrete bunker with foliage/netting disguise
> **Poly**: ≤1,500 tris
> **Code**: Size: 1x1 cell. Theater-specific (temperate/snow variants). Simple damage. No turret.
| `b_turret` | `STRUCT_TURRET` | 炮塔 (Gun Turret) | GLB | `public/assets/buildings/turret.glb` | [ ] Dummy: Box底座 + Cylinder炮管 |
> **Promote**: Gun turret, concrete base with rotating heavy cannon
> **Poly**: ≤2,000 tris
> **Code**: Size: 1x1 cell. HAS ROTATING TURRET (separate mesh). Foundation: FACING_NONE. No bib.
| `b_aagun` | `STRUCT_AAGUN` | 防空炮 | GLB | `public/assets/buildings/aagun.glb` | [ ] Dummy: Box + 旋转炮架 |
> **Promote**: AA gun, twin anti-aircraft cannons on rotating mount
> **Poly**: ≤2,500 tris
> **Code**: Size: 1x2 cells. HAS ROTATING TURRET (separate mesh). Foundation: FACING_S. No bib.
| `b_flame` | `STRUCT_FLAME_TURRET` | 火焰炮塔 | GLB | `public/assets/buildings/flame.glb` | [ ] Dummy: Box + 火焰喷嘴 |
> **Promote**: Flame turret, cone-shaped nozzle on concrete pedestal
> **Poly**: ≤1,500 tris
> **Code**: Size: 1x1 cell. Simple damage. No turret (fixed facing). Flame weapon.
| `b_sam` | `STRUCT_SAM` | SAM 导弹基地 | GLB | `public/assets/buildings/sam.glb` | [ ] Dummy: Box + 4 Cylinder导弹 |
> **Promote**: SAM site, 3 missile tubes on rotating platform
> **Poly**: ≤2,500 tris
> **Code**: Size: 2x1 cells. HAS ROTATING TURRET (separate mesh). Foundation: FACING_NONE. 8-direction turret.
| `b_tesla` | `STRUCT_TESLA` | 磁暴线圈 (Tesla Coil) | GLB | `public/assets/buildings/tesla.glb` | [ ] Dummy: 高 Box + 闪电球 |
> **Promote**: Tesla coil, tall tower with glowing electrode ball on top, electrical arcs
> **Poly**: ≤2,500 tris
> **Code**: Size: 1x2 cells. Foundation: FACING_S. Powered building (requires electricity). Active animation when firing. No turret.
| `b_mslo` | `STRUCT_MSLO` | 核弹发射井 | GLB | `public/assets/buildings/mslo.glb` | [ ] Dummy: 地下井 + 导弹 |
> **Promote**: Nuclear missile silo, underground launch tube with missile nose visible
> **Poly**: ≤3,000 tris
> **Code**: Size: 2x1 cells. Theater-specific. Foundation: FACING_NONE. Super weapon building. Missile launch animation.
| `b_iron` | `STRUCT_IRON_CURTAIN` | 铁幕装置 | GLB | `public/assets/buildings/iron.glb` | [ ] Dummy: 圆顶 + 发光环 |
> **Promote**: Iron Curtain device, dome structure with glowing red energy ring
> **Poly**: ≤2,500 tris
> **Code**: Size: 1x1 cell. Simple damage. Foundation: FACING_S. Super weapon. Active animation when charging.
| `b_chrono` | `STRUCT_CHRONOSPHERE` | 超时空传送仪 | GLB | `public/assets/buildings/chrono.glb` | [ ] Dummy: 圆环 + 发光球 |
> **Promote**: Chronosphere, circular platform with teleportation rings and glowing core
> **Poly**: ≤4,000 tris
> **Code**: Size: 2x2 cells. Foundation: FACING_NONE. Super weapon. Needs active animation + chrono effect shader.

#### 1.5.2 经济与生产建筑

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `b_const` | `STRUCT_CONST` | 建造厂 (Construction Yard) | GLB | `public/assets/buildings/const.glb` | [ ] Dummy: 大 Box + 天线(Cylinder) |
> **Promote**: Construction yard, massive industrial complex with crane and assembly lines
> **Poly**: ≤8,000 tris
> **Code**: Size: 3x3 cells. Factory (produces RTTI_BUILDINGTYPE). Foundation: FACING_NONE. ExitList=ExitConst. Buildup animation (FACTMAKE).
| `b_refinery` | `STRUCT_REFINERY` | 矿厂 (Refinery) | GLB | `public/assets/buildings/refinery.glb` | [ ] Dummy: Box + 管道(Torus) |
> **Promote**: Ore refinery, large processing plant with tall silo and conveyor pipes
> **Poly**: ≤7,000 tris
> **Code**: Size: 3x3 cells. Foundation: FACING_NONE. Ore dump slot for harvester (HARV enters and unloads).
| `b_storage` | `STRUCT_STORAGE` | 矿石储存罐 (Silo) | GLB | `public/assets/buildings/silo.glb` | [ ] Dummy: Cylinder |
> **Promote**: Ore silo, cylindrical storage tank
> **Poly**: ≤1,500 tris
> **Code**: Size: 1x1 cell. Simple damage. Foundation: FACING_NONE.
| `b_power` | `STRUCT_POWER` | 电厂 (Power Plant) | GLB | `public/assets/buildings/power.glb` | [ ] Dummy: Box + 烟囱(Cylinder) |
> **Promote**: Power plant, brick building with tall smokestack and cooling fans
> **Poly**: ≤4,000 tris
> **Code**: Size: 2x2 cells. Simple damage. Foundation: FACING_S. Power generator. Smokestack particle effect.
| `b_advpow` | `STRUCT_ADVANCED_POWER` | 先进电厂 | GLB | `public/assets/buildings/advpow.glb` | [ ] Dummy: Box + 双烟囱 |
> **Promote**: Advanced power plant, larger complex with dual smokestacks
> **Poly**: ≤6,000 tris
> **Code**: Size: 3x3 cells. Simple damage. Foundation: FACING_S. Power generator.
| `b_barracks` | `STRUCT_BARRACKS` | 兵营 (Barracks) | GLB | `public/assets/buildings/barracks.glb` | [ ] Dummy: 长 Box + 旗杆 |
> **Promote**: Barracks, military training facility with flagpole and parade ground
> **Poly**: ≤4,000 tris
> **Code**: Size: 2x2 cells. Factory (produces RTTI_INFANTRYTYPE). Foundation: FACING_NONE. ExitList=ExitPyle.
| `b_tent` | `STRUCT_TENT` | 帐篷兵营 | GLB | `public/assets/buildings/tent.glb` | [ ] Dummy: 锥形帐篷 |
> **Promote**: Tent barracks, canvas military tents
> **Poly**: ≤3,000 tris
> **Code**: Size: 2x2 cells. Factory (produces RTTI_INFANTRYTYPE). Foundation: FACING_NONE. ExitList=ExitPyle.
| `b_kennel` | `STRUCT_KENNEL` | 军犬窝 | GLB | `public/assets/buildings/kennel.glb` | [ ] Dummy: 小 Box + 围栏 |
> **Promote**: Kennel, small dog house with fenced yard
> **Poly**: ≤1,500 tris
> **Code**: Size: 1x1 cell. Factory (produces RTTI_INFANTRYTYPE / dogs). Foundation: FACING_NONE.
| `b_repair` | `STRUCT_REPAIR` | 维修厂 | GLB | `public/assets/buildings/repair.glb` | [ ] Dummy: Box + 起重架 |
> **Promote**: Service depot, repair bay with hydraulic lift and tool racks
> **Poly**: ≤6,000 tris
> **Code**: Size: 3x3 cells. Foundation: FACING_NONE. Repair facility. Vehicles drive onto center for repair.
| `b_helipad` | `STRUCT_HELIPAD` | 直升机停机坪 | GLB | `public/assets/buildings/helipad.glb` | [ ] Dummy: 圆台 + H标记 |
> **Promote**: Helipad, circular landing pad with H marking and refuel station
> **Poly**: ≤3,000 tris
> **Code**: Size: 2x2 cells. Factory (produces RTTI_AIRCRAFTTYPE). Foundation: FACING_NONE.
| `b_airstrip` | `STRUCT_AIRSTRIP` | 飞机跑道 (Nod) | GLB | `public/assets/buildings/airstrip.glb` | [ ] Dummy: 长跑道 Box |
> **Promote**: Airfield, long runway with hangar and control tower
> **Poly**: ≤6,000 tris
> **Code**: Size: 3x2 cells. Factory (produces RTTI_AIRCRAFTTYPE). Foundation: FACING_S. Fixed-wing aircraft landing strip.
| `b_shipyard` | `STRUCT_SHIP_YARD` | 船坞 | GLB | `public/assets/buildings/shipyard.glb` | [ ] Dummy: 大 Box + 干船坞 |
> **Promote**: Ship yard, large dry dock with gantry crane and water gate
> **Poly**: ≤7,000 tris
> **Code**: Size: 3x3 cells. Factory (produces RTTI_VESSELTYPE). Foundation: FACING_NONE.
| `b_subpen` | `STRUCT_SUB_PEN` | 潜艇船坞 | GLB | `public/assets/buildings/subpen.glb` | [ ] Dummy: 大 Box + 水下入口 |
> **Promote**: Submarine pen, concrete bunker with underwater entrance
> **Poly**: ≤7,000 tris
> **Code**: Size: 3x3 cells. Factory (produces RTTI_VESSELTYPE). Foundation: FACING_NONE.

#### 1.5.3 科技/支援建筑

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `b_radar` | `STRUCT_RADAR` | 雷达站 (Radar Dome) | GLB | `public/assets/buildings/radar.glb` | [ ] Dummy: Box + 旋转碟片 |
> **Promote**: Radar dome, geodesic dome with rotating radar dish on top
> **Poly**: ≤4,000 tris
> **Code**: Size: 2x2 cells. Foundation: FACING_NONE. Needs rotating radar dish mesh on top. Provides minimap.
| `b_gap` | `STRUCT_GAP` | 遮蔽发生器 | GLB | `public/assets/buildings/gap.glb` | [ ] Dummy: Box + 天线阵列 |
> **Promote**: Gap generator, tall antenna array with electronic warfare equipment
> **Poly**: ≤2,500 tris
> **Code**: Size: 1x2 cells. Foundation: FACING_S. Creates shroud around base.
| `b_advtech` | `STRUCT_ADVANCED_TECH` | 科技中心 (Allied Tech) | GLB | `public/assets/buildings/advtech.glb` | [ ] Dummy: 大 Box + 卫星天线 |
> **Promote**: Allied tech center, modern laboratory with satellite dish
> **Poly**: ≤4,000 tris
> **Code**: Size: 2x2 cells. Foundation: FACING_NONE. Simple damage.
| `b_sovtech` | `STRUCT_SOVIET_TECH` | 苏联科技中心 | GLB | `public/assets/buildings/sovtech.glb` | [ ] Dummy: 大 Box + 天线 |
> **Promote**: Soviet tech center, brutalist concrete building with antenna
> **Poly**: ≤6,000 tris
> **Code**: Size: 3x3 cells. Simple damage. Foundation: FACING_S.
| `b_hospital` | `STRUCT_HOSPITAL` | 医院 | GLB | `public/assets/buildings/hospital.glb` | [ ] Dummy: Box + 十字标志 |
> **Promote**: Hospital, white building with red cross and ambulance bay
> **Poly**: ≤4,000 tris
> **Code**: Size: 2x2 cells. Foundation: FACING_NONE. Heals nearby infantry.
| `b_biolab` | `STRUCT_BIO_LAB` | 生化实验室 | GLB | `public/assets/buildings/biolab.glb` | [ ] Dummy: Box + 圆顶 |
> **Promote**: Bio laboratory, green-domed research facility
> **Poly**: ≤4,000 tris
> **Code**: Size: 2x2 cells. Foundation: FACING_NONE.
| `b_mission` | `STRUCT_MISSION` | 任务建筑 (钱宁研究所) | GLB | `public/assets/buildings/mission.glb` | [ ] Dummy: 独特造型 Box |
> **Promote**: Mission building, unique architecture (Chronosphere research facility)
> **Poly**: ≤5,000 tris
> **Code**: Size: 3x2 cells. Simple damage. Foundation: FACING_NONE.
| `b_forward` | `STRUCT_FORWARD_COM` | 前进指挥部 | GLB | `public/assets/buildings/forward.glb` | [ ] Dummy: Box + 天线 |
> **Promote**: Forward command post, small field HQ with radio antennas
> **Poly**: ≤3,500 tris
> **Code**: Size: 2x2 cells. Simple damage. Foundation: FACING_S.

#### 1.5.4 防御工事 / 围墙

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `b_sandbag` | `STRUCT_SANDBAG_WALL` | 沙袋墙 | GLB | `public/assets/buildings/sandbag.glb` | [ ] Dummy: 矮 Box 段 |
> **Promote**: Sandbag wall segment, stacked sandbags barrier
> **Poly**: ≤300 tris
> **Code**: Size: 1x1 cell. IsWall=true. Simple damage. Low health.
| `b_cyclone` | `STRUCT_CYCLONE_WALL` | 铁丝网 | GLB | `public/assets/buildings/cyclone.glb` | [ ] Dummy: 网格 Plane |
> **Promote**: Chain-link fence segment, metal wire mesh barrier
> **Poly**: ≤300 tris
> **Code**: Size: 1x1 cell. IsWall=true. Simple damage.
| `b_brick` | `STRUCT_BRICK_WALL` | 砖墙 | GLB | `public/assets/buildings/brick.glb` | [ ] Dummy: 厚 Box 段 |
> **Promote**: Brick wall segment, solid concrete brick barrier
> **Poly**: ≤400 tris
> **Code**: Size: 1x1 cell. IsWall=true. Simple damage.
| `b_barbwire` | `STRUCT_BARBWIRE_WALL` | 铁丝网 | GLB | `public/assets/buildings/barbwire.glb` | [ ] Dummy: 带刺线 |
> **Promote**: Barbed wire segment, spiked metal wire obstacle
> **Poly**: ≤300 tris
> **Code**: Size: 1x1 cell. IsWall=true. Simple damage. Damages infantry.
| `b_woodwall` | `STRUCT_WOOD_WALL` | 木栅栏 | GLB | `public/assets/buildings/woodwall.glb` | [ ] Dummy: 薄 Box 段 |
> **Promote**: Wooden fence segment, plank barrier
> **Poly**: ≤300 tris
> **Code**: Size: 1x1 cell. IsWall=true. Simple damage. Wooden (vulnerable to fire).
| `b_fence` | `STRUCT_FENCE` | 围栏 | GLB | `public/assets/buildings/fence.glb` | [ ] Dummy: 细杆 |
> **Promote**: Metal fence segment, thin rail fence
> **Poly**: ≤200 tris
> **Code**: Size: 1x1 cell. IsWall=true. Simple damage.
| `b_avmine` | `STRUCT_AVMINE` | 反载具地雷 | GLB | `public/assets/buildings/avmine.glb` | [ ] Dummy: 小圆盘 |
> **Promote**: Anti-vehicle mine, flat disc buried in ground
> **Poly**: ≤200 tris
> **Code**: Size: 1x1 cell. Simple damage. Invisible until triggered. Explodes when vehicle drives over.
| `b_apmine` | `STRUCT_APMINE` | 反步兵地雷 | GLB | `public/assets/buildings/apmine.glb` | [ ] Dummy: 更小圆盘 |
> **Promote**: Anti-personnel mine, small buried explosive
> **Poly**: ≤150 tris
> **Code**: Size: 1x1 cell. Simple damage. Invisible until triggered.

#### 1.5.5 伪装建筑

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `b_fakeweap` | `STRUCT_FAKEWEAP` | 伪装兵工厂 | GLB | `public/assets/buildings/fakeweap.glb` | [ ] Dummy: 同 weap 但弱 |
> **Promote**: Fake weapons factory, identical to real WEAP but weaker
> **Poly**: ≤6,000 tris
> **Code**: Size: 3x2 cells. IsFake=true. Same visual as WEAP but different health. No production.
| `b_fakeconst` | `STRUCT_FAKECONST` | 伪装建造厂 | GLB | `public/assets/buildings/fakeconst.glb` | [ ] Dummy: 同 const 但弱 |
> **Promote**: Fake construction yard, identical to real FACT but weaker
> **Poly**: ≤8,000 tris
> **Code**: Size: 3x3 cells. IsFake=true. Same visual as FACT.
| `b_fakeyard` | `STRUCT_FAKE_YARD` | 伪装院子 | GLB | `public/assets/buildings/fakeyard.glb` | [ ] Dummy: Box |
> **Promote**: Fake ship yard
> **Poly**: ≤7,000 tris
> **Code**: Size: 3x3 cells. IsFake=true. Same visual as SYRD.
| `b_fakepen` | `STRUCT_FAKE_PEN` | 伪装船坞 | GLB | `public/assets/buildings/fakepen.glb` | [ ] Dummy: Box |
> **Promote**: Fake sub pen
> **Poly**: ≤7,000 tris
> **Code**: Size: 3x3 cells. IsFake=true. Same visual as SPEN.
| `b_fakeradar` | `STRUCT_FAKE_RADAR` | 伪装雷达 | GLB | `public/assets/buildings/fakeradar.glb` | [ ] Dummy: Box + 碟片 |
> **Promote**: Fake radar dome
> **Poly**: ≤4,000 tris
> **Code**: Size: 2x2 cells. IsFake=true. Same visual as DOME.

#### 1.5.6 平民建筑

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `b_v01`–`b_v37` | `STRUCT_V01`–`STRUCT_V37` | 平民建筑 V01-V37 | GLB | `public/assets/buildings/v01.glb` 等 | [ ] Dummy: 随机 Box/Cylinder |
> **Promote**: Civilian building V1, generic town structure (house/store/warehouse)
> **Poly**: ≤3,000 tris
> **Code**: Size: varies (1x1 to 2x2). Theater-specific graphic (temperate/snow). Simple damage. Foundation: FACING_S for most.
| `b_pump` | `STRUCT_PUMP` | 油泵 / 油井 | GLB | `public/assets/buildings/pump.glb` | [ ] Dummy: 摇头泵 |
| `b_barrel` | `STRUCT_BARREL` | 油桶 (可爆炸) | GLB | `public/assets/buildings/barrel.glb` | [ ] Dummy: Cylinder |
> **Promote**: Explosive barrel, red metal drum with hazard stripes
> **Poly**: ≤300 tris
> **Code**: Size: 1x1 cell. Simple damage. Explodes when damaged.
| `b_barrel3` | `STRUCT_BARREL3` | 三堆油桶 | GLB | `public/assets/buildings/barrel3.glb` | [ ] Dummy: 3 Cylinder |
> **Promote**: Three stacked explosive barrels
> **Poly**: ≤500 tris
> **Code**: Size: 1x1 cell. Simple damage. Explodes when damaged.

---

### 1.6 地形装饰模型（TerrainType + OverlayType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 2163-2206 (Terrain), Line 1522-1552 (Overlay)

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `t_tree1` | `TERRAIN_TREE1` | 树木类型 1 | GLB | `public/assets/terrain/tree1.glb` | [ ] Dummy: Cylinder + Sphere |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.
| `t_tree2` | `TERRAIN_TREE2` | 树木类型 2 | GLB | `public/assets/terrain/tree2.glb` | [ ] Dummy: Cylinder + 锥形 |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.
| `t_tree3` | `TERRAIN_TREE3` | 树木类型 3 | GLB | `public/assets/terrain/tree3.glb` | [ ] Dummy: 不同比例树木 |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.
| `t_tree5`–`t_tree17` | `TERRAIN_TREE5`–`TERRAIN_TREE17` | 树木变体 5-17 | GLB | `public/assets/terrain/tree5.glb` 等 | [ ] Dummy: 随机树木 |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.
| `t_clump1`–`t_clump5` | `TERRAIN_CLUMP1`–`TERRAIN_CLUMP5` | 树丛 | GLB | `public/assets/terrain/clump1.glb` 等 | [ ] Dummy: 多棵树组合 |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.
| `t_ice01`–`t_ice05` | `TERRAIN_ICE01`–`TERRAIN_ICE05` | 冰块 (雪地) | GLB | `public/assets/terrain/ice01.glb` 等 | [ ] Dummy: 白色不规则 Box |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.
| `t_boxes01`–`t_boxes09` | `TERRAIN_BOXES01`–`TERRAIN_BOXES09` | 木箱堆 | GLB | `public/assets/terrain/boxes01.glb` 等 | [ ] Dummy: 堆叠 Box |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.
| `t_mine` | `TERRAIN_MINE` | 地形装饰地雷 | GLB | `public/assets/terrain/mine.glb` | [ ] Dummy: 小圆盘 |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.
| `o_sandbag` | `OVERLAY_SANDBAG_WALL` | 沙袋墙覆盖物 | GLB | `public/assets/overlay/sandbag.glb` | [ ] Dummy: 矮 Box 段 |
> **Promote**: Sandbag wall overlay, stacked sandbags barrier (ground-level)
> **Poly**: ≤300 tris
> **Code**: Overlay wall. Size: 1×1 cell. Low health. Placed on ground. Same visual as STRUCT_SANDBAG_WALL but as overlay.
| `o_cyclone` | `OVERLAY_CYCLONE_WALL` | 铁丝网覆盖物 | GLB | `public/assets/overlay/cyclone.glb` | [ ] Dummy: 网格 |
> **Promote**: Chain-link fence overlay, metal wire mesh barrier (ground-level)
> **Poly**: ≤300 tris
> **Code**: Overlay wall. Size: 1×1 cell. Same visual as STRUCT_CYCLONE_WALL but as overlay.
| `o_brick` | `OVERLAY_BRICK_WALL` | 砖墙覆盖物 | GLB | `public/assets/overlay/brick.glb` | [ ] Dummy: 厚 Box |
> **Promote**: Brick wall overlay, solid concrete brick barrier (ground-level)
> **Poly**: ≤400 tris
> **Code**: Overlay wall. Size: 1×1 cell. Same visual as STRUCT_BRICK_WALL but as overlay.
| `o_barbwire` | `OVERLAY_BARBWIRE_WALL` | 铁丝网覆盖物 | GLB | `public/assets/overlay/barbwire.glb` | [ ] Dummy: 带刺线 |
> **Promote**: Barbed wire overlay, spiked metal wire obstacle (ground-level)
> **Poly**: ≤300 tris
> **Code**: Overlay wall. Size: 1×1 cell. Same visual as STRUCT_BARBWIRE_WALL but as overlay.
| `o_woodwall` | `OVERLAY_WOOD_WALL` | 木栅栏覆盖物 | GLB | `public/assets/overlay/woodwall.glb` | [ ] Dummy: 薄 Box |
| `o_gold1`–`o_gold4` | `OVERLAY_GOLD1`–`OVERLAY_GOLD4` | 金矿覆盖 (不同密度) | PNG | `public/assets/overlay/gold1.png` 等 | [ ] Dummy: 黄色发光 Ground |
| `o_gems1`–`o_gems4` | `OVERLAY_GEMS1`–`OVERLAY_GEMS4` | 宝石矿覆盖 | PNG | `public/assets/overlay/gems1.png` 等 | [ ] Dummy: 蓝色发光 Ground |
| `o_crate_wood` | `OVERLAY_WOOD_CRATE` | 木质宝箱 | GLB | `public/assets/overlay/crate_wood.glb` | [ ] Dummy: 小 Box |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.
| `o_crate_steel` | `OVERLAY_STEEL_CRATE` | 钢铁宝箱 | GLB | `public/assets/overlay/crate_steel.glb` | [ ] Dummy: 金属 Box |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.
| `o_crate_water` | `OVERLAY_WATER_CRATE` | 水上宝箱 | GLB | `public/assets/overlay/crate_water.glb` | [ ] Dummy: 漂浮 Box |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.
| `o_flagspot` | `OVERLAY_FLAG_SPOT` | 旗帜起始点 | GLB | `public/assets/overlay/flagspot.glb` | [ ] Dummy: 旗杆 |
> **Promote**: Terrain prop, low-poly decorative object
> **Poly**: ≤500 tris
> **Code**: Static mesh. No animation. Single cell or smaller. No weapon offsets.

---

## 2. 2D 纹理 / 精灵资源（Textures & Sprites）

> **说明**：原始游戏使用 `.SHP` 和 `.CPS` 格式。在 Web 重构中，需转换为 PNG/SVG 序列或 Atlas。

### 2.1 地形模板纹理（TemplateType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 1740-1939+（约 200+ 种模板）

| 类别 | 数量 | 说明 | 格式 | 路径模式 | 状态 |
|------|------|------|------|----------|------|
| 水面 (Water) | ~2 | TEMPLATE_WATER, WATER2 | PNG | `public/assets/templates/water*.png` | [ ] Dummy: 蓝色纯色 |
| 水岸 (Shore) | ~56 | TEMPLATE_SHORE01-56 | PNG | `public/assets/templates/shore*.png` | [ ] Dummy: 蓝绿过渡 |
| 悬崖水岸 (ShoreCliff) | ~38 | TEMPLATE_SHORECLIFF01-38 | PNG | `public/assets/templates/shorecliff*.png` | [ ] Dummy: 灰色斜坡 |
| 巨石 (Boulder) | ~6 | TEMPLATE_BOULDER1-6 | PNG | `public/assets/templates/boulder*.png` | [ ] Dummy: 灰色石块 |
| 草地斑块 (Patch) | ~8 | TEMPLATE_PATCH01-15 | PNG | `public/assets/templates/patch*.png` | [ ] Dummy: 绿色斑块 |
| 河流 (River) | ~13 | TEMPLATE_RIVER01-13 | PNG | `public/assets/templates/river*.png` | [ ] Dummy: 蓝色曲线 |
| 瀑布 (Falls) | ~4 | TEMPLATE_FALLS1/1A/2/2A | PNG | `public/assets/templates/falls*.png` | [ ] Dummy: 蓝色竖条 |
| 浅滩 (Ford) | ~2 | TEMPLATE_FORD1-2 | PNG | `public/assets/templates/ford*.png` | [ ] Dummy: 浅蓝 |
| 桥梁 (Bridge) | ~4 | TEMPLATE_BRIDGE1/1D/2/2D | PNG | `public/assets/templates/bridge*.png` | [ ] Dummy: 灰色长条 |
| 斜坡 (Slope) | ~38 | TEMPLATE_SLOPE01-38 | PNG | `public/assets/templates/slope*.png` | [ ] Dummy: 绿色斜坡 |
| 道路 (Road) | ~26 | TEMPLATE_ROAD01-26 | PNG | `public/assets/templates/road*.png` | [ ] Dummy: 灰色线条 |
| 其余地形... | ~40+ | 铁路、隧道、悬崖、海岸变体等 | PNG | `public/assets/templates/*.png` | [ ] Dummy: 对应纯色 |

**替代方案**：由于模板数量庞大（200+），在 3D 重构中可改用 **程序化地形生成** + **少量混合纹理**，而非逐一还原每个模板。

### 2.2 爆炸与特效动画（AnimType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 2245-2343

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `anim_fireball1` | `ANIM_FBALL1` | 大火球爆炸 | PNG 序列 | `public/assets/anims/fireball1/` | [ ] Dummy: 橙色 Sphere 缩放 |
| `anim_frag1` | `ANIM_FRAG1` | 碎片爆炸 | PNG 序列 | `public/assets/anims/frag1/` | [ ] Dummy: 黄色粒子 |
| `anim_veh_hit1` | `ANIM_VEH_HIT1` | 载具击中 (小火球) | PNG 序列 | `public/assets/anims/veh_hit1/` | [ ] Dummy: 橙色闪光 |
| `anim_veh_hit2` | `ANIM_VEH_HIT2` | 载具击中 (碎片) | PNG 序列 | `public/assets/anims/veh_hit2/` | [ ] Dummy: 火花粒子 |
| `anim_veh_hit3` | `ANIM_VEH_HIT3` | 载具击中 (燃烧) | PNG 序列 | `public/assets/anims/veh_hit3/` | [ ] Dummy: 橙红闪光 |
| `anim_art_exp1` | `ANIM_ART_EXP1` | 火炮爆炸 | PNG 序列 | `public/assets/anims/art_exp1/` | [ ] Dummy: 大型橙色粒子 |
| `anim_napalm1` | `ANIM_NAPALM1` | 凝固汽油弹 (小) | PNG 序列 | `public/assets/anims/napalm1/` | [ ] Dummy: 红色火焰 |
| `anim_napalm2` | `ANIM_NAPALM2` | 凝固汽油弹 (中) | PNG 序列 | `public/assets/anims/napalm2/` | [ ] Dummy: 更大红色火焰 |
| `anim_napalm3` | `ANIM_NAPALM3` | 凝固汽油弹 (大) | PNG 序列 | `public/assets/anims/napalm3/` | [ ] Dummy: 大型红色火焰 |
| `anim_smoke_puff` | `ANIM_SMOKE_PUFF` | 烟雾尾迹 | PNG 序列 | `public/assets/anims/smoke_puff/` | [ ] Dummy: 灰色半透明 Sphere |
| `anim_piff` | `ANIM_PIFF` | 子弹命中 | PNG 序列 | `public/assets/anims/piff/` | [ ] Dummy: 白色闪光 |
| `anim_piffpiff` | `ANIM_PIFFPIFF` | 机枪命中 | PNG 序列 | `public/assets/anims/piffpiff/` | [ ] Dummy: 连续白色闪光 |
| `anim_fire_small` | `ANIM_FIRE_SMALL` | 小火焰 | PNG 序列 | `public/assets/anims/fire_small/` | [ ] Dummy: 红色向上粒子 |
| `anim_fire_med` | `ANIM_FIRE_MED` | 中火焰 | PNG 序列 | `public/assets/anims/fire_med/` | [ ] Dummy: 更大红色粒子 |
| `anim_muzzle_flash` | `ANIM_MUZZLE_FLASH` | 炮口火焰 | PNG 序列 | `public/assets/anims/muzzle_flash/` | [ ] Dummy: 黄色锥形闪光 |
| `anim_smoke_m` | `ANIM_SMOKE_M` | 地面烟雾 | PNG 序列 | `public/assets/anims/smoke_m/` | [ ] Dummy: 灰色上升 Sphere |
| `anim_burn_small`–`anim_burn_big` | `ANIM_BURN_SMALL`–`ANIM_BURN_BIG` | 燃烧效果 (小/中/大) | PNG 序列 | `public/assets/anims/burn_*/` | [ ] Dummy: 红色/橙色粒子 |
| `anim_on_fire_small`–`anim_on_fire_big` | `ANIM_ON_FIRE_SMALL`–`ANIM_ON_FIRE_BIG` | 建筑燃烧 | PNG 序列 | `public/assets/anims/on_fire_*/` | [ ] Dummy: 建筑顶部火焰 |
| `anim_sam_*` | `ANIM_SAM_N`–`ANIM_SAM_NW` | SAM 发射 (8方向) | PNG 序列 | `public/assets/anims/sam_*/` | [ ] Dummy: 导弹尾焰 |
| `anim_gun_*` | `ANIM_GUN_N`–`ANIM_GUN_NW` | 炮口火焰 (8方向) | PNG 序列 | `public/assets/anims/gun_*/` | [ ] Dummy: 方向性闪光 |
| `anim_atom_blast` | `ANIM_ATOM_BLAST` | 核爆 | PNG 序列 | `public/assets/anims/atom_blast/` | [ ] Dummy: 白色→橙色 Sphere 快速放大 |
| `anim_chrono_box` | `ANIM_CHRONO_BOX` | 超时空传送效果 | PNG 序列 | `public/assets/anims/chrono_box/` | [ ] Dummy: 蓝色闪烁 Box |
| `anim_gps_box` | `ANIM_GPS_BOX` | GPS 卫星效果 | PNG 序列 | `public/assets/anims/gps_box/` | [ ] Dummy: 绿色扫描线 |
| `anim_invul_box` | `ANIM_INVUL_BOX` | 铁幕效果 | PNG 序列 | `public/assets/anims/invul_box/` | [ ] Dummy: 红色闪烁外壳 |
| `anim_para_box` | `ANIM_PARA_BOX` | 伞兵箱 | PNG 序列 | `public/assets/anims/para_box/` | [ ] Dummy: 降落伞 + 箱子 |
| `anim_sonar_box` | `ANIM_SONAR_BOX` | 声纳脉冲 | PNG 序列 | `public/assets/anims/sonar_box/` | [ ] Dummy: 蓝色波纹 |
| `anim_twinkle1`–`anim_twinkle3` | `ANIM_TWINKLE1`–`ANIM_TWINKLE3` | 闪光点 | PNG 序列 | `public/assets/anims/twinkle*/` | [ ] Dummy: 白色闪烁 |
| `anim_flak` | `ANIM_FLAK` | 防空炮火 | PNG 序列 | `public/assets/anims/flak/` | [ ] Dummy: 黑色烟雾球 |
| `anim_water_exp1`–`anim_water_exp3` | `ANIM_WATER_EXP1`–`ANIM_WATER_EXP3` | 水中爆炸 | PNG 序列 | `public/assets/anims/water_exp*/` | [ ] Dummy: 水花 Sphere |
| `anim_crate_*` | `ANIM_CRATE_*` | 宝箱特效 (多种) | PNG 序列 | `public/assets/anims/crate_*/` | [ ] Dummy: 彩色闪烁 |
| `anim_para_bomb` | `ANIM_PARA_BOMB` | 降落伞炸弹 | PNG 序列 | `public/assets/anims/para_bomb/` | [ ] Dummy: 炸弹 + 伞 |
| `anim_mine_exp1` | `ANIM_MINE_EXP1` | 地雷爆炸 | PNG 序列 | `public/assets/anims/mine_exp1/` | [ ] Dummy: 土色闪光 |
| `anim_flag` | `ANIM_FLAG` | 旗帜 | PNG 序列 | `public/assets/anims/flag/` | [ ] Dummy: 飘动旗帜 |
| `anim_beacon` | `ANIM_BEACON` | 信标 | PNG 序列 | `public/assets/anims/beacon/` | [ ] Dummy: 闪烁标记 |
| `anim_elect_die` | `ANIM_ELECT_DIE` | 电击死亡 | PNG 序列 | `public/assets/anims/elect_die/` | [ ] Dummy: 蓝色电弧 + 骨架 |
| `anim_dog_elect_die` | `ANIM_DOG_ELECT_DIE` | 军犬电击死亡 | PNG 序列 | `public/assets/anims/dog_elect_die/` | [ ] Dummy: 蓝色电弧 |
| `anim_corpse1`–`anim_corpse3` | `ANIM_CORPSE1`–`ANIM_CORPSE3` | 尸体 | PNG 序列 | `public/assets/anims/corpse*/` | [ ] Dummy: 倒地 Capsule |
| `anim_sputdoor` | `ANIM_SPUTDOOR` | 铁幕门开启 | PNG 序列 | `public/assets/anims/sputdoor/` | [ ] Dummy: 红色门扇打开 |

### 2.3 痕迹纹理（SmudgeType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 2216-2236

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `smg_crater1`–`smg_crater6` | `SMUDGE_CRATER1`–`SMUDGE_CRATER6` | 弹坑 (6种大小) | PNG | `public/assets/smudges/crater*.png` | [ ] Dummy: 黑色凹陷圆 |
| `smg_scorch1`–`smg_scorch6` | `SMUDGE_SCORCH1`–`SMUDGE_SCORCH6` | 焦痕 (6种) | PNG | `public/assets/smudges/scorch*.png` | [ ] Dummy: 黑色不规则斑块 |
| `smg_bib1`–`smg_bib3` | `SMUDGE_BIB1`–`SMUDGE_BIB3` | 建筑底座 (Bib) | PNG | `public/assets/smudges/bib*.png` | [ ] Dummy: 灰色地基 |

### 2.4 基础地形与 Theater 纹理

| 资源 ID | 用途 | 格式 | 文件路径 | 状态 |
|---------|------|------|----------|------|
| `tex_clear_temperate` | 温带草地 | PNG / JPG | `public/assets/textures/clear_temperate.png` | [ ] Dummy: #4a7c4a 纯色 |
| `tex_clear_snow` | 雪地 | PNG / JPG | `public/assets/textures/clear_snow.png` | [ ] Dummy: #e8e8e8 纯色 |
| `tex_clear_interior` | 室内地面 | PNG / JPG | `public/assets/textures/clear_interior.png` | [ ] Dummy: #808080 纯色 |
| `tex_road_temperate` | 温带道路 | PNG / JPG | `public/assets/textures/road_temperate.png` | [ ] Dummy: #888888 纯色 |
| `tex_road_snow` | 雪地道路 | PNG / JPG | `public/assets/textures/road_snow.png` | [ ] Dummy: #a0a0a0 纯色 |
| `tex_water` | 水面 | PNG / JPG | `public/assets/textures/water.png` | [ ] Dummy: 蓝色 StandardMaterial |
| `tex_rock` | 岩石 | PNG / JPG | `public/assets/textures/rock.png` | [ ] Dummy: #666666 纯色 |
| `tex_beach` | 沙滩 | PNG / JPG | `public/assets/textures/beach.png` | [ ] Dummy: #c2b280 纯色 |
| `tex_rough` | 粗糙地形 | PNG / JPG | `public/assets/textures/rough.png` | [ ] Dummy: #5a6b5a 纯色 |
| `tex_tiberium` | 泰伯利亚 / 矿脉 | PNG / JPG | `public/assets/textures/tiberium.png` | [ ] Dummy: 绿色发光 Ground |

---

## 3. 音频资源（Audio）

### 3.1 单位语音与音效（VocType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 3152-3343（共 100+ 条）

#### 通用回应语音

| 资源 ID | C++ 枚举 | 说明 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `voc_acknowl` | `VOC_ACKNOWL` | "Acknowledged" | OGG | `public/assets/audio/voc/acknowl.ogg` | [ ] Dummy: 800Hz 蜂鸣 0.15s |
| `voc_affirm` | `VOC_AFFIRM` | "Affirmative" | OGG | `public/assets/audio/voc/affirm.ogg` | [ ] Dummy: 800Hz 蜂鸣 0.15s |
| `voc_await` | `VOC_AWAIT` | "Awaiting orders" | OGG | `public/assets/audio/voc/await.ogg` | [ ] Dummy: 700Hz 蜂鸣 0.2s |
| `voc_ready` | `VOC_READY` | "Ready and waiting" | OGG | `public/assets/audio/voc/ready.ogg` | [ ] Dummy: 750Hz 蜂鸣 0.2s |
| `voc_report` | `VOC_REPORT` | "Reporting" | OGG | `public/assets/audio/voc/report.ogg` | [ ] Dummy: 800Hz 蜂鸣 0.15s |
| `voc_roger` | `VOC_ROGER` | "Roger" | OGG | `public/assets/audio/voc/roger.ogg` | [ ] Dummy: 800Hz 短蜂鸣 |
| `voc_yessir` | `VOC_YESSIR` | "Yes sir" | OGG | `public/assets/audio/voc/yessir.ogg` | [ ] Dummy: 800Hz 蜂鸣 0.15s |
| `voc_gotit` | `VOC_UGOTIT` | "You got it" | OGG | `public/assets/audio/voc/ugotit.ogg` | [ ] Dummy: 800Hz 蜂鸣 |
| `voc_rightaway` | `VOC_RIGHT_AWAY` | "Right away sir" | OGG | `public/assets/audio/voc/rightaway.ogg` | [ ] Dummy: 800Hz 蜂鸣 0.2s |
| `voc_vehicle` | `VOC_VEHIC` | "Vehicle reporting" | OGG | `public/assets/audio/voc/vehic.ogg` | [ ] Dummy: 600Hz 蜂鸣 |
| `voc_noprob` | `VOC_NO_PROB` | "Not a problem" | OGG | `public/assets/audio/voc/noprob.ogg` | [ ] Dummy: 700Hz 蜂鸣 |
| `voc_eng_affirm` | `VOC_ENG_AFFIRM` | 工程师 "Affirmative" | OGG | `public/assets/audio/voc/eng_affirm.ogg` | [ ] Dummy: 700Hz 蜂鸣 |
| `voc_eng_eng` | `VOC_ENG_ENG` | 工程师 "Engineering" | OGG | `public/assets/audio/voc/eng_eng.ogg` | [ ] Dummy: 700Hz 蜂鸣 |
| `voc_eng_moveout` | `VOC_ENG_MOVEOUT` | 工程师 "Movin' out" | OGG | `public/assets/audio/voc/eng_moveout.ogg` | [ ] Dummy: 700Hz 蜂鸣 |
| `voc_eng_yes` | `VOC_ENG_YES` | 工程师 "Yes sir" | OGG | `public/assets/audio/voc/eng_yes.ogg` | [ ] Dummy: 700Hz 蜂鸣 |

#### 战斗音效

| 资源 ID | C++ 枚举 | 说明 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `voc_cannon1` | `VOC_CANNON1` | 火炮 (中) | OGG | `public/assets/audio/sfx/cannon1.ogg` | [ ] Dummy: 200Hz 低频噪声 0.2s |
| `voc_cannon2` | `VOC_CANNON2` | 火炮 (短) | OGG | `public/assets/audio/sfx/cannon2.ogg` | [ ] Dummy: 200Hz 低频噪声 0.15s |
| `voc_cannon6` | `VOC_CANNON6` | 火炮 (长闷响) | OGG | `public/assets/audio/sfx/cannon6.ogg` | [ ] Dummy: 150Hz 低频噪声 0.3s |
| `voc_cannon7` | `VOC_CANNON7` | 火炮 (机械感) | OGG | `public/assets/audio/sfx/cannon7.ogg` | [ ] Dummy: 200Hz 机械噪声 |
| `voc_cannon8` | `VOC_CANNON8` | 火炮 (尖锐) | OGG | `public/assets/audio/sfx/cannon8.ogg` | [ ] Dummy: 300Hz 尖锐噪声 |
| `voc_gun_rifle` | `VOC_GUN_RIFLE` | 步枪射击 | OGG | `public/assets/audio/sfx/gun_rifle.ogg` | [ ] Dummy: 白噪声 0.05s |
| `voc_gun5` | `VOC_GUN_5` | 5发点射 (慢) | OGG | `public/assets/audio/sfx/gun5.ogg` | [ ] Dummy: 白噪声脉冲 5次 |
| `voc_gun7` | `VOC_GUN_7` | 7发点射 (快) | OGG | `public/assets/audio/sfx/gun7.ogg` | [ ] Dummy: 白噪声脉冲 7次 |
| `voc_gun5f` | `VOC_GUN_5F` | 5发点射 (快) | OGG | `public/assets/audio/sfx/gun5f.ogg` | [ ] Dummy: 白噪声脉冲 5次 |
| `voc_gun5r` | `VOC_GUN_5R` | 5发点射 (咔嗒) | OGG | `public/assets/audio/sfx/gun5r.ogg` | [ ] Dummy: 白噪声脉冲 |
| `voc_missile1` | `VOC_MISSILE_1` | 导弹 (高科技) | OGG | `public/assets/audio/sfx/missile1.ogg` | [ ] Dummy: 上升蜂鸣 |
| `voc_missile2` | `VOC_MISSILE_2` | 导弹 (长发射) | OGG | `public/assets/audio/sfx/missile2.ogg` | [ ] Dummy: 长上升蜂鸣 |
| `voc_missile3` | `VOC_MISSILE_3` | 导弹 (短发射) | OGG | `public/assets/audio/sfx/missile3.ogg` | [ ] Dummy: 短上升蜂鸣 |
| `voc_torpedo` | `VOC_TORPEDO` | 鱼雷发射 | OGG | `public/assets/audio/sfx/torpedo.ogg` | [ ] Dummy: 水下嗖嗖声 |
| `voc_grenade` | `VOC_GRENADE_TOSS` | 手雷投掷 | OGG | `public/assets/audio/sfx/grenade_toss.ogg` | [ ] Dummy: 嗖嗖声 |
| `voc_fire_launch` | `VOC_FIRE_LAUNCH` | 火球发射 | OGG | `public/assets/audio/sfx/fire_launch.ogg` | [ ] Dummy: 呼呼声 |
| `voc_fire_explode` | `VOC_FIRE_EXPLODE` | 火球爆炸 | OGG | `public/assets/audio/sfx/fire_explode.ogg` | [ ] Dummy: 爆燃声 |
| `voc_napalm` | `VOC_NAPALM` | 凝固汽油弹 | OGG | `public/assets/audio/sfx/napalm.ogg` | [ ] Dummy: 火焰呼啸 |
| `voc_tesla_zap` | `VOC_TESLA_ZAP` | 磁暴电击 | OGG | `public/assets/audio/sfx/tesla_zap.ogg` | [ ] Dummy: 电火花声 |
| `voc_tesla_power` | `VOC_TESLA_POWER_UP` | 磁暴充能 | OGG | `public/assets/audio/sfx/tesla_power.ogg` | [ ] Dummy: 50Hz→200Hz 上升 |
| `voc_depth_charge` | `VOC_DEPTH_CHARGE` | 深水炸弹 | OGG | `public/assets/audio/sfx/depth_charge.ogg` | [ ] Dummy: 水下闷爆 |

#### 爆炸音效

| 资源 ID | C++ 枚举 | 说明 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `voc_kaboom1` | `VOC_KABOOM1` | 爆炸 (长闷响) | OGG | `public/assets/audio/sfx/kaboom1.ogg` | [ ] Dummy: 100-50Hz 扫频 0.3s |
| `voc_kaboom12` | `VOC_KABOOM12` | 爆炸 (很长闷响) | OGG | `public/assets/audio/sfx/kaboom12.ogg` | [ ] Dummy: 100-40Hz 扫频 0.5s |
| `voc_kaboom15` | `VOC_KABOOM15` | 爆炸 (极长闷响) | OGG | `public/assets/audio/sfx/kaboom15.ogg` | [ ] Dummy: 100-30Hz 扫频 0.6s |
| `voc_kaboom22` | `VOC_KABOOM22` | 爆炸 (长尖锐) | OGG | `public/assets/audio/sfx/kaboom22.ogg` | [ ] Dummy: 150-30Hz 扫频 0.4s |
| `voc_kaboom25` | `VOC_KABOOM25` | 爆炸 (短咆哮) | OGG | `public/assets/audio/sfx/kaboom25.ogg` | [ ] Dummy: 150-50Hz 短扫频 |
| `voc_kaboom30` | `VOC_KABOOM30` | 爆炸 (短HE) | OGG | `public/assets/audio/sfx/kaboom30.ogg` | [ ] Dummy: 200-80Hz 短扫频 |
| `voc_splash` | `VOC_SPLASH` | 水花 | OGG | `public/assets/audio/sfx/splash.ogg` | [ ] Dummy: 水声 |
| `voc_mineblow` | `VOC_MINEBLOW` | 地雷爆炸 | OGG | `public/assets/audio/sfx/mineblow.ogg` | [ ] Dummy: 土色闷爆 |
| `voc_trip_mine` | `VOC_TRIP_MINE` | 地雷触发 | OGG | `public/assets/audio/sfx/trip_mine.ogg` | [ ] Dummy: 咔嗒+爆 |

#### 步兵死亡与动物

| 资源 ID | C++ 枚举 | 说明 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `voc_scream1` | `VOC_SCREAM1` | 尖叫 (短) | OGG | `public/assets/audio/sfx/scream1.ogg` | [ ] Dummy: 高频衰减 0.2s |
| `voc_scream3`–`voc_scream7` | `VOC_SCREAM3`–`VOC_SCREAM7` | 尖叫变体 | OGG | `public/assets/audio/sfx/scream*.ogg` | [ ] Dummy: 高频衰减 |
| `voc_scream10`–`voc_scream11` | `VOC_SCREAM10`–`VOC_SCREAM11` | 尖叫变体 | OGG | `public/assets/audio/sfx/scream*.ogg` | [ ] Dummy: 高频衰减 |
| `voc_yell1` | `VOC_YELL1` | 惨叫 (长) | OGG | `public/assets/audio/sfx/yell1.ogg` | [ ] Dummy: 长高频衰减 0.4s |
| `voc_tanya_die` | `VOC_TANYA_DIE` | 谭雅死亡尖叫 | OGG | `public/assets/audio/sfx/tanya_die.ogg` | [ ] Dummy: 高频尖叫 |
| `voc_dog_bark` | `VOC_DOG_BARK` | 狗吠 | OGG | `public/assets/audio/sfx/dog_bark.ogg` | [ ] Dummy: 短脉冲 500Hz |
| `voc_dog_growl` | `VOC_DOG_GROWL2` | 狗低吼 | OGG | `public/assets/audio/sfx/dog_growl.ogg` | [ ] Dummy: 低频噪声 |
| `voc_dog_whine` | `VOC_DOG_WHINE` | 狗哀鸣 | OGG | `public/assets/audio/sfx/dog_whine.ogg` | [ ] Dummy: 衰减高频 |
| `voc_dog_hurt` | `VOC_DOG_HURT` | 狗受伤 | OGG | `public/assets/audio/sfx/dog_hurt.ogg` | [ ] Dummy: 高频哀鸣 |
| `voc_dog_yes` | `VOC_DOG_YES` | 狗 "Yes sir" | OGG | `public/assets/audio/sfx/dog_yes.ogg` | [ ] Dummy: 短吠 |
| `voc_squish` | `VOC_SQUISH` | 碾压声 | OGG | `public/assets/audio/sfx/squish.ogg` | [ ] Dummy: 湿闷声 |
| `voc_elect_die` | `VOC_ELECT_DIE` | 电击死亡 | OGG | `public/assets/audio/sfx/elect_die.ogg` | [ ] Dummy: 电火花+尖叫 |

#### 建筑与建造音效

| 资源 ID | C++ 枚举 | 说明 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `voc_place_building` | `VOC_PLACE_BUILDING_DOWN` | 建筑放置 | OGG | `public/assets/audio/sfx/place_building.ogg` | [ ] Dummy: 400Hz 下降蜂鸣 0.3s |
| `voc_construction` | `VOC_CONSTRUCTION` | 建造中 | OGG | `public/assets/audio/sfx/construction.ogg` | [ ] Dummy: 机械咔嗒循环 |
| `voc_crumble` | `VOC_CRUMBLE` | 建筑倒塌 | OGG | `public/assets/audio/sfx/crumble.ogg` | [ ] Dummy: 低频崩塌声 |
| `voc_door` | `VOC_DOOR` | 液压门 | OGG | `public/assets/audio/sfx/door.ogg` | [ ] Dummy: 气泵声 |
| `voc_sandbag` | `VOC_SANDBAG` | 沙袋声 | OGG | `public/assets/audio/sfx/sandbag.ogg` | [ ] Dummy: 沙沙声 |
| `voc_wallkill` | `VOC_WALLKILL2` | 墙体摧毁 | OGG | `public/assets/audio/sfx/wallkill.ogg` | [ ] Dummy: 碎裂声 |
| `voc_radar_on` | `VOC_RADAR_ON` | 雷达开启 | OGG | `public/assets/audio/sfx/radar_on.ogg` | [ ] Dummy: 电子启动声 |
| `voc_radar_off` | `VOC_RADAR_OFF` | 雷达关闭 | OGG | `public/assets/audio/sfx/radar_off.ogg` | [ ] Dummy: 电子关闭声 |
| `voc_money_up` | `VOC_MONEY_UP` | 资金增加 | OGG | `public/assets/audio/sfx/money_up.ogg` | [ ] Dummy: 上升叮 |
| `voc_money_down` | `VOC_MONEY_DOWN` | 资金减少 | OGG | `public/assets/audio/sfx/money_down.ogg` | [ ] Dummy: 下降叮 |
| `voc_cashturn` | `VOC_CASHTURN` | 资金到账 | OGG | `public/assets/audio/sfx/cashturn.ogg` | [ ] Dummy: 空气制动声 |
| `voc_heal` | `VOC_HEAL` | 治疗 | OGG | `public/assets/audio/sfx/heal.ogg` | [ ] Dummy: 柔和上升音 |
| `voc_invulnerable` | `VOC_INVULNERABLE` | 无敌效果 | OGG | `public/assets/audio/sfx/invulnerable.ogg` | [ ] Dummy: 金属共鸣 |
| `voc_chrono` | `VOC_CHRONO` | 超时空传送 | OGG | `public/assets/audio/sfx/chrono.ogg` | [ ] Dummy: 扭曲空间声 |
| `voc_sonar` | `VOC_SONAR` | 声纳脉冲 | OGG | `public/assets/audio/sfx/sonar.ogg` | [ ] Dummy: 水下 pings |
| `voc_iron1` | `VOC_IRON1` | 铁幕启动 | OGG | `public/assets/audio/sfx/iron1.ogg` | [ ] Dummy: 金属轰鸣 |
| `voc_chute` | `VOC_CHUTE1` | 降落伞风声 | OGG | `public/assets/audio/sfx/chute.ogg` | [ ] Dummy: 风嗖嗖 |
| `voc_beep` | `VOC_BEEP` | 通用蜂鸣 | OGG | `public/assets/audio/sfx/beep.ogg` | [ ] Dummy: 800Hz 短蜂鸣 |
| `voc_click` | `VOC_CLICK` | 通用点击 | OGG | `public/assets/audio/sfx/click.ogg` | [ ] Dummy: 短咔嗒 |
| `voc_silencer` | `VOC_SILENCER` | 消音器 | OGG | `public/assets/audio/sfx/silencer.ogg` | [ ] Dummy: 极短闷响 |
| `voc_scold` | `VOC_SCOLD` | 责备提示 | OGG | `public/assets/audio/sfx/scold.ogg` | [ ] Dummy: 低频警告 |
| `voc_subshow` | `VOC_SUBSHOW` | 潜艇上浮 | OGG | `public/assets/audio/sfx/subshow.ogg` | [ ] Dummy: 水声 |

#### UI / 系统音效

| 资源 ID | C++ 枚举 | 说明 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `voc_game_closed` | `VOC_GAME_CLOSED` | 游戏关闭 | OGG | `public/assets/audio/ui/game_closed.ogg` | [ ] Dummy: 长哔声 |
| `voc_incoming_message` | `VOC_INCOMING_MESSAGE` | 消息到来 | OGG | `public/assets/audio/ui/incoming_message.ogg` | [ ] Dummy: 柔和提示 |
| `voc_sys_error` | `VOC_SYS_ERROR` | 系统错误 | OGG | `public/assets/audio/ui/sys_error.ogg` | [ ] Dummy: 尖锐警告 |
| `voc_options_changed` | `VOC_OPTIONS_CHANGED` | 选项更改 | OGG | `public/assets/audio/ui/options_changed.ogg` | [ ] Dummy: 柔和确认 |
| `voc_game_forming` | `VOC_GAME_FORMING` | 游戏组建中 | OGG | `public/assets/audio/ui/game_forming.ogg` | [ ] Dummy: 柔和提示 |
| `voc_player_left` | `VOC_PLAYER_LEFT` | 玩家离开 | OGG | `public/assets/audio/ui/player_left.ogg` | [ ] Dummy: 下降提示 |
| `voc_player_joined` | `VOC_PLAYER_JOINED` | 玩家加入 | OGG | `public/assets/audio/ui/player_joined.ogg` | [ ] Dummy: 上升提示 |

#### 谭雅语音 (Tanya)

| 资源 ID | C++ 枚举 | 说明 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `voc_tanya_chew` | `VOC_TANYA_CHEW` | "Chew on this" | OGG | `public/assets/audio/voc/tanya_chew.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_tanya_rock` | `VOC_TANYA_ROCK` | "Let's rock" | OGG | `public/assets/audio/voc/tanya_rock.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_tanya_laugh` | `VOC_TANYA_LAUGH` | "Ha ha ha" | OGG | `public/assets/audio/voc/tanya_laugh.ogg` | [ ] Dummy: 笑声合成 |
| `voc_tanya_shake` | `VOC_TANYA_SHAKE` | "Shake it baby" | OGG | `public/assets/audio/voc/tanya_shake.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_tanya_ching` | `VOC_TANYA_CHING` | "Cha Ching" | OGG | `public/assets/audio/voc/tanya_ching.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_tanya_got` | `VOC_TANYA_GOT` | "That's all you got" | OGG | `public/assets/audio/voc/tanya_got.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_tanya_kiss` | `VOC_TANYA_KISS` | "Kiss it bye bye" | OGG | `public/assets/audio/voc/tanya_kiss.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_tanya_there` | `VOC_TANYA_THERE` | "I'm there" | OGG | `public/assets/audio/voc/tanya_there.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_tanya_give` | `VOC_TANYA_GIVE` | "Give it to me" | OGG | `public/assets/audio/voc/tanya_give.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_tanya_yea` | `VOC_TANYA_YEA` | "Yea?" | OGG | `public/assets/audio/voc/tanya_yea.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_tanya_yes` | `VOC_TANYA_YES` | "Yes sir?" | OGG | `public/assets/audio/voc/tanya_yes.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_tanya_whats` | `VOC_TANYA_WHATS` | "What's up" | OGG | `public/assets/audio/voc/tanya_whats.ogg` | [ ] Dummy: 女声蜂鸣 |

#### 间谍 / 医疗兵 / 小偷语音

| 资源 ID | C++ 枚举 | 说明 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `voc_spy_cmdr` | `VOC_SPY_COMMANDER` | 间谍 "Commander?" | OGG | `public/assets/audio/voc/spy_cmdr.ogg` | [ ] Dummy: 英式蜂鸣 |
| `voc_spy_yessir` | `VOC_SPY_YESSIR` | 间谍 "Yes sir" | OGG | `public/assets/audio/voc/spy_yessir.ogg` | [ ] Dummy: 英式蜂鸣 |
| `voc_spy_indeed` | `VOC_SPY_INDEED` | 间谍 "Indeed" | OGG | `public/assets/audio/voc/spy_indeed.ogg` | [ ] Dummy: 英式蜂鸣 |
| `voc_spy_onway` | `VOC_SPY_ONWAY` | 间谍 "On my way" | OGG | `public/assets/audio/voc/spy_onway.ogg` | [ ] Dummy: 英式蜂鸣 |
| `voc_spy_king` | `VOC_SPY_KING` | 间谍 "For king and country" | OGG | `public/assets/audio/voc/spy_king.ogg` | [ ] Dummy: 英式蜂鸣 |
| `voc_med_reporting` | `VOC_MED_REPORTING` | 医护 "Reporting" | OGG | `public/assets/audio/voc/med_reporting.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_med_yessir` | `VOC_MED_YESSIR` | 医护 "Yes sir" | OGG | `public/assets/audio/voc/med_yessir.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_med_affirm` | `VOC_MED_AFFIRM` | 医护 "Affirmative" | OGG | `public/assets/audio/voc/med_affirm.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_med_moveout` | `VOC_MED_MOVEOUT` | 医护 "Movin' out" | OGG | `public/assets/audio/voc/med_moveout.ogg` | [ ] Dummy: 女声蜂鸣 |
| `voc_thief_yea` | `VOC_THIEF_YEA` | 小偷 "Yea?" | OGG | `public/assets/audio/voc/thief_yea.ogg` | [ ] Dummy: 低声蜂鸣 |
| `voc_thief_moveout` | `VOC_THIEF_MOVEOUT` | 小偷 "Movin' out" | OGG | `public/assets/audio/voc/thief_moveout.ogg` | [ ] Dummy: 低声蜂鸣 |
| `voc_thief_okay` | `VOC_THIEF_OKAY` | 小偷 "Ok" | OGG | `public/assets/audio/voc/thief_okay.ogg` | [ ] Dummy: 低声蜂鸣 |
| `voc_thief_what` | `VOC_THIEF_WHAT` | 小偷 "What" | OGG | `public/assets/audio/voc/thief_what.ogg` | [ ] Dummy: 低声蜂鸣 |
| `voc_thief_affirm` | `VOC_THIEF_AFFIRM` | 小偷 "Affirmative" | OGG | `public/assets/audio/voc/thief_affirm.ogg` | [ ] Dummy: 低声蜂鸣 |

#### CS 扩展语音

| 资源 ID | C++ 枚举 | 说明 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `voc_mech_yes` | `VOC_MECHYES1` | 机械师语音 | OGG | `public/assets/audio/voc/mech_yes.ogg` | [ ] Dummy: 美国南部蜂鸣 |
| `voc_mech_howdy` | `VOC_MECHHOWDY1` | 机械师语音 | OGG | `public/assets/audio/voc/mech_howdy.ogg` | [ ] Dummy: 美国南部蜂鸣 |
| `voc_mech_boss` | `VOC_MECHBOSS1` | 机械师语音 | OGG | `public/assets/audio/voc/mech_boss.ogg` | [ ] Dummy: 美国南部蜂鸣 |
| `voc_stav_*` | `VOC_STAVCMDR` 等 | Stavros 将军语音 | OGG | `public/assets/audio/voc/stav_*.ogg` | [ ] Dummy: 低沉蜂鸣 |
| `voc_buzzy1` | `VOC_BUZZY1` | 特殊语音 | OGG | `public/assets/audio/voc/buzzy1.ogg` | [ ] Dummy: 蜂鸣 |
| `voc_rambo_*` | `VOC_RAMBO1`–`VOC_RAMBO3` | Rambo 语音 | OGG | `public/assets/audio/voc/rambo*.ogg` | [ ] Dummy: 硬汉蜂鸣 |
| `voc_shock_troop` | `VOC_SHOCK_TROOP1` | 磁暴步兵语音 | OGG | `public/assets/audio/voc/shock_troop.ogg` | [ ] Dummy: 俄语口音蜂鸣 |
| `voc_mad_charge` | `VOC_MAD_CHARGE` | MAD 坦克充能 | OGG | `public/assets/audio/voc/mad_charge.ogg` | [ ] Dummy: 机械蜂鸣 |
| `voc_mad_explode` | `VOC_MAD_EXPLODE` | MAD 坦克爆炸 | OGG | `public/assets/audio/voc/mad_explode.ogg` | [ ] Dummy: 巨大蜂鸣 |
| `voc_chronotank` | `VOC_CHRONOTANK1` | 超时空坦克语音 | OGG | `public/assets/audio/voc/chronotank.ogg` | [ ] Dummy: 扭曲蜂鸣 |
| `voc_beacon` | `VOC_BEACON` | 信标 | OGG | `public/assets/audio/voc/beacon.ogg` | [ ] Dummy: 脉冲蜂鸣 |

### 3.2 EVA 播报语音（VoxType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 3348-3447+

| 资源 ID | C++ 枚举 | 说明 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `vox_accomplished` | `VOX_ACCOMPLISHED` | "Mission accomplished" | OGG | `public/assets/audio/eva/accomplished.ogg` | [ ] Dummy: 合成女声 |
| `vox_fail` | `VOX_FAIL` | "Mission failed" | OGG | `public/assets/audio/eva/fail.ogg` | [ ] Dummy: 合成女声 |
| `vox_construction` | `VOX_CONSTRUCTION` | "Construction complete" | OGG | `public/assets/audio/eva/construction.ogg` | [ ] Dummy: 合成女声 |
| `vox_unit_ready` | `VOX_UNIT_READY` | "Unit ready" | OGG | `public/assets/audio/eva/unit_ready.ogg` | [ ] Dummy: 合成女声 |
| `vox_new_construct` | `VOX_NEW_CONSTRUCT` | "New construction options" | OGG | `public/assets/audio/eva/new_construct.ogg` | [ ] Dummy: 合成女声 |
| `vox_no_factory` | `VOX_NO_FACTORY` | "Unable to comply..." | OGG | `public/assets/audio/eva/no_factory.ogg` | [ ] Dummy: 合成女声 |
| `vox_deploy` | `VOX_DEPLOY` | "Cannot deploy here" | OGG | `public/assets/audio/eva/deploy.ogg` | [ ] Dummy: 合成女声 |
| `vox_structure_destroyed` | `VOX_STRUCTURE_DESTROYED` | "Structure destroyed" | OGG | `public/assets/audio/eva/structure_destroyed.ogg` | [ ] Dummy: 合成女声 |
| `vox_insufficient_power` | `VOX_INSUFFICIENT_POWER` | "Insufficient power" | OGG | `public/assets/audio/eva/insufficient_power.ogg` | [ ] Dummy: 合成女声 |
| `vox_no_cash` | `VOX_NO_CASH` | "Insufficient funds" | OGG | `public/assets/audio/eva/no_cash.ogg` | [ ] Dummy: 合成女声 |
| `vox_control_exit` | `VOX_CONTROL_EXIT` | "Battle control terminated" | OGG | `public/assets/audio/eva/control_exit.ogg` | [ ] Dummy: 合成女声 |
| `vox_reinforcements` | `VOX_REINFORCEMENTS` | "Reinforcements have arrived" | OGG | `public/assets/audio/eva/reinforcements.ogg` | [ ] Dummy: 合成女声 |
| `vox_canceled` | `VOX_CANCELED` | "Canceled" | OGG | `public/assets/audio/eva/canceled.ogg` | [ ] Dummy: 合成女声 |
| `vox_building` | `VOX_BUILDING` | "Building" | OGG | `public/assets/audio/eva/building.ogg` | [ ] Dummy: 合成女声 |
| `vox_low_power` | `VOX_LOW_POWER` | "Low power" | OGG | `public/assets/audio/eva/low_power.ogg` | [ ] Dummy: 合成女声 |
| `vox_need_money` | `VOX_NEED_MO_MONEY` | "Need more funds" | OGG | `public/assets/audio/eva/need_money.ogg` | [ ] Dummy: 合成女声 |
| `vox_base_under_attack` | `VOX_BASE_UNDER_ATTACK` | "Our base is under attack" | OGG | `public/assets/audio/eva/base_under_attack.ogg` | [ ] Dummy: 合成女声 |
| `vox_unable_to_build` | `VOX_UNABLE_TO_BUILD` | "Unable to build more" | OGG | `public/assets/audio/eva/unable_to_build.ogg` | [ ] Dummy: 合成女声 |
| `vox_primary_selected` | `VOX_PRIMARY_SELECTED` | "Primary building selected" | OGG | `public/assets/audio/eva/primary_selected.ogg` | [ ] Dummy: 合成女声 |
| `vox_unit_lost` | `VOX_UNIT_LOST` | "Unit lost" | OGG | `public/assets/audio/eva/unit_lost.ogg` | [ ] Dummy: 合成女声 |
| `vox_select_target` | `VOX_SELECT_TARGET` | "Select target" | OGG | `public/assets/audio/eva/select_target.ogg` | [ ] Dummy: 合成女声 |
| `vox_prepare` | `VOX_PREPARE` | "Enemy approaching" | OGG | `public/assets/audio/eva/prepare.ogg` | [ ] Dummy: 合成女声 |
| `vox_need_capacity` | `VOX_NEED_MO_CAPACITY` | "Silos needed" | OGG | `public/assets/audio/eva/need_capacity.ogg` | [ ] Dummy: 合成女声 |
| `vox_suspended` | `VOX_SUSPENDED` | "On hold" | OGG | `public/assets/audio/eva/suspended.ogg` | [ ] Dummy: 合成女声 |
| `vox_repairing` | `VOX_REPAIRING` | "Repairing" | OGG | `public/assets/audio/eva/repairing.ogg` | [ ] Dummy: 合成女声 |
| `vox_aircraft_lost` | `VOX_AIRCRAFT_LOST` | "Aircraft lost" | OGG | `public/assets/audio/eva/aircraft_lost.ogg` | [ ] Dummy: 合成女声 |
| `vox_building_infiltrated` | `VOX_BUILDING_INFILTRATED` | "Building infiltrated" | OGG | `public/assets/audio/eva/building_infiltrated.ogg` | [ ] Dummy: 合成女声 |
| `vox_chrono_charging` | `VOX_CHRONO_CHARGING` | "Chronosphere charging" | OGG | `public/assets/audio/eva/chrono_charging.ogg` | [ ] Dummy: 合成女声 |
| `vox_chrono_ready` | `VOX_CHRONO_READY` | "Chronosphere ready" | OGG | `public/assets/audio/eva/chrono_ready.ogg` | [ ] Dummy: 合成女声 |
| `vox_hq_under_attack` | `VOX_HQ_UNDER_ATTACK` | "HQ under attack" | OGG | `public/assets/audio/eva/hq_under_attack.ogg` | [ ] Dummy: 合成女声 |
| `vox_convoy_approaching` | `VOX_CONVOY_APPROACHING` | "Convoy approaching" | OGG | `public/assets/audio/eva/convoy_approaching.ogg` | [ ] Dummy: 合成女声 |
| `vox_money_stolen` | `VOX_MONEY_STOLEN` | "Funds stolen" | OGG | `public/assets/audio/eva/money_stolen.ogg` | [ ] Dummy: 合成女声 |
| `vox_satellite_launched` | `VOX_SATALITE_LAUNCHED` | "Satellite launched" | OGG | `public/assets/audio/eva/satellite_launched.ogg` | [ ] Dummy: 合成女声 |
| `vox_sonar_available` | `VOX_SONAR_AVAILABLE` | "Sonar available" | OGG | `public/assets/audio/eva/sonar_available.ogg` | [ ] Dummy: 合成女声 |
| `vox_training` | `VOX_TRAINING` | "Training" | OGG | `public/assets/audio/eva/training.ogg` | [ ] Dummy: 合成女声 |
| `vox_abomb_ready` | `VOX_ABOMB_READY` | "A-bomb ready" | OGG | `public/assets/audio/eva/abomb_ready.ogg` | [ ] Dummy: 合成女声 |
| `vox_abomb_launch` | `VOX_ABOMB_LAUNCH` | "A-bomb launch detected" | OGG | `public/assets/audio/eva/abomb_launch.ogg` | [ ] Dummy: 合成女声 |
| `vox_iron_charging` | `VOX_IRON_CHARGING` | "Iron Curtain charging" | OGG | `public/assets/audio/eva/iron_charging.ogg` | [ ] Dummy: 合成女声 |
| `vox_iron_ready` | `VOX_IRON_READY` | "Iron Curtain ready" | OGG | `public/assets/audio/eva/iron_ready.ogg` | [ ] Dummy: 合成女声 |
| `vox_upgrade_armor` | `VOX_UPGRADE_ARMOR` | "Armor upgraded" | OGG | `public/assets/audio/eva/upgrade_armor.ogg` | [ ] Dummy: 合成女声 |
| `vox_upgrade_firepower` | `VOX_UPGRADE_FIREPOWER` | "Firepower upgraded" | OGG | `public/assets/audio/eva/upgrade_firepower.ogg` | [ ] Dummy: 合成女声 |
| `vox_upgrade_speed` | `VOX_UPGRADE_SPEED` | "Speed upgraded" | OGG | `public/assets/audio/eva/upgrade_speed.ogg` | [ ] Dummy: 合成女声 |
| `vox_mission_timer` | `VOX_MISSION_TIMER` | "Mission timer initialized" | OGG | `public/assets/audio/eva/mission_timer.ogg` | [ ] Dummy: 合成女声 |
| `vox_unit_repaired` | `VOX_UNIT_REPAIRED` | "Unit repaired" | OGG | `public/assets/audio/eva/unit_repaired.ogg` | [ ] Dummy: 合成女声 |
| `vox_unit_sold` | `VOX_UNIT_SOLD` | "Unit sold" | OGG | `public/assets/audio/eva/unit_sold.ogg` | [ ] Dummy: 合成女声 |
| `vox_structure_sold` | `VOX_STRUCTURE_SOLD` | "Structure sold" | OGG | `public/assets/audio/eva/structure_sold.ogg` | [ ] Dummy: 合成女声 |
| `vox_timer_started` | `VOX_TIMER_STARTED` | "Timer started" | OGG | `public/assets/audio/eva/timer_started.ogg` | [ ] Dummy: 合成女声 |
| `vox_time_*` | `VOX_TIME_40`–`VOX_TIME_1` | 倒计时播报 | OGG | `public/assets/audio/eva/time_*.ogg` | [ ] Dummy: 合成女声数字 |

### 3.3 背景音乐（ThemeType）

**来源**: `origin/REDALERT/DEFINES.H`, Line 861-913

| 资源 ID | C++ 枚举 | 名称 | 格式 | 文件路径 | 状态 |
|---------|---------|------|------|----------|------|
| `bgm_bigf` | `THEME_BIGF` | Bigfoot | OGG/MP3 | `public/assets/audio/bgm/bigf.ogg` | [ ] Dummy: 静音 |
| `bgm_crus` | `THEME_CRUS` | Crush | OGG/MP3 | `public/assets/audio/bgm/crus.ogg` | [ ] Dummy: 静音 |
| `bgm_fac1` | `THEME_FAC1` | Face the Enemy 1 | OGG/MP3 | `public/assets/audio/bgm/fac1.ogg` | [ ] Dummy: 静音 |
| `bgm_fac2` | `THEME_FAC2` | Face the Enemy 2 | OGG/MP3 | `public/assets/audio/bgm/fac2.ogg` | [ ] Dummy: 静音 |
| `bgm_hell` | `THEME_HELL` | Hell March | OGG/MP3 | `public/assets/audio/bgm/hell.ogg` | [ ] Dummy: 静音 |
| `bgm_run1` | `THEME_RUN1` | Run for your Life | OGG/MP3 | `public/assets/audio/bgm/run1.ogg` | [ ] Dummy: 静音 |
| `bgm_smsh` | `THEME_SMSH` | Smash | OGG/MP3 | `public/assets/audio/bgm/smsh.ogg` | [ ] Dummy: 静音 |
| `bgm_tren` | `THEME_TREN` | Trenches | OGG/MP3 | `public/assets/audio/bgm/tren.ogg` | [ ] Dummy: 静音 |
| `bgm_work` | `THEME_WORK` | Workmen | OGG/MP3 | `public/assets/audio/bgm/work.ogg` | [ ] Dummy: 静音 |
| `bgm_await` | `THEME_AWAIT` | Awaiting | OGG/MP3 | `public/assets/audio/bgm/await.ogg` | [ ] Dummy: 静音 |
| `bgm_dense_r` | `THEME_DENSE_R` | Dense | OGG/MP3 | `public/assets/audio/bgm/dense_r.ogg` | [ ] Dummy: 静音 |
| `bgm_fogger1a` | `THEME_FOGGER1A` | Fogger | OGG/MP3 | `public/assets/audio/bgm/fogger1a.ogg` | [ ] Dummy: 静音 |
| `bgm_mud1a` | `THEME_MUD1A` | Mud | OGG/MP3 | `public/assets/audio/bgm/mud1a.ogg` | [ ] Dummy: 静音 |
| `bgm_radio2` | `THEME_RADIO2` | Radio 2 | OGG/MP3 | `public/assets/audio/bgm/radio2.ogg` | [ ] Dummy: 静音 |
| `bgm_rollout` | `THEME_ROLLOUT` | Roll Out | OGG/MP3 | `public/assets/audio/bgm/rollout.ogg` | [ ] Dummy: 静音 |
| `bgm_snake` | `THEME_SNAKE` | Snake | OGG/MP3 | `public/assets/audio/bgm/snake.ogg` | [ ] Dummy: 静音 |
| `bgm_terminat` | `THEME_TERMINAT` | Terminate | OGG/MP3 | `public/assets/audio/bgm/terminat.ogg` | [ ] Dummy: 静音 |
| `bgm_twin` | `THEME_TWIN` | Twin | OGG/MP3 | `public/assets/audio/bgm/twin.ogg` | [ ] Dummy: 静音 |
| `bgm_vector1a` | `THEME_VECTOR1A` | Vector | OGG/MP3 | `public/assets/audio/bgm/vector1a.ogg` | [ ] Dummy: 静音 |
| `bgm_map` | `THEME_MAP` | Map Theme | OGG/MP3 | `public/assets/audio/bgm/map.ogg` | [ ] Dummy: 静音 |
| `bgm_score` | `THEME_SCORE` | Score Theme | OGG/MP3 | `public/assets/audio/bgm/score.ogg` | [ ] Dummy: 静音 |
| `bgm_intro` | `THEME_INTRO` | Intro Theme | OGG/MP3 | `public/assets/audio/bgm/intro.ogg` | [ ] Dummy: 静音 |
| `bgm_credits` | `THEME_CREDITS` | Credits Theme | OGG/MP3 | `public/assets/audio/bgm/credits.ogg` | [ ] Dummy: 静音 |
| `bgm_2nd_hand` | `THEME_2ND_HAND` | 2nd Hand | OGG/MP3 | `public/assets/audio/bgm/2nd_hand.ogg` | [ ] Dummy: 静音 |
| `bgm_arazoid` | `THEME_ARAZOID` | Arazoid | OGG/MP3 | `public/assets/audio/bgm/arazoid.ogg` | [ ] Dummy: 静音 |
| `bgm_backstab` | `THEME_BACKSTAB` | Backstab | OGG/MP3 | `public/assets/audio/bgm/backstab.ogg` | [ ] Dummy: 静音 |
| `bgm_chaos2` | `THEME_CHAOS2` | Chaos | OGG/MP3 | `public/assets/audio/bgm/chaos2.ogg` | [ ] Dummy: 静音 |
| `bgm_shut_it` | `THEME_SHUT_IT` | Shut It | OGG/MP3 | `public/assets/audio/bgm/shut_it.ogg` | [ ] Dummy: 静音 |
| `bgm_twinmix1` | `THEME_TWINMIX1` | Twinmix | OGG/MP3 | `public/assets/audio/bgm/twinmix1.ogg` | [ ] Dummy: 静音 |
| `bgm_under3` | `THEME_UNDER3` | Under | OGG/MP3 | `public/assets/audio/bgm/under3.ogg` | [ ] Dummy: 静音 |
| `bgm_vr2` | `THEME_VR2` | VR2 | OGG/MP3 | `public/assets/audio/bgm/vr2.ogg` | [ ] Dummy: 静音 |
| `bgm_bog` | `THEME_BOG` | Bog (CS) | OGG/MP3 | `public/assets/audio/bgm/bog.ogg` | [ ] Dummy: 静音 |
| `bgm_float_v2` | `THEME_FLOAT_V2` | Float (CS) | OGG/MP3 | `public/assets/audio/bgm/float_v2.ogg` | [ ] Dummy: 静音 |
| `bgm_gloom` | `THEME_GLOOM` | Gloom (CS) | OGG/MP3 | `public/assets/audio/bgm/gloom.ogg` | [ ] Dummy: 静音 |
| `bgm_grndwire` | `THEME_GRNDWIRE` | Groundwire (CS) | OGG/MP3 | `public/assets/audio/bgm/grndwire.ogg` | [ ] Dummy: 静音 |
| `bgm_rpt` | `THEME_RPT` | RPT (CS) | OGG/MP3 | `public/assets/audio/bgm/rpt.ogg` | [ ] Dummy: 静音 |
| `bgm_search` | `THEME_SEARCH` | Search (CS) | OGG/MP3 | `public/assets/audio/bgm/search.ogg` | [ ] Dummy: 静音 |
| `bgm_traction` | `THEME_TRACTION` | Traction (CS) | OGG/MP3 | `public/assets/audio/bgm/traction.ogg` | [ ] Dummy: 静音 |
| `bgm_wastelnd` | `THEME_WASTELND` | Wasteland (CS) | OGG/MP3 | `public/assets/audio/bgm/wastelnd.ogg` | [ ] Dummy: 静音 |

---

## 4. UI 资源

### 4.1 光标（Cursor）

**来源**: `origin/REDALERT/DEFINES.H`, Line 1067+ (ActionType)

| 资源 ID | 说明 | 格式 | 文件路径 | 状态 |
|---------|------|------|----------|------|
| `cursor_default` | 默认指针 | PNG / CUR | `public/assets/ui/cursor_default.png` | [ ] Dummy: CSS `cursor: default` |
| `cursor_select` | 框选指针 | PNG / CUR | `public/assets/ui/cursor_select.png` | [ ] Dummy: CSS `cursor: crosshair` |
| `cursor_move` | 移动指令 | PNG / CUR | `public/assets/ui/cursor_move.png` | [ ] Dummy: CSS `cursor: move` |
| `cursor_attack` | 攻击指令 | PNG / CUR | `public/assets/ui/cursor_attack.png` | [ ] Dummy: CSS `cursor: not-allowed` |
| `cursor_enter` | 进入/装载 | PNG / CUR | `public/assets/ui/cursor_enter.png` | [ ] Dummy: 箭头 + 车门 |
| `cursor_deploy` | 部署 | PNG / CUR | `public/assets/ui/cursor_deploy.png` | [ ] Dummy: 箭头 + 基地 |
| `cursor_repair` | 维修 | PNG / CUR | `public/assets/ui/cursor_repair.png` | [ ] Dummy: 扳手图标 |
| `cursor_sell` | 出售 | PNG / CUR | `public/assets/ui/cursor_sell.png` | [ ] Dummy: 美元符号 |
| `cursor_nuke` | 核弹目标 | PNG / CUR | `public/assets/ui/cursor_nuke.png` | [ ] Dummy: 辐射标志 |
| `cursor_chrono` | 超时空目标 | PNG / CUR | `public/assets/ui/cursor_chrono.png` | [ ] Dummy: 时钟标志 |
| `cursor_iron` | 铁幕目标 | PNG / CUR | `public/assets/ui/cursor_iron.png` | [ ] Dummy: 盾牌标志 |
| `cursor_sonar` | 声纳脉冲 | PNG / CUR | `public/assets/ui/cursor_sonar.png` | [ ] Dummy: 波纹标志 |
| `cursor_spyp` | 间谍飞机 | PNG / CUR | `public/assets/ui/cursor_spyp.png` | [ ] Dummy: 飞机标志 |
| `cursor_guard` | 警戒 | PNG / CUR | `public/assets/ui/cursor_guard.png` | [ ] Dummy: 停止标志 |
| `cursor_capture` | 占领 | PNG / CUR | `public/assets/ui/cursor_capture.png` | [ ] Dummy: 旗帜标志 |
| `cursor_noenter` | 无法进入 | PNG / CUR | `public/assets/ui/cursor_noenter.png` | [ ] Dummy: 禁止标志 |

### 4.2 建造图标（Sidebar Icons）

**来源**: 所有可建造的 `StructType` + `UnitType` + `InfantryType` + `AircraftType`

> C++ 中图标通过 `{GraphicName}ICON.SHP` 加载。3D 重构中每个可建造单位/建筑需要一个 64x64 的 Sidebar 图标。

| 类别 | 数量 | 路径模式 | 状态 |
|------|------|----------|------|
| 建筑图标 | ~30 | `public/assets/ui/icons/building_*.png` | [ ] Dummy: 纯色方块 + 首字母 |
| 载具图标 | ~15 | `public/assets/ui/icons/unit_*.png` | [ ] Dummy: 纯色方块 + 首字母 |
| 步兵图标 | ~10 | `public/assets/ui/icons/infantry_*.png` | [ ] Dummy: 纯色方块 + 首字母 |
| 飞机图标 | ~7 | `public/assets/ui/icons/aircraft_*.png` | [ ] Dummy: 纯色方块 + 首字母 |
| 舰船图标 | ~5 | `public/assets/ui/icons/vessel_*.png` | [ ] Dummy: 纯色方块 + 首字母 |
| 超级武器图标 | ~8 | `public/assets/ui/icons/super_*.png` | [ ] Dummy: 纯色方块 + 首字母 |

### 4.3 UI 面板与字体

| 资源 ID | 用途 | 格式 | 文件路径 | 状态 |
|---------|------|------|----------|------|
| `font_cnc` | 红警风格像素字体 | WOFF2 | `public/assets/fonts/cnc.woff2` | [ ] Dummy: 系统等宽字体 `Courier New` |
| `tex_ui_sidebar` | Sidebar 背景面板 | PNG | `public/assets/ui/sidebar_bg.png` | [ ] Dummy: CSS 渐变背景 |
| `tex_ui_button` | 建造按钮边框 | PNG / SVG | `public/assets/ui/button_frame.svg` | [ ] Dummy: CSS border |
| `tex_ui_powerbar` | 电力条 | PNG | `public/assets/ui/powerbar.png` | [ ] Dummy: CSS 渐变 |
| `tex_ui_healthbar_green` | 满血条 | PNG | `public/assets/ui/health_green.png` | [ ] Dummy: 绿色矩形 |
| `tex_ui_healthbar_yellow` | 黄血条 | PNG | `public/assets/ui/health_yellow.png` | [ ] Dummy: 黄色矩形 |
| `tex_ui_healthbar_red` | 红血条 | PNG | `public/assets/ui/health_red.png` | [ ] Dummy: 红色矩形 |
| `tex_ui_radar_bg` | 雷达小地图背景 | PNG | `public/assets/ui/radar_bg.png` | [ ] Dummy: 深绿矩形 |
| `tex_ui_radar_border` | 雷达边框 | PNG | `public/assets/ui/radar_border.png` | [ ] Dummy: 绿色边框 |

---

## 5. 地图数据（Map Data）

### 5.1 地图文件

| 资源 ID | 描述 | 格式 | 文件路径 | 状态 |
|---------|------|------|----------|------|
| `map_01` | 测试地图 64x64 | JSON | `public/maps/map_01.json` | [ ] Dummy: 程序生成随机地形 |
| `map_02` | 测试地图 96x96 | JSON | `public/maps/map_02.json` | [ ] Dummy: 程序生成随机地形 |
| `map_tutorial` | 教学地图 | JSON | `public/maps/tutorial.json` | [ ] Dummy: 平坦草地 + 双方基地 |

**JSON 地图格式约定**：
```json
{
  "version": "1.0",
  "width": 64,
  "height": 64,
  "theater": "temperate",
  "cells": [
    { "x": 0, "y": 0, "template": "TEMPLATE_CLEAR1", "overlay": "OVERLAY_NONE", "smudge": "SMUDGE_NONE" }
  ],
  "units": [
    { "type": "UNIT_MTANK", "owner": "HOUSE_GREECE", "x": 10, "y": 10, "facing": 0 }
  ],
  "infantry": [
    { "type": "INFANTRY_E1", "owner": "HOUSE_GREECE", "x": 12, "y": 12, "subcell": 0 }
  ],
  "buildings": [
    { "type": "STRUCT_CONST", "owner": "HOUSE_GREECE", "x": 5, "y": 5, "facing": 0 }
  ],
  "terrain": [
    { "type": "TERRAIN_TREE1", "x": 20, "y": 20 }
  ],
  "waypoints": [
    { "id": 0, "x": 30, "y": 30 }
  ],
  "triggers": []
}
```

---

## 6. Shader 与特效资源

### 6.1 核心 Shader

| 资源 ID | 用途 | 格式 | 文件路径 | 状态 |
|---------|------|------|----------|------|
| `shd_fog_of_war` | 战争迷雾 (未探索=纯黑, 已探索=半透明灰) | GLSL | `public/assets/shaders/fog_of_war.glsl` | [ ] Dummy: 固定透明度 |
| `shd_iron_curtain` | 铁幕效果 (红色闪烁外壳) | GLSL | `public/assets/shaders/iron_curtain.glsl` | [ ] Dummy: 红色自发光 |
| `shd_cloak` | 隐身/光学迷彩 (边缘折射) | GLSL | `public/assets/shaders/cloak.glsl` | [ ] Dummy: 半透明 + 波动 |
| `shd_chrono` | 超时空传送 (蓝色闪烁) | GLSL | `public/assets/shaders/chrono.glsl` | [ ] Dummy: 蓝色闪烁 |
| `shd_gps_scan` | GPS 扫描线效果 | GLSL | `public/assets/shaders/gps_scan.glsl` | [ ] Dummy: 绿色扫描线 |
| `shd_tesla_arc` | 磁暴电弧 | GLSL | `public/assets/shaders/tesla_arc.glsl` | [ ] Dummy: 蓝色锯齿线 |
| `shd_nuke_flash` | 核爆全屏白闪 | GLSL | `public/assets/shaders/nuke_flash.glsl` | [ ] Dummy: 白色全屏 1秒 |

### 6.2 粒子纹理

| 资源 ID | 用途 | 格式 | 文件路径 | 状态 |
|---------|------|------|----------|------|
| `ptl_smoke` | 烟雾粒子 | PNG | `public/assets/particles/smoke.png` | [ ] Dummy: 灰色圆形 |
| `ptl_fire` | 火焰粒子 | PNG | `public/assets/particles/fire.png` | [ ] Dummy: 橙红色圆形 |
| `ptl_spark` | 火花粒子 | PNG | `public/assets/particles/spark.png` | [ ] Dummy: 黄色星形 |
| `ptl_dust` | 尘土粒子 | PNG | `public/assets/particles/dust.png` | [ ] Dummy: 棕色圆形 |
| `ptl_water_splash` | 水花粒子 | PNG | `public/assets/particles/water_splash.png` | [ ] Dummy: 蓝色圆形 |
| `ptl_debris` | 碎片粒子 | PNG | `public/assets/particles/debris.png` | [ ] Dummy: 灰色多边形 |
| `ptl_tiberium_spark` | 泰伯利亚火花 | PNG | `public/assets/particles/tiberium_spark.png` | [ ] Dummy: 绿色星形 |

---

## 7. Dummy 资源实现速查

在资源未 `ready` 前，使用以下 Babylon.js 程序化方案：

```typescript
// 坦克 Dummy
const body = BABYLON.MeshBuilder.CreateBox("tank_body", {size: 1.2}, scene);
const turret = BABYLON.MeshBuilder.CreateCylinder("turret", {diameter: 0.8, height: 0.4}, scene);
turret.position.y = 0.6;
const barrel = BABYLON.MeshBuilder.CreateBox("barrel", {width: 0.15, height: 0.15, depth: 1.2}, scene);
barrel.position.z = 0.6; barrel.position.y = 0.6;

// 步兵 Dummy
const body = BABYLON.MeshBuilder.CreateCapsule("inf_body", {radius: 0.2, height: 0.8}, scene);
const head = BABYLON.MeshBuilder.CreateSphere("head", {diameter: 0.3}, scene);
head.position.y = 0.6;

// 选择环
const ring = BABYLON.MeshBuilder.CreateTorus("select_ring", {diameter: 1.5, thickness: 0.05}, scene);
ring.position.y = 0.1;
ring.color = faction === 'GDI' ? new BABYLON.Color3(0,1,0) : new BABYLON.Color3(1,0,0);
```

---

## 8. 资源准备优先级建议

1. **P0（最高）**：`map_01.json`（Dummy 即可，无需真实资源）
2. **P0**：单位 Dummy 几何体（代码内置，无需文件）
3. **P1**：`u_mtank`, `b_power`, `b_const` 的 GLB 模型（首批真实 3D 资源）
4. **P1**：地形纹理 `tex_clear_temperate`, `tex_water`
5. **P2**：核心音效（`voc_acknowl`, `voc_kaboom1`, `voc_cannon1`, `voc_gun_rifle`）
6. **P2**：核心 EVA 语音（`vox_construction`, `vox_unit_ready`, `vox_base_under_attack`）
7. **P2**：UI 光标与建造图标
8. **P3**：爆炸动画精灵
9. **P3**：战争迷雾 / 铁幕 Shader
10. **P4**：背景音乐
11. **P4**： civilian 建筑模型

---

*请在准备好的资源行末尾追加 `ready`。我会根据此清单在代码中切换 Dummy / 真实资源加载路径。*
