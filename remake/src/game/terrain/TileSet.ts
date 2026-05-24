/**
 * TileSet / Template system — OpenRA-style terrain template definitions.
 *
 * In the original C&C games (and OpenRA) the map does not store raw pixels;
 * instead each cell stores a `TerrainTile` reference:
 *   - `type`  → ushort template id
 *   - `index` → byte index inside that template
 *
 * A template (e.g. a 2×2 cliff, a 1×1 water tile, a 3×2 road corner) is a
 * reusable "stamp" that can be placed many times across the map.
 *
 * Source: OpenRA.Mods.Common/Terrain/DefaultTerrain.cs
 */

/** A concrete tile instance inside a cell. */
export interface TerrainTile {
  /** Template id (matches TerrainTemplateInfo.id). */
  readonly type: number;
  /** Index inside the template's frame array. */
  readonly index: number;
}

/** Per-frame metadata inside a template. */
export interface TerrainTileInfo {
  /** Byte index into the global TerrainTypeInfo table. */
  readonly terrainType: number;
  /** Local height offset added to Map.Height for this cell. */
  readonly height: number;
  /** Ramp type (0 = flat). */
  readonly rampType: number;
  /** Min / max colour for minimap variation. */
  readonly minColor: string;
  readonly maxColor: string;
  /** 8-direction riser mask (expected height discontinuities). */
  readonly riser: number;
}

/** A reusable terrain template (e.g. "cliff NE corner", "water flat"). */
export interface TerrainTemplateInfo {
  /** Unique ushort id. */
  readonly id: number;
  /** Human-readable id string (e.g. "Clear01", "Cliff1"). */
  readonly name: string;
  /** Template footprint size in cells (default 1×1). */
  readonly size: { readonly width: number; readonly height: number };
  /** If true, any index in this template may be picked at random. */
  readonly pickAny: boolean;
  /** Frame metadata for every cell in the template (row-major). */
  readonly tiles: readonly TerrainTileInfo[];
  /** Image source paths (one per variant).  Dummy phase: may be empty. */
  readonly images: readonly string[];
  /** Frame indices inside the image spritesheet. */
  readonly frames: readonly number[];
}

/** A terrain type category (e.g. "Clear", "Water", "Rock"). */
export interface TerrainTypeInfo {
  /** Human-readable name. */
  readonly type: string;
  /** Target-type tags used by weapon validity checks. */
  readonly targetTypes: readonly string[];
  /** Minimap / radar colour (hex string). */
  readonly color: string;
}

/** Complete tileset for one theater (TEMPERAT / DESERT / SNOW / …). */
export interface TileSet {
  /** Theater name. */
  readonly name: string;
  /** Cell size in pixels (for the source artwork). */
  readonly tileSize: { readonly width: number; readonly height: number };
  /** Global palette reference (Dummy phase). */
  readonly palette?: string;
  /** Ordered terrain type table (index = terrainType byte). */
  readonly terrainTypes: readonly TerrainTypeInfo[];
  /** All templates indexed by id. */
  readonly templates: ReadonlyMap<number, TerrainTemplateInfo>;
}

// ── Helpers ──

/** Build a lookup map from template array. */
export function buildTemplateMap(templates: readonly TerrainTemplateInfo[]): Map<number, TerrainTemplateInfo> {
  const map = new Map<number, TerrainTemplateInfo>();
  for (const t of templates) {
    map.set(t.id, t);
  }
  return map;
}

/** Resolve the TerrainTileInfo for a concrete TerrainTile. */
export function resolveTileInfo(tileSet: TileSet, tile: TerrainTile): TerrainTileInfo | undefined {
  const template = tileSet.templates.get(tile.type);
  if (!template) return undefined;
  return template.tiles[tile.index];
}

/** Resolve the TerrainTypeInfo name for a concrete TerrainTile. */
export function resolveTerrainTypeName(tileSet: TileSet, tile: TerrainTile): string | undefined {
  const info = resolveTileInfo(tileSet, tile);
  if (!info) return undefined;
  return tileSet.terrainTypes[info.terrainType]?.type;
}

// ── JSON Loader ──

export interface TileSetJson {
  name: string;
  tileSize: { width: number; height: number };
  palette?: string;
  terrainTypes: Array<{
    type: string;
    targetTypes?: string[];
    color: string;
  }>;
  templates: Array<{
    id: number;
    name?: string;
    size?: { width: number; height: number };
    pickAny?: boolean;
    tiles: Array<{
      terrainType: number;
      height?: number;
      rampType?: number;
      minColor?: string;
      maxColor?: string;
      riser?: number;
    }>;
    images?: string[];
    frames?: number[];
  }>;
}

export function parseTileSet(json: TileSetJson): TileSet {
  const terrainTypes: TerrainTypeInfo[] = json.terrainTypes.map((t) => ({
    type: t.type,
    targetTypes: t.targetTypes ?? [],
    color: t.color,
  }));

  const templates: TerrainTemplateInfo[] = json.templates.map((t) => ({
    id: t.id,
    name: t.name ?? `Template_${t.id}`,
    size: t.size ?? { width: 1, height: 1 },
    pickAny: t.pickAny ?? false,
    tiles: t.tiles.map((tile) => ({
      terrainType: tile.terrainType,
      height: tile.height ?? 0,
      rampType: tile.rampType ?? 0,
      minColor: tile.minColor ?? '#000000',
      maxColor: tile.maxColor ?? '#FFFFFF',
      riser: tile.riser ?? 0,
    })),
    images: t.images ?? [],
    frames: t.frames ?? [],
  }));

  return {
    name: json.name,
    tileSize: json.tileSize,
    palette: json.palette,
    terrainTypes,
    templates: buildTemplateMap(templates),
  };
}

/** Async load from URL. */
export async function loadTileSetFromUrl(url: string): Promise<TileSet> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[TileSetLoader] Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const json = (await response.json()) as TileSetJson;
  return parseTileSet(json);
}
