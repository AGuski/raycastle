import { SpriteSheet } from '../../spriteSheet';
import { Component, ComponentContext } from '../component';
import { Entity } from '../entity';
import { Sprite } from '../sprite';
import { SpriteEffect } from '../spriteEffect';
import { SpriteAnimator } from '../spriteAnimator';
import { Strikeable } from './strikeable';

/** Produces the structural Sprite view the renderer already consumes. */
export class Renderable implements Component {
  animationTime = 0;
  private entity!: Entity;
  private prevX = 0;
  private prevY = 0;

  constructor(
    public texture: SpriteSheet,
    public animator?: SpriteAnimator,
    public effect: SpriteEffect = 'none',
    private readonly animationSpeed = 1,
    private readonly animateWhileIdle = false
  ) {}

  onAttach(entity: Entity): void {
    this.entity = entity;
    this.prevX = entity.x;
    this.prevY = entity.y;
  }

  update(ctx: ComponentContext): void {
    const moved =
      this.entity.x !== this.prevX || this.entity.y !== this.prevY;
    if (moved || this.animateWhileIdle) {
      this.animationTime += ctx.dt * this.animationSpeed;
    }
    this.prevX = this.entity.x;
    this.prevY = this.entity.y;
  }

  /** The structural Sprite the existing render passes already read. */
  get view(): Sprite {
    const e = this.entity;
    return {
      texture: this.texture,
      get x() {
        return e.x;
      },
      get y() {
        return e.y;
      },
      animationTime: this.animationTime,
      animator: this.animator,
      effect: this.effect,
      getHitFlash: (t) => this.resolveHitFlash(t)
    };
  }

  private resolveHitFlash(time: number): number {
    return this.entity.get(Strikeable)?.getHitFlash(time) ?? 0;
  }
}
