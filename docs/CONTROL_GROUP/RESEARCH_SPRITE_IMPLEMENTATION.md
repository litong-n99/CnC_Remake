# Control Group 标签 Sprite 实现方案调研

> **调研日期**：2026-05-31
> **调研目标**：评估将控制组标签从 Babylon.GUI 改为 Sprite 实现的可行性
> **文档位置**：`docs/CONTROL_GROUP/RESEARCH_SPRITE_IMPLEMENTATION.md`

---

## 1. 执行摘要

经对 **4 种 Sprite 技术路线** 和 **1 种 GUI 路线** 的全面调研，结论如下：

| 方案 | 屏幕大小恒定 | 工作量 | 性能 | 推荐度 |
|------|------------|--------|------|--------|
| **Babylon.GUI TextBlock（当前）** | ✅ | 小 | 好 | ⭐⭐⭐⭐ |
| **Babylon.GUI Image + 精灵图集** | ✅ | 中 | 好 | ⭐⭐⭐⭐⭐ 远期目标 |
| Babylon.js `Sprite` / `SpriteManager` | ❌ | 大 | 很好 | ⭐⭐ 不推荐 |
| `SpriteRenderable`（mesh billboard） | ❌ | 小 | 一般 | ⭐ 不推荐 |
| 自研屏幕空间 Sprite 管线 | ✅ | 很大 | 很好 | ⭐⭐⭐ 成本过高 |

**核心发现**：Babylon.js 原生的 `Sprite` / `SpriteManager` 和项目中的 `SpriteRenderable` 都是**世界空间渲染**，在透视相机下会随距离缩放，与 OpenRA 的 `UISpriteRenderable`（屏幕空间）有本质差异。**不建议**将控制组标签改为这些 Sprite 方案。

---

## 2. 各方案详细分析

### 2.1 Babylon.js `Sprite` / `SpriteManager`

#### API 概览

```typescript
// SpriteManager: 批量渲染精灵图集
const manager = new SpriteManager(
  'cgManager',
  'url/to/spritesheet.png',
  capacity: 100,
  cellSize: { width: 16, height: 16 },
  scene
);

// Sprite: 单个精灵实例
const sprite = new Sprite('cg_1', manager);
sprite.position = new Vector3(x, y, z);  // ← 世界坐标！
sprite.size = 0.5;                        // ← 世界空间大小！
sprite.cellIndex = 1;                     // 图集帧索引
```

#### 关键属性验证

| 属性 | 类型 | 空间 | 说明 |
|------|------|------|------|
| `position` | `Vector3` | **世界空间** | 单位在世界中的绝对位置 |
| `size` | `number` | **世界空间** | 精灵在世界中的边长 |
| `cellIndex` | `number` | — | 精灵图集帧索引 |
| `color` | `Color4` | — | 染色叠加 |
| `pixelPerfect` | `boolean` | — | 像素艺术风格（NEAREST 采样），不改变透视行为 |

#### 透视缩放问题

Babylon.js `Sprite` 通过 `SpriteRenderer` 使用**正交 billboard quad** 渲染，但它仍然处于**世界空间变换管线**中：

```
世界坐标 (sprite.position)
    ↓ 视图矩阵 (camera.viewMatrix)
相机空间
    ↓ 投影矩阵 (camera.projectionMatrix)
裁剪空间 (NDC)
    ↓ 视口变换
屏幕像素
```

由于 `sprite.size` 是世界空间单位，当相机远离时，透视投影将其压缩为更少的屏幕像素；当相机靠近时，放大为更多屏幕像素。

**这与当前已废弃的 3D mesh 方案完全一致。**

#### 解决缩放的尝试

要在每帧保持屏幕像素恒定，需要反解透视投影：

```typescript
// 伪代码：每帧调整 sprite.size
const dist = Vector3.Distance(camera.position, sprite.position);
const fov = camera.fov;
const canvasH = engine.getRenderHeight();
const targetPx = 16; // 目标屏幕像素

// worldSize = targetPx * dist * 2 * tan(fov/2) / canvasH
sprite.size = targetPx * dist * 2 * Math.tan(fov / 2) / canvasH;
```

**问题**：
1. 每帧需要遍历所有标签计算距离和三角函数，CPU 开销大
2. 需要接入 `onBeforeRenderObservable` 或 `renderTick`
3. `pixelPerfect` 模式对此无帮助（它只是禁用纹理插值）

#### 批量渲染优势

