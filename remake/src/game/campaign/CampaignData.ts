/**
 * Campaign Data Layer — Task 52
 *
 * 定义战役列表 (CampaignData) 和单个任务 (MissionData) 的数据结构。
 * 支持从 JSON 加载，与 CampaignMenu 直接兼容。
 */

export interface MissionObjective {
  readonly id: string;
  readonly description: string;
  readonly type: 'primary' | 'secondary' | 'bonus';
}

export interface MissionData {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly mapPath: string;
  /** 简报文字（支持打字机效果） */
  readonly briefingText: string;
  /** 可选：简报语音旁白路径 */
  readonly briefingAudio?: string;
  /** 可选： briefing 视频路径 */
  readonly briefingVideo?: string;
  readonly objectives: MissionObjective[];
  /** 前置任务 ID，完成前置后才可解锁 */
  readonly prerequisites: string[];
  /** 可选：推荐使用的阵营 */
  readonly faction?: 'gdi' | 'nod';
}

export interface CampaignData {
  readonly id: string;
  readonly name: string;
  readonly faction: 'gdi' | 'nod';
  readonly missions: MissionData[];
}

/** 内置的 GDI 战役（占位数据，可替换为真实 JSON）。 */
const GDI_CAMPAIGN: CampaignData = {
  id: 'gdi-campaign',
  name: 'GDI Campaign',
  faction: 'gdi',
  missions: [
    {
      id: 'gdi-01',
      name: 'First Strike',
      description: 'Establish a beachhead and destroy the Nod outpost.',
      mapPath: '/maps/gdi_01.json',
      briefingText:
        'Welcome to the GDI, Commander. Nod forces have been spotted near this location. ' +
        'Your mission is to establish a base and eliminate all enemy presence.',
      objectives: [
        { id: 'obj-1', description: 'Build a Construction Yard', type: 'primary' },
        { id: 'obj-2', description: 'Destroy all Nod forces', type: 'primary' },
      ],
      prerequisites: [],
      faction: 'gdi',
    },
    {
      id: 'gdi-02',
      name: 'Behind Enemy Lines',
      description: 'Infiltrate the Nod base and gather intelligence.',
      mapPath: '/maps/gdi_02.json',
      briefingText:
        'Excellent work on your first mission. Now we need you to infiltrate ' +
        'a Nod supply base and gather intelligence on their Tiberium research.',
      objectives: [
        { id: 'obj-1', description: 'Reach the Nod base undetected', type: 'primary' },
        { id: 'obj-2', description: 'Destroy the Tiberium research lab', type: 'primary' },
      ],
      prerequisites: ['gdi-01'],
      faction: 'gdi',
    },
  ],
};

/** 内置的 Nod 战役（占位数据）。 */
const NOD_CAMPAIGN: CampaignData = {
  id: 'nod-campaign',
  name: 'Nod Campaign',
  faction: 'nod',
  missions: [
    {
      id: 'nod-01',
      name: 'Silencing Nikoomba',
      description: 'Eliminate the local tribal leader to secure the region.',
      mapPath: '/maps/nod_01.json',
      briefingText:
        'The Brotherhood has need of your talents, Commander. A local tribal leader ' +
        'threatens our operations. Remove him.',
      objectives: [{ id: 'obj-1', description: 'Eliminate Nikoomba', type: 'primary' }],
      prerequisites: [],
      faction: 'nod',
    },
  ],
};

const CAMPAIGNS = new Map<string, CampaignData>([
  [GDI_CAMPAIGN.id, GDI_CAMPAIGN],
  [NOD_CAMPAIGN.id, NOD_CAMPAIGN],
]);

/** 获取所有战役列表。 */
export function getAllCampaigns(): CampaignData[] {
  return Array.from(CAMPAIGNS.values());
}

/** 按 ID 获取单个战役。 */
export function getCampaignById(id: string): CampaignData | undefined {
  return CAMPAIGNS.get(id);
}

/** 获取指定战役的所有任务。 */
export function getMissions(campaignId: string): MissionData[] {
  return CAMPAIGNS.get(campaignId)?.missions ?? [];
}

/** 按任务 ID 查找任务（跨所有战役）。 */
export function getMissionById(missionId: string): MissionData | undefined {
  for (const campaign of CAMPAIGNS.values()) {
    const mission = campaign.missions.find((m) => m.id === missionId);
    if (mission) return mission;
  }
  return undefined;
}

/** 注册自定义战役（支持 mod 扩展）。 */
export function registerCampaign(campaign: CampaignData): void {
  CAMPAIGNS.set(campaign.id, campaign);
}

/** 从 JSON 加载战役数据。 */
export function loadCampaignsFromJson(json: unknown): void {
  if (!Array.isArray(json)) {
    console.warn('[CampaignData] Expected array of campaigns');
    return;
  }
  for (const item of json) {
    if (isCampaignData(item)) {
      registerCampaign(item as CampaignData);
    }
  }
}

function isCampaignData(obj: unknown): boolean {
  const c = obj as Record<string, unknown>;
  return typeof c?.id === 'string' && typeof c?.name === 'string' && Array.isArray(c?.missions);
}
