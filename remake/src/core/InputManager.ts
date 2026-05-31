import { Vector3, type Scene } from '@babylonjs/core';
import type { RTSCamera } from './RTSCamera';
import type { SelectionManager } from '../game/SelectionManager';
import { SelectionBox } from './SelectionBox';
import { GameObjectManager } from '../game/objects/GameObjectManager';
import { GameObjectType } from '../game/objects/GameObject';
import type { Unit } from '../game/objects/Unit';
import type { BuildingPlacer } from '../game/building/BuildingPlacer';
import type { GameConsole } from '../debug/GameConsole';
import { OrderDispatcher } from '../game/order/OrderDispatcher';
import { groundOrder, actorOrder } from '../game/order/GameOrder';

/**
 * InputManager — 鼠标输入层（翻译 MOUSE.CPP 概念）
 *
 * 职责：
 * - 将 RTSCamera 的低层鼠标事件转换为高层游戏命令
 * - 左键单击 = 单选 / Shift+切换
 * - 左键拖动 = 框选多单位
 * - 右键 = 移动 / 攻击 / 取消放置
 * - 维护 Shift/Ctrl 修饰键状态
 *
 * 不直接监听 DOM 事件，而是订阅 RTSCamera 的回调接口，
 * 保持与渲染层的解耦。
 */
export class InputManager {
  private rtsCamera: RTSCamera;
  private scene: Scene;
  private selectionManager: SelectionManager;
  private placer: BuildingPlacer;
  private gameConsole: GameConsole | null;
  private selectionBox: SelectionBox;

