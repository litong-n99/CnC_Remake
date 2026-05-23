import { Vector3, type Scene } from '@babylonjs/core';
import type { RTSCamera } from './RTSCamera';
import type { SelectionManager } from '../game/SelectionManager';
import { SelectionBox } from './SelectionBox';
import { GameObjectManager } from '../game/objects/GameObjectManager';
import { GameObjectType } from '../game/objects/GameObject';
import type { Unit } from '../game/objects/Unit';
import type { Pathfinder } from '../game/terrain/Pathfinder';
import type { BuildingPlacer } from '../game/building/BuildingPlacer';
import { UnitState } from '../game/unit/UnitState';
import type { GameConsole } from '../debug/GameConsole';

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
  private pathfinder: Pathfinder;
  private placer: BuildingPlacer;
  private gameConsole: GameConsole | null;
  private selectionBox: SelectionBox;

  private isShiftDown = false;

  constructor(
    rtsCamera: RTSCamera,
    scene: Scene,
    selectionManager: SelectionManager,
    pathfinder: Pathfinder,
    placer: BuildingPlacer,
    gameConsole?: GameConsole
  ) {
    this.rtsCamera = rtsCamera;
    this.scene = scene;
    this.selectionManager = selectionManager;
    this.pathfinder = pathfinder;
    this.placer = placer;
    this.gameConsole = gameConsole ?? null;
    this.selectionBox = new SelectionBox(scene);

    this.setupCameraCallbacks();
    this.setupKeyboard();
  }

  // ── Keyboard state ──

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') this.isShiftDown = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.isShiftDown = false;
    });
  }

  // ── Camera callback wiring ──

  private setupCameraCallbacks(): void {
    this.rtsCamera.onLeftClick = (sx, sy) => this.handleLeftClick(sx, sy);
    this.rtsCamera.onLeftDragStart = (sx, sy) => this.handleLeftDragStart(sx, sy);
    this.rtsCamera.onLeftDragMove = (sx, sy, cx, cy) => this.handleLeftDragMove(sx, sy, cx, cy);
    this.rtsCamera.onLeftDragEnd = (sx, sy, ex, ey) => this.handleLeftDragEnd(sx, sy, ex, ey);
    this.rtsCamera.onRightClick = (sx, sy) => this.handleRightClick(sx, sy);
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

    // 检查是否右键点击了某个单位（攻击目标）
    const targetUnit = this.pickUnitAt(screenX, screenY);
    const isEnemyTarget = targetUnit && targetUnit.house !== selected[0].house;

    for (const unit of selected) {
      if (isEnemyTarget && targetUnit) {
        // 攻击命令
        unit.logic.attackTarget = { x: targetUnit.x, y: targetUnit.y };
        if (unit.definition.hasTurret) {
          unit.logic.stateMachine.transition(UnitState.TurretTracking);
        }
        // eslint-disable-next-line no-console
        console.info(`Attack order: ${unit.definition.name} → ${targetUnit.definition.name}`);
      } else {
        // 移动命令
        unit.logic.attackTarget = undefined;
        const success = unit.logic.moveTo(cell.x, cell.y, this.pathfinder);
        if (success) {
          // eslint-disable-next-line no-console
          console.info(`Move order: ${unit.definition.name} → (${cell.x}, ${cell.y})`);
        } else {
          console.warn(`Move failed for ${unit.definition.name} → (${cell.x}, ${cell.y})`);
        }
      }
    }
  }

  // ── Lifecycle ──

  dispose(): void {
    this.selectionBox.dispose();
    this.selectionManager.clear();
  }
}
