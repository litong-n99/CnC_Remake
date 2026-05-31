# OpenRA 控制组显示的坐标转换详细流程

## 可视化示例

### 坐标系图示

```
世界坐标系（WPos）
─────────────────────────────
|   0,0              X→
|    □ 单位中心 (100, 50, 0)
|    ┌─────────┐
|    │选择框   │  Z 方向（向上）
|    └─────────┘   
Y↓


屏幕坐标系（不考虑缩放）
─────────────────────────────
转换后：
|  (240, 120)  屏幕坐标
|    □ 单位中心
|    ┌─────────┐
|    │选择框   │
|    └─────────┘
|
按公式：
  screenX = TileSize.Width * worldX / TileScale
  screenY = TileSize.Height * (worldY - worldZ) / TileScale

例如（假设 TileSize=24, TileScale=1024）：
  screenX = 24 * 100 / 1024 = 2.34 → 2 (像素)
  screenY = 24 * (50 - 0) / 1024 = 1.17 → 1 (像素)


视口坐标系（应用缩放和平移）
─────────────────────────────
最终屏幕位置（考虑摄像机）：
  viewX = Zoom / UIScale * (screenX - ViewportCenterX + ViewportWidth / 2)
  viewY = Zoom / UIScale * (screenY - ViewportCenterY + ViewportHeight / 2)
```

---

## 执行流程的代码走线

### 场景 1: 选择单位并显示控制组数字

```
玩家选择单位
    ↓
SelectionManager 标记单位为被选择
    ↓
每帧调用 IRenderAnnotations.RenderAnnotations()
    ↓
SelectionDecorationsBase.DrawDecorations()
    ↓
if (selected && selectedDecorations)
    ↓
    对于每个 IDecoration（包括 WithSpriteControlGroupDecoration）
        ↓
        调用 IDecoration.RenderDecoration(self, wr, container)
            ↓
            WithSpriteControlGroupDecoration.RenderDecoration()
                ↓
                [步骤 1] var group = self.World.ControlGroups.GetControlGroupForActor(self);
                    获取单位的控制组 (返回 0-9 或 null)
                    
                [步骤 2] anim.PlayFetchIndex(GroupSequence, () => (int)group);
                    从 "pips" 图像的 "groups" 序列中加载第 group 帧
                    例如：group=1 时加载数字"1"的精灵
                    
                [步骤 3] var bounds = interactable.DecorationBounds(self, wr);
                    ├─ 调用 Bounds(self, wr, info.DecorationBounds)
                    │   ├─ 从 WDist 转换为像素尺寸
                    │   │   width_px = bounds[0].Length * TileSize.Width / TileScale
                    │   │   height_px = bounds[1].Length * TileSize.Height / TileScale
                    │   │
                    │   ├─ 计算选择框偏移
                    │   │   offset = -size / 2  (居中)
                    │   │
                    │   ├─ 单位中心转屏幕坐标
                    │   │   xy = wr.ScreenPxPosition(self.CenterPosition) + offset
                    │   │
                    │   └─ 返回屏幕坐标矩形
                    │       Polygon(Rectangle(xy.X, xy.Y, width_px, height_px))
                    │
                    └─ 返回 decorationBounds.BoundingRect（屏幕坐标）
                    
                [步骤 4] var decorationOrigin = container.GetDecorationOrigin(self, wr, "TopLeft", margin);
                    ├─ GetDecorationPosition(self, wr, "TopLeft")
                    │   return bounds.TopLeft  // 选择框左上角的屏幕坐标
                    │
                    ├─ wr.Viewport.WorldToViewPx(decorationOrigin)
                    │   return (Zoom / UIScale * (decorationOrigin - CenterLocation 
                    │           + ViewportSize / 2)).ToInt2()
                    │   [应用摄像机缩放和视口平移]
                    │
                    └─ + GetDecorationMargin("TopLeft", margin)
                        [添加配置的偏移]
                        
                [步骤 5] var screenPos = decorationOrigin - (0.5f * anim.Image.Size.XY).ToInt2();
                    [精灵中心定位：减去精灵尺寸的一半]
                    例如：anim.Image.Size = (16, 16)
                         减去 (8, 8) 使精灵中心对齐到边界点
                         
                [步骤 6] return [new UISpriteRenderable(anim.Image, self.CenterPosition, screenPos, 0, palette)];
                    创建可渲染对象：
                    - 使用世界坐标 self.CenterPosition 用于深度排序
                    - 使用屏幕坐标 screenPos 用于最终渲染位置
                    - 从调色板 "chrome" 获取颜色
```

---

## 具体数值示例

### 例子：LightTank 单位显示控制组"1"

