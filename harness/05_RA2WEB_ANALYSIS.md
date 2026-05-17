# RA2-Web 项目分析 — 对 C&C Remake 的借鉴价值

> **项目来源**：基于 `chronodivide` 客户端分析开发的红色警戒2网页版（React + TypeScript + Vite + Three.js）。
> **分析日期**：2026-05-17
> **分析范围**：数据解析层、渲染层、音频系统、游戏逻辑架构、虚拟文件系统

---

## 1. 数据解析层（最高优先级借鉴）

RA2-Web 完整实现了 Westwood 所有专有文件格式的 TypeScript 解析器。这些解析器可直接复用或移植到 C&C Remake，用于加载原版游戏资源。

### 1.1 MIX 归档解析

| 文件 | 路径 | 价值 |
|------|------|------|
| `MixFile.ts` | `ra2-web/src/data/MixFile.ts` | 核心。支持 TD（未加密）和 RA/TS（Blowfish 加密）两种 MIX 头格式 |
| `MixEntry.ts` | `ra2-web/src/data/MixEntry.ts` | CRC32 文件名哈希算法（Westwood 特有填充规则） |
| `Blowfish.ts` | `ra2-web/src/data/encoding/Blowfish.ts` | 标准 Blowfish 实现，18 P-array + 4 S-boxes |
| `BlowfishKey.ts` | `ra2-web/src/data/encoding/BlowfishKey.ts` | 大整数模幂运算，从 80 字节加密头推导 56 字节 Blowfish 密钥 |

**关键发现**：MIX 解析采用**懒加载**策略——只解析头/索引，文件数据保留在原始 `ArrayBuffer` 中，直到 `openFile()` 时才通过 `VirtualFile.factory()` 创建零拷贝的 slice 视图。

**对 Remake 的价值**：`origin/REDALERT/` 中的 `.MIX` 文件（如 `CONQUER.MIX`、`LOCAL.MIX`）可直接用此解析器加载，提取 SHP/VXL/TMP 等资源。

### 1.2 SHP 精灵解析

| 文件 | 路径 | 说明 |
|------|------|------|
| `ShpFile.ts` | `ra2-web/src/data/ShpFile.ts` | 支持 TD-SHP（全局宽高头）和 TS-SHP（每帧独立尺寸） |
| `ShpImage.ts` | `ra2-web/src/data/ShpImage.ts` | 单帧裁剪/clip |
| `Format3.ts` | `ra2-web/src/data/encoding/Format3.ts` | LCW-like RLE 解压（Type 3 压缩） |

**压缩类型**：
- Type 0/1：原始字节
- Type 2：每行 RLE（2 字节行长度头 + 字节数据）
- Type 3：LCW-like RLE（`Format3.decode()`）——非零字节=像素，零字节+计数=零像素

**对 Remake 的价值**：单位/建筑/步兵的精灵动画资源（如 `E1.SHP`、`MTNK.SHP`）可直接解析，避免从头创建 Dummy 几何体。

### 1.3 地形与体素解析

| 文件 | 格式 | 说明 |
|------|------|------|
| `TmpFile.ts` / `TmpImage.ts` | TMP | 地形瓦片。每瓦片含高度、地形类型、坡度、雷达颜色、Z-buffer、ExtraData 标志 |
| `VxlFile.ts` | VXL | 体素模型（载具/建筑）。稀疏体素网格，每列用 skipCount+voxelCount 编码 |
| `HvaFile.ts` | HVA | 体素动画（与 VXL 配对） |
| `PcxFile.ts` | PCX | ZSoft PCX，委托 `@ra2web/pcxfile`。洋红色 `(255,0,255)` → 透明 |

**对 Remake 的价值**：TMP 可直接用于程序化地形生成；VXL 可用于替换 Dummy 载具 mesh。

### 1.4 调色板与字符串

