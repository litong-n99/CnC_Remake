/**
 * 战役菜单 — Babylon.GUI 实现。
 */

import * as GUI from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';
import { GuiScreen } from './GuiScreen';
import { createHeading, createButton } from './GuiFactory';
import type { GuiRouter } from './GuiRouter';
import { loadCampaignProgress, isMissionUnlocked } from '../../game/campaign/CampaignProgress';
import { getAllCampaigns, type CampaignData } from '../../game/campaign/CampaignData';

export class CampaignMenuGui extends GuiScreen {
  private readonly router: GuiRouter;
  private onMissionSelect?: (missionId: string) => void;

  constructor(scene: Scene, router: GuiRouter) {
    super(scene, 'campaignMenu');
    this.router = router;
  }

  setOnMissionSelect(cb: (missionId: string) => void): void {
    this.onMissionSelect = cb;
  }

  protected build(): void {
    const title = createHeading('campaign_title', 'CAMPAIGN');
    this.content.addControl(title);

    const campaigns = getAllCampaigns();

    for (const campaign of campaigns) {
      this.buildCampaignSection(campaign);
    }

    // 返回按钮
    const btnBack = createButton('campaign_back', '返回主菜单');
    btnBack.onPointerDownObservable.add(() => this.router.navigate('menu'));
    this.content.addControl(btnBack);
  }

  private buildCampaignSection(campaign: CampaignData): void {
    // 战役标题
    const sectionTitle = new GUI.TextBlock(`campaign_section_${campaign.id}`, campaign.name);
    sectionTitle.fontFamily = "'Courier New', Courier, monospace";
    sectionTitle.fontSize = '18px';
    sectionTitle.fontWeight = '700';
    sectionTitle.color = '#6b8';
    sectionTitle.height = '30px';
    sectionTitle.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.content.addControl(sectionTitle);

    // 任务列表面板
    const missionPanel = new GUI.StackPanel(`campaign_missions_${campaign.id}`);
    missionPanel.isVertical = true;
    missionPanel.width = '100%';
    missionPanel.height = 'auto';
    missionPanel.spacing = 6;
    this.content.addControl(missionPanel);

    const progress = loadCampaignProgress(campaign.id);

    for (const mission of campaign.missions) {
      const unlocked = isMissionUnlocked(
        campaign.id,
        mission.id,
        (id) => campaign.missions.find((m) => m.id === id)?.prerequisites ?? []
      );
      const completed = progress.missions[mission.id]?.completed ?? false;

      const row = new GUI.Rectangle(`campaign_mission_${mission.id}`);
      row.width = '100%';
      row.height = '40px';
      row.background = 'rgba(0, 0, 0, 0.3)';
      row.color = completed ? '#4a9' : '#353';
      row.thickness = 1;
      row.isHitTestVisible = unlocked;
      row.alpha = unlocked ? 1 : 0.5;

      const nameText = new GUI.TextBlock(`campaign_mname_${mission.id}`, mission.name);
      nameText.fontFamily = "'Courier New', Courier, monospace";
      nameText.fontSize = '14px';
      nameText.color = unlocked ? '#c8d6af' : '#586';
      nameText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      nameText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
      nameText.paddingLeft = '12px';
      row.addControl(nameText);

      const statusText = new GUI.TextBlock(
        `campaign_mstatus_${mission.id}`,
        completed ? '⭐ 已完成' : unlocked ? '▶ 开始' : '🔒 锁定'
      );
      statusText.fontFamily = "'Courier New', Courier, monospace";
      statusText.fontSize = '12px';
      statusText.color = '#7a8';
      statusText.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
      statusText.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
      statusText.paddingRight = '12px';
      row.addControl(statusText);

      if (unlocked) {
        row.onPointerEnterObservable.add(() => {
          row.background = 'rgba(40, 80, 40, 0.5)';
        });
        row.onPointerOutObservable.add(() => {
          row.background = 'rgba(0, 0, 0, 0.3)';
        });
        row.onPointerDownObservable.add(() => {
          this.onMissionSelect?.(mission.id);
        });
      }

      missionPanel.addControl(row);
    }
  }
}
