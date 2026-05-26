/**
 * 任务简报页面 — Task 54
 *
 * 进入战役前显示简报：背景图、任务描述文字（打字机效果）、目标列表。
 * 点击 Skip 跳过。
 *
 * Source: OpenRA.Mods.Common/Widgets/Logic/MissionBrowserLogic.cs
 */

import { MissionData } from '../../game/campaign/CampaignData';

export class BriefingScreen {
  private container: HTMLDivElement | null = null;
  private textElement: HTMLDivElement | null = null;
  private objectivesElement: HTMLUListElement | null = null;
  private typewriterInterval: ReturnType<typeof setInterval> | null = null;
  private onSkipCallback: (() => void) | null = null;

  /** 显示指定任务的简报 */
  show(mission: MissionData): void {
    this.dispose();
    this.createContainer();
    if (!this.container) return;

    // Title
    const title = document.createElement('h2');
    title.textContent = mission.name;
    title.style.cssText =
      'font-family: monospace; font-size: 28px; color: #0f0; margin-bottom: 16px; text-transform: uppercase;';
    this.container.appendChild(title);

    // Briefing text (typewriter)
    this.textElement = document.createElement('div');
    this.textElement.style.cssText =
      'font-family: monospace; font-size: 16px; color: #afa; line-height: 1.6; max-width: 600px; margin-bottom: 24px; min-height: 80px;';
    this.container.appendChild(this.textElement);
    this.startTypewriter(mission.briefingText);

    // Objectives
    const objTitle = document.createElement('h3');
    objTitle.textContent = 'Objectives';
    objTitle.style.cssText = 'font-family: monospace; font-size: 18px; color: #ff0; margin-bottom: 8px;';
    this.container.appendChild(objTitle);

    this.objectivesElement = document.createElement('ul');
    this.objectivesElement.style.cssText =
      'font-family: monospace; font-size: 14px; color: #fff; line-height: 1.8; padding-left: 20px;';
    for (const obj of mission.objectives) {
      const li = document.createElement('li');
      const marker = obj.type === 'primary' ? '★' : obj.type === 'secondary' ? '☆' : '◎';
      li.textContent = `${marker} ${obj.description}`;
      li.style.color = obj.type === 'primary' ? '#ff6' : obj.type === 'secondary' ? '#aaf' : '#888';
      this.objectivesElement.appendChild(li);
    }
    this.container.appendChild(this.objectivesElement);

    // Skip button
    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'SKIP';
    skipBtn.style.cssText =
      'margin-top: 32px; padding: 12px 32px; font-family: monospace; font-size: 16px; ' +
      'background: transparent; color: #0f0; border: 2px solid #0f0; cursor: pointer; ' +
      'text-transform: uppercase;';
    skipBtn.addEventListener('click', () => this.skip());
    skipBtn.addEventListener('mouseenter', () => {
      skipBtn.style.background = '#0f0';
      skipBtn.style.color = '#000';
    });
    skipBtn.addEventListener('mouseleave', () => {
      skipBtn.style.background = 'transparent';
      skipBtn.style.color = '#0f0';
    });
    this.container.appendChild(skipBtn);
  }

  /** 设置跳过回调 */
  onSkip(cb: () => void): void {
    this.onSkipCallback = cb;
  }

  /** 跳过简报 */
  skip(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    this.dispose();
    this.onSkipCallback?.();
  }

  private startTypewriter(text: string, speedMs = 30): void {
    if (!this.textElement) return;
    let index = 0;
    this.textElement.textContent = '';
    this.typewriterInterval = setInterval(() => {
      if (index >= text.length) {
        if (this.typewriterInterval) clearInterval(this.typewriterInterval);
        this.typewriterInterval = null;
        return;
      }
      this.textElement!.textContent += text[index];
      index++;
    }, speedMs);
  }

  private createContainer(): void {
    const container = document.createElement('div');
    container.style.cssText =
      'position: fixed; inset: 0; background: rgba(0, 20, 0, 0.95); ' +
      'display: flex; flex-direction: column; justify-content: center; align-items: center; ' +
      'z-index: 10000; padding: 40px; box-sizing: border-box;';
    document.body.appendChild(container);
    this.container = container;
  }

  private dispose(): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.textElement = null;
    this.objectivesElement = null;
  }
}
