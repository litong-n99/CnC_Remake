import type { Scene } from '@babylonjs/core';
import type { TileSet, TerrainTile, TerrainTileInfo } from './TileSet';
import { LandType } from './TerrainGrid';
import { SheetBuilder, type AtlasSlot } from '../../renderer/terrain/SheetBuilder';
import { loadImageFromUrl, createSpriteFrameFromRgba, type SpriteFrame } from '../../renderer/terrain/SpriteLoader';

/**
 * DefaultTileCache — Bridges the TileSet template system to the renderer.
 *
 * Task 10.4 upgrade:
 *   - Loads real sprite images from the TileSet's `images` array
 *   - Packs them into a texture atlas via SheetBuilder
 *   - Provides UV lookups for each TerrainTile
 *   - Falls back to LandType colouring when images are missing
 *
 * Source: OpenRA.Mods.Common/Terrain/DefaultTileCache.cs
 */

const ATLAS_SIZE = 512;

export class DefaultTileCache {
  private landTypeFallbacks = new Map<number, LandType>();
  private atlas: SheetBuilder | null = null;
  private atlasTexture: import('@babylonjs/core').DynamicTexture | null = null;
  private readonly testFrames = new Map<string, SpriteFrame>();

  constructor(private readonly tileSet: TileSet) {
    this.buildFallbacks();
  }

  getTileSet(): TileSet {
    return this.tileSet;
  }

  /** Resolve metadata for a concrete tile instance. */
  resolve(tile: TerrainTile): TerrainTileInfo | undefined {
    const template = this.tileSet.templates.get(tile.type);
    if (!template) return undefined;
    return template.tiles[tile.index];
  }

  /** Get the terrain-type name for a tile (e.g. "Clear", "Water"). */
  getTerrainTypeName(tile: TerrainTile): string | undefined {
    const info = this.resolve(tile);
    if (!info) return undefined;
    return this.tileSet.terrainTypes[info.terrainType]?.type;
  }

  /**
   * Fallback LandType for a tile — used when the renderer is still in
   * vertex-colour mode (before Task 9.4 real textures).
   */
  getLandTypeFallback(tile: TerrainTile): LandType {
    return this.landTypeFallbacks.get(this.hashKey(tile)) ?? LandType.Clear;
  }

  // ── Atlas building (Task 10.4) ──

  /** Inject a test frame for e2e validation (bypasses file loading). */
  injectTestFrame(id: string, width: number, height: number, rgba: Uint8Array): void {
    this.testFrames.set(id, createSpriteFrameFromRgba(width, height, rgba));
  }

  /** Build the texture atlas from all images referenced by the TileSet. */
  async buildAtlas(scene: Scene): Promise<boolean> {
    const builder = new SheetBuilder(ATLAS_SIZE, ATLAS_SIZE);

    // Load each template's images
    for (const [templateId, template] of this.tileSet.templates) {
      for (let frameIdx = 0; frameIdx < template.frames.length; frameIdx++) {
        const imagePath = template.images[frameIdx];
        if (!imagePath) continue;

        const slotId = this.slotKey(templateId, frameIdx);

        // Check test frame injection first (e2e helper)
        const testFrame = this.testFrames.get(slotId);
        if (testFrame) {
          const slot = builder.allocate(slotId, testFrame);
          if (!slot) {
            console.warn(`Atlas full — could not allocate ${slotId}`);
            continue;
          }
          continue;
        }

        // Try loading from URL (relative to tileset directory)
        try {
          const url = `tilesets/${imagePath}`;
          const frame = await loadImageFromUrl(url);
          const slot = builder.allocate(slotId, frame);
          if (!slot) {
            console.warn(`Atlas full — could not allocate ${slotId}`);
            continue;
          }
        } catch {
          // Image missing — expected in dummy phase
          console.warn(`Tile image not found: ${imagePath}`);
        }
      }
    }

    if (builder.getSlotCount() === 0) {
      return false; // No images loaded
    }

    this.atlas = builder;
    this.atlasTexture = builder.buildTexture(scene);
    return true;
  }

  /** Lookup atlas UVs for a concrete tile. Returns undefined if atlas not built or slot missing. */
  getAtlasSlot(tile: TerrainTile): AtlasSlot | undefined {
    return this.atlas?.getSlot(this.slotKey(tile.type, tile.index));
  }

  hasAtlas(): boolean {
    return this.atlasTexture !== null;
  }

  getAtlasTexture(): import('@babylonjs/core').DynamicTexture | null {
    return this.atlasTexture;
  }

  // ── Internal helpers ──

  private hashKey(tile: TerrainTile): number {
    return (tile.type << 8) | tile.index;
  }

  private slotKey(templateId: number, frameIndex: number): string {
    return `${templateId}:${frameIndex}`;
  }

  private buildFallbacks(): void {
    for (const [id, template] of this.tileSet.templates) {
      for (let i = 0; i < template.tiles.length; i++) {
        const tileInfo = template.tiles[i];
        const typeName = this.tileSet.terrainTypes[tileInfo.terrainType]?.type.toLowerCase();
        const landType = this.nameToLandType(typeName);
        this.landTypeFallbacks.set(this.hashKey({ type: id, index: i }), landType);
      }
    }
  }

  private nameToLandType(name: string | undefined): LandType {
    if (!name) return LandType.Clear;
    switch (name) {
      case 'clear':
        return LandType.Clear;
      case 'road':
      case 'pavement':
        return LandType.Road;
      case 'water':
        return LandType.Water;
      case 'rock':
      case 'cliff':
        return LandType.Rock;
      case 'wall':
        return LandType.Wall;
      case 'tiberium':
      case 'ore':
        return LandType.Tiberium;
      case 'beach':
      case 'shore':
        return LandType.Beach;
      case 'rough':
        return LandType.Rough;
      case 'river':
        return LandType.River;
      default:
        return LandType.Clear;
    }
  }
}
