/**
 * ShpTextureBuilder — Task-SPR3: SHP → Texture Atlas
 *
 * 将 Westwood SHP 文件的帧解压、调色板映射后，
 * 打包成 Babylon.js 可用的纹理图集。
 *
 * OpenRA 对标: `OpenRA.Game/Graphics/SpriteLoader` + `SheetBuilder`
 */

import type { ShpFrame } from './ShpLoader';
import { ShpLoader } from './ShpLoader';

/** 单帧在图集中的 UV 坐标和位置信息。 */
export interface AtlasFrame {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** 在图集纹理中的归一化 UV 坐标 */
  readonly u: number;
  readonly v: number;
  readonly u2: number;
  readonly v2: number;
}

/** 256 色调色板（RGB 数组，索引 0-255）。 */
export type Palette256 = Uint8Array; // 256 * 4 bytes (RGBA)

/** SHP 纹理图集构建结果。 */
export interface ShpAtlasResult {
  readonly canvas: HTMLCanvasElement;
  readonly frames: AtlasFrame[];
  readonly atlasWidth: number;
  readonly atlasHeight: number;
}

/**
 * 构建 256 色调色板（默认使用标准 VGA 调色板近似）。
 * 实际游戏中应从 .PAL 文件加载。
 */
export function buildDefaultPalette(): Palette256 {
  const pal = new Uint8Array(256 * 4);
  // 索引 0 = 透明色
  pal[3] = 0;
  // 索引 1-255 = 灰度渐变（简化）
  for (let i = 1; i < 256; i++) {
    const v = i;
    pal[i * 4] = v;
    pal[i * 4 + 1] = v;
    pal[i * 4 + 2] = v;
    pal[i * 4 + 3] = 255;
  }
  return pal;
}

/**
 * 使用 RLE 解压算法解码 SHP 帧数据。
 * TS 格式使用 Format=3 (Uncompressed) 或 Format=2 (RLE)
 */
function decodeShpFrameData(buffer: ArrayBuffer, frame: ShpFrame, format: number): Uint8Array {
  const dataStart = frame.dataOffset + 24; // TS frame header size
  const pixelCount = frame.width * frame.height;
  const result = new Uint8Array(pixelCount);

  if (format === 3) {
    // Uncompressed — 直接拷贝
    const src = new Uint8Array(buffer, dataStart, pixelCount);
    result.set(src);
    return result;
  }

  if (format === 2) {
    // RLE-compressed (simplified)
    const src = new Uint8Array(buffer, dataStart);
    let srcIdx = 0;
    let dstIdx = 0;

    while (dstIdx < pixelCount && srcIdx < src.length) {
      const count = src[srcIdx++];
      const value = src[srcIdx++];
      const fillLen = Math.min(count, pixelCount - dstIdx);
      for (let i = 0; i < fillLen; i++) {
        result[dstIdx++] = value;
      }
    }
    return result;
  }

  // Unknown format — 返回零填充
  return result;
}

/**
 * SHP 纹理图集构建器。
 * 将 SHP 帧解压后按行优先排列到一个大 canvas 中。
 */
export class ShpTextureBuilder {
  /**
   * 从 SHP buffer 和调色板构建纹理图集。
   * @param buffer SHP 文件二进制数据
   * @param palette 256 色调色板（默认生成）
   * @returns 包含 canvas 和帧 UV 坐标的结果
   */
  static build(buffer: ArrayBuffer, palette?: Palette256): ShpAtlasResult | null {
    const info = ShpLoader.parse(buffer);
    if (!info.isValid || info.frames.length === 0) return null;

    const pal = palette ?? buildDefaultPalette();

    // 计算图集尺寸：单行排列，总宽度 = 所有帧宽度之和
    let totalWidth = 0;
    let maxHeight = 0;
    for (const frame of info.frames) {
      totalWidth += frame.width;
      maxHeight = Math.max(maxHeight, frame.height);
    }

    // 限制最大宽度，超出则换行
    const maxAtlasWidth = 2048;
    let atlasWidth = totalWidth;
    let atlasHeight = maxHeight;

    if (totalWidth > maxAtlasWidth) {
      // 简单多行排列：估算需要的行数
      const rows = Math.ceil(totalWidth / maxAtlasWidth);
      atlasWidth = maxAtlasWidth;
      atlasHeight = maxHeight * rows;
    }

    const canvas = document.createElement('canvas');
    canvas.width = atlasWidth;
    canvas.height = atlasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.createImageData(atlasWidth, atlasHeight);
    const pixels = imageData.data;

    // 填充透明背景
    pixels.fill(0);

    const atlasFrames: AtlasFrame[] = [];
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;

    for (const frame of info.frames) {
      // 如果当前行超出最大宽度，换行
      if (currentX + frame.width > maxAtlasWidth && currentX > 0) {
        currentX = 0;
        currentY += rowHeight;
        rowHeight = 0;
      }

      // 解码帧数据
      const raw = decodeShpFrameData(buffer, frame, frame.format);

      // 将索引色映射到 RGBA 并写入图集
      for (let fy = 0; fy < frame.height; fy++) {
        for (let fx = 0; fx < frame.width; fx++) {
          const idx = raw[fy * frame.width + fx];
          const palOffset = idx * 4;
          const px = currentX + fx;
          const py = currentY + fy;
          const pixelOffset = (py * atlasWidth + px) * 4;
          pixels[pixelOffset] = pal[palOffset];
          pixels[pixelOffset + 1] = pal[palOffset + 1];
          pixels[pixelOffset + 2] = pal[palOffset + 2];
          pixels[pixelOffset + 3] = pal[palOffset + 3];
        }
      }

      // 记录 UV 坐标
      atlasFrames.push({
        index: frame.index,
        x: currentX,
        y: currentY,
        width: frame.width,
        height: frame.height,
        u: currentX / atlasWidth,
        v: 1 - (currentY + frame.height) / atlasHeight, // flip Y for Babylon
        u2: (currentX + frame.width) / atlasWidth,
        v2: 1 - currentY / atlasHeight,
      });

      currentX += frame.width;
      rowHeight = Math.max(rowHeight, frame.height);
    }

    ctx.putImageData(imageData, 0, 0);

    return {
      canvas,
      frames: atlasFrames,
      atlasWidth,
      atlasHeight,
    };
  }

  /**
   * 获取指定帧的 UV 坐标（用于 SequenceProvider 的 start/length 映射）。
   */
  static getFrameUv(result: ShpAtlasResult, frameIndex: number): AtlasFrame | undefined {
    return result.frames.find((f) => f.index === frameIndex);
  }
}