```
输入：
─────
单位位置: WPos(200, 150, 0)          // 世界坐标
控制组: 1                              // 属于控制组 1
选择框配置: 
  - Bounds: [30, 30]                  // 30x30 WDist
  - DecorationBounds: null (使用 Bounds)
Position: "TopLeft"
Margin: (0, 0)
TileSize: (24, 24)                    // 24x24 像素
TileScale: 1024
Zoom: 1.0                             // 未缩放
UIScale: 1
摄像机视口中心: (512, 384)
视口大小: (1024, 768)

步骤 1: 获取控制组 = 1

步骤 2: 加载精灵 = "pips" 序列的第 1 帧（数字"1"）

步骤 3: 计算选择框边界
────────────────────
3a) 将 WDist 转换为像素
    width_px = 30 * 24 / 1024 = 0.7 ≈ 1 像素（太小，通常实际配置更大）
    
    // 实际例子（使用更现实的值）
    假设 Bounds: [2.0, 2.0] TileSize（即 2048 WDist）
    width_px = 2048 * 24 / 1024 = 48 像素
    height_px = 2048 * 24 / 1024 = 48 像素
    
3b) 计算偏移
    offset = -(48, 48) / 2 = (-24, -24)  // 使选择框居中于单位
    
3c) 单位中心转屏幕坐标
    screenPos = wr.ScreenPxPosition(WPos(200, 150, 0))
              = (24 * 200 / 1024, 24 * (150 - 0) / 1024)
              = (4.69, 3.52)
              → (5, 4) 像素（四舍五入）
    
3d) 选择框左上角
    xy = (5, 4) + (-24, -24) = (-19, -20)  // 可能在屏幕外
    bounds = Rectangle(-19, -20, 48, 48)
    bounds.TopLeft = (-19, -20)
    
步骤 4: 计算装饰元素原点
────────────────────────
4a) GetDecorationPosition(pos="TopLeft")
    = bounds.TopLeft = (-19, -20)  // 屏幕坐标
    
4b) WorldToViewPx((-19, -20))
    // 这里有个重要点：前面的 bounds 已经是屏幕坐标
    // 但 WorldToViewPx 需要屏幕坐标（未经视口转换）
    // 实际上这已经是屏幕坐标，不需要再转换
    
    // 让我重新审视流程...
    // 实际上 GetDecorationOrigin 在 SelectionDecorations 中被重写：
    
    protected override int2 GetDecorationOrigin(Actor self, WorldRenderer wr, string pos, int2 margin)
    {
        return wr.Viewport.WorldToViewPx(GetDecorationPosition(self, wr, pos)) 
               + GetDecorationMargin(pos, margin);
    }
    
    // 这意味着 GetDecorationPosition 返回屏幕坐标（不是视口坐标）
    // 然后再通过 WorldToViewPx 转换为视口坐标
    
    viewportX = 1.0 / 1 * ((-19) - 512 + 1024 / 2) = 1.0 * (-19 - 512 + 512) = -19
    viewportY = 1.0 / 1 * ((-20) - 384 + 768 / 2) = 1.0 * (-20 - 384 + 384) = -20
    
    result = (-19, -20) + (0, 0) = (-19, -20)

步骤 5: 应用精灵中心定位
────────────────────
精灵图像大小: (16, 16) 像素
screenPos = (-19, -20) - (8, 8) = (-27, -28)

步骤 6: 创建可渲染对象
──────────────────
UISpriteRenderable:
  image: 数字"1"精灵（16x16）
  worldPos: (200, 150, 0)              // 用于排序
  screenPos: (-27, -28)                // 实际渲染位置
  palette: "chrome"

最终结果：
────────
数字"1"在屏幕上的位置：(-27, -28)
（负数表示在视口的左上角外，或者摄像机需要平移）
```

---

## 关键公式速查表

### 1. 世界坐标转屏幕坐标

```csharp
// 浮点数版本
float2 screenPos = new float2(
    TileSize.Width * worldPos.X / TileScale,
    TileSize.Height * (worldPos.Y - worldPos.Z) / TileScale
);

// 整数版本
int2 screenPxPos = new int2(
    (int)Math.Round(TileSize.Width * worldPos.X / TileScale),
    (int)Math.Round(TileSize.Height * (worldPos.Y - worldPos.Z) / TileScale)
);
```

### 2. 屏幕坐标转视口坐标（应用缩放和平移）

```csharp
int2 viewportPos = (Zoom / UIScale * (screenPos - CenterLocation + ViewportSize / 2))
    .ToInt2();

// 详细版本
int2 viewportPos = new int2(
    (int)(Zoom / UIScale * (screenPos.X - ViewportCenterX + ViewportWidth / 2)),
    (int)(Zoom / UIScale * (screenPos.Y - ViewportCenterY + ViewportHeight / 2))
);
```

### 3. 世界距离转像素

```csharp
int pixelSize = (int)wdist.Length * tileSize / tileScale;
```

### 4. 精灵中心定位

```csharp
int2 centerAlignedPos = decorationPos - spriteSize / 2;
```

---

