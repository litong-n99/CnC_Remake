import type { TileSet, TerrainTile, TerrainTileInfo } from './TileSet';
import { LandType } from './TerrainGrid';

/**
 * DefaultTileCache — Bridges the TileSet template system to the renderer.
 *
 * Dummy-phase responsibilities:
 *   - Hold the loaded TileSet
 *   - Map each TerrainTile to a fallback LandType colour
 *   - In Task 9.4 this class will be extended to generate real textures
 *     (Canvas / SpriteAtlas) from the template image paths.
 *
 * Source: OpenRA.Mods.Common/Terrain/DefaultTileCache.cs
 */
export class DefaultTileCache {
  private landTypeFallbacks = new Map<number, LandType>();

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

  // ── Internal helpers ──

  private hashKey(tile: TerrainTile): number {
    return (tile.type << 8) | tile.index;
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
