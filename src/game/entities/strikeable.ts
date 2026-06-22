import { CONFIG } from '../../core/config';
import { Point } from '../../types';
import { ActorEntity, ActorEntityConfig, ActorWorld } from './actorEntity';
import { SpriteSheet } from '../spriteSheet';

/** Mutable position used for knockback displacement. */
export interface StrikeableHost {
  x: number;
  y: number;
}

/** Weapon-hit response: flash, knockback, and per-swing tracking. */
export class Strikeable {
  private _hitFlashUntil = 0;
  private _lastHitSwing = -1;
  private _knockbackDirX = 0;
  private _knockbackDirY = 0;
  private _knockbackTotal = 0;
  private _knockbackElapsed = 0;

  constructor(private readonly host: StrikeableHost) {}

  wasHitBySwing(swingId: number): boolean {
    return this._lastHitSwing === swingId;
  }

  markHit(swingId: number, worldTime: number): void {
    this._lastHitSwing = swingId;
    this._hitFlashUntil =
      worldTime + CONFIG.weapon.strike.hitFlashDuration;
  }

  /** Begin a smooth ease-out shove away from a point. */
  applyKnockback(from: Point, distance: number): void {
    const dx = this.host.x - from.x;
    const dy = this.host.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return;

    this._knockbackDirX = dx / dist;
    this._knockbackDirY = dy / dist;
    this._knockbackTotal = distance;
    this._knockbackElapsed = 0;
  }

  isKnockedBack(): boolean {
    return this._knockbackTotal > 0;
  }

  getHitFlash(time: number): number {
    if (time >= this._hitFlashUntil) return 0;
    const remaining = this._hitFlashUntil - time;
    return remaining / CONFIG.weapon.strike.hitFlashDuration;
  }

  update(seconds: number, world: ActorWorld): void {
    if (this._knockbackTotal <= 0) return;

    const duration = CONFIG.weapon.strike.knockbackDuration;
    const prevT = Math.min(1, this._knockbackElapsed / duration);
    this._knockbackElapsed += seconds;
    const t = Math.min(1, this._knockbackElapsed / duration);
    const easeOut = (u: number) => 1 - (1 - u) * (1 - u);
    const step =
      this._knockbackTotal * (easeOut(t) - easeOut(prevT));

    if (step <= 0) {
      if (t >= 1) this._knockbackTotal = 0;
      return;
    }

    const moveX = this._knockbackDirX * step;
    const moveY = this._knockbackDirY * step;

    if (world.isOpen(this.host.x + moveX, this.host.y)) this.host.x += moveX;
    if (world.isOpen(this.host.x, this.host.y + moveY)) this.host.y += moveY;

    if (t >= 1) this._knockbackTotal = 0;
  }
}

/** Hostile actor that can be hit by the player's weapon. */
export function createStrikeableActor(
  texture: SpriteSheet,
  x: number,
  y: number,
  config: ActorEntityConfig
): ActorEntity {
  const actor = new ActorEntity(texture, x, y, config);
  actor.attachStrikeable();
  return actor;
}
