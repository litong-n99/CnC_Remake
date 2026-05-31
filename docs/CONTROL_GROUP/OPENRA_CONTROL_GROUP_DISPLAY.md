# OpenRA 控制组数字显示实现分析

## 概览

OpenRA 中控制组数字的显示由两个平行的实现支持：
1. **WithSpriteControlGroupDecoration** - 使用像素艺术精灵表现
2. **WithTextControlGroupDecoration** - 使用文本字体显示

两者都遵循相同的**位置算法**和**坐标转换流程**。

---

## 1. 绘制位置算法

### 核心原理

控制组数字的绘制位置基于**选择框（Selection Decoration Box）边界**，而非单位中心。

#### 位置选项（Position 参数）

支持以下预设位置，在 `SelectionDecorations.cs` 中定义：

```csharp
int2 GetDecorationPosition(Actor self, WorldRenderer wr, string pos)
{
    var bounds = interactable.DecorationBounds(self, wr);  // 获取选择框边界
    switch (pos)
    {
        case "TopLeft":     return bounds.TopLeft;
        case "TopRight":    return bounds.TopRight;
        case "BottomLeft":  return bounds.BottomLeft;
        case "BottomRight": return bounds.BottomRight;
        case "Top":         return new int2(bounds.Left + bounds.Size.Width / 2, bounds.Top);
        default:            return bounds.TopLeft + new int2(bounds.Size.Width / 2, bounds.Size.Height / 2);
    }
}
```

**默认位置**："TopLeft" - 绘制在选择框左上角

### 关键特征

- ✅ **相对于选择框边界** - 不是相对于单位中心
- ✅ **屏幕坐标计算** - `DecorationBounds()` 已返回屏幕像素坐标
- ✅ **支持 Margin 偏移** - 可在基础位置基础上额外偏移

---

## 2. WithSpriteControlGroupDecoration 的完整流程

### YAML 配置示例

```yaml
WithSpriteControlGroupDecoration:
  Palette: chrome
  Image: pips
  GroupSequence: groups          # 精灵序列用于表现 0-9
  Position: TopLeft              # 绘制位置
  Margin: 0, 0                   # 相对于边界的偏移（像素）
```

### 渲染逻辑（核心代码）

```csharp
public class WithSpriteControlGroupDecoration : IDecoration
{
    public readonly WithSpriteControlGroupDecorationInfo Info;
    readonly Animation anim;

    bool IDecoration.RequiresSelection => true;  // 仅当单位被选择时渲染

    IEnumerable<IRenderable> IDecoration.RenderDecoration(Actor self, WorldRenderer wr, ISelectionDecorations container)
    {
        // 步骤 1: 获取单位所属的控制组
        var group = self.World.ControlGroups.GetControlGroupForActor(self);
        if (group == null)
            return [];  // 单位不在任何控制组中

        // 步骤 2: 加载对应数字的精灵（0-9）
        anim.PlayFetchIndex(Info.GroupSequence, () => (int)group);
        // group 值为 0-9，对应不同的精灵帧

        // 步骤 3: 计算屏幕坐标
        // GetDecorationOrigin() 返回选择框边界位置的屏幕坐标
        var screenPos = container.GetDecorationOrigin(self, wr, Info.Position, Info.Margin) 
                        - (0.5f * anim.Image.Size.XY).ToInt2();  // 居中偏移

        // 步骤 4: 获取调色板
        var palette = wr.Palette(Info.Palette);

        // 步骤 5: 创建可渲染对象
        return
        [
            new UISpriteRenderable(anim.Image, self.CenterPosition, screenPos, 0, palette)
        ];
    }
}
```

#### 关键行解析

```csharp
// 最关键的一行：
var screenPos = container.GetDecorationOrigin(self, wr, Info.Position, Info.Margin) 
                - (0.5f * anim.Image.Size.XY).ToInt2();
```

- **第一部分**：`container.GetDecorationOrigin(...)`
  - 获取选择框边界位置的**屏幕坐标**
  - 返回一个已经过坐标系转换的整数像素坐标
  
- **第二部分**：`- (0.5f * anim.Image.Size.XY).ToInt2()`
  - 从该位置减去精灵尺寸的一半
  - 目的：将精灵中心对齐到边界点（精灵中心定位）

#### UISpriteRenderable 参数

```csharp
new UISpriteRenderable(
    anim.Image,           // 精灵图像
    self.CenterPosition,  // 世界坐标（用于排序）
    screenPos,            // 屏幕坐标（用于渲染）
    0,                    // Z 偏移量
    palette               // 调色板
)
```

---

## 3. 坐标系转换（世界 → 屏幕）

### 完整转换链路

#### 3.1 获取选择框边界（世界坐标 → 屏幕坐标）

在 `SelectionDecorations.cs` 中：

