import { SpriteSheet } from '../spriteSheet';
import { CONFIG } from '../../core/config';
import { hasLineOfSight } from '../../engine/lineOfSight';
import { RaycastWorld } from '../../engine/raycaster';
import { isInContact, contactDetectRadius } from '../contact';
import { Point } from '../../types';
import { Sprite } from './sprite';
import { SpriteEffect } from './spriteEffect';
import { Strikeable } from './strikeable';
import {
  BounceWalkAnimator,
  BounceWalkConfig,
  HoverAnimator,
  HoverConfig,
  SpriteAnimator
} from './spriteAnimator';

export interface ActorEntityConfig {
  speed: number;
  sightRange: number;
  proximityRadius: number;
  chaseOnSight: boolean;
  /** Multiplier on default animation rate; 1 = normal, <1 slower, >1 faster. */
  animationSpeed?: number;
  /**
   * When set, the actor uses a procedural "bounce walk" transform instead of
   * (or in addition to) a sprite-sheet animation. Useful for single-frame
   * sprites that have no walk cycle of their own.
   */
  bounceWalk?: BounceWalkConfig;
  /**
   * When set, the actor uses a smooth vertical hover transform. Animates even
   * while idle so floating creatures never look frozen in place.
   */
  hover?: HoverConfig;
  /** Optional fragment shader applied when this actor is drawn. */
  spriteEffect?: SpriteEffect;
}

export interface ActorWorld extends RaycastWorld {
  isOpen(x: number, y: number): boolean;
}

export class ActorEntity implements Sprite {
  animationTime = 0;
  readonly animator?: SpriteAnimator;
  readonly effect?: SpriteEffect;
  strikeable?: Strikeable;
  private _inContact = false;

  /** Whether this actor is currently touching the player. */
  get inContact(): boolean {
    return this._inContact;
  }

  constructor(
    public texture: SpriteSheet,
    public x: number,
    public y: number,
    public readonly config: ActorEntityConfig
  ) {
    this.effect = config.spriteEffect;
    if (config.hover) {
      this.animator = new HoverAnimator(config.hover);
    } else if (config.bounceWalk) {
      this.animator = new BounceWalkAnimator(config.bounceWalk);
    }
  }

  /** Adds weapon-hit response (flash, knockback). Safe to call once at spawn. */
  attachStrikeable(): Strikeable {
    this.strikeable = new Strikeable(this);
    return this.strikeable;
  }

  distanceTo(point: Point): number {
    return Math.hypot(point.x - this.x, point.y - this.y);
  }

  isNear(point: Point): boolean {
    return this.distanceTo(point) <= this.config.proximityRadius;
  }

  isInContactWith(point: Point, radius = contactDetectRadius()): boolean {
    return isInContact(this, point, radius);
  }

  getHitFlash(time: number): number {
    return this.strikeable?.getHitFlash(time) ?? 0;
  }

  update(seconds: number, target: Point, world: ActorWorld): void {
    const prevX = this.x;
    const prevY = this.y;
    const stopRadius = CONFIG.contact.stopRadius;
    const isKnockedBack = this.strikeable?.isKnockedBack() ?? false;

    this.strikeable?.update(seconds, world);

    if (!isKnockedBack && this.config.chaseOnSight) {
      const dist = this.distanceTo(target);
      if (
        dist > stopRadius &&
        dist <= this.config.sightRange &&
        hasLineOfSight(world, this, target)
      ) {
        const step = Math.min(this.config.speed * seconds, dist - stopRadius);
        const moveX = ((target.x - this.x) / dist) * step;
        const moveY = ((target.y - this.y) / dist) * step;

        if (world.isOpen(this.x + moveX, this.y)) this.x += moveX;
        if (world.isOpen(this.x, this.y + moveY)) this.y += moveY;
      }
    }

    this._inContact = this.isInContactWith(target);

    if (this.x !== prevX || this.y !== prevY || this.config.hover) {
      this.animationTime += seconds * (this.config.animationSpeed ?? 1);
    }
  }
}
