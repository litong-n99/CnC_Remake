/**
 * 战役选择页面 — Task 38
 *
 * 显示 GDI / Nod 战役列表和任务缩略图。
 * 纯 DOM + CSS，数据硬编码（后续对接 CampaignData 层）。
 */

import type { ShellRouter } from './ShellRouter';

interface MissionInfo {
  id: string;
  name: string;
  locked: boolean;
  completed: boolean;
}

interface CampaignInfo {
  faction: string;
  name: string;
  missions: MissionInfo[];
}

const CAMPAIGNS: CampaignInfo[] = [
  {
    faction: 'gdi',
    name: 'GDI 战役',
    missions: [
      { id: 'gdi-01', name: '第一关：初试锋芒', locked: false, completed: true },
      { id: 'gdi-02', name: '第二关：沙漠风暴', locked: false, completed: false },
      { id: 'gdi-03', name: '第三关： nuclear dawn', locked: true, completed: false },
    ],
  },
  {
    faction: 'nod',
    name: 'Nod 战役',
    missions: [
      { id: 'nod-01', name: '第一关：兄弟会崛起', locked: false, completed: false },
      { id: 'nod-02', name: '第二关：暗影行动', locked: true, completed: false },
      { id: 'nod-03', name: '第三关：泰伯利亚之日', locked: true, completed: false },
    ],
  },
];

export class CampaignMenu {
  private readonly container: HTMLElement;
  private readonly router: ShellRouter;

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
        const mission = missionEl.getAttribute('data-mission') ?? '';
        // eslint-disable-next-line no-console
        console.info('Campaign selected:', faction, mission);
        // TODO: 进入战役加载流程（Task 54+）
      }
    });
  }

  dispose(): void {
    this.container.remove();
  }
}