  private isShiftDown = false;
  private isCtrlDown = false;
  private lastSquadKey = -1;
  private lastSquadKeyTime = 0;
  private readonly squadDoubleClickMs = 800;
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    rtsCamera: RTSCamera,
    scene: Scene,
    selectionManager: SelectionManager,
    placer: BuildingPlacer,
    gameConsole?: GameConsole
  ) {
    this.rtsCamera = rtsCamera;
    this.scene = scene;
    this.selectionManager = selectionManager;
    this.placer = placer;
    this.gameConsole = gameConsole ?? null;
    this.selectionBox = new SelectionBox(scene);

    this.setupCameraCallbacks();
    this.setupKeyboard();
  }

  // ── Keyboard state ──

  private setupKeyboard(): void {
    this.boundKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') this.isShiftDown = true;
      if (e.key === 'Control' || e.key === 'Meta') this.isCtrlDown = true;

      // Squad hotkeys: 0-9 (Task 49)
      // 使用 keyCode 作为主检测（像 ra2-web 一样），不受 Shift/键盘布局影响
      let index: number | null = null;
      if (e.keyCode >= 48 && e.keyCode <= 57) {
        index = e.keyCode - 48; // 主键盘 0-9
      } else if (e.keyCode >= 96 && e.keyCode <= 105) {
        index = e.keyCode - 96; // 小键盘 0-9
      } else {
        // 回退: e.code / e.key（兼容非标准环境）
        const digitCodeMatch = e.code.match(/^Digit(\d)$/) || e.code.match(/^Numpad(\d)$/);
        if (digitCodeMatch) {
          index = parseInt(digitCodeMatch[1], 10);
        } else if (/^[0-9]$/.test(e.key)) {
          index = parseInt(e.key, 10);
        }
      }

      if (index !== null && !e.repeat) {
        // 使用 stopImmediatePropagation 阻止同一元素上的其他监听器（如浏览器扩展）
        // 并在 capture 阶段拦截，这是 JavaScript 能触及的最早时机
        e.preventDefault();
        e.stopImmediatePropagation();

        if (this.isShiftDown && this.isCtrlDown) {
          // Shift+Ctrl+数字 = 追加到编组（OpenRA: AddSelectionToControlGroup）
          this.selectionManager.addToSquad(index);
          console.warn(`Squad ${index} added (${this.selectionManager.getSelected().length} units appended)`);
        } else if (this.isShiftDown) {
          // Shift+数字 = 合并编组到当前选择（OpenRA: CombineSelectionWithControlGroup）
          this.selectionManager.combineSquad(index, this.scene);
          console.warn(`Squad ${index} combined into current selection`);
        } else if (this.isCtrlDown) {
          // Ctrl+数字 = 创建/覆盖编组（OpenRA: CreateControlGroup）
          this.selectionManager.saveSquad(index);
          console.warn(`Squad ${index} saved (${this.selectionManager.getSelected().length} units)`);
        } else {
          // 数字 = 选中编组（OpenRA: SelectControlGroup）
          this.selectionManager.restoreSquad(index, this.scene);
          const now = performance.now();
          const isDoubleClick = this.lastSquadKey === index && now - this.lastSquadKeyTime < this.squadDoubleClickMs;
          this.lastSquadKey = index;
          this.lastSquadKeyTime = now;
          if (isDoubleClick) {
            this.jumpToSquadCenter(index);
          }
          console.warn(`Squad ${index} restored`);
        }
      }
    };

    this.boundKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') this.isShiftDown = false;
      if (e.key === 'Control' || e.key === 'Meta') this.isCtrlDown = false;
    };

    // 在 document 和 window 的 capture 阶段都注册，最大化拦截概率
    // capture 阶段是事件传播的最开始，比浏览器扩展的冒泡监听器更早
    document.addEventListener('keydown', this.boundKeyDown, { capture: true });
    window.addEventListener('keydown', this.boundKeyDown, { capture: true });
    window.addEventListener('keyup', this.boundKeyUp);
  }

  /** 将视角跳转到指定编组的中心（Task 49 双击编组键）。 */
  private jumpToSquadCenter(index: number): void {
    const squad = this.selectionManager.getSquad(index);
    const alive = squad.filter((u) => u.isAlive());
    if (alive.length === 0) return;
    let cx = 0;
    let cz = 0;
    for (const u of alive) {
      const p = u.getPosition();
      cx += p.x;
      cz += p.z;
    }
    cx /= alive.length;
    cz /= alive.length;
    this.rtsCamera.setTarget(new Vector3(cx, 0, cz));
    console.warn(`Camera jumped to squad ${index} center`);
  }

  // ── Camera callback wiring ──

  private setupCameraCallbacks(): void {
    this.rtsCamera.onLeftClick = (sx, sy) => this.handleLeftClick(sx, sy);
    this.rtsCamera.onLeftDragStart = (sx, sy) => this.handleLeftDragStart(sx, sy);
    this.rtsCamera.onLeftDragMove = (sx, sy, cx, cy) => this.handleLeftDragMove(sx, sy, cx, cy);
    this.rtsCamera.onLeftDragEnd = (sx, sy, ex, ey) => this.handleLeftDragEnd(sx, sy, ex, ey);
    this.rtsCamera.onRightClick = (sx, sy) => this.handleRightClick(sx, sy);
    this.rtsCamera.onLeftDoubleClick = (sx, sy) => this.handleLeftDoubleClick(sx, sy);
  }

  // ── Coordinate helpers ──

  /** 世界坐标 → 格子坐标。 */
  private worldToCell(worldPos: Vector3): { x: number; y: number } {
    return {
      x: Math.floor(worldPos.x + 32),
      y: Math.floor(worldPos.z + 32),
    };
  }

  /**
   * 世界坐标 → 屏幕坐标（canvas-local CSS pixels）。
   *
   * 返回的坐标是相对于 canvas 左上角的 CSS 像素，与框选矩形的坐标系一致。
   * e2e 测试中使用此坐标时，若 canvas 在 (0,0) 则等同于 viewport 坐标。
   */
  worldToScreen(worldPos: Vector3): { x: number; y: number } | null {
    const camera = this.rtsCamera.getCamera();
    const canvas = camera.getEngine().getRenderingCanvas();
    if (!canvas) return null;

    const transformMatrix = this.scene.getTransformMatrix();
    const ndc = Vector3.TransformCoordinates(worldPos, transformMatrix);

    const cssWidth = canvas.getBoundingClientRect().width;
    const cssHeight = canvas.getBoundingClientRect().height;

    const screenX = (ndc.x * 0.5 + 0.5) * cssWidth;
    const screenY = (1.0 - (ndc.y * 0.5 + 0.5)) * cssHeight;

    return { x: screenX, y: screenY };
  }

  /** 屏幕坐标 → 地面世界坐标。 */
  private screenToGround(screenX: number, screenY: number): Vector3 | null {
    return this.rtsCamera.screenToGround(screenX, screenY);
  }

  /** 屏幕坐标 → 最近单位（1.5 格半径内）。 */
  private pickUnitAt(screenX: number, screenY: number): Unit | null {
    const groundPos = this.screenToGround(screenX, screenY);
    if (!groundPos) return null;

    let closest: Unit | null = null;
    let closestDist = Infinity;

    for (const obj of GameObjectManager.getInstance().getUnits()) {
      if (obj.type !== GameObjectType.Unit) continue;
      const unit = obj as Unit;
      const pos = unit.getPosition();
      const dx = pos.x - groundPos.x;
      const dz = pos.z - groundPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 1.5 && dist < closestDist) {
        closest = unit;
        closestDist = dist;
      }
    }
    return closest;
  }

  // ── Left click: single select / toggle ──

  private handleLeftClick(screenX: number, screenY: number): void {
    // 放置模式下左键 = 确认放置
    if (this.placer.isPlacing()) {
      this.placer.updateFromScreen(screenX, screenY);
      const cell = this.placer.confirmPlacement();
      if (cell && this.gameConsole) {
        const building = this.gameConsole.tryPlaceBuilding(cell.x, cell.y, this.scene);
        if (building) {
          console.warn(`Placed ${building.definition.name} at (${cell.x}, ${cell.y})`);
        }
      }
      return;
    }

    const unit = this.pickUnitAt(screenX, screenY);
    if (unit) {
      if (this.isShiftDown) {
        this.selectionManager.toggleSelect(unit, this.scene);
        console.warn(`Toggled selection: ${unit.definition.name} (${unit.id})`);
      } else {
        this.selectionManager.select(unit, this.scene);
        console.warn(`Selected unit: ${unit.definition.name} (${unit.id})`);
      }
    } else if (!this.isShiftDown) {
      this.selectionManager.clear();
      console.warn('Cleared selection');
    }
  }

  private handleLeftDoubleClick(screenX: number, screenY: number): void {
    const unit = this.pickUnitAt(screenX, screenY);
    if (unit) {
      // Task 50: select only visible same-type units on screen
      const visibleSameType = this.getVisibleSameTypeUnits(unit);
      if (visibleSameType.length > 0) {
        this.selectionManager.selectMultiple(visibleSameType, this.scene);
        console.warn(`Double-click selected ${visibleSameType.length} visible ${unit.definition.name}`);
      }
    }
  }

  /** 获取与指定单位同类型且当前在屏幕内的可见单位（Task 50）。 */
  private getVisibleSameTypeUnits(reference: Unit): Unit[] {
    const targetId = reference.definition.id;
    const camera = this.rtsCamera.getCamera();
    const canvas = camera.getEngine().getRenderingCanvas();
    if (!canvas) return [];
    const cssWidth = canvas.getBoundingClientRect().width;
    const cssHeight = canvas.getBoundingClientRect().height;
    const result: Unit[] = [];
    for (const obj of GameObjectManager.getInstance().getUnits()) {
      if (obj.type !== GameObjectType.Unit) continue;
      const u = obj as Unit;
      if (u.definition.id !== targetId || !u.isAlive()) continue;
      const screenPos = this.worldToScreen(u.getPosition());
      if (!screenPos) continue;
      if (screenPos.x >= 0 && screenPos.x <= cssWidth && screenPos.y >= 0 && screenPos.y <= cssHeight) {
        result.push(u);
      }
    }
    return result;
  }

  // ── Left drag: box select ──

  private handleLeftDragStart(startX: number, startY: number): void {
    // RTSCamera 传来的坐标已经是 canvas-local，直接传给 Babylon.GUI SelectionBox
    this.selectionBox.show(startX, startY);
  }

  private handleLeftDragMove(startX: number, startY: number, currentX: number, currentY: number): void {
    // RTSCamera 传来的坐标已经是 canvas-local，直接传给 Babylon.GUI SelectionBox
    this.selectionBox.update(startX, startY, currentX, currentY);
  }

  private handleLeftDragEnd(startX: number, startY: number, endX: number, endY: number): void {
    this.selectionBox.hide();

    const sx = Math.min(startX, endX);
    const sy = Math.min(startY, endY);
    const ex = Math.max(startX, endX);
    const ey = Math.max(startY, endY);

    if (ex - sx < 5 && ey - sy < 5) return;

    const selectedUnits: Unit[] = [];
    for (const obj of GameObjectManager.getInstance().getUnits()) {
      if (obj.type !== GameObjectType.Unit) continue;
      const unit = obj as Unit;
      const screenPos = this.worldToScreen(unit.getPosition());
      if (screenPos && screenPos.x >= sx && screenPos.x <= ex && screenPos.y >= sy && screenPos.y <= ey) {
        selectedUnits.push(unit);
      }
    }

    if (this.isShiftDown) {
      const current = this.selectionManager.getSelected();
      const combined = [...current];
      for (const unit of selectedUnits) {
        if (!combined.includes(unit)) combined.push(unit);
      }
      this.selectionManager.selectMultiple(combined, this.scene);
    } else {
      this.selectionManager.selectMultiple(selectedUnits, this.scene);
    }
  }

  // ── Right click: move / attack / cancel placement ──

  private handleRightClick(screenX: number, screenY: number): void {
    // 放置模式下右键 = 取消
    if (this.placer.isPlacing()) {
      this.placer.cancelPlacement();
      this.gameConsole?.clearPendingBuilding();
      console.warn('Placement cancelled');
      return;
    }

    const worldPos = this.screenToGround(screenX, screenY);
    if (!worldPos) {
      console.warn('screenToGround returned null');
      return;
    }

    const cell = this.worldToCell(worldPos);
    if (cell.x < 0 || cell.x >= 64 || cell.y < 0 || cell.y >= 64) {
      console.warn('Cell out of bounds:', cell);
      return;
    }

    const selected = this.selectionManager.getSelected();
    if (selected.length === 0) {
      console.warn('No unit selected — click a unit first (left click)');
      return;
    }

    // 检查是否右键点击了某个单位
    const targetUnit = this.pickUnitAt(screenX, screenY);
    const isEnemyTarget = targetUnit && targetUnit.house !== selected[0].house;
    const isFriendlyTarget = targetUnit && targetUnit.house === selected[0].house && targetUnit !== selected[0];

    const dispatcher = OrderDispatcher.getInstance();

    for (const unit of selected) {
      if (isEnemyTarget && targetUnit) {
        // 攻击命令
        const order = actorOrder('Attack', unit.id, targetUnit.id);
        const result = dispatcher.dispatch(order);
        if (result.success) {
          // eslint-disable-next-line no-console
          console.info(result.message);
        } else {
          console.warn(result.message);
        }
      } else if (isFriendlyTarget && targetUnit) {
        // 护卫命令
        const order = actorOrder('Guard', unit.id, targetUnit.id);
        const result = dispatcher.dispatch(order);
        if (result.success) {
          // eslint-disable-next-line no-console
          console.info(result.message);
        } else {
          console.warn(result.message);
        }
      } else {
        // 移动命令
        const order = groundOrder('Move', unit.id, cell.x, cell.y);
        const result = dispatcher.dispatch(order);
        if (result.success) {
          // eslint-disable-next-line no-console
          console.info(result.message);
        } else {
          console.warn(result.message);
        }
      }
    }
  }

  // ── Lifecycle ──

  dispose(): void {
    if (this.boundKeyDown) {
      document.removeEventListener('keydown', this.boundKeyDown, { capture: true });
      window.removeEventListener('keydown', this.boundKeyDown, { capture: true });
      this.boundKeyDown = null;
    }
    if (this.boundKeyUp) {
      window.removeEventListener('keyup', this.boundKeyUp);
      this.boundKeyUp = null;
    }
    this.selectionBox.dispose();
    this.selectionManager.clear();
  }
}