## 常见问题与陷阱

### Q1: 控制组数字为什么显示在选择框的左上角？

**A:** 这是默认配置 `Position: "TopLeft"`。其他选项包括：
- `"TopLeft"`, `"TopRight"`, `"BottomLeft"`, `"BottomRight"` - 四个角
- `"Top"` - 上方中央
- `"Center"` - 选择框中心

### Q2: 控制组数字有时会闪烁或位置不对？

**A:** 可能的原因：
1. 缩放因子（Zoom）变化时，`WorldToViewPx` 的计算结果改变
2. 视口中心（CenterLocation）移动时，相对位置改变
3. 精灵尺寸计算错误导致中心定位偏移

### Q3: 为什么要"减去精灵尺寸的一半"？

**A:** 因为 `screenPos` 原本指向边界点（如左上角），而 `UISpriteRenderable` 会从 `screenPos` 位置绘制精灵。为了让精灵中心对齐到边界点，需要向上和向左移动半个精灵宽度和高度。

```
原始点（选择框左上角）       减去偏移后（精灵中心）
        ●                        ●
    ┌───────┐                ╔═══╗
    │       │                ║■■■║
    │       │                ║■■■║
    └───────┘                ╚═══╝
```

### Q4: 文本版本（WithTextControlGroupDecoration）为什么不减去尺寸？

**A:** 文本由字体渲染器处理，其本身已考虑了文本的基线和对齐方式。直接传递 `screenPos` 给 `UITextRenderable` 即可。

---

## 在 Babylon.js 中的实现参考

```typescript
// 伪代码

class ControlGroupDecorationRenderer {
    render(unit: Unit, selectedUnits: Unit[], camera: RTSCamera): void {
        if (!selectedUnits.includes(unit)) return;  // 仅选中时显示
        
        const controlGroup = unit.getControlGroup();
        if (controlGroup === null) return;
        
        // 步骤 1: 获取选择框边界（世界坐标）
        const selectionBounds = unit.getSelectionBounds();  // Rectangle in world space
        
        // 步骤 2: 转换为屏幕坐标
        const screenBounds = this.worldToScreen(selectionBounds, camera);
        
        // 步骤 3: 获取装饰元素位置（左上角为例）
        const decorationScreenPos = screenBounds.topLeft;
        
        // 步骤 4: 加载精灵或文本
        const spriteTexture = this.getControlGroupTexture(controlGroup);  // 数字 0-9
        const spriteSize = { width: 16, height: 16 };
        
        // 步骤 5: 应用精灵中心定位
        const spriteRenderPos = {
            x: decorationScreenPos.x - spriteSize.width / 2,
            y: decorationScreenPos.y - spriteSize.height / 2
        };
        
        // 步骤 6: 渲染（到 HTML overlay 或 Babylon.js GUI）
        this.renderSpriteAtScreenPos(spriteTexture, spriteRenderPos);
    }
    
    worldToScreen(worldPos: Vector3, camera: RTSCamera): Vector2 {
        // 应用同构变换
        const screenX = TILE_SIZE.width * worldPos.x / TILE_SCALE;
        const screenY = TILE_SIZE.height * (worldPos.y - worldPos.z) / TILE_SCALE;
        
        // 应用摄像机转换
        const viewportPos = this.screenToViewport(
            { x: screenX, y: screenY },
            camera
        );
        
        return viewportPos;
    }
    
    screenToViewport(screenPos: Vector2, camera: RTSCamera): Vector2 {
        const zoom = camera.getZoom();
        const centerLoc = camera.getCenterLocation();
        const viewportSize = camera.getViewportSize();
        
        return {
            x: (zoom * (screenPos.x - centerLoc.x + viewportSize.width / 2)) | 0,
            y: (zoom * (screenPos.y - centerLoc.y + viewportSize.height / 2)) | 0
        };
    }
}
```

---

## 性能优化建议

1. **缓存选择框边界** - 仅在单位移动或选择状态改变时重新计算
2. **批量渲染** - 收集所有控制组装饰元素，一次性提交给渲染器
3. **避免重复转换** - 预计算常用的缩放因子
4. **使用精灵图集** - 将所有数字 0-9 合并到单个纹理中，减少 Draw Call

---

## 总结

OpenRA 的控制组显示系统是一个**多级坐标转换**的经典例子：

```
WPos → ScreenPxPosition() → int2 (Screen)
                              ↓
                         WorldToViewPx()
                              ↓
                         int2 (Viewport)
                              ↓
                      最终像素位置
```

关键特征：
- ✅ **选择框为基准** - 不是单位中心
- ✅ **精灵中心定位** - 减去尺寸一半
- ✅ **3级坐标系** - 世界 → 屏幕 → 视口
- ✅ **同构转换** - Y' = TileSize * (Y - Z) / TileScale
- ✅ **视口缩放** - 应对摄像机缩放和平移