| 文件 | 说明 |
|------|------|
| `Palette.ts` | 6-bit VGA 调色板（768 字节=256×3）。含 **remap 阴影算法**（16 级灰度变体，从索引 16 开始） |
| `CsfFile.ts` | 字符串表。XOR 解码（`~byte & 0xFF`）+ UTF-16LE。自动检测中文简体/繁体/英文 |
| `IniFile.ts` / `IniParser.ts` | 标准 INI。支持 `Key[]` 数组语法、引号字符串、分号注释、Section 合并 |

**Palette.remap() 算法**（对 Remake 材质系统有直接参考价值）：
```typescript
// 16 个 remap 因子：[63, 59, 55, 52, 48, 44, 41, 37, 33, 30, 26, 22, 19, 15, 11, 8]
// 从索引 16 开始计算 baseColor 的暗色变体
// formula: Math.floor((baseColor.channel / 255) * factor * 4)
```

### 1.5 压缩算法库

| 文件 | 算法 | 用途 |
|------|------|------|
| `Format80.ts` | Westwood Format80 | SHP/VXL 帧数据解压 |
| `Format5.ts` | Format5 包装器 | 调度到 Format80 或 MiniLzo |
| `MiniLzo.ts` | LZO1x | 封装外部 `lzo1x.decompress()` |
| `Crc32.ts` | CRC32 | 256 项查找表，用于 MIX 文件名哈希 |

### 1.6 二进制 I/O 基础设施

| 文件 | 说明 |
|------|------|
| `DataStream.ts` | 核心。包装 `ArrayBuffer` + `DataView`。动态扩容（`_realloc()` 双倍）、大小端转换、所有标量类型的读写、字符串编码（ASCII/UCS2/UTF-8/C-string） |
| `VirtualFile.ts` | 基于 `DataStream` 的文件抽象。`factory()` 创建父缓冲区的 slice 视图（零拷贝） |

---

## 2. 渲染层（高优先级借鉴）

RA2-Web 的渲染系统基于 Three.js，但做了大量 C&C 特定的定制。

### 2.1 等距投影系统

| 文件 | 路径 | 核心内容 |
|------|------|----------|
| `IsoCoords.ts` | `src/engine/IsoCoords.ts` | **world ↔ screen 双向转换**。经典等距公式：`screenX = x' - y'`, `screenY = (x' + y') / 2` |
| `Coords.ts` | `src/engine/Coords.ts` | 常量：`ISO_TILE_SIZE = 30`, `LEPTONS_PER_TILE = 256`, `ISO_WORLD_SCALE = 256/30 ≈ 8.533` |

**坐标转换公式**（可直接复用）：
```typescript
// World → Screen
const xScaled = x / ISO_WORLD_SCALE;
const yScaled = y / ISO_WORLD_SCALE;
return { x: xScaled - yScaled, y: (xScaled + yScaled) / 2 };

// Screen → World
return {
  x: ((x + 2 * y) / 2) * ISO_WORLD_SCALE,
  y: ((2 * y - x) / 2) * ISO_WORLD_SCALE
};
```

**对 Remake 的价值**：当前 Remake 使用 `ArcRotateCamera` 俯视视角，但未来如需忠实还原 C&C 等距视角，可直接参考此坐标系统。

### 2.2 Sprite 批处理系统

| 文件 | 说明 |
|------|------|
| `MeshBatchManager.ts` | 核心。自动收集 mesh，按 batch key 分组，决定用 Instancing 还是 Merging |
| `MeshInstancingBatch.ts` | GPU Instancing。每实例 4×4 矩阵（拆分为 4 个 vec4 attribute）+ opacity + paletteOffset + extraLight |
| `MeshMergingBatch.ts` | CPU Merging。合并顶点缓冲区，每顶点含 `vertexColorMult` 和 `vertexPaletteOffset` |
| `InstancedMesh.ts` | 自定义 Three.js InstancedMesh。支持 `INSTANCE_TRANSFORM`/`INSTANCE_UNIFORM`/`INSTANCE_COLOR`/`INSTANCE_OPACITY` shader define |