```csharp
protected override int2 GetDecorationOrigin(Actor self, WorldRenderer wr, string pos, int2 margin)
{
    // 步骤 A: 获取选择框 (返回屏幕坐标矩形)
    var bounds = interactable.DecorationBounds(self, wr);
    
    // 步骤 B: 根据位置选项获取边界上的点
    var decorationPos = GetDecorationPosition(self, wr, pos);  // 屏幕坐标
    
    // 步骤 C: 应用 Margin 偏移
    return wr.Viewport.WorldToViewPx(decorationPos) + GetDecorationMargin(pos, margin);
}
```

#### 3.2 DecorationBounds 计算过程

在 `Interactable.cs` 中：

```csharp
public Rectangle DecorationBounds(Actor self, WorldRenderer wr)
{
    return Bounds(self, wr, info.DecorationBounds != null ? info.DecorationBounds : info.Bounds)
        .BoundingRect;
}

Polygon Bounds(Actor self, WorldRenderer wr, ImmutableArray<WDist> bounds)
{
    // 从 WDist（世界距离）转换为像素

    // 步骤 1: 将世界距离转换为像素尺寸
    var size = new int2(
        bounds[0].Length * wr.TileSize.Width / wr.TileScale,    // 宽度
        bounds[1].Length * wr.TileSize.Height / wr.TileScale    // 高度
    );

    // 步骤 2: 计算偏移（使选择框以单位中心为基准）
    var offset = -size / 2;                    // 使矩形居中于单位
    if (bounds.Length > 2)
        offset += new int2(
            bounds[2].Length * wr.TileSize.Width / wr.TileScale,
            bounds[3].Length * wr.TileSize.Height / wr.TileScale
        );

    // 步骤 3: 将单位世界坐标转换为屏幕坐标
    var xy = wr.ScreenPxPosition(self.CenterPosition) + offset;
    
    // 步骤 4: 返回屏幕坐标下的矩形
    return new Polygon(new Rectangle(xy.X, xy.Y, size.X, size.Y));
}
```

#### 3.3 ScreenPxPosition 坐标转换

在 `WorldRenderer.cs` 中：

```csharp
public int2 ScreenPxPosition(WPos pos)
{
    // 先转换为浮点数屏幕坐标，再四舍五入到整数像素
    var px = ScreenPosition(pos);
    return new int2((int)Math.Round(px.X), (int)Math.Round(px.Y));
}

public float2 ScreenPosition(WPos pos)
{
    // 同构坐标系（Isometric）转换公式
    // WPos 是 (X, Y, Z) 三维世界坐标
    // 其中 Z 是"高度"
    return new float2(
        (float)TileSize.Width * pos.X / TileScale,           // 屏幕 X
        (float)TileSize.Height * (pos.Y - pos.Z) / TileScale // 屏幕 Y（Y 减 Z）
    );
}
```

#### 3.4 视口坐标转换（屏幕局部 → 视口视图）

在 `Viewport.cs` 中：

```csharp
public int2 WorldToViewPx(int2 world) 
    => (Zoom / graphicSettings.UIScale * (world - CenterLocation + ViewportSize.ToInt2() / 2))
        .ToInt2();

public int2 WorldToViewPx(in float3 world) 
    => (Zoom / graphicSettings.UIScale * (world - CenterLocation + ViewportSize.ToInt2() / 2).XY)
        .ToInt2();
```

**含义**：
- `Zoom / graphicSettings.UIScale` - 视口缩放因子（应对摄像机缩放）
- `world - CenterLocation` - 相对于视口中心的世界坐标
- `+ ViewportSize.ToInt2() / 2` - 平移至视口中心（屏幕坐标系的原点）

---

## 4. 坐标转换关键概念

### 三级坐标系

| 坐标系 | 数据类型 | 定义 | 用途 |
|--------|---------|------|------|
| **世界坐标** | `WPos` (X, Y, Z) | 游戏世界中的绝对位置 | 游戏逻辑、物理计算 |
| **屏幕坐标** | `int2` (X, Y) | 单个监视器的像素坐标（未缩放） | 局部 UI 布局 |
| **视口坐标** | `int2` (X, Y) | 应用摄像机缩放和平移后的像素坐标 | 最终渲染位置 |

### 转换顺序

```
WPos (World)
    ↓ ScreenPosition() / ScreenPxPosition()
int2 (Screen)
    ↓ WorldToViewPx() [应用缩放和平移]
int2 (Viewport)
    ↓ [渲染器使用]
最终像素位置
```

### 关键参数

- **TileSize** - 单个格子的像素尺寸（通常 24x24 或 30x30）
- **TileScale** - 世界坐标缩放系数（通常 1024）
- **Zoom** - 摄像机缩放因子（1.0 = 无缩放，> 1 = 放大）
- **CenterLocation** - 视口中心的屏幕坐标
- **UIScale** - UI 相对于游戏分辨率的缩放（HIDPI）

---

## 5. WithTextControlGroupDecoration

文本显示版本逻辑类似，但直接使用字体渲染：

