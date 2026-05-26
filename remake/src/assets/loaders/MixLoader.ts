/**
 * MIX/MPR 资源包解析器 — Task 69
 *
 * 浏览器端解析 Westwood MIX 包格式，提取内部文件列表。
 * 当前为简化实现：支持未压缩 MIX 包的头解析和文件列表导出。
 *
 * Source: OpenRA.Mods.Cnc/FileSystem/MixFile.cs
 * Format ref: https://moddingwiki.shikadi.net/wiki/MIX_Format_(Westwood)
 */

export interface MixEntry {
  /** CRC32 哈希值（Westwood 使用） */
  readonly id: number;
  /** 文件在包内的偏移 */
  readonly offset: number;
  /** 文件大小（字节） */
  readonly size: number;
}

export interface MixFileInfo {
  readonly fileCount: number;
  readonly dataSize: number;
  readonly entries: MixEntry[];
  readonly isValid: boolean;
}

/** 已知 CRC32 → 文件名的映射（常用文件名，用于可读输出）。 */
const KNOWN_CRC32 = new Map<number, string>([
  // Placeholder: real mapping would contain hundreds of C&C filenames
  [0x12345678, 'EXAMPLE.TMP'],
]);

export class MixLoader {
  /**
   * 解析 MIX 文件头。
   * @param buffer 完整的 MIX 文件二进制数据
   */
  static parse(buffer: ArrayBuffer): MixFileInfo {
    const view = new DataView(buffer);
    const signature = view.getUint16(0, true);

    // Westwood MIX signature: 0x0000 (unencrypted) or other flags
    if (signature !== 0x0000) {
      return { fileCount: 0, dataSize: 0, entries: [], isValid: false };
    }

    const fileCount = view.getUint16(2, true);
    const dataSize = view.getUint32(4, true);

    const entries: MixEntry[] = [];
    const headerOffset = 6;
    for (let i = 0; i < fileCount; i++) {
      const offset = headerOffset + i * 12;
      if (offset + 12 > buffer.byteLength) break;
      const id = view.getUint32(offset, true);
      const fileOffset = view.getUint32(offset + 4, true);
      const size = view.getUint32(offset + 8, true);
      entries.push({ id, offset: fileOffset, size });
    }

    return { fileCount, dataSize, entries, isValid: true };
  }

  /**
   * 提取指定 ID 的文件数据。
   */
  static extract(buffer: ArrayBuffer, entry: MixEntry): ArrayBuffer {
    return buffer.slice(entry.offset, entry.offset + entry.size);
  }

  /**
   * 将 CRC32 ID 转换为可读文件名（使用已知映射）。
   */
  static resolveName(id: number): string {
    return KNOWN_CRC32.get(id) ?? `UNKNOWN_${id.toString(16).toUpperCase().padStart(8, '0')}`;
  }

  /**
   * 计算字符串的 Westwood CRC32（简化版，使用标准 CRC32）。
   */
  static crc32(name: string): number {
    const table = MixLoader.getCrcTable();
    let crc = 0xffffffff;
    for (let i = 0; i < name.length; i++) {
      crc = table[(crc ^ name.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private static crcTable: Uint32Array | null = null;

  private static getCrcTable(): Uint32Array {
    if (MixLoader.crcTable) return MixLoader.crcTable;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    MixLoader.crcTable = table;
    return table;
  }
}
