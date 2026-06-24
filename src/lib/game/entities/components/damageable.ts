import { CONFIG } from '../../../core/config';
import { Component, ComponentContext } from '../component';
import { Entity } from '../entity';

/** Health, death dissolve timing, and removal when the dissolve completes. */
export class Damageable implements Component {
  private entity!: Entity;
  private _deathStartedAt = -1;

  constructor(
    readonly maxHealth: number,
    public health = maxHealth
  ) {}

  onAttach(entity: Entity): void {
    this.entity = entity;
  }

  get isAlive(): boolean {
    return this._deathStartedAt < 0;
  }

  get isDying(): boolean {
    return this._deathStartedAt >= 0;
  }

  takeDamage(_ctx: ComponentContext, amount: number): void {
    if (!this.isAlive) return;
    this.health -= amount;
    if (this.health <= 0) {
      this._deathStartedAt = _ctx.time;
    }
  }

  getDeathProgress(time: number): number {
    if (!this.isDying) return 0;
    const duration = CONFIG.combat.deathDissolveDuration;
    return Math.min(1, (time - this._deathStartedAt) / duration);
  }

  update(ctx: ComponentContext): void {
    if (!this.isDying) return;
    if (this.getDeathProgress(ctx.time) >= 1) {
      ctx.world.removeEntity?.(this.entity);
    }
  }
}
