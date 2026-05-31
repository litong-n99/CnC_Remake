/**
 * 任务简报页面 — Babylon.GUI 实现。
 */

import * as GUI from '@babylonjs/gui';
import type { Scene } from '@babylonjs/core';
import { GuiScreen } from './GuiScreen';
import { createHeading, createButton, createBodyText } from './GuiFactory';
import type { MissionData } from '../../game/campaign/CampaignData';

export class BriefingScreenGui extends GuiScreen {
  private mission: MissionData | null = null;
  private onSkipCallback: (() => void) | null = null;
  private textBlock!: GUI.TextBlock;
  private objectivesPanel!: GUI.StackPanel;
  private typewriterTimer: ReturnType<typeof setInterval> | null = null;

  constructor(scene: Scene) {
    super(scene, 'briefingScreen');
  }

  /** 显示指定任务的简报。 */
  showMission(mission: MissionData): void {
    this.mission = mission;
    this.show();
    this.startTypewriter(mission.briefingText);
    this.buildObjectives(mission);
  }

  onSkip(cb: () => void): void {
    this.onSkipCallback = cb;
  }

  skip(): void {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    this.hide();
    this.onSkipCallback?.();
  }

  protected build(): void {
    // 背景已经是深色的，无需额外处理
  }

  protected onShow(): void {
    if (!this.mission) return;

    // 标题
    const title = createHeading('briefing_title', this.mission.name);
    this.content.addControl(title);

    // 简报文本
    this.textBlock = createBodyText('briefing_text', '');
    this.textBlock.height = '120px';
    this.textBlock.textWrapping = true;
    this.textBlock.color = '#afa';
    this.content.addControl(this.textBlock);

    // 目标标题
    const objTitle = new GUI.TextBlock('briefing_objTitle', 'Objectives');
    objTitle.fontFamily = "'Courier New', Courier, monospace";
    objTitle.fontSize = '18px';
    objTitle.fontWeight = '700';
    objTitle.color = '#ff0';
    objTitle.height = '30px';
    objTitle.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.content.addControl(objTitle);

    // 目标列表
    this.objectivesPanel = new GUI.StackPanel('briefing_objectives');
    this.objectivesPanel.isVertical = true;
    this.objectivesPanel.width = '100%';
    this.objectivesPanel.height = 'auto';
    this.objectivesPanel.spacing = 6;
    this.content.addControl(this.objectivesPanel);

    // Skip 按钮
    const btnSkip = createButton('briefing_skip', 'SKIP', { primary: true });
    btnSkip.onPointerDownObservable.add(() => this.skip());
    this.content.addControl(btnSkip);
  }

  protected onHide(): void {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    // 清理 content
    while (this.content.children.length > 0) {
      this.content.children[0].dispose();
    }
  }

  private startTypewriter(text: string, speedMs = 30): void {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
    }
    let index = 0;
    this.textBlock.text = '';
    this.typewriterTimer = setInterval(() => {
      if (index >= text.length) {
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
        return;
      }
      this.textBlock.text += text[index];
      index++;
    }, speedMs);
  }

  private buildObjectives(mission: MissionData): void {
    while (this.objectivesPanel.children.length > 0) {
      this.objectivesPanel.children[0].dispose();
    }

    for (const obj of mission.objectives) {
      const marker = obj.type === 'primary' ? '★' : obj.type === 'secondary' ? '☆' : '◎';
      const color = obj.type === 'primary' ? '#ff6' : obj.type === 'secondary' ? '#aaf' : '#888';

      const row = new GUI.TextBlock(`briefing_obj_${obj.id}`, `${marker} ${obj.description}`);
      row.fontFamily = "'Courier New', Courier, monospace";
      row.fontSize = '14px';
      row.color = color;
      row.height = '24px';
      row.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      this.objectivesPanel.addControl(row);
    }
  }
}