**Batch Key**（决定 mesh 是否可共享批次）：
```typescript
batchMode + "_" + geometry.uuid/count + "_" + material.uuid + "_" +
  castShadow + "_" + renderOrder + "_" + receiveShadow + "_" + clippingPlanesHash
```

**容量限制**：Instancing 每批次 1024 个，Merging 每批次 128 个。

**对 Remake 的价值**：当前 Remake 使用程序化几何体（每单位独立 Mesh），当单位数量增多时（>50），draw call 会成为瓶颈。此批处理系统可直接移植，将大量相同几何体的 draw call 降至 1。

### 2.3 Palette-Based 着色器

| 文件 | 说明 |
|------|------|
| `paletteShaderLib.ts` | GLSL 调色板查找系统。调色板索引存储在纹理的 **alpha 通道** |
| `PaletteBasicMaterial` | 扩展 `THREE.MeshBasicMaterial`，无光照 |
| `PaletteLambertMaterial` | 扩展 `THREE.MeshLambertMaterial`，含漫反射 |
| `PalettePhongMaterial` | 扩展 `THREE.MeshPhongMaterial`，含镜面高光 |

**着色器核心逻辑**：
```glsl
// 从 alpha 通道读取调色板索引
paletteColorIndex = texelColor.a;

// 从 palette texture 查找实际 RGB
// palette texture 是 N×256 的 RGBA 条纹（每个 palette 占一行）
diffuseColor = texture2D(palette, vec2(
  paletteColorIndex,
  (paletteOffset + 0.5) / paletteOffsetCount.y
));
```

**Per-instance extra light**：支持每实例独立光照染色（用于建筑断电、核弹闪光等效果）。

**对 Remake 的价值**：当加载真实 SHP 精灵时，此着色器系统可直接用于渲染原版调色板索引图像，同时支持阵营颜色 remapping。

### 2.4 精灵图集与纹理管理

| 文件 | 说明 |
|------|------|
| `TextureAtlas.ts` | Binary Space Partitioning（GrowingPacker）算法打包多个 `IndexedBitmap` 到单个 `THREE.DataTexture` |
| `TextureUtils.ts` | Palette → `THREE.Texture` 转换。按 hash 缓存，避免重复 |
| `ImageUtils.ts` | SHP → Bitmap/Canvas/PNG 转换 |
| `SpriteUtils.ts` | 面向相机的 Sprite 几何体生成（billboarding） |

**TextureAtlas 关键实现**：
```typescript
// 调色板索引存储在 RGBA 的 alpha 通道
rgbaData[i * 4]     = 0;              // R
rgbaData[i * 4 + 1] = 0;              // G
rgbaData[i * 4 + 2] = 0;              // B
rgbaData[i * 4 + 3] = paletteIndex;   // A (palette index)

texture.minFilter = THREE.NearestFilter;
texture.magFilter = THREE.NearestFilter;
```

### 2.5 视锥剔除

| 文件 | 说明 |
|------|------|
| `OctreeContainer.ts` | 基于 `@brakebein/threeoctree` 的空间八叉树。相机移动时才重新计算视锥 |
| `FrustumCuller.ts` | 遍历八叉树节点，动态计算 `Box3`，裁剪视锥外对象 |

**配置**：`CAMERA_PADDING = 3` tiles，避免对象突然消失。

---

## 3. 音频系统（高优先级借鉴）

### 3.1 架构分层

```
SoundSpecs (INI) ──→ Sound ──→ AudioSystem ──→ Web Audio API
MusicSpecs (INI) ──→ Music ──→ AudioFiles ──┤
WorldSound (spatial) ────────────────────────┤
Eva (voice queue) ───────────────────────────┤
Mixer (volume state) ────────────────────────┘
```

### 3.2 关键组件

