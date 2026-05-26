/**
 * SHP 精灵序列解析器 — Task 70
 *
 * 解析 Westwood SHP 格式（帧动画、方向、调色板映射）。
 * 当前为简化实现：解析头信息、帧偏移表、提取帧元数据。
 * 完整解码（RLE 解压 + 调色板映射）可后续扩展。
 *
 * Source: OpenRA.Mods.Cnc/SpriteLoaders/ShpTSLoader.cs
 * Format ref: https://moddingwiki.shikadi.net/wiki/SHP_Format_(Westwood)
 */

export interface ShpFrame {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** 帧数据在文件中的偏移 */
  readonly dataOffset: number;
  /** 帧数据格式标志 */
  readonly format: number;
}

export interface ShpFileInfo {
  readonly frameCount: number;
  readonly width: number;
  readonly height: number;
  readonly frames: ShpFrame[];
  readonly isValid: boolean;
}

export class ShpLoader {
  /**
   * 解析 SHP 文件头。
   * @param buffer 完整的 SHP 文件二进制数据
   */
  static parse(buffer: ArrayBuffer): ShpFileInfo {
    const view = new DataView(buffer);

    // Check minimum size for header
    if (buffer.byteLength < 14) {
      return { frameCount: 0, width: 0, height: 0, frames: [], isValid: false };
    }

    const signature = view.getUint16(0, true);
    // SHP signature is typically 0x0000 for TS/RA2 format
    if (signature !== 0x0000) {
      // Try RA1 format: first 2 bytes are frame count
      return ShpLoader.parseRa1Format(view, buffer.byteLength);
    }

    return ShpLoader.parseTsFormat(view, buffer.byteLength);
  }

  /** 解析 TS/RA2 格式 SHP。 */
  private static parseTsFormat(view: DataView, byteLength: number): ShpFileInfo {
    const width = view.getUint16(6, true);
    const height = view.getUint16(8, true);
    const frameCount = view.getUint16(10, true);

    const frames: ShpFrame[] = [];

    for (let i = 0; i < frameCount; i++) {
      const offset = 14 + i * 8;
      if (offset + 8 > byteLength) break;

      const dataOffset = view.getUint32(offset, true);
      const frameInfo = view.getUint32(offset + 4, true);
      // frameInfo: lower 16 bits = format, upper bits = dimensions
      const format = frameInfo & 0xffff;

      // Read frame header at dataOffset
      if (dataOffset + 24 > byteLength) continue;
      const fx = view.getUint16(dataOffset + 2, true);
      const fy = view.getUint16(dataOffset + 4, true);
      const fw = view.getUint16(dataOffset + 6, true);
      const fh = view.getUint16(dataOffset + 8, true);

      frames.push({
        index: i,
        x: fx,
        y: fy,
        width: fw,
        height: fh,
        dataOffset,
        format,
      });
    }

    return { frameCount, width, height, frames, isValid: frames.length > 0 };
  }

  /** 解析 RA1/Dune2 格式 SHP（简化）。 */
  private static parseRa1Format(view: DataView, byteLength: number): ShpFileInfo {
    const frameCount = view.getUint16(0, true);
    const width = view.getUint16(4, true);
    const height = view.getUint16(6, true);

    const frames: ShpFrame[] = [];
    const offsetTableStart = 8;

    for (let i = 0; i < frameCount; i++) {
      const offsetPos = offsetTableStart + i * 4;
      if (offsetPos + 4 > byteLength) break;

      const dataOffset = view.getUint32(offsetPos, true);
      if (dataOffset === 0) continue;

      // RA1 frame header: 2 bytes flags, 2 bytes width, 2 bytes height, 2 bytes unknown, 4 bytes size
      if (dataOffset + 12 > byteLength) continue;
      const fw = view.getUint16(dataOffset + 2, true);
      const fh = view.getUint16(dataOffset + 4, true);

      frames.push({
        index: i,
        x: 0,
        y: 0,
        width: fw,
        height: fh,
        dataOffset,
        format: 0,
      });
    }

    return { frameCount, width, height, frames, isValid: frames.length > 0 };
  }

  /**
   * 提取指定帧的原始像素数据（未解压）。
   * 完整 RLE 解压需要额外实现。
   */
  static extractRawFrame(buffer: ArrayBuffer, frame: ShpFrame): Uint8Array {
    // For TS format, frame data starts at dataOffset + 24 (header size)
    const dataStart = frame.dataOffset + 24;
    const dataSize = frame.width * frame.height;
    return new Uint8Array(buffer.slice(dataStart, dataStart + dataSize));
  }

  /**
   * 获取帧数据的可读摘要。
   */
  static getFrameSummary(buffer: ArrayBuffer): string[] {
    const info = ShpLoader.parse(buffer);
    if (!info.isValid) return ['Invalid SHP file'];
    return [
      `Frames: ${info.frameCount}`,
      `Size: ${info.width}x${info.height}`,
      ...info.frames.map((f) => `  [${f.index}] ${f.width}x${f.height} @ offset ${f.dataOffset} (fmt=${f.format})`),
    ];
  }
}
