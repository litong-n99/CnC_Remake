/**
 * 本地化系统 — Task 75
 *
 * 轻量级 i18n 字典，支持运行时切换语言。
 * 所有游戏 UI 文本通过 `t(key)` 获取，默认回退到英文。
 */

export type Language = 'en' | 'zh' | 'ja';

const DICTIONARY: Record<Language, Record<string, string>> = {
  en: {
    'game.title': 'Command & Conquer',
    'menu.start': 'Start Game',
    'menu.campaign': 'Campaign',
    'menu.skirmish': 'Skirmish',
    'menu.multiplayer': 'Multiplayer',
    'menu.settings': 'Settings',
    'menu.quit': 'Quit',
    'hud.credits': 'Credits',
    'hud.power': 'Power',
    'hud.unit.ready': 'Unit Ready',
    'hud.building.ready': 'Building Ready',
    'hud.objective.complete': 'Objective Complete',
    'hud.victory': 'Victory',
    'hud.defeat': 'Defeat',
  },
  zh: {
    'game.title': '命令与征服',
    'menu.start': '开始游戏',
    'menu.campaign': '战役',
    'menu.skirmish': '遭遇战',
    'menu.multiplayer': '多人游戏',
    'menu.settings': '设置',
    'menu.quit': '退出',
    'hud.credits': '资金',
    'hud.power': '电力',
    'hud.unit.ready': '单位就绪',
    'hud.building.ready': '建筑完成',
    'hud.objective.complete': '目标完成',
    'hud.victory': '胜利',
    'hud.defeat': '失败',
  },
  ja: {
    'game.title': 'コマンド＆コンカー',
    'menu.start': 'ゲーム開始',
    'menu.campaign': 'キャンペーン',
    'menu.skirmish': '遭遇戦',
    'menu.multiplayer': 'マルチプレイ',
    'menu.settings': '設定',
    'menu.quit': '終了',
    'hud.credits': '資金',
    'hud.power': '電力',
    'hud.unit.ready': 'ユニット準備完了',
    'hud.building.ready': '建築完了',
    'hud.objective.complete': '目標達成',
    'hud.victory': '勝利',
    'hud.defeat': '敗北',
  },
};

export class Localization {
  private language: Language = 'en';
  private customOverrides: Record<string, string> = {};

  /** 当前语言 */
  getLanguage(): Language {
    return this.language;
  }

  /** 切换语言 */
  setLanguage(lang: Language): void {
    this.language = lang;
  }

  /** 获取翻译文本，找不到时回退到英文，再找不到返回 key */
  t(key: string): string {
    // 1. 自定义覆盖
    if (this.customOverrides[key] !== undefined) {
      return this.customOverrides[key];
    }
    // 2. 当前语言
    const current = DICTIONARY[this.language]?.[key];
    if (current !== undefined) return current;
    // 3. 英文回退
    const fallback = DICTIONARY.en[key];
    if (fallback !== undefined) return fallback;
    // 4. 返回 key 本身
    return key;
  }

  /** 运行时覆盖某条翻译（用于 mod 或动态文本） */
  setOverride(key: string, value: string): void {
    this.customOverrides[key] = value;
  }

  /** 移除覆盖 */
  removeOverride(key: string): void {
    delete this.customOverrides[key];
  }

  /** 列出所有可用语言 */
  getAvailableLanguages(): Language[] {
    return Object.keys(DICTIONARY) as Language[];
  }
}

/** 全局单例 */
let globalLocalization: Localization | null = null;

export function getLocalization(): Localization {
  if (!globalLocalization) {
    globalLocalization = new Localization();
  }
  return globalLocalization;
}

export function resetLocalization(): void {
  globalLocalization = null;
}
