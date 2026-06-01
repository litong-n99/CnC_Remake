/**
 * 战役选择页面 — CAM-16
 *
 * 显示 Red Alert Allies / Soviet 战役列表。
 * 点击任务触发加载流程（BriefingScreen → 加载 → 游戏）。
 */

import type { ShellRouter } from './ShellRouter';

interface MissionInfo {
  id: string;
  name: string;
  locked: boolean;
  completed: boolean;
  mapFolder: string;
  scriptUrl?: string;
}

interface CampaignInfo {
  faction: string;
  name: string;
  missions: MissionInfo[];
}

const CAMPAIGNS: CampaignInfo[] = [
  {
    faction: 'allies',
    name: 'Allies Campaign',
    missions: [
      {
        id: 'allies-01',
        name: '01: In the Thick of It',
        locked: false,
        completed: false,
        mapFolder: '/maps/allies-01',
        scriptUrl: '/maps/allies-01/allies01.js',
      },
      { id: 'allies-02', name: '02: (Locked)', locked: true, completed: false, mapFolder: '' },
      { id: 'allies-03', name: '03: (Locked)', locked: true, completed: false, mapFolder: '' },
    ],
  },
  {
    faction: 'soviet',
    name: 'Soviet Campaign',
    missions: [
      { id: 'soviet-01', name: '01: (Locked)', locked: true, completed: false, mapFolder: '' },
      { id: 'soviet-02', name: '02: (Locked)', locked: true, completed: false, mapFolder: '' },
    ],
  },
];

export class CampaignMenu {
  private readonly container: HTMLElement;
  private readonly router: ShellRouter;
  private onMissionSelectedCallback: ((mission: MissionInfo) => void) | null = null;

  constructor(parent: HTMLElement, router: ShellRouter) {
    this.router = router;
    this.container = document.createElement('div');
    this.container.id = 'campaign-menu';
    this.container.className = 'cnc-shell cnc-page';
    this.render();
    parent.appendChild(this.container);
    this.bindEvents();
  }

  getElement(): HTMLElement {
    return this.container;
  }

  /** 设置任务选择回调。 */
  onMissionSelected(cb: (mission: MissionInfo) => void): void {
    this.onMissionSelectedCallback = cb;
  }

  private render(): void {
    const campaignsHtml = CAMPAIGNS.map((c) => {
      const missionsHtml = c.missions
        .map((m) => {
          const statusClass = m.locked ? 'cnc-mission-locked' : m.completed ? 'cnc-mission-done' : 'cnc-mission-open';
          const statusText = m.locked ? '🔒 锁定' : m.completed ? '⭐ 已完成' : '▶ 开始';
          return `
            <div class="cnc-mission ${statusClass}" data-faction="${c.faction}" data-mission="${m.id}">
              <span class="cnc-mission-name">${m.name}</span>
              <span class="cnc-mission-status">${statusText}</span>
            </div>
          `;
        })
        .join('');
      return `
        <div class="cnc-campaign" data-faction="${c.faction}">
          <h3 class="cnc-campaign-title">${c.name}</h3>
          <div class="cnc-mission-list">${missionsHtml}</div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="cnc-campaign-bg"></div>
      <div class="cnc-campaign-content">
        <h2 class="cnc-campaign-title-main">CAMPAIGN</h2>
        <div class="cnc-campaign-list">${campaignsHtml}</div>
        <div class="cnc-campaign-actions">
          <button class="cnc-btn" data-action="back">返回主菜单</button>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.closest('[data-action]')?.getAttribute('data-action');
      if (action === 'back') {
        this.router.navigate('menu');
        return;
      }

      const missionEl = target.closest('.cnc-mission') as HTMLElement | null;
      if (missionEl && !missionEl.classList.contains('cnc-mission-locked')) {
        const faction = missionEl.getAttribute('data-faction') ?? '';
        const missionId = missionEl.getAttribute('data-mission') ?? '';
        const campaign = CAMPAIGNS.find((c) => c.faction === faction);
        const mission = campaign?.missions.find((m) => m.id === missionId);
        if (mission) {
          console.warn('[CampaignMenu] Selected:', missionId);
          this.onMissionSelectedCallback?.(mission);
        }
      }
    });
  }

  dispose(): void {
    this.container.remove();
  }
}

export type { MissionInfo };