| 文件 | 说明 |
|------|------|
| `AudioSystem.ts` | 核心。`AudioContext` 生命周期管理。`AudioBuffer` LRU 缓存（100 项）。三种播放模式：one-shot、sequence、loop |
| `Mixer.ts` | 音量/静音状态。`EventDispatcher` 通知所有 `GainNode` 实时更新 |
| `Music.ts` | 播放列表管理（shuffle/repeat/sequential）。MP3 通过 `HTMLAudioElement` + `MediaElementAudioSourceNode` 流式播放 |
| `Sound.ts` | 高层游戏音效 API。自动检测 UI 点击（CSS selector）播放点击音。声音实例限制、打断控制、频率偏移 |
| `WorldSound.ts` | **空间音频**。按视口中心距离衰减、按格子距离衰减、shroud 区域静音 |
| `Eva.ts` | EVA 语音队列。按优先级排序，5 秒去重 |
| `AudioBagFile.ts` | `.bag` + `.idx` 解析。支持 PCM 和 Westwood IMA ADPCM 两种格式 |
| `WavFile.ts` | 委托 `@ra2web/wavefile`。自动解码 4-bit IMA ADPCM |

### 3.3 Web Audio API 管线

```
AudioBufferSourceNode ──→ StereoPannerNode ──→ per-sound GainNode ──→ channel GainNode ──→ Master
                                                                   └── Effect channel ──→ DynamicsCompressorNode ──→ Master
```

**对 Remake 的价值**：当前 Remake 无音频系统。此架构可直接作为 `AudioManager.ts` 的设计蓝图，尤其是：
- LRU 缓存避免重复解码
- 按频道（UI/战斗/音乐/EVA）独立音量控制
- 空间音频（单位在屏幕左侧 → 左声道更响）

---

## 4. 游戏逻辑架构（中优先级借鉴）

### 4.1 游戏对象系统

**类层次**：
```
GameObject
├── Techno
│   ├── Unit
│   │   ├── Infantry
│   │   ├── Vehicle
│   │   └── Aircraft
│   └── Building
├── Terrain
├── Overlay
├── Smudge
├── Projectile
└── Debris
```

**与 C++ 原版的对比**：

| 特性 | C++ 原版 | RA2-Web |
|------|---------|---------|
| 继承深度 | 深：`Object → Techno → Foot → Unit/Infantry` | 浅：`GameObject → Techno → Unit → Vehicle/Infantry` |
| 行为复用 | 虚方法覆盖 | **Trait/Component 组合** |
| 移动 | `FootClass` 基类 | `MoveTrait` 组件 |
| 武器 | `TechnoClass` 指针 | `ArmedTrait` 组件 |
| 生命 | `TechnoClass` 字段 | `HealthTrait` 组件 |
| 工厂生产 | `BuildingClass` 虚方法 | `FactoryTrait` 组件 |

### 4.2 Trait/Component 系统（ECS 混合）

**核心设计**：
- Traits 是纯数据 + 行为的组件，**不从基类继承**
- 通过 **Symbol-keyed 方法** 实现通知接口（鸭子类型）
- `Traits` 类缓存按类型过滤的结果，避免每帧扫描

**关键通知接口**：
```typescript
NotifyTick.onTick        // 每帧更新
NotifySpawn.onSpawn      // 对象生成
NotifyDestroy.onDestroy  // 对象销毁
NotifyDamage.onDamage    // 受到伤害
NotifyOwnerChange.onOwnerChange
NotifyAttack.onAttack
```

**对 Remake 的价值**：当前 Remake 的 `Unit`/`Building` 使用单体类（`UnitController`/`BuildingController`），所有行为硬编码在类中。当需要添加新能力（如匍匐、恐惧、工程师占领）时，必须修改基类。Trait 系统允许**数据驱动地组合行为**，例如：
```typescript
// 工程师 = MoveTrait + ArmedTrait(no weapon) + AgentTrait(capture)
// 谭雅 = MoveTrait + ArmedTrait + C4Trait + VeteranTrait
// 军犬 = MoveTrait + LeapAttackTrait
```

### 4.3 事件总线

| 文件 | 说明 |
|------|------|
| `GameEventBus.ts` | 两层分发：全局订阅者 + 类型特定订阅者。`subscribe()` 返回取消函数 |
| `EventType.ts` | 65 种事件类型：对象生命周期、建筑、单位/战斗、玩家、经济/电力、工厂、超武、触发器 |

