import { SpriteSheet } from '../../spriteSheet';
import { Component, ComponentContext } from '../component';
import { Entity } from '../entity';
import { Sprite } from '../sprite';
import { SpriteEffect } from '../spriteEffect';
import { SpriteAnimator } from '../spriteAnimator';
import { Attacker } from './attacker';
import { Damageable } from './damageable';
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
    const attacker = this.entity.get(Attacker);
    return {
      texture: this.texture,
      // The attack lunge is a cosmetic offset on top of the entity's position.
      get x() {
        return e.x + (attacker?.getLungeOffset().x ?? 0);
      },
      get y() {
        return e.y + (attacker?.getLungeOffset().y ?? 0);
      },
      animationTime: this.animationTime,
      animator: this.animator,
      effect: this.effect,
      getHitFlash: (t) => this.resolveHitFlash(t),
      getTelegraph: () => attacker?.getTelegraph() ?? 0,
      getDeathDissolve: (t) => this.resolveDeathDissolve(t)
    };
  }

  private resolveHitFlash(time: number): number {
    return this.entity.get(Strikeable)?.getHitFlash(time) ?? 0;
  }

  private resolveDeathDissolve(time: number): number {
    return this.entity.get(Damageable)?.getDeathProgress(time) ?? 0;
  }
}
