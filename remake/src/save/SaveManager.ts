/**
 * 存档管理器 — Task 33
 *
 * 提供游戏状态的保存/加载 UI 接口（下载 `.cncsave` 文件 / 上传恢复）。
 */

import { GameSerializer, type GameSaveData } from './GameSerializer';
import type { TerrainGrid } from '../game/terrain/TerrainGrid';

export class SaveManager {
  private terrain: TerrainGrid;
  private scene: import('@babylonjs/core').Scene;

  constructor(terrain: TerrainGrid, scene: import('@babylonjs/core').Scene) {
    this.terrain = terrain;
    this.scene = scene;
  }

  /** 保存当前游戏状态并触发浏览器下载。 */
  save(): { filename: string; url: string } | null {
    const data = GameSerializer.serialize(this.terrain);
    const url = GameSerializer.exportToBlob(data);
    const filename = `save_${new Date().toISOString().replace(/[:.]/g, '-')}.cncsave`;

    // 触发下载
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    // 清理 Blob URL（延迟以确保下载开始）
    setTimeout(() => URL.revokeObjectURL(url), 30000);

    return { filename, url };
  }

  /** 从 File 对象加载游戏状态。 */
  async load(file: File): Promise<boolean> {
    const data = await GameSerializer.importFromFile(file);
    if (!data) return false;
    GameSerializer.deserialize(data, this.terrain, this.scene);
    return true;
  }

  /** 获取当前游戏状态的序列化数据（用于调试或预览）。 */
  peek(): GameSaveData {
    return GameSerializer.serialize(this.terrain);
  }
}
