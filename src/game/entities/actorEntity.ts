import { Bitmap } from '../block';
import { hasLineOfSight } from '../../engine/lineOfSight';
import { RaycastWorld } from '../../engine/raycaster';
import { Point } from '../../types';
import { Sprite } from './sprite';

export interface ActorEntityConfig {
  speed: number;
  sightRange: number;
  proximityRadius: number;
  chaseOnSight: boolean;
}

export interface ActorWorld extends RaycastWorld {
  isOpen(x: number, y: number): boolean;
}

export class ActorEntity implements Sprite {
  constructor(
    public texture: Bitmap,
    public x: number,
    public y: number,
    public readonly config: ActorEntityConfig
  ) {}

  distanceTo(point: Point): number {
    return Math.hypot(point.x - this.x, point.y - this.y);
  }

  isNear(point: Point): boolean {
    return this.distanceTo(point) <= this.config.proximityRadius;
  }

  update(seconds: number, target: Point, world: ActorWorld): void {
    if (!this.config.chaseOnSight) return;

    const dist = this.distanceTo(target);
    if (dist > this.config.sightRange) return;
    if (!hasLineOfSight(world, this, target)) return;
    if (dist < 0.001) return;

    const step = this.config.speed * seconds;
    const moveX = ((target.x - this.x) / dist) * step;
    const moveY = ((target.y - this.y) / dist) * step;

    if (world.isOpen(this.x + moveX, this.y)) this.x += moveX;
    if (world.isOpen(this.x, this.y + moveY)) this.y += moveY;
  }
}