**事件流**：
1. 游戏逻辑触发事件（如 `destroyObject()`）
2. `TriggerManager` 订阅所有事件，收集到 `pendingGameEvents`
3. 每 tick 处理 pending 事件，触发触发器条件
4. UI 和其他系统订阅特定事件类型

**对 Remake 的价值**：当前 Remake 无事件系统。事件总线可解耦各个系统（如建筑被摧毁 → 电力系统更新 → UI 更新 → 触发器检查）。

### 4.4 触发器系统

| 文件 | 说明 |
|------|------|
| `TriggerManager.ts` | 管理所有触发器实例，每 tick 评估条件和执行动作 |
| `TriggerConditionFactory.ts` | 35+ 种条件：单位状态、空间、经济、时间、战斗、间谍、变量 |
| `TriggerExecutorFactory.ts` | 45+ 种动作：创建/销毁对象、改变阵营、揭示地图、超武、音频/视觉、计时器、变量 |

**条件-动作模式**：
- 条件用 AND 逻辑组合，阻塞条件短路失败
- 支持重复类型：`OnceAll`（所有目标触发一次）、`Repeat`（无限重复）、默认（一次）

**对 Remake 的价值**：触发器是战役系统的核心。当前 Remake 无触发器系统，此设计可作为 `TriggerSystem.ts` 的蓝图。

### 4.5 任务系统（HTN 替代状态机）

RA2-Web 用 **分层任务网络（Hierarchical Task Network）** 替代了 C++ 的平面状态机：

- `Task` 基类：`onStart()` / `onTick()` / `onEnd()`，支持子任务、阻塞/可取消标志
- `TaskRunner`：处理任务队列
- `UnitOrderTrait`：管理任务队列 + 指令队列

**示例任务**：`MoveTask` → `AttackMoveTask` → `GatherOreTask` → `CaptureBuildingTask`

**对 Remake 的价值**：当前 Remake 的 `UnitState` 是平面状态机（Idle/Moving/Attacking/Dying）。当需要添加复杂行为（如采矿状态机：寻找矿 → 移动 → 采集 → 返回 → 卸载）时，HTN 比平面状态机更易扩展。

---

## 5. 虚拟文件系统（中优先级借鉴）

### 5.1 架构

```
RealFileSystem (浏览器 File System Access API)
    ├── RealFileSystemDir #1 (用户选择的游戏目录)
    └── RealFileSystemDir #2 (mod 目录)
            │
            ▼
    VirtualFileSystem (分层优先级归档栈)
        ├── MixFile("ra2.mix") → VirtualFile.factory(slice)
        ├── MixFile("local.mix") → ...
        ├── AudioBagFile("audio.bag" + "audio.idx") → VirtualFile(wavData)
        └── MemArchive → standalone INI/CSF
```

### 5.2 关键设计

| 组件 | 说明 |
|------|------|
| `VirtualFileSystem` | 维护 `allArchives: Map<string, Archive>` 和 `archivesByPriority: Archive[]`。`openFile()` 按优先级遍历，first-match wins |
| `VirtualFile` | 基于 `DataStream` 的文件抽象。`factory()` 创建父缓冲区的 **slice 视图**（零拷贝） |
| `RealFileSystemDir` | 包装 `FileSystemDirectoryHandle`。默认**大小写不敏感**（`fixEntryCase()` 线性搜索） |
| `MemArchive` | 内存归档。`Map<string, VirtualFile>` 包装，用于独立 `.ini`/`.csf` 和运行时生成文件 |
| `AudioBagFile` | `.bag` + `.idx` 解析。合成 WAV 头（PCM 或 IMA ADPCM），返回 `VirtualFile` |

### 5.3 懒加载策略

1. **MIX 归档**：挂载时只解析头/索引，数据保留在原始 `ArrayBuffer`
2. **AudioBag**：只在 `openFile()` 时合成 WAV 头并切片数据
3. **AudioSystem**：`decodeFile()` 懒解码，100 项 LRU 缓存
4. **RealFileSystem**：目录条目通过 async generator 迭代，无需预先全量列出

