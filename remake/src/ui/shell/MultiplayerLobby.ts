/**
 * 多人游戏大厅 — Task 40
 *
 * 房间列表、创建房间、加入房间。
 * 纯占位 UI，网络功能待 Task 61–68 实现后对接。
 */

import type { ShellRouter } from './ShellRouter';

interface RoomInfo {
  id: string;
  name: string;
  host: string;
  map: string;
  players: number;
  maxPlayers: number;
}

const DUMMY_ROOMS: RoomInfo[] = [
  { id: 'room-1', name: 'GDI vs Nod', host: 'Player1', map: 'Temperat 64×64', players: 2, maxPlayers: 4 },
  { id: 'room-2', name: '2v2 Team', host: 'Commander', map: 'Winter 96×96', players: 1, maxPlayers: 4 },
];

export class MultiplayerLobby {
  private readonly container: HTMLElement;
  private readonly router: ShellRouter;

  constructor(parent: HTMLElement, router: ShellRouter) {
    this.router = router;
    this.container = document.createElement('div');
    this.container.id = 'multiplayer-lobby';
    this.container.className = 'cnc-shell cnc-page';
    this.render();
    parent.appendChild(this.container);
    this.bindEvents();
  }

  getElement(): HTMLElement {
    return this.container;
  }

  private render(): void {
    const roomsHtml = DUMMY_ROOMS.map(
      (r) => `
      <div class="cnc-room" data-room="${r.id}">
        <span class="cnc-room-name">${r.name}</span>
        <span class="cnc-room-meta">${r.map} · ${r.players}/${r.maxPlayers} · ${r.host}</span>
        <button class="cnc-btn" data-action="join" data-room="${r.id}">加入</button>
      </div>
    `
    ).join('');

    this.container.innerHTML = `
      <div class="cnc-lobby-bg"></div>
      <div class="cnc-lobby-content">
        <h2 class="cnc-lobby-title">MULTIPLAYER</h2>
        <div class="cnc-room-list">
          ${roomsHtml}
        </div>
        <div class="cnc-lobby-actions">
          <button class="cnc-btn cnc-btn-primary" data-action="create">创建房间</button>
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
      } else if (action === 'create') {
        // eslint-disable-next-line no-console
        console.info('Create room clicked — network layer not ready (Task 61–68)');
      } else if (action === 'join') {
        const roomId = target.closest('[data-room]')?.getAttribute('data-room') ?? '';
        // eslint-disable-next-line no-console
        console.info('Join room:', roomId, '— network layer not ready (Task 61–68)');
      }
    });
  }

  dispose(): void {
    this.container.remove();
  }
}
