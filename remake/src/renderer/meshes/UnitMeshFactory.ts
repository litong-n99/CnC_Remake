import { Mesh, MeshBuilder, Scene, Color3, StandardMaterial, Vector3, TransformNode } from '@babylonjs/core';
import { Locomotion, type UnitDefinition } from '../../game/rules/UnitDefinitions';
import type { House } from '../../game/house/House';
import { RenderLayer, setRenderLayer } from '../RenderLayer';

/**
 * 单位占位几何体工厂 — 根据 Definition 动态组合程序化 Mesh。
 *
 * 当前为 Task 16/18 Dummy 实现，按 locomotion + hasTurret 生成三种外形：
 * - 坦克型（Track + 炮塔）：车身 + 圆柱炮塔 + 炮管
 * - 履带型（Track + 无炮塔）：长车身 + 舱盖
 * - 轮式型（Wheel）：扁车身 + 货舱/炮架
 *
 * 炮塔通过 TransformNode 轴心实现独立 Y 轴旋转（Task 18）。
 */
export class UnitMeshFactory {
  /**
   * 为单位创建占位几何体。
   * @returns 根 Mesh（车身），以及可选的炮塔旋转轴心 TransformNode。
   */
  static create(
    definition: UnitDefinition,
    house: House,
    scene: Scene,
    name: string
  ): { body: Mesh; turret?: TransformNode } {
    const color = Color3.FromHexString(house.color);
    const mat = new StandardMaterial(`unitMat_${name}`, scene);
    mat.diffuseColor = color;
    mat.specularColor = Color3.Black();

    let result: { body: Mesh; turret?: TransformNode };
    if (definition.locomotion === Locomotion.Foot) {
      result = { body: this.createInfantry(name, mat, scene, definition) };
    } else if (definition.locomotion === Locomotion.Track && definition.hasTurret) {
      result = this.createTank(name, mat, scene);
    } else if (definition.locomotion === Locomotion.Track) {
      result = { body: this.createTracked(name, mat, scene) };
    } else if (definition.locomotion === Locomotion.Wheel && definition.hasTurret) {
      result = this.createWheeledWithTurret(name, mat, scene);
    } else {
      result = { body: this.createWheeled(name, mat, scene) };
    }
    setRenderLayer(result.body, RenderLayer.Opaque);
    return result;
  }

  // ── 坦克型（Track + 炮塔）──
  private static createTank(name: string, mat: StandardMaterial, scene: Scene): { body: Mesh; turret: TransformNode } {
    const body = MeshBuilder.CreateBox(`${name}_body`, { width: 0.6, height: 0.3, depth: 0.8 }, scene);
    body.position.y = 0.25;
    body.material = mat;

    // 炮塔旋转轴心 — Task 18：通过 turretPivot.rotation.y 独立旋转炮塔
    const turretPivot = new TransformNode(`${name}_turretPivot`, scene);
    turretPivot.parent = body;
    turretPivot.position.y = 0.45;

    const turret = MeshBuilder.CreateCylinder(`${name}_turret`, { diameter: 0.4, height: 0.15 }, scene);
    turret.rotation.x = Math.PI / 2;
    turret.parent = turretPivot;
    turret.material = mat;

    const barrel = MeshBuilder.CreateBox(`${name}_barrel`, { width: 0.08, height: 0.08, depth: 0.5 }, scene);
    barrel.position = new Vector3(0, 0, 0.25);
    barrel.parent = turretPivot;
    barrel.material = mat;

    return { body, turret: turretPivot };
  }

  // ── 履带型运输车（Track + 无炮塔）──
  private static createTracked(name: string, mat: StandardMaterial, scene: Scene): Mesh {
    const body = MeshBuilder.CreateBox(`${name}_body`, { width: 0.55, height: 0.3, depth: 0.9 }, scene);
    body.position.y = 0.25;
    body.material = mat;

    const hatch = MeshBuilder.CreateBox(`${name}_hatch`, { width: 0.3, height: 0.08, depth: 0.3 }, scene);
    hatch.position = new Vector3(0, 0.45, -0.1);
    hatch.parent = body;
    hatch.material = mat;

    return body;
  }

