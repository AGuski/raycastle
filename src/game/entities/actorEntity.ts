import { SpriteSheet } from '../spriteSheet';
import { hasLineOfSight } from '../../engine/lineOfSight';
import { RaycastWorld } from '../../engine/raycaster';
import { Point } from '../../types';
import { Sprite } from './sprite';

export interface ActorEntityConfig {
  speed: number;
  sightRange: number;
  proximityRadius: number;
  chaseOnSight: boolean;
  /** Multiplier on default animation rate; 1 = normal, <1 slower, >1 faster. */
  animationSpeed?: number;
}

export interface ActorWorld extends RaycastWorld {
  isOpen(x: number, y: number): boolean;
}

export class ActorEntity implements Sprite {
  animationTime = 0;

  constructor(
    public texture: SpriteSheet,
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
    const prevX = this.x;
    const prevY = this.y;

    if (this.config.chaseOnSight) {
      const dist = this.distanceTo(target);
      if (dist <= this.config.sightRange && hasLineOfSight(world, this, target) && dist >= 0.001) {
        const step = this.config.speed * seconds;
        const moveX = ((target.x - this.x) / dist) * step;
        const moveY = ((target.y - this.y) / dist) * step;

        if (world.isOpen(this.x + moveX, this.y)) this.x += moveX;
        if (world.isOpen(this.x, this.y + moveY)) this.y += moveY;
      }
    }

    if (this.x !== prevX || this.y !== prevY) {
      this.animationTime += seconds * (this.config.animationSpeed ?? 1);
    }
  }
}