**对 Remake 的价值**：当前 Remake 使用 Vite 的 `import.meta.env.BASE_URL` 加载 JSON 地图。未来加载真实 C&C 资源（MIX/SHP/VXL）时，此 VFS 可直接作为资源加载层。

---

## 6. 动画与游戏循环

### 6.1 游戏循环

| 文件 | 说明 |
|------|------|
| `GameAnimationLoop.ts` | 固定时间步长 + 插值渲染。`requestAnimationFrame` 可见时使用，`setInterval(..., 1000)` 后台时切换 |

**关键机制**：
- 固定时间步：`gameTurnMgr.getTurnMillis()`
- 插值系数：`(timestamp - startTime - lastGameFrame * turnMillis) / turnMillis`
- 帧跳过预算：`skipBudgetMillis` 防止慢机器上的死亡螺旋
- 错误隔离：`onError` 回调捕获错误不崩溃循环

**对 Remake 的价值**：当前 Remake 使用 `scene.onBeforeRenderObservable` + `engine.getDeltaTime()`，是变时间步长。当游戏逻辑复杂化后，固定时间步长 + 插值可保证网络同步和回放一致性。

---

## 7. 对 Remake 各模块的直接借鉴建议

| Remake 模块 | 可借鉴的 RA2-Web 组件 | 优先级 |
|------------|----------------------|--------|
| `src/data/`（资源解析） | `MixFile`, `ShpFile`, `VxlFile`, `TmpFile`, `Palette`, `IniFile`, `CsfFile`, `DataStream` | 🔴 最高 |
| `src/renderer/meshes/`（精灵渲染） | `TextureAtlas`, `paletteShaderLib`, `SpriteUtils`, `MeshBatchManager`, `InstancedMesh` | 🔴 最高 |
| `src/core/AudioManager.ts`（音频） | `AudioSystem`, `Mixer`, `WorldSound`, `Eva`, `AudioBagFile` | 🟡 高 |
| `src/game/`（游戏逻辑） | `Trait` 系统、`GameEventBus`、`TriggerManager`、`Task` 系统 | 🟡 高 |
| `src/core/EngineManager.ts`（引擎） | `Engine`（静态单例 + 懒加载集合）、`GameAnimationLoop`（固定步长） | 🟢 中 |
| `src/game/terrain/`（地形） | `TmpFile` 解析、`IsoCoords` 坐标转换 | 🟢 中 |
| `src/game/unit/`（寻路） | `MoveTrait`（子单元格占用、桥梁、碾压） | 🟢 中 |
| `src/network/`（网络） | `WolConnection`、回放系统数据结构 | ⚪ 低（Phase 8） |

---

## 8. 关键设计模式总结

| 模式 | 在 RA2-Web 中的应用 | 对 Remake 的启示 |
|------|-------------------|-----------------|
| **静态单例** | `Engine` 类 | 资源管理器的合理模式 |
| **懒加载/记忆化** | `LazyResourceCollection`、`TextureUtils.cache` | 避免重复加载和解析 |
| **对象池/批处理** | `MeshBatchManager`、`InstancedMesh` | 减少 draw call，提升性能 |
| **策略模式** | `BatchMode.Instancing` vs `Merging` | 根据场景选择最优渲染策略 |
| **观察者/事件分发** | `Renderer._onFrame`、`Mixer.onVolumeChange` | 解耦系统间的依赖 |
| **工厂模式** | `Theater.factory()`、`ObjectFactory` | 动态创建游戏对象 |
| **命令/队列** | `MeshBatchManager.fillBatches()` | 延迟执行和批量处理 |
| **Flyweight/视图** | MIX 子文件共享父 `ArrayBuffer` | 减少内存占用 |
| **LRU 缓存** | `AudioSystem.audioBufferCache` | 音频/纹理资源的缓存策略 |
| **鸭子类型 ECS** | `traitImplements()` 检查 Symbol 方法 | 比深继承更灵活的行为组合 |
| **分层任务网络** | `Task` + `TaskRunner` | 替代平面状态机，更易扩展 |