  // ── 轮式 + 炮塔 ──
  private static createWheeledWithTurret(
    name: string,
    mat: StandardMaterial,
    scene: Scene
  ): { body: Mesh; turret: TransformNode } {
    const body = MeshBuilder.CreateBox(`${name}_body`, { width: 0.5, height: 0.2, depth: 0.7 }, scene);
    body.position.y = 0.2;
    body.material = mat;

    const turretPivot = new TransformNode(`${name}_turretPivot`, scene);
    turretPivot.parent = body;
    turretPivot.position.y = 0.35;

    const turret = MeshBuilder.CreateCylinder(`${name}_turret`, { diameter: 0.3, height: 0.12 }, scene);
    turret.rotation.x = Math.PI / 2;
    turret.parent = turretPivot;
    turret.material = mat;

    const barrel = MeshBuilder.CreateBox(`${name}_barrel`, { width: 0.06, height: 0.06, depth: 0.35 }, scene);
    barrel.position = new Vector3(0, 0, 0.175);
    barrel.parent = turretPivot;
    barrel.material = mat;

    return { body, turret: turretPivot };
  }

  // ── 轮式（无炮塔）──
  private static createWheeled(name: string, mat: StandardMaterial, scene: Scene): Mesh {
    const body = MeshBuilder.CreateBox(`${name}_body`, { width: 0.5, height: 0.2, depth: 0.7 }, scene);
    body.position.y = 0.2;
    body.material = mat;

    const cargo = MeshBuilder.CreateBox(`${name}_cargo`, { width: 0.35, height: 0.15, depth: 0.4 }, scene);
    cargo.position = new Vector3(0, 0.38, 0.05);
    cargo.parent = body;
    cargo.material = mat;

    return body;
  }

  // ── 步兵（Foot）──
  private static createInfantry(name: string, mat: StandardMaterial, scene: Scene, definition: UnitDefinition): Mesh {
    // 主体 — 小圆柱体表示人形
    const body = MeshBuilder.CreateCylinder(`${name}_body`, { diameter: 0.35, height: 0.6 }, scene);
    body.position.y = 0.4;
    body.material = mat;

    // 头部 — 小方块
    const head = MeshBuilder.CreateBox(`${name}_head`, { width: 0.2, height: 0.2, depth: 0.2 }, scene);
    head.position = new Vector3(0, 0.45, 0);
    head.parent = body;
    head.material = mat;

    // 武器 — 根据射程和类型区分外观
    if (definition.range > 0) {
      const weapon = MeshBuilder.CreateBox(`${name}_weapon`, { width: 0.06, height: 0.06, depth: 0.25 }, scene);
      weapon.position = new Vector3(0.15, 0.1, 0.12);
      weapon.parent = body;
      weapon.material = mat;
    }

    // 特殊标记 — 工程师/谭雅/医疗兵用头部上方小标记区分
    if (definition.id === 'INFANTRY_RENOVATOR') {
      const wrench = MeshBuilder.CreateBox(`${name}_wrench`, { width: 0.04, height: 0.2, depth: 0.04 }, scene);
      wrench.position = new Vector3(0.18, 0.15, 0);
      wrench.parent = body;
      wrench.material = mat;
    } else if (definition.id === 'INFANTRY_TANYA') {
      const beret = MeshBuilder.CreateBox(`${name}_beret`, { width: 0.22, height: 0.04, depth: 0.22 }, scene);
      beret.position = new Vector3(0, 0.12, 0);
      beret.parent = head;
      beret.material = mat;
    } else if (definition.id === 'INFANTRY_MEDIC') {
      const cross = MeshBuilder.CreateBox(`${name}_cross`, { width: 0.15, height: 0.04, depth: 0.05 }, scene);
      cross.position = new Vector3(0, 0.14, 0);
      cross.parent = head;
      cross.material = mat;
    } else if (definition.id === 'INFANTRY_DOG') {
      // 狗用更矮更长的身体
      body.dispose();
      const dogBody = MeshBuilder.CreateBox(`${name}_body`, { width: 0.3, height: 0.25, depth: 0.5 }, scene);
      dogBody.position.y = 0.2;
      dogBody.material = mat;
      head.dispose();
      const dogHead = MeshBuilder.CreateBox(`${name}_head`, { width: 0.18, height: 0.18, depth: 0.22 }, scene);
      dogHead.position = new Vector3(0, 0.15, 0.2);
      dogHead.parent = dogBody;
      dogHead.material = mat;
      return dogBody;
    }

    return body;
  }
}
