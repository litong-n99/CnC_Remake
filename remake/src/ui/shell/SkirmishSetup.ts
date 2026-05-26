/**
 * 遭遇战设置页面 — Task 39
 *
 * 选择地图、玩家数、起始资金、游戏速度、AI 难度。
 * 配置完成后点击"开始"进入 loading → game。
 */

import type { ShellRouter } from './ShellRouter';

interface SkirmishConfig {
  map: string;
  startingCash: number;
  gameSpeed: string;
  aiDifficulty: string;
}

const MAPS = [
  { id: 'temperat-64', name: 'Temperate 64×64' },
  { id: 'desert-64', name: 'Desert 64×64' },
  { id: 'winter-96', name: 'Winter 96×96' },
];

const STARTING_CASH = [5000, 10000, 20000];
const GAME_SPEEDS = [
  { value: 'slow', label: '慢速' },
  { value: 'normal', label: '正常' },
  { value: 'fast', label: '快速' },
];
const AI_DIFFICULTIES = [
  { value: 'easy', label: '简单' },
  { value: 'normal', label: '普通' },
  { value: 'hard', label: '困难' },
];

export class SkirmishSetup {
  private readonly container: HTMLElement;
  private readonly router: ShellRouter;
  private config: SkirmishConfig;

  constructor(parent: HTMLElement, router: ShellRouter) {
    this.router = router;
    this.config = { map: MAPS[0].id, startingCash: 10000, gameSpeed: 'normal', aiDifficulty: 'normal' };
    this.container = document.createElement('div');
    this.container.id = 'skirmish-setup';
    this.container.className = 'cnc-shell cnc-page';
    this.render();
    parent.appendChild(this.container);
    this.bindEvents();
  }

  getElement(): HTMLElement {
    return this.container;
  }

  getConfig(): Readonly<SkirmishConfig> {
    return { ...this.config };
  }

  private render(): void {
    const mapOptions = MAPS.map(
      (m) => `<option value="${m.id}" ${m.id === this.config.map ? 'selected' : ''}>${m.name}</option>`
    ).join('');
    const cashOptions = STARTING_CASH.map(
      (c) => `<option value="${c}" ${c === this.config.startingCash ? 'selected' : ''}>$${c}</option>`
    ).join('');
    const speedOptions = GAME_SPEEDS.map(
      (s) => `<option value="${s.value}" ${s.value === this.config.gameSpeed ? 'selected' : ''}>${s.label}</option>`
    ).join('');
    const aiOptions = AI_DIFFICULTIES.map(
      (d) => `<option value="${d.value}" ${d.value === this.config.aiDifficulty ? 'selected' : ''}>${d.label}</option>`
    ).join('');

    this.container.innerHTML = `
      <div class="cnc-skirmish-bg"></div>
      <div class="cnc-skirmish-content">
        <h2 class="cnc-skirmish-title">SKIRMISH</h2>
        <div class="cnc-skirmish-form">
          <label class="cnc-skirmish-row">
            <span>地图</span>
            <select data-key="map">${mapOptions}</select>
          </label>
          <label class="cnc-skirmish-row">
            <span>起始资金</span>
            <select data-key="startingCash">${cashOptions}</select>
          </label>
          <label class="cnc-skirmish-row">
            <span>游戏速度</span>
            <select data-key="gameSpeed">${speedOptions}</select>
          </label>
          <label class="cnc-skirmish-row">
            <span>AI 难度</span>
            <select data-key="aiDifficulty">${aiOptions}</select>
          </label>
        </div>
        <div class="cnc-skirmish-actions">
          <button class="cnc-btn cnc-btn-primary" data-action="start">开始游戏</button>
          <button class="cnc-btn" data-action="back">返回主菜单</button>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.closest('[data-action]')?.getAttribute('data-action');
      if (action === 'start') {
        this.router.navigate('loading');
        // TODO: pass config to GameLoop when Task 136 (GameSpeeds) is ready
        setTimeout(() => {
          this.router.navigate('game');
        }, 1500);
      } else if (action === 'back') {
        this.router.navigate('menu');
      }
    });

    this.container.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const key = target.getAttribute('data-key');
      if (!key) return;
      const value = target.value;
      if (key === 'startingCash') {
        this.config.startingCash = parseInt(value, 10);
      } else {
        (this.config as unknown as Record<string, string>)[key] = value;
      }
    });
  }

  dispose(): void {
    this.container.remove();
  }
}
