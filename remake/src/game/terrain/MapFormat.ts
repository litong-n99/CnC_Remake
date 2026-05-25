/**
 * OpenRA 地图格式定义。
 *
 * Source: OpenRA.Game/Map/Map.cs + MapGrid.cs
 *
 * OpenRA 地图是一个文件夹，包含：
 * - `map.yaml` — 元数据、玩家、演员、规则（MiniYaml 格式）
 * - `map.bin`  — 二进制地形数据（tiles / heights / resources）
 * - `map.png`  — 缩略图（本项目暂不解析）
 */

// ═══════════════════════════════════════════════════════════════
//  MiniYaml — OpenRA 的简化 YAML 方言
// ═══════════════════════════════════════════════════════════════

/** MiniYaml 节点。OpenRA 使用缩进（Tab）表示层级。 */
export interface MiniYamlNode {
  readonly key: string;
  readonly value: string;
  readonly children: MiniYamlNode[];
}

/**
 * 解析 OpenRA MiniYaml 文本。
 *
 * MiniYaml 与标准 YAML 的差异：
 * - 使用 Tab（`\t`）缩进，每层一个 Tab
 * - `Key: Value` 后可以继续跟子节点（标准 YAML 不允许）
 * - `@` 符号用于引用/继承（如 `PlayerReference@Multi0`）
 *
 * 本解析器为简化版，支持基本键值对和层级，足以解析 map.yaml。
 */
export function parseMiniYaml(text: string): MiniYamlNode[] {
  const lines = text.split('\n');
  const root: MiniYamlNode[] = [];
  const stack: MiniYamlNode[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const match = line.match(/^(\t*)(.*)$/);
    const indent = match?.[1].length ?? 0;
    const content = match?.[2] ?? '';

    const colonIdx = content.indexOf(':');
    let key: string;
    let value: string;

    if (colonIdx >= 0) {
      key = content.slice(0, colonIdx).trim();
      value = content.slice(colonIdx + 1).trim();
    } else {
      key = content.trim();
      value = '';
    }

    const node: MiniYamlNode = { key, value, children: [] };

    // 调整栈深度到当前缩进
    while (stack.length > indent) {
      stack.pop();
    }

    if (indent === 0) {
      root.push(node);
    } else if (stack.length >= indent) {
      stack[indent - 1].children.push(node);
    }

    // 将当前节点放到栈的对应位置
    if (stack.length <= indent) {
      stack.push(node);
    } else {
      stack[indent] = node;
    }
  }

  return root;
}

/** 从 MiniYaml 节点树中查找指定键的节点。 */
export function findMiniYamlNode(nodes: MiniYamlNode[], key: string): MiniYamlNode | undefined {
  return nodes.find((n) => n.key === key);
}

/** 从 MiniYaml 节点树中查找指定键的值（字符串）。 */
export function getMiniYamlValue(nodes: MiniYamlNode[], key: string): string | undefined {
  return findMiniYamlNode(nodes, key)?.value;
}

// ═══════════════════════════════════════════════════════════════
//  map.yaml 数据结构
// ═══════════════════════════════════════════════════════════════

/** 解析后的 map.yaml 顶层结构。 */
export interface MapYaml {
  readonly MapFormat: number;
  readonly RequiresMod: string;
  readonly Title: string;
  readonly Author: string;
  readonly Tileset: string;
  readonly MapSize: { width: number; height: number };
  readonly Bounds: { x: number; y: number; width: number; height: number };
  readonly Visibility?: string;
  readonly Categories?: string[];
  readonly Players: PlayerReference[];
  readonly Actors: ActorPlacement[];
  readonly Rules?: Record<string, unknown>;
}

/** 玩家定义。 */
export interface PlayerReference {
  readonly id: string; // 如 "Multi0", "Neutral"
  readonly name: string;
  readonly ownsWorld?: boolean;
  readonly nonCombatant?: boolean;
  readonly playable?: boolean;
  readonly faction?: string;
  readonly enemies?: string[];
  readonly allies?: string[];
}

/** 演员（单位/建筑）初始放置。 */
export interface ActorPlacement {
  readonly id: string; // 如 "Actor0"
  readonly type: string; // 如 "mcv", "fact"
  readonly location: { x: number; y: number };
  readonly owner: string;
}

