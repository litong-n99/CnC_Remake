/**
 * CustomMovementLayer — Task 126
 * OpenRA 对标: `OpenRA.Mods.Common/Traits/World/CustomMovementLayer.cs`
 *
 * 多层移动系统接口：支持隧道、地下、飞行、桥梁等特殊移动层。
 * 当前为骨架实现，预留接口供后续路径查找器扩展。
 */

/** 移动层类型。 */
export enum MovementLayerType {
  Ground = 'Ground',
  Water = 'Water',
  Air = 'Air',
  Tunnel = 'Tunnel',
  Bridge = 'Bridge',
  Cliff = 'Cliff',
}

/** 单层移动信息。 */
export interface MovementLayerInfo {
  readonly type: MovementLayerType;
  /** 该层的高度偏移（世界单位）。 */
  readonly heightOffset: number;
  /** 该层是否允许通行（可能被建筑/单位阻塞）。 */
  readonly enabled: boolean;
}

/**
 * 自定义移动层管理器 — 管理地图上的多层移动。
 *
 * 骨架实现：支持注册/注销层、查询格子的可用层、高度过渡。
 */
export class CustomMovementLayer {
  private readonly layers = new Map<string, MovementLayerInfo>();
  private readonly cellLayers = new Map<string, MovementLayerType[]>();

  /** 注册一个移动层。 */
  registerLayer(id: string, info: MovementLayerInfo): void {
    this.layers.set(id, info);
  }

  /** 注销一个移动层。 */
  unregisterLayer(id: string): void {
    this.layers.delete(id);
  }

  /** 获取指定层的配置。 */
  getLayer(id: string): MovementLayerInfo | undefined {
    return this.layers.get(id);
  }

  /** 为指定格子设置可用移动层。 */
  setCellLayers(x: number, y: number, layerTypes: MovementLayerType[]): void {
    this.cellLayers.set(`${x},${y}`, layerTypes);
  }

  /** 获取指定格子的可用移动层。 */
  getCellLayers(x: number, y: number): MovementLayerType[] {
    return this.cellLayers.get(`${x},${y}`) ?? [MovementLayerType.Ground];
  }

  /** 检查指定格子是否支持某移动层。 */
  canEnterLayer(x: number, y: number, layerType: MovementLayerType): boolean {
    const layers = this.getCellLayers(x, y);
    return layers.includes(layerType);
  }

  /** 获取层间高度差（用于判断过渡合法性）。 */
  getHeightDifference(fromLayer: string, toLayer: string): number {
    const from = this.layers.get(fromLayer);
    const to = this.layers.get(toLayer);
    if (!from || !to) return 0;
    return to.heightOffset - from.heightOffset;
  }

  /** 清空所有层和格子映射。 */
  clear(): void {
    this.layers.clear();
    this.cellLayers.clear();
  }

  /** 获取所有已注册层（只读）。 */
  getAllLayers(): ReadonlyMap<string, MovementLayerInfo> {
    return this.layers;
  }
}
