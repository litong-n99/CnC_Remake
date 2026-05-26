/**
 * Campaign Progress — Task 53
 *
 * 使用 localStorage 保存每个战役的完成状态、最佳时间、困难度通关标记。
 * Key 前缀: `cnc_campaign_`
 */

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface MissionProgress {
  readonly missionId: string;
  /** 是否已完成 */
  completed: boolean;
  /** 最佳通关时间（秒） */
  bestTimeSeconds: number;
  /** 已通关的困难度 */
  completedDifficulties: Difficulty[];
}

export interface CampaignProgressData {
  readonly campaignId: string;
  /** 每个任务的进度 */
  missions: Record<string, MissionProgress>;
  /** 当前进行到的任务索引 */
  currentMissionIndex: number;
}

const STORAGE_KEY_PREFIX = 'cnc_campaign_';

function getStorageKey(campaignId: string): string {
  return `${STORAGE_KEY_PREFIX}${campaignId}`;
}

/** 加载指定战役的进度。 */
export function loadCampaignProgress(campaignId: string): CampaignProgressData {
  const key = getStorageKey(campaignId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as CampaignProgressData;
      return {
        campaignId,
        missions: parsed.missions ?? {},
        currentMissionIndex: parsed.currentMissionIndex ?? 0,
      };
    }
  } catch {
    // ignore corrupt data
  }
  return { campaignId, missions: {}, currentMissionIndex: 0 };
}

/** 保存指定战役的进度。 */
export function saveCampaignProgress(progress: CampaignProgressData): void {
  const key = getStorageKey(progress.campaignId);
  localStorage.setItem(key, JSON.stringify(progress));
}

/** 标记某个任务已完成。 */
export function markMissionCompleted(
  campaignId: string,
  missionId: string,
  elapsedSeconds: number,
  difficulty: Difficulty
): void {
  const progress = loadCampaignProgress(campaignId);
  const existing = progress.missions[missionId] ?? {
    missionId,
    completed: false,
    bestTimeSeconds: Number.MAX_SAFE_INTEGER,
    completedDifficulties: [],
  };

  const diffs = new Set(existing.completedDifficulties);
  diffs.add(difficulty);

  progress.missions[missionId] = {
    missionId,
    completed: true,
    bestTimeSeconds: Math.min(existing.bestTimeSeconds, elapsedSeconds),
    completedDifficulties: Array.from(diffs),
  };

  // Advance currentMissionIndex if this was the last unlocked mission
  const missions = Object.values(progress.missions);
  const completedCount = missions.filter((m) => m.completed).length;
  if (completedCount > progress.currentMissionIndex) {
    progress.currentMissionIndex = completedCount;
  }

  saveCampaignProgress(progress);
}

/** 检查某个任务是否已解锁（前置任务已完成或该任务是第一个）。 */
export function isMissionUnlocked(
  campaignId: string,
  missionId: string,
  getPrerequisites: (id: string) => string[]
): boolean {
  const progress = loadCampaignProgress(campaignId);
  if (progress.missions[missionId]?.completed) return true;

  const prerequisites = getPrerequisites(missionId);
  if (prerequisites.length === 0) return true;

  return prerequisites.every((preId) => progress.missions[preId]?.completed);
}

/** 清除所有战役进度（重置）。 */
export function clearAllCampaignProgress(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(STORAGE_KEY_PREFIX)) {
      keys.push(k);
    }
  }
  for (const k of keys) {
    localStorage.removeItem(k);
  }
}

/** 获取所有已保存的战役 ID。 */
export function getSavedCampaignIds(): string[] {
  const ids: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(STORAGE_KEY_PREFIX)) {
      ids.push(k.slice(STORAGE_KEY_PREFIX.length));
    }
  }
  return ids;
}