/** 将 MiniYaml 节点树转换为结构化的 MapYaml。 */
export function mapYamlFromNodes(nodes: MiniYamlNode[]): MapYaml {
  const mapSizeStr = getMiniYamlValue(nodes, 'MapSize') ?? '64,64';
  const boundsStr = getMiniYamlValue(nodes, 'Bounds') ?? '0,0,64,64';

  const [mapW, mapH] = mapSizeStr.split(',').map((s) => parseInt(s.trim(), 10));
  const [bx, by, bw, bh] = boundsStr.split(',').map((s) => parseInt(s.trim(), 10));

  const playersNode = findMiniYamlNode(nodes, 'Players');
  const actorsNode = findMiniYamlNode(nodes, 'Actors');

  return {
    MapFormat: parseInt(getMiniYamlValue(nodes, 'MapFormat') ?? '11', 10),
    RequiresMod: getMiniYamlValue(nodes, 'RequiresMod') ?? '',
    Title: getMiniYamlValue(nodes, 'Title') ?? 'Untitled',
    Author: getMiniYamlValue(nodes, 'Author') ?? '',
    Tileset: getMiniYamlValue(nodes, 'Tileset') ?? 'TEMPERAT',
    MapSize: { width: mapW, height: mapH },
    Bounds: { x: bx, y: by, width: bw, height: bh },
    Visibility: getMiniYamlValue(nodes, 'Visibility'),
    Categories: getMiniYamlValue(nodes, 'Categories')
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    Players: parsePlayers(playersNode?.children ?? []),
    Actors: parseActors(actorsNode?.children ?? []),
  };
}

function parsePlayers(nodes: MiniYamlNode[]): PlayerReference[] {
  return nodes.map((n) => ({
    id: n.key.replace(/^PlayerReference@/, ''),
    name: getMiniYamlValue(n.children, 'Name') ?? n.key,
    ownsWorld: getMiniYamlValue(n.children, 'OwnsWorld') === 'True',
    nonCombatant: getMiniYamlValue(n.children, 'NonCombatant') === 'True',
    playable: getMiniYamlValue(n.children, 'Playable') === 'True',
    faction: getMiniYamlValue(n.children, 'Faction') ?? undefined,
    enemies: getMiniYamlValue(n.children, 'Enemies')
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    allies: getMiniYamlValue(n.children, 'Allies')
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  }));
}

function parseActors(nodes: MiniYamlNode[]): ActorPlacement[] {
  return nodes.map((n) => {
    const locStr = getMiniYamlValue(n.children, 'Location') ?? '0,0';
    const [lx, ly] = locStr.split(',').map((s) => parseInt(s.trim(), 10));
    return {
      id: n.key,
      type: n.value,
      location: { x: lx, y: ly },
      owner: getMiniYamlValue(n.children, 'Owner') ?? 'Neutral',
    };
  });
}

// ═══════════════════════════════════════════════════════════════
//  map.bin 数据结构
// ═══════════════════════════════════════════════════════════════

/** map.bin 文件头。 */
export interface MapBinHeader {
  readonly format: number;
  readonly width: number;
  readonly height: number;
  readonly tilesOffset: number;
  readonly heightsOffset: number;
  readonly resourcesOffset: number;
}

/** 单个地形 tile。 */
export interface MapTile {
  readonly type: number; // ushort — TileSet 模板 ID
  readonly index: number; // byte  — 模板内索引（255 = PickAny）
}

/** 单个格子的资源数据。 */
export interface MapResourceCell {
  readonly type: number; // byte — 0=None, 1=Ore, 2=Gem, 3=Tiberium...
  readonly density: number; // byte — 0-255
}

/** 完整的 map.bin 解析结果。 */
export interface MapBinData {
  readonly header: MapBinHeader;
  readonly tiles: MapTile[]; // length = width * height
  readonly heights: number[]; // length = width * height
  readonly resources: MapResourceCell[]; // length = width * height
}

/**
 * 解析 OpenRA map.bin 二进制数据。
 *
 * 字节序：Little-endian。
 */
export function parseMapBin(buffer: ArrayBuffer): MapBinData {
  const view = new DataView(buffer);
  let offset = 0;

  const header: MapBinHeader = {
    format: view.getUint8(offset),
    width: view.getUint16(offset + 1, true),
    height: view.getUint16(offset + 3, true),
    tilesOffset: view.getUint32(offset + 5, true),
    heightsOffset: view.getUint32(offset + 9, true),
    resourcesOffset: view.getUint32(offset + 13, true),
  };
  offset = 17;

  const cellCount = header.width * header.height;

  // Tiles
  const tiles: MapTile[] = [];
  offset = header.tilesOffset;
  for (let i = 0; i < cellCount; i++) {
    const type = view.getUint16(offset, true);
    const index = view.getUint8(offset + 2);
    tiles.push({ type, index });
    offset += 3;
  }

  // Heights
  const heights: number[] = [];
  offset = header.heightsOffset;
  for (let i = 0; i < cellCount; i++) {
    heights.push(view.getUint8(offset));
    offset += 1;
  }

  // Resources
  const resources: MapResourceCell[] = [];
  offset = header.resourcesOffset;
  for (let i = 0; i < cellCount; i++) {
    const type = view.getUint8(offset);
    const density = view.getUint8(offset + 1);
    resources.push({ type, density });
    offset += 2;
  }

  return { header, tiles, heights, resources };
}