`SpriteManager` 的核心优势是**批量渲染**：
- 所有 sprite 共享同一个 `SpriteRenderer`
- 单次 draw call 渲染数百个 sprite
- 支持自动裁剪（视口外的 sprite 不渲染）

**但控制组标签数量极少**（最多 10 个数字 × 选中单位数，通常 < 50），批量渲染优势不明显。

#### 结论

| 维度 | 评估 |
|------|------|
| 解决缩放问题 | ❌ 不能，需要每帧手动反解投影 |
| 利用现有基础设施 | ⚠️ 需新建 SpriteManager + 图集，与 `SheetBuilder`/`SequenceProvider` 不直接兼容 |
| 工作量 | 大（需要图集生成、每帧 size 更新、位置同步） |
| 推荐度 | ⭐⭐ **不推荐** |

---

### 2.2 `SpriteRenderable`（项目中已有）

#### 实现分析

```typescript
export class SpriteRenderable {
  mesh: Mesh;
  material: StandardMaterial;

  constructor(scene, name, options) {
    this.mesh = MeshBuilder.CreatePlane(name, { width, height }, scene);
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    // ...
  }
}
```

`SpriteRenderable` 本质：
- `MeshBuilder.CreatePlane` → 平面网格
- `billboardMode = BILLBOARDMODE_ALL` → 始终面向相机
- `StandardMaterial` → 标准 PBR 材质

**这其实就是之前的 3D mesh 控制组标签方案，只是名字带 "Sprite"。**

#### 与 Babylon.js `Sprite` 的对比

| 特性 | `SpriteRenderable` | Babylon.js `Sprite` |
|------|-------------------|---------------------|
| 底层实现 | Mesh + Material | 专用 SpriteRenderer |
| 批量渲染 | ❌ 每个独立 mesh | ✅ SpriteManager 批量 |
| 透视缩放 | ❌ 会缩放 | ❌ 会缩放 |
| 性能 | 一般（多 draw call）| 很好（单 draw call）|
| 控制能力 | 高（完整 mesh API）| 中（受限于 Sprite API）|

#### 结论

| 维度 | 评估 |
|------|------|
| 解决缩放问题 | ❌ 不能 |
| 与当前 GUI 方案相比 | 无优势，且需要回到已废弃的 mesh 方案 |
| 推荐度 | ⭐ **不推荐** |

---

### 2.3 OpenRA 屏幕空间 Sprite 管线（自研）

#### OpenRA 的实现

```csharp
// UISpriteRenderable.cs
public class UISpriteRenderable : IRenderable {
    readonly Sprite sprite;
    readonly int2 screenPos;  // ← 屏幕像素坐标！
    readonly float scale;

    public void Render(WorldRenderer wr) {
        Game.Renderer.SpriteRenderer.DrawSprite(
            sprite, Palette, screenPos, scale, ...);
    }
}
```

OpenRA 的 `UISpriteRenderable` 关键特征：
- `screenPos` 是**屏幕像素坐标**，不是世界坐标
- `SpriteRenderer.DrawSprite` 直接绘制到屏幕，绕过 3D 投影管线
- 大小由 `sprite.Size * scale` 决定，单位是**像素**

#### 在 Remake 中复现的方案

要在 Remake 中实现类似的屏幕空间 Sprite 管线，需要：

```
方案 A: Canvas 2D 覆盖层
─────────────────────────
1. 创建全屏 Canvas 2D 覆盖层（position: fixed）
2. 每帧清空 → 遍历所有标签 → 计算屏幕坐标 → drawImage
3. 使用 SheetBuilder 生成的图集作为 Image 源

方案 B: Babylon.GUI Image
─────────────────────────
1. 使用 AdvancedDynamicTexture.CreateFullscreenUI
2. 为每个标签创建 GUI.Image
3. Image.source = 图集纹理
4. 使用 sourceLeft/sourceTop/sourceWidth/sourceHeight 选择图集子区域
5. linkWithMesh 自动投影

方案 C: 自定义 Shader + SpriteBatch
────────────────────────────────────
1. 编写自定义 post-process 或 effect shader
2. 每帧收集所有标签数据（屏幕坐标 + UV + 颜色）
3. 使用 GPU instancing 批量渲染
```

#### 工作量评估

| 子任务 | 工作量 | 说明 |
|--------|--------|------|
| 图集生成（0-9 数字） | 2 天 | 利用 SheetBuilder 打包，或手写 Canvas 生成 |
| 屏幕坐标转换 | 1 天 | 复用现有 worldToScreen 逻辑 |
| 渲染器实现 | 3-5 天 | Canvas 2D 方案较简单，Shader 方案复杂 |
| 生命周期管理 | 1 天 | 标签创建/销毁/隐藏 |
| 与现有系统集成 | 2 天 | SelectionManager、渲染管线 |

