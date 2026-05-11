import { Mesh, MeshBuilder, Scene, Color3, StandardMaterial, Vector3, TransformNode } from '@babylonjs/core';
import { Locomotion, type UnitDefinition } from '../../game/rules/UnitDefinitions';
import type { House } from '../../game/house/House';

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

    if (definition.locomotion === Locomotion.Track && definition.hasTurret) {
      return this.createTank(name, mat, scene);
    }
    if (definition.locomotion === Locomotion.Track) {
      return { body: this.createTracked(name, mat, scene) };
    }
    if (definition.locomotion === Locomotion.Wheel && definition.hasTurret) {
      return this.createWheeledWithTurret(name, mat, scene);
    }
    return { body: this.createWheeled(name, mat, scene) };
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
}
