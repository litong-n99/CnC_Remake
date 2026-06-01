import { FreeCamera, Vector3 } from '@babylonjs/core';
import { SceneManager } from '../core/SceneManager';
import { GuiRouter } from '../ui/gui/GuiRouter';
import { MainMenuGui } from '../ui/gui/MainMenuGui';
import { LoadScreenGui } from '../ui/gui/LoadScreenGui';
import { SettingsMenuGui } from '../ui/gui/SettingsMenuGui';
import { CampaignMenuGui } from '../ui/gui/CampaignMenuGui';
import { BriefingScreenGui } from '../ui/gui/BriefingScreenGui';
import { SkirmishSetupGui } from '../ui/gui/SkirmishSetupGui';
import { MultiplayerLobbyGui } from '../ui/gui/MultiplayerLobbyGui';

export interface MenuSceneCallbacks {
  onStartGame: () => void;
}

export class MenuScene {
  private readonly router: GuiRouter;
  private readonly mainMenu: MainMenuGui;
  private readonly loadScreen: LoadScreenGui;
  private readonly settingsMenu: SettingsMenuGui;
  private readonly campaignMenu: CampaignMenuGui;
  private readonly briefingScreen: BriefingScreenGui;
  private readonly skirmishSetup: SkirmishSetupGui;
  private readonly multiplayerLobby: MultiplayerLobbyGui;

  constructor(callbacks: MenuSceneCallbacks) {
    const sceneManager = SceneManager.getInstance();
    const menuScene = sceneManager.createScene('menu');

    // AdvancedDynamicTexture requires an active camera to trigger onBeforeCameraRenderObservable
    const camera = new FreeCamera('menuCamera', new Vector3(0, 0, -10), menuScene);
    camera.setTarget(Vector3.Zero());
    menuScene.activeCamera = camera;

    this.router = new GuiRouter();

    this.mainMenu = new MainMenuGui(menuScene, this.router);
    this.loadScreen = new LoadScreenGui(menuScene);
    this.settingsMenu = new SettingsMenuGui(menuScene, this.router);
    this.campaignMenu = new CampaignMenuGui(menuScene, this.router);
    this.briefingScreen = new BriefingScreenGui(menuScene);
    this.skirmishSetup = new SkirmishSetupGui(menuScene, this.router);
    this.multiplayerLobby = new MultiplayerLobbyGui(menuScene, this.router);

    this.router.registerPage('menu', this.mainMenu);
    this.router.registerPage('loading', this.loadScreen);
    this.router.registerPage('settings', this.settingsMenu);
    this.router.registerPage('campaign', this.campaignMenu);
    this.router.registerPage('briefing', this.briefingScreen);
    this.router.registerPage('skirmish', this.skirmishSetup);
    this.router.registerPage('lobby', this.multiplayerLobby);

    // Main menu → start game
    this.mainMenu.setOnStartGame(() => {
      callbacks.onStartGame();
    });

    // Escape navigation for menu pages
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const current = this.router.getCurrentPage();
        if (current === 'settings' || current === 'campaign' || current === 'skirmish' || current === 'lobby') {
          this.router.navigate('menu');
        }
      }
    });

    // Show menu by default
    this.router.navigate('menu');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)._menuRouter = this.router;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)._settingsMenu = this.settingsMenu;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)._skirmishSetup = this.skirmishSetup;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)._briefingScreen = this.briefingScreen;
  }

  show(): void {
    const sceneManager = SceneManager.getInstance();
    sceneManager.switchScene('menu');
  }

  dispose(): void {
    const sceneManager = SceneManager.getInstance();
    sceneManager.disposeScene('menu');
  }
}