**总工作量：1-2 周**

#### 结论

| 维度 | 评估 |
|------|------|
| 解决缩放问题 | ✅ 能，因为直接屏幕空间绘制 |
| 对齐 OpenRA | ✅✅ 最接近原始设计 |
| 工作量 | 很大 |
| 推荐度 | ⭐⭐⭐ **远期可考，当前成本过高** |

---

### 2.4 Babylon.GUI `Image` + 精灵图集（推荐远期方案）

#### 设计

当前已实现 Babylon.GUI `TextBlock` + `Rectangle`，可以平滑升级为 `Image`：

```typescript
import { AdvancedDynamicTexture, Image, Rectangle } from '@babylonjs/gui';

// 使用项目已有的 SheetBuilder 生成数字图集
const atlasTexture = new DynamicTexture('cgAtlas', { width: 256, height: 32 }, scene);
// ... 将 0-9 数字绘制到图集 ...

const img = new Image('cgLabel', '');
img.source = atlasTexture;
img.sourceLeft = groupIndex * 16;   // 图集子区域
img.sourceTop = 0;
img.sourceWidth = 16;
img.sourceHeight = 16;
img.width = '20px';
img.height = '20px';

guiTexture.addControl(img);
img.linkWithMesh(unit.mesh);
```

#### 与当前 TextBlock 方案对比

| 特性 | TextBlock（当前） | Image + 图集（远期） |
|------|------------------|---------------------|
| 屏幕大小恒定 | ✅ | ✅ |
| 渲染方式 | 文字光栅化 | 纹理采样 |
| 资源来源 | 系统字体 | 精灵图集（可替换为 SHP/原始资源） |
| 阵营色/调色板 | ❌ 固定白色 | ✅ 可通过染色或预生成多版本支持 |
| 与 OpenRA 对齐度 | 文本版（WithTextControlGroupDecoration） | 精灵版（WithSpriteControlGroupDecoration） |
| 工作量 | 已完成 | 中（需图集生成管线） |

#### 与 OpenRA `WithSpriteControlGroupDecoration` 的对标

OpenRA YAML 配置：
```yaml
WithSpriteControlGroupDecoration:
  Palette: chrome
  Image: pips
  GroupSequence: groups
  Position: TopLeft
```

Remake 远期对应：
```typescript
// 从 YAML/JSON 加载配置
interface ControlGroupDecorationConfig {
  image: string;        // 'pips'
  sequence: string;     // 'groups'
  palette: string;      // 'chrome'
  position: 'TopLeft' | ...;
}

// SequenceProvider 提供帧索引
const frameIndex = sequenceProvider.getSequence('pips', 'groups');
// SheetBuilder 提供 UV
const slot = sheetBuilder.getSlot(`pips-groups-${groupIndex}`);
```

#### 结论

| 维度 | 评估 |
|------|------|
| 解决缩放问题 | ✅ |
| 利用现有基础设施 | ✅ 可直接复用 SheetBuilder、SequenceProvider |
| 工作量 | 中 |
| 推荐度 | ⭐⭐⭐⭐⭐ **远期首选方案，当前已用 TextBlock 占位** |

---

## 3. 综合对比矩阵

| 评估维度 | 3D Mesh (旧) | Babylon.js Sprite | SpriteRenderable | 自研屏幕 Sprite | GUI TextBlock | GUI Image+图集 |
|---------|-------------|-------------------|------------------|----------------|---------------|---------------|
| **屏幕大小恒定** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **透视缩放免疫** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **批量渲染** | ❌ | ✅ | ❌ | ✅ | ✅* | ✅* |
| **精灵图集支持** | ❌ | ✅ | ⚠️ 需手动 UV | ✅ | ❌ | ✅ |
| **阵营色/调色板** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **与 OpenRA 对齐** | ❌ | ❌ | ❌ | ✅✅ | ✅ | ✅✅ |
| **现有基础设施复用** | — | ❌ | ✅ | ⚠️ | ✅ | ✅✅ |
| **实现工作量** | 小 | 大 | 小 | 很大 | 小 | 中 |
| **维护成本** | 低 | 中 | 低 | 高 | 低 | 中 |

> *Babylon.GUI 内部使用批处理，但不如 SpriteManager 高效。对于 < 50 个标签，差异可忽略。

---

