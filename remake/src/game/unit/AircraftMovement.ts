/**
 * Aircraft Movement — Task 86
 *
 * Manages non-selectable aircraft that fly in from map edges,
 * drop payload (bombs / paratroopers), and exit.
 * Air units ignore terrain blocking.
 *
 * OpenRA 对标: Aircraft trait + FlyAttack activity
 */

import { Vector3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';

export interface AircraftPathPoint {
  x: number;
  y: number;
  z: number;
  action?: 'drop' | 'none';
}

export interface AircraftOptions {
  id: string;
  speed: number; // world units per second
  path: AircraftPathPoint[];
  onDrop?: (x: number, y: number) => void;
  onComplete?: (id: string) => void;
}

export class Aircraft {
  id: string;
  private speed: number;
  private path: AircraftPathPoint[];
  private currentIndex = 0;
  private position = new Vector3(0, 0, 0);
  private active = false;
  private onDrop?: (x: number, y: number) => void;
  private onComplete?: (id: string) => void;
  private mesh: import('@babylonjs/core').Mesh | null = null;

  constructor(options: AircraftOptions) {
    this.id = options.id;
    this.speed = options.speed;
    this.path = options.path;
    this.onDrop = options.onDrop;
    this.onComplete = options.onComplete;
    if (this.path.length > 0) {
      const start = this.path[0];
      this.position.set(start.x, start.z ?? 10, start.y);
    }
  }

  async createMesh(scene: Scene, color = '#888888'): Promise<void> {
    const { MeshBuilder, StandardMaterial, Color3 } = await import('@babylonjs/core');
    this.mesh = MeshBuilder.CreateBox(`aircraft_${this.id}`, { size: 1.5 }, scene);
    this.mesh.position = this.position.clone();
    const mat = new StandardMaterial(`aircraft_mat_${this.id}`, scene);
    mat.diffuseColor = Color3.FromHexString(color);
    this.mesh.material = mat;
  }

  start(): void {
    this.active = true;
  }

  update(dt: number): void {
    if (!this.active || this.currentIndex >= this.path.length - 1) {
      if (this.active && this.currentIndex >= this.path.length - 1) {
        this.active = false;
        this.onComplete?.(this.id);
      }
      return;
    }

    const target = this.path[this.currentIndex + 1];
    const targetPos = new Vector3(target.x, target.z ?? 10, target.y);
    const dir = targetPos.subtract(this.position);
    const dist = dir.length();
    const step = this.speed * dt;

    if (dist <= step) {
      this.position.copyFrom(targetPos);
      if (target.action === 'drop') {
        this.onDrop?.(target.x, target.y);
      }
      this.currentIndex++;
    } else {
      dir.normalize().scaleInPlace(step);
      this.position.addInPlace(dir);
    }

    if (this.mesh) {
      this.mesh.position.copyFrom(this.position);
      // Face movement direction
      if (dist > 0.001) {
        const yaw = Math.atan2(dir.x, dir.z);
        this.mesh.rotation.y = yaw;
      }
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getPosition(): Readonly<Vector3> {
    return this.position;
  }

  dispose(): void {
    this.active = false;
    this.mesh?.dispose();
    this.mesh = null;
  }
}
