/**
 * 多人游戏大厅 — Babylon.GUI 实现。
 */

import * as GUI from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';
import { GuiScreen } from './GuiScreen';
import { createHeading, createButton, createSmallButton } from './GuiFactory';
import type { GuiRouter } from './GuiRouter';

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

export class MultiplayerLobbyGui extends GuiScreen {
  private readonly router: GuiRouter;

  constructor(scene: Scene, router: GuiRouter) {
    super(scene, 'multiplayerLobby');
    this.router = router;
  }

  protected build(): void {
    const title = createHeading('lobby_title', 'MULTIPLAYER');
    this.content.addControl(title);

    // 房间列表
    const roomPanel = new GUI.StackPanel('lobby_rooms');
    roomPanel.isVertical = true;
    roomPanel.width = '100%';
    roomPanel.height = 'auto';
    roomPanel.spacing = 6;
    this.content.addControl(roomPanel);

    for (const room of DUMMY_ROOMS) {
      const row = new GUI.Rectangle(`lobby_room_${room.id}`);
      row.width = '100%';
      row.height = '48px';
      row.background = 'rgba(0, 0, 0, 0.3)';
      row.color = '#353';
      row.thickness = 1;

      // 房间名
      const nameText = new GUI.TextBlock(`lobby_rname_${room.id}`, room.name);
      nameText.fontFamily = "'Courier New', Courier, monospace";
      nameText.fontSize = '14px';
      nameText.fontWeight = '600';
      nameText.color = '#c8d6af';
      nameText.width = '120px';
      nameText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      nameText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
      nameText.paddingLeft = '10px';
      row.addControl(nameText);

      // 房间信息
      const metaText = new GUI.TextBlock(
        `lobby_rmeta_${room.id}`,
        `${room.map} · ${room.players}/${room.maxPlayers} · ${room.host}`
      );
      metaText.fontFamily = "'Courier New', Courier, monospace";
      metaText.fontSize = '12px';
      metaText.color = '#7a8';
      metaText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      metaText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
      metaText.paddingLeft = '130px';
      row.addControl(metaText);

      // 加入按钮
      const btnJoin = createSmallButton(`lobby_join_${room.id}`, '加入');
      btnJoin.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
      btnJoin.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
      btnJoin.paddingRight = '8px';
      btnJoin.onPointerDownObservable.add(() => {
        // eslint-disable-next-line no-console
        console.info('Join room:', room.id, '— network layer not ready (Task 61–68)');
      });
      row.addControl(btnJoin);

      roomPanel.addControl(row);
    }

    // 按钮
    const btnPanel = new GUI.StackPanel('lobby_actions');
    btnPanel.isVertical = true;
    btnPanel.width = '100%';
    btnPanel.height = 'auto';
    btnPanel.spacing = 10;
    this.content.addControl(btnPanel);

    const btnCreate = createButton('lobby_create', '创建房间', { primary: true });
    btnCreate.onPointerDownObservable.add(() => {
      // eslint-disable-next-line no-console
      console.info('Create room clicked — network layer not ready (Task 61–68)');
    });
    btnPanel.addControl(btnCreate);

    const btnBack = createButton('lobby_back', '返回主菜单');
    btnBack.onPointerDownObservable.add(() => this.router.navigate('menu'));
    btnPanel.addControl(btnBack);
  }
}