## 4. 根因分析：为什么 Babylon.js Sprite 不能解决缩放问题

### 4.1 渲染管线差异

```
OpenRA UISpriteRenderable          Babylon.js Sprite
─────────────────────────          ─────────────────
screenPos (像素坐标)                position (Vector3 世界坐标)
    ↓                                   ↓
SpriteRenderer.DrawSprite(          视图矩阵 × 投影矩阵
  sprite, screenPos, scale)             ↓
    ↓                               NDC (x,y ∈ [-1,1])
屏幕像素 (恒定大小)                      ↓
                                    视口变换
                                        ↓
                                    屏幕像素 (随距离缩放)
```

### 4.2 数学证明

在透视投影中，世界空间大小 `w` 在距离 `d` 处的屏幕像素大小 `s` 为：

```
s = w × (h / 2) / (d × tan(fov/2))
```

其中 `h` 为 canvas 高度（像素）。

- 当相机 zoom in（`d` 减小）→ `s` 增大
- 当相机 zoom out（`d` 增大）→ `s` 减小

**Babylon.js Sprite 的 `size` 就是上式中的 `w`**，因此必然随 `d` 变化。

OpenRA 的 `UISpriteRenderable` 直接指定 `screenPos` 和 `sprite.Size`（像素），不经过透视投影，因此 `s` 恒定。

### 4.3 为什么 Babylon.GUI 可以

Babylon.GUI 的 `TextBlock`/`Image` 使用**独立的 2D 渲染管线**：

```
世界坐标 (mesh) → linkWithMesh → 屏幕坐标 (内部计算)
                                    ↓
                              GUI 渲染器 (正交投影)
                                    ↓
                              屏幕像素 (width='24px' 恒定)
```

GUI 渲染器使用**正交投影**（或等价的 2D 绘制），`width='24px'` 直接映射到 24 屏幕像素，不经过 3D 透视。

---

## 5. 结论与建议

### 5.1 短期（当前阶段）

**保持 Babylon.GUI `TextBlock` + `Rectangle` 方案。**

理由：
1. ✅ 屏幕大小恒定，不随相机缩放
2. ✅ `linkWithMesh` 自动处理投影和视口裁剪
3. ✅ 实现简单，维护成本低
4. ✅ 与 OpenRA `WithTextControlGroupDecoration` 语义对齐

### 5.2 中期（引入真实精灵资源后）

**平滑迁移到 Babylon.GUI `Image` + 精灵图集。**

迁移路径：
```
当前: Rectangle + TextBlock
           ↓ 替换为
中期: Image(source=图集, sourceLeft/Top/Width/Height)
           ↓ 配置化
远期: 从 YAML 加载 (image, sequence, palette, position)
```

需要完成的前置任务：
- Task-SPR2: 单位序列绑定完成
- Task-SPR3: SHP 图集解析接入 SheetBuilder
- 为 `pips/groups` 序列生成图集 UV 映射

### 5.3 不推荐的方向

| 方案 | 不推荐原因 |
|------|-----------|
| Babylon.js `Sprite` / `SpriteManager` | 世界空间渲染，无法避免透视缩放；工作量大于收益 |
| `SpriteRenderable`（mesh billboard）| 与已废弃的 3D mesh 方案本质相同 |
| 自研屏幕空间 Sprite 管线 | 成本过高，Babylon.GUI 已提供等效能力 |

---

## 6. 参考文件

| 文件 | 说明 |
|------|------|
| `OpenRA/OpenRA.Game/Graphics/UISpriteRenderable.cs` | OpenRA 屏幕空间精灵 |
| `OpenRA/OpenRA.Game/Graphics/SpriteRenderable.cs` | OpenRA 世界空间精灵 |
| `OpenRA/OpenRA.Mods.Common/Traits/Render/WithSpriteControlGroupDecoration.cs` | 控制组精灵装饰 |
| `remake/src/renderer/sprites/SpriteRenderable.ts` | 项目 mesh billboard 封装 |
| `remake/src/renderer/terrain/SheetBuilder.ts` | 纹理图集打包 |
| `remake/src/game/rules/SequenceProvider.ts` | 序列定义管理 |
| `remake/src/renderer/terrain/SpriteLoader.ts` | 精灵帧加载 |
| `remake/node_modules/@babylonjs/core/Sprites/sprite.d.ts` | Babylon.js Sprite API |
| `remake/node_modules/@babylonjs/core/Sprites/spriteManager.d.ts` | SpriteManager API |

---

*本文档为技术调研成果，供架构决策参考。最后更新：2026-05-31*
