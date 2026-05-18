import { Mesh, MeshBuilder, Scene, Color3, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { BuildingDefinition } from '../../game/rules/BuildingDefinitions';
import type { House } from '../../game/house/House';

/**
 * 建筑占位几何体工厂 — Task 21。
 *
 * 根据 Definition 为每种建筑类型创建差异化的程序化 Mesh 组合。
 * 所有部件挂接在同一根 Mesh 下，便于整体位移/缩放/旋转。
 *
 * 建造动画由 `objects/Building.ts` 通过 root mesh 的 scaling 控制。
 */
export class BuildingMeshFactory {
  static create(definition: BuildingDefinition, house: House, scene: Scene, name: string): Mesh {
    const bodyColor = Color3.FromHexString(house.color);
    const bodyMat = new StandardMaterial(`${name}_bodyMat`, scene);
    bodyMat.diffuseColor = bodyColor;
    bodyMat.specularColor = Color3.Black();

    const detailMat = new StandardMaterial(`${name}_detailMat`, scene);
    detailMat.diffuseColor = new Color3(0.25, 0.25, 0.28);
    detailMat.specularColor = Color3.Black();

    switch (definition.id) {
      case 'STRUCT_CONST':
        return this.createConstructionYard(name, bodyMat, detailMat, scene);
      case 'STRUCT_POWER':
        return this.createPowerPlant(name, bodyMat, detailMat, scene);
      case 'STRUCT_ADVANCED_POWER':
        return this.createAdvancedPower(name, bodyMat, detailMat, scene);
      case 'STRUCT_BARRACKS':
        return this.createBarracks(name, bodyMat, detailMat, scene);
      case 'STRUCT_REFINERY':
        return this.createRefinery(name, bodyMat, detailMat, scene);
      case 'STRUCT_WEAP':
        return this.createWarFactory(name, bodyMat, detailMat, scene);
      case 'STRUCT_RADAR':
        return this.createRadar(name, bodyMat, detailMat, scene);
      case 'STRUCT_HELIPAD':
        return this.createHelipad(name, bodyMat, detailMat, scene);
      case 'STRUCT_REPAIR':
        return this.createRepairFacility(name, bodyMat, detailMat, scene);
      case 'STRUCT_SHIP_YARD':
        return this.createShipyard(name, bodyMat, detailMat, scene);
      default:
        return this.createFallback(name, bodyMat, definition.width, definition.height, scene);
    }
  }

  // ── 建造厂 (3×3) ──
  private static createConstructionYard(
    name: string,
    bodyMat: StandardMaterial,
    detailMat: StandardMaterial,
    scene: Scene
  ): Mesh {
    const root = MeshBuilder.CreateBox(`${name}_base`, { width: 2.8, height: 0.2, depth: 2.8 }, scene);
    root.position.y = 0.1;
    root.material = bodyMat;

    const main = MeshBuilder.CreateBox(`${name}_main`, { width: 1.2, height: 1.0, depth: 1.2 }, scene);
    main.position.y = 0.7;
    main.parent = root;
    main.material = bodyMat;

    const tower = MeshBuilder.CreateBox(`${name}_tower`, { width: 0.4, height: 0.6, depth: 0.4 }, scene);
    tower.position.y = 1.5;
    tower.parent = root;
    tower.material = bodyMat;

    const crane = MeshBuilder.CreateCylinder(`${name}_crane`, { diameter: 0.08, height: 1.8 }, scene);
    crane.rotation.z = Math.PI / 2;
    crane.position = new Vector3(0.3, 1.8, 0);
    crane.parent = root;
    crane.material = detailMat;

    return root;
  }

  // ── 电厂 (2×2) ──
  private static createPowerPlant(
    name: string,
    bodyMat: StandardMaterial,
    detailMat: StandardMaterial,
    scene: Scene
  ): Mesh {
    const root = MeshBuilder.CreateBox(`${name}_main`, { width: 1.6, height: 0.8, depth: 1.4 }, scene);
    root.position.y = 0.5;
    root.material = bodyMat;

    const chimney = MeshBuilder.CreateCylinder(`${name}_chimney`, { diameter: 0.25, height: 1.2 }, scene);
    chimney.position = new Vector3(0.3, 1.4, -0.3);
    chimney.parent = root;
    chimney.material = detailMat;

    const rim = MeshBuilder.CreateCylinder(`${name}_rim`, { diameter: 0.3, height: 0.1 }, scene);
    rim.position = new Vector3(0.3, 2.0, -0.3);
    rim.parent = root;
    rim.material = detailMat;

    return root;
  }

  // ── 先进电厂 (3×3) ──
  private static createAdvancedPower(
    name: string,
    bodyMat: StandardMaterial,
    detailMat: StandardMaterial,
    scene: Scene
  ): Mesh {
    const root = MeshBuilder.CreateBox(`${name}_main`, { width: 2.6, height: 0.9, depth: 2.6 }, scene);
    root.position.y = 0.55;
    root.material = bodyMat;

    const positions = [new Vector3(0.6, 1.4, -0.3), new Vector3(-0.6, 1.4, -0.3)];
    for (let i = 0; i < positions.length; i++) {
      const chimney = MeshBuilder.CreateCylinder(`${name}_chimney${i}`, { diameter: 0.25, height: 1.2 }, scene);
      chimney.position = positions[i];
      chimney.parent = root;
      chimney.material = detailMat;

      const rim = MeshBuilder.CreateCylinder(`${name}_rim${i}`, { diameter: 0.3, height: 0.1 }, scene);
      rim.position = positions[i].add(new Vector3(0, 0.6, 0));
      rim.parent = root;
      rim.material = detailMat;
    }

    const cooler = MeshBuilder.CreateCylinder(`${name}_cooler`, { diameter: 0.7, height: 1.0 }, scene);
    cooler.position = new Vector3(0, 1.0, 0.5);
    cooler.parent = root;
    cooler.material = bodyMat;

    return root;
  }

  // ── 兵营 (2×2) ──
  private static createBarracks(
    name: string,
    bodyMat: StandardMaterial,
    detailMat: StandardMaterial,
    scene: Scene
  ): Mesh {
    const root = MeshBuilder.CreateBox(`${name}_main`, { width: 1.5, height: 0.7, depth: 1.2 }, scene);
    root.position.y = 0.45;
    root.material = bodyMat;

    const door = MeshBuilder.CreateBox(`${name}_door`, { width: 0.4, height: 0.4, depth: 0.05 }, scene);
    door.position = new Vector3(0, 0.2, 0.62);
    door.parent = root;
    door.material = detailMat;

    const pole = MeshBuilder.CreateCylinder(`${name}_pole`, { diameter: 0.04, height: 1.2 }, scene);
    pole.position = new Vector3(0.5, 1.2, -0.4);
    pole.parent = root;
    pole.material = detailMat;

    const flag = MeshBuilder.CreateBox(`${name}_flag`, { width: 0.3, height: 0.2, depth: 0.02 }, scene);
    flag.position = new Vector3(0.65, 1.5, -0.4);
    flag.parent = root;
    flag.material = new StandardMaterial(`${name}_flagMat`, scene);
    (flag.material as StandardMaterial).diffuseColor = new Color3(0.9, 0.1, 0.1);
    (flag.material as StandardMaterial).specularColor = Color3.Black();

    return root;
  }

  // ── 矿厂 (3×3) ──
  private static createRefinery(
    name: string,
    bodyMat: StandardMaterial,
    detailMat: StandardMaterial,
    scene: Scene
  ): Mesh {
    const root = MeshBuilder.CreateBox(`${name}_main`, { width: 1.8, height: 0.9, depth: 1.4 }, scene);
    root.position.y = 0.55;
    root.material = bodyMat;

    const siloPositions = [new Vector3(0.6, 1.2, 0.6), new Vector3(-0.6, 1.2, 0.6)];
    for (let i = 0; i < siloPositions.length; i++) {
      const silo = MeshBuilder.CreateCylinder(`${name}_silo${i}`, { diameter: 0.7, height: 1.2 }, scene);
      silo.position = siloPositions[i];
      silo.parent = root;
      silo.material = bodyMat;
    }

    const frame = MeshBuilder.CreateBox(`${name}_frame`, { width: 0.8, height: 0.6, depth: 0.1 }, scene);
    frame.position = new Vector3(0, 0.9, -0.8);
    frame.parent = root;
    frame.material = detailMat;

    return root;
  }

  // ── 战车工厂 (3×2) ──
  private static createWarFactory(
    name: string,
    bodyMat: StandardMaterial,
    detailMat: StandardMaterial,
    scene: Scene
  ): Mesh {
    const root = MeshBuilder.CreateBox(`${name}_main`, { width: 2.4, height: 1.0, depth: 1.6 }, scene);
    root.position.y = 0.6;
    root.material = bodyMat;

    const door = MeshBuilder.CreateBox(`${name}_door`, { width: 1.2, height: 0.6, depth: 0.05 }, scene);
    door.position = new Vector3(0, 0.3, 0.92);
    door.parent = root;
    door.material = detailMat;

    const antenna = MeshBuilder.CreateCylinder(`${name}_antenna`, { diameter: 0.03, height: 1.5 }, scene);
    antenna.position = new Vector3(0.8, 1.75, -0.6);
    antenna.parent = root;
    antenna.material = detailMat;

    const antHead = MeshBuilder.CreateSphere(`${name}_antHead`, { diameter: 0.08 }, scene);
    antHead.position = new Vector3(0.8, 2.6, -0.6);
    antHead.parent = root;
    antHead.material = detailMat;

    return root;
  }

  // ── 雷达 (2×2) ──
  private static createRadar(name: string, bodyMat: StandardMaterial, detailMat: StandardMaterial, scene: Scene): Mesh {
    const root = MeshBuilder.CreateBox(`${name}_main`, { width: 1.2, height: 0.7, depth: 1.2 }, scene);
    root.position.y = 0.45;
    root.material = bodyMat;

    const bracket = MeshBuilder.CreateCylinder(`${name}_bracket`, { diameter: 0.05, height: 0.4 }, scene);
    bracket.position = new Vector3(0, 1.0, 0);
    bracket.parent = root;
    bracket.material = detailMat;

    const dish = MeshBuilder.CreateCylinder(`${name}_dish`, { diameter: 1.0, height: 0.08 }, scene);
    dish.rotation.x = Math.PI / 2;
    dish.position = new Vector3(0, 1.2, 0);
    dish.parent = root;
    dish.material = detailMat;

    return root;
  }

  // ── 停机坪 (2×2) ──
  private static createHelipad(
    name: string,
    bodyMat: StandardMaterial,
    detailMat: StandardMaterial,
    scene: Scene
  ): Mesh {
    const root = MeshBuilder.CreateBox(`${name}_platform`, { width: 1.8, height: 0.15, depth: 1.8 }, scene);
    root.position.y = 0.075;
    root.material = bodyMat;

    const hMat = new StandardMaterial(`${name}_hMat`, scene);
    hMat.diffuseColor = new Color3(0.9, 0.9, 0.1);
    hMat.specularColor = Color3.Black();

    const vBar = MeshBuilder.CreateBox(`${name}_hV`, { width: 0.15, height: 0.02, depth: 0.6 }, scene);
    vBar.position = new Vector3(0, 0.16, 0);
    vBar.parent = root;
    vBar.material = hMat;

    const hBar = MeshBuilder.CreateBox(`${name}_hH`, { width: 0.5, height: 0.02, depth: 0.15 }, scene);
    hBar.position = new Vector3(0, 0.16, 0);
    hBar.parent = root;
    hBar.material = hMat;

    const light = MeshBuilder.CreateCylinder(`${name}_light`, { diameter: 0.06, height: 0.4 }, scene);
    light.position = new Vector3(0.6, 0.35, 0.6);
    light.parent = root;
    light.material = detailMat;

    return root;
  }

  // ── 维修厂 (3×3) ──
  private static createRepairFacility(
    name: string,
    bodyMat: StandardMaterial,
    detailMat: StandardMaterial,
    scene: Scene
  ): Mesh {
    const root = MeshBuilder.CreateBox(`${name}_platform`, { width: 2.6, height: 0.15, depth: 2.6 }, scene);
    root.position.y = 0.075;
    root.material = bodyMat;

    const slot = MeshBuilder.CreateBox(`${name}_slot`, { width: 1.0, height: 0.05, depth: 0.6 }, scene);
    slot.position = new Vector3(0, 0.18, 0);
    slot.parent = root;
    slot.material = detailMat;

    const col = MeshBuilder.CreateCylinder(`${name}_col`, { diameter: 0.1, height: 1.2 }, scene);
    col.position = new Vector3(-0.8, 0.75, -0.4);
    col.parent = root;
    col.material = detailMat;

    const arm = MeshBuilder.CreateCylinder(`${name}_arm`, { diameter: 0.06, height: 0.8 }, scene);
    arm.rotation.z = Math.PI / 2;
    arm.position = new Vector3(-0.4, 1.3, -0.4);
    arm.parent = root;
    arm.material = detailMat;

    return root;
  }

  // ── 船坞 (3×3) ──
  private static createShipyard(
    name: string,
    bodyMat: StandardMaterial,
    detailMat: StandardMaterial,
    scene: Scene
  ): Mesh {
    const root = MeshBuilder.CreateBox(`${name}_building`, { width: 1.8, height: 0.7, depth: 1.0 }, scene);
    root.position.y = 0.45;
    root.material = bodyMat;

    const dock = MeshBuilder.CreateBox(`${name}_dock`, { width: 2.8, height: 0.1, depth: 1.5 }, scene);
    dock.position = new Vector3(0, 0.05, 0.8);
    dock.parent = root;
    dock.material = detailMat;

    const colPositions = [new Vector3(1.0, 0.85, 0), new Vector3(-1.0, 0.85, 0)];
    for (let i = 0; i < colPositions.length; i++) {
      const col = MeshBuilder.CreateCylinder(`${name}_col${i}`, { diameter: 0.1, height: 1.5 }, scene);
      col.position = colPositions[i];
      col.parent = root;
      col.material = detailMat;
    }

    const beam = MeshBuilder.CreateBox(`${name}_beam`, { width: 2.2, height: 0.1, depth: 0.15 }, scene);
    beam.position = new Vector3(0, 1.6, 0);
    beam.parent = root;
    beam.material = detailMat;

    return root;
  }

  // ── 回退：纯色方块（未知建筑类型）──
  private static createFallback(
    name: string,
    bodyMat: StandardMaterial,
    width: number,
    height: number,
    scene: Scene
  ): Mesh {
    const root = MeshBuilder.CreateBox(`${name}_fallback`, { width, height: 1.0, depth: height }, scene);
    root.position.y = 0.5;
    root.material = bodyMat;
    return root;
  }
}