```csharp
IEnumerable<IRenderable> IDecoration.RenderDecoration(Actor self, WorldRenderer wr, ISelectionDecorations container)
{
    var group = self.World.ControlGroups.GetControlGroupForActor(self);
    if (group == null)
        return [];

    var text = label.Update(group.Value);  // 获取控制组标签（"1", "2" 等）
    
    // 关键区别：没有减去尺寸的一半，因为字体渲染已处理对齐
    var screenPos = container.GetDecorationOrigin(self, wr, info.Position, info.Margin);
    
    return
    [
        new UITextRenderable(
            font, 
            self.CenterPosition,  // 世界坐标（用于排序）
            screenPos,            // 屏幕坐标（用于渲染）
            0,                    // Z 偏移
            info.UsePlayerColor ? self.OwnerColor() : info.Color,
            text
        )
    ];
}
```

---

## 6. IsometricSelectionDecorations（等距视图）

对于等距视角（如泰伯利亚黎明），位置计算有所不同：

```csharp
int2 GetDecorationPosition(Actor self, WorldRenderer wr, string pos)
{
    var bounds = selectable.DecorationBounds(self, wr);  // 返回多边形边界
    switch (pos)
    {
        case "TopLeft":     return bounds.Vertices[1];
        case "TopRight":    return bounds.Vertices[5];
        case "BottomLeft":  return bounds.Vertices[2];
        case "BottomRight": return bounds.Vertices[4];
        case "Top":         return new int2(
                                (bounds.Vertices[1].X + bounds.Vertices[5].X) / 2, 
                                bounds.Vertices[1].Y
                            );
        default: return bounds.BoundingRect.TopLeft + 
                        new int2(bounds.BoundingRect.Size.Width / 2, 
                                 bounds.BoundingRect.Size.Height / 2);
    }
}
```

关键区别：使用多边形顶点而非矩形边界。

---

## 7. 实现要点总结

| 要点 | 说明 |
|------|------|
| **选择依赖** | 仅当单位被选择时渲染（`RequiresSelection = true`） |
| **位置基准** | 相对于选择框边界，**不是**相对于单位中心 |
| **坐标系** | 世界坐标 → 屏幕像素 → 视口坐标（3 级转换） |
| **精灵尺寸** | 精灵中心定位需要减去尺寸的一半 |
| **文本对齐** | 文本由字体渲染器处理对齐，不需要额外偏移 |
| **Margin 应用** | 在屏幕坐标阶段应用，支持方向感知（各边不同符号） |
| **同构转换** | `ScreenPosition()` 使用公式 `Y' = TileSize.Height * (Y - Z) / TileScale` |
| **视口缩放** | `WorldToViewPx()` 应用摄像机缩放和视口平移 |

---

## 8. 在 CnC_Remake 中的应用建议

### 对应 Babylon.js 的实现

1. **选择框边界计算**
   - 在 `SelectionManager` 中实现，基于单位渲染网格的边界
   - 返回屏幕坐标下的 `Rectangle`

2. **世界到屏幕坐标转换**
   ```typescript
   screenPosition(worldPos: Vector3): Vector2 {
       // 对应 ScreenPosition() 的逻辑
       // 如果使用斜交坐标系：
       return new Vector2(
           TILE_SIZE.width * worldPos.x / TILE_SCALE,
           TILE_SIZE.height * (worldPos.y - worldPos.z) / TILE_SCALE
       );
   }
   ```

3. **控制组数字渲染**
   - 获取单位的控制组
   - 加载对应的精灵/文本
   - 计算相对于选择框边界的屏幕坐标
   - 渲染到 UI 层（HTML overlay 或 Babylon.js GUI）

4. **位置配置**
   ```typescript
   interface ControlGroupDecorationConfig {
       position: "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight" | "Top" | "Center";
       margin: Vector2;
       image?: string;      // WithSpriteControlGroupDecoration
       font?: string;       // WithTextControlGroupDecoration
       palette?: string;
   }
   ```

---

## 参考文件

- [WithSpriteControlGroupDecoration.cs](../OpenRA/OpenRA.Mods.Common/Traits/Render/WithSpriteControlGroupDecoration.cs)
- [WithTextControlGroupDecoration.cs](../OpenRA/OpenRA.Mods.Common/Traits/Render/WithTextControlGroupDecoration.cs)
- [SelectionDecorations.cs](../OpenRA/OpenRA.Mods.Common/Traits/Render/SelectionDecorations.cs)
- [SelectionDecorationsBase.cs](../OpenRA/OpenRA.Mods.Common/Traits/Render/SelectionDecorationsBase.cs)
- [Interactable.cs](../OpenRA/OpenRA.Mods.Common/Traits/Interactable.cs)
- [WorldRenderer.cs](../OpenRA/OpenRA.Game/Graphics/WorldRenderer.cs)
- [Viewport.cs](../OpenRA/OpenRA.Game/Graphics/Viewport.cs)
