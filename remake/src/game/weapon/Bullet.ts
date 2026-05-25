/**
 * 弹道飞行逻辑 — Task 28
 * Source: origin/REDALERT/BULLET.CPP
 *
 * 每逻辑帧更新位置，到达目标后触发命中回调并销毁自身。
 * 使用 Babylon.js Mesh（Cylinder 或 Box）作为视觉表现。
 */

import { Vector3, MeshBuilder, StandardMaterial, Color3, type Scene } from '@babylonjs/core';
import type { WeaponDef } from './Weapon';

export interface BulletHitCallback {
  (targetX: number, targetY: number, damage: number): void;
}

/** 活跃的弹道实例。 */
export class Bullet {
  private mesh: ReturnType<typeof MeshBuilder.CreateCylinder> | null = null;
  private material: StandardMaterial | null = null;
  private destroyed = false;

  constructor(
    private scene: Scene,
    private weapon: WeaponDef,
    private fromX: number,
    private fromY: number,
    private toX: number,
    private toY: number,
    private onHit: BulletHitCallback
  ) {
    this.createMesh();
  }

  private createMesh(): void {
    if (this.weapon.projectileType === 'instant') return;

    const mesh = MeshBuilder.CreateCylinder(
      `bullet_${Math.random().toString(36).slice(2)}`,
      { diameter: 0.15, height: 0.6 },
      this.scene
    );
    mesh.rotation.x = Math.PI / 2;

    const mat = new StandardMaterial('bulletMat', this.scene);
    mat.diffuseColor = new Color3(1, 0.8, 0);
    mat.emissiveColor = new Color3(1, 0.6, 0);
    mat.disableLighting = true;
    mesh.material = mat;

    mesh.position = new Vector3(this.fromX - 32, 1, this.fromY - 32);
    this.mesh = mesh;
    this.material = mat;
  }

  /** 每逻辑帧调用，返回 true 表示仍需更新，false 表示已命中/销毁。 */
  update(): boolean {
    if (this.destroyed) return false;

    const dx = this.toX - this.fromX;
    const dy = this.toY - this.fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1 || this.weapon.projectileType === 'instant') {
      this.hit();
      return false;
    }

    const speed = this.weapon.projectileSpeed;
    const nx = dx / dist;
    const ny = dy / dist;

    this.fromX += nx * speed;
    this.fromY += ny * speed;

    // 更新 mesh 位置
    if (this.mesh) {
      this.mesh.position.x = this.fromX - 32;
      this.mesh.position.z = this.fromY - 32;
      // 朝向目标
      this.mesh.rotation.y = Math.atan2(nx, ny);
    }

    // 检查是否到达或越过目标
    const newDx = this.toX - this.fromX;
    const newDy = this.toY - this.fromY;
    if (newDx * dx <= 0 && newDy * dy <= 0) {
      this.hit();
      return false;
    }

    return true;
  }

  private hit(): void {
    this.destroyed = true;
    this.onHit(this.toX, this.toY, this.weapon.damage);
    this.createExplosion();
    this.dispose();
  }

  private createExplosion(): void {
    const exp = MeshBuilder.CreateSphere(
      `explosion_${Math.random().toString(36).slice(2)}`,
      { diameter: 0.8 },
      this.scene
    );
    exp.position = new Vector3(this.toX - 32, 0.5, this.toY - 32);

    const mat = new StandardMaterial('expMat', this.scene);
    mat.diffuseColor = new Color3(1, 0.3, 0);
    mat.emissiveColor = new Color3(1, 0.2, 0);
    mat.disableLighting = true;
    exp.material = mat;

    // 0.3s 后销毁爆炸球
    setTimeout(() => {
      exp.dispose();
      mat.dispose();
    }, 300);
  }

  dispose(): void {
    this.destroyed = true;
    this.mesh?.dispose();
    this.material?.dispose();
    this.mesh = null;
    this.material = null;
  }
}

/** 全局弹道管理器。 */
export class BulletManager {
  private bullets: Bullet[] = [];
  private static instance: BulletManager | null = null;

  static getInstance(): BulletManager {
    if (!BulletManager.instance) {
      BulletManager.instance = new BulletManager();
    }
    return BulletManager.instance;
  }

  static reset(): void {
    BulletManager.instance?.clear();
    BulletManager.instance = null;
  }

  spawn(
    scene: Scene,
    weapon: WeaponDef,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    onHit: BulletHitCallback
  ): void {
    this.bullets.push(new Bullet(scene, weapon, fromX, fromY, toX, toY, onHit));
  }

  updateAll(): void {
    this.bullets = this.bullets.filter((b) => b.update());
  }

  clear(): void {
    for (const b of this.bullets) {
      b.dispose();
    }
    this.bullets = [];
  }

  getCount(): number {
    return this.bullets.length;
  }
}
