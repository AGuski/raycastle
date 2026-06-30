import { CONFIG } from '../../../core/config';
import { hasLineOfSight } from '../../../engine/lineOfSight';
import { Component, ComponentContext } from '../component';
import { Entity } from '../entity';
import { Attacker } from './attacker';
import { Damageable } from './damageable';
import { Strikeable } from './strikeable';

export interface ChaseMovementConfig {
  speed: number;
  sightRange: number;
  /** Distance at which the actor holds position (its preferred spacing). */
  stopRadius?: number;
}

/** Moves toward the player when within sight range and line of sight is clear. */
export class ChaseMovement implements Component {
  private entity!: Entity;

  constructor(private readonly config: ChaseMovementConfig) {}

  onAttach(entity: Entity): void {
    this.entity = entity;
  }

  update(ctx: ComponentContext): void {
    const damageable = this.entity.get(Damageable);
    if (damageable && !damageable.isAlive) return;

    if (this.entity.get(Strikeable)?.isKnockedBack()) return;
    // Hold still while winding up, striking, or recovering; the strike's forward
    // dart is cosmetic, so the enemy keeps its spacing the whole time.
    if (this.entity.get(Attacker)?.isBusy()) return;

    const target = ctx.player;
    const dx = target.x - this.entity.x;
    const dy = target.y - this.entity.y;
    const dist = Math.hypot(dx, dy);
    const stopRadius = this.config.stopRadius ?? CONFIG.contact.stopRadius;

    if (dist <= stopRadius || dist > this.config.sightRange) return;
    if (!hasLineOfSight(ctx.world, this.entity, target)) return;

    const step = Math.min(this.config.speed * ctx.dt, dist - stopRadius);
    const moveX = (dx / dist) * step;
    const moveY = (dy / dist) * step;

    if (ctx.world.isOpen(this.entity.x + moveX, this.entity.y)) {
      this.entity.x += moveX;
    }
    if (ctx.world.isOpen(this.entity.x, this.entity.y + moveY)) {
      this.entity.y += moveY;
    }
  }
}