---

## 9. 文件路径速查

```
ra2-web/
├── src/data/
│   ├── MixFile.ts, MixEntry.ts
│   ├── ShpFile.ts, ShpImage.ts
│   ├── VxlFile.ts, VxlHeader.ts, Section.ts
│   ├── TmpFile.ts, TmpImage.ts
│   ├── PcxFile.ts, Palette.ts
│   ├── IniFile.ts, IniParser.ts, IniSection.ts
│   ├── CsfFile.ts
│   ├── DataStream.ts
│   ├── AudioBagFile.ts, WavFile.ts, Mp3File.ts
│   └── encoding/
│       ├── Blowfish.ts, BlowfishKey.ts
│       ├── Format3.ts, Format80.ts, Format5.ts
│       └── MiniLzo.ts
├── src/engine/
│   ├── Engine.ts
│   ├── IsoCoords.ts, Coords.ts
│   ├── GameAnimationLoop.ts
│   ├── ImageFinder.ts
│   ├── gfx/
│   │   ├── Renderer.ts, RenderableContainer.ts
│   │   ├── batch/
│   │   │   ├── MeshBatchManager.ts
│   │   │   ├── MeshInstancingBatch.ts
│   │   │   ├── MeshMergingBatch.ts
│   │   │   └── InstancedMesh.ts
│   │   ├── material/paletteShaderLib.ts
│   │   ├── TextureAtlas.ts, TextureUtils.ts, ImageUtils.ts
│   │   ├── SpriteUtils.ts
│   │   ├── OctreeContainer.ts, FrustumCuller.ts
│   │   └── lighting/LightingDirector.ts
│   └── sound/
│       ├── AudioSystem.ts, Mixer.ts, Music.ts
│       ├── Sound.ts, WorldSound.ts, Eva.ts
│       ├── AudioLoop.ts, AudioSequence.ts
│       └── AudioBagFile.ts (在 data/ 中)
├── src/game/
│   ├── Game.ts
│   ├── GameEventBus.ts
│   ├── gameobject/
│   │   ├── GameObject.ts, Techno.ts, Unit.ts
│   │   ├── Infantry.ts, Vehicle.ts, Aircraft.ts, Building.ts
│   │   └── ObjectFactory.ts
│   ├── gameobject/trait/
│   │   ├── MoveTrait.ts, AttackTrait.ts, ArmedTrait.ts
│   │   ├── HealthTrait.ts, VeteranTrait.ts, CloakableTrait.ts
│   │   └── interface/ (NotifyTick, NotifySpawn, etc.)
│   ├── game/trait/
│   │   ├── PowerTrait.ts, RadarTrait.ts, ProductionTrait.ts
│   │   └── interface/
│   ├── event/EventType.ts
│   └── trigger/
│       ├── TriggerManager.ts
│       ├── TriggerConditionFactory.ts
│       └── TriggerExecutorFactory.ts
└── src/data/vfs/
    ├── VirtualFileSystem.ts, VirtualFile.ts
    ├── RealFileSystem.ts, RealFileSystemDir.ts
    └── MemArchive.ts
```

---

## 10. 许可证与使用限制

> ⚠️ **重要**：RA2-Web 基于 `chronodivide` 客户端分析开发，**所有权利归 chronodivide 所有者 Alexandru Ciucă**。未经其许可，严禁用于任何商业行为。
>
> 本项目（C&C Remake）对 RA2-Web 的借鉴**仅限于设计思路、架构模式和技术方案**的参考学习。**禁止直接复制其源代码**到本项目的发布版本中。如需使用其数据解析器代码，应在独立的兼容层中实现，并确保符合 GPL-3.0 许可证要求。
>
> 当前阶段（Phase 0–1），所有借鉴内容仅用于**技术可行性验证和架构设计参考**。
