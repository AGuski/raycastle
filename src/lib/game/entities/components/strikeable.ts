import { CONFIG } from '../../../core/config';
import { hasLineOfSight } from '../../../engine/lineOfSight';
import { rollDamage } from '../../combat/damageRoll';
import { resolveKnockbackDistance } from '../../combat/knockback';
import { isInStrikeCone } from '../../systems/weaponStrike';
import { Component, ComponentContext } from '../component';
import { Entity } from '../entity';
import { Damageable } from './damageable';

/** Weapon-hit response: flash, knockback, and per-swing tracking. */
export class Strikeable implements Component {
  private entity!: Entity;
  private _hitFlashUntil = 0;
  private _lastHitSwing = -1;
  private _knockbackDirX = 0;
  private _knockbackDirY = 0;
  private _knockbackTotal = 0;
  private _knockbackElapsed = 0;

  constructor(private readonly knockbackResistance = 0) {}

  onAttach(entity: Entity): void {
    this.entity = entity;
  }

  wasHitBySwing(swingId: number): boolean {
    return this._lastHitSwing === swingId;
  }

  markHit(swingId: number, worldTime: number): void {
    this._lastHitSwing = swingId;
    this._hitFlashUntil =
      worldTime + CONFIG.weapon.strike.hitFlashDuration;
  }

  /** Begin a smooth ease-out shove away from a point. */
  applyKnockback(from: { x: number; y: number }, distance: number): void {
    const dx = this.entity.x - from.x;
    const dy = this.entity.y - from.y;
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

  /** Full weapon-hit response: flash, knockback, and damage. */
  receiveWeaponHit(ctx: ComponentContext, swingId: number): void {
    this.markHit(swingId, ctx.time);

    const distance = resolveKnockbackDistance(
      CONFIG.weapon.strike.knockbackStrength,
      this.knockbackResistance
    );
    this.applyKnockback(ctx.player, distance);

    const { baseDamage, damageLuck } = CONFIG.weapon.strike;
    const amount = rollDamage(baseDamage, damageLuck);
    this.entity.get(Damageable)?.takeDamage(ctx, amount);
  }

  update(ctx: ComponentContext): void {
    if (this._knockbackTotal <= 0) return;

    const duration = CONFIG.weapon.strike.knockbackDuration;
    const prevT = Math.min(1, this._knockbackElapsed / duration);
    this._knockbackElapsed += ctx.dt;
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
    const { world } = ctx;

    if (world.isOpen(this.entity.x + moveX, this.entity.y)) {
      this.entity.x += moveX;
    }
    if (world.isOpen(this.entity.x, this.entity.y + moveY)) {
      this.entity.y += moveY;
    }

    if (t >= 1) this._knockbackTotal = 0;
  }
}

/**
 * Marks strikeable actors hit by the current swing during its active frames,
 * capped at `maxTargets` distinct enemies per swing. The cap is the weapon's
 * crowd-control limit: a wide hammer sweep clears many, a knife only a few. When
 * more targets are in the cone than the remaining budget, the closest are hit
 * first (peel the nearest threat).
 */
export function resolveActorWeaponStrike(
  ctx: ComponentContext,
  entities: Iterable<Entity>
): void {
  const { player, world } = ctx;
  const maxTargets = CONFIG.weapon.strike.maxTargets;

  // Candidates hittable this frame, plus how many this swing already struck on
  // earlier active frames — the cap spans the whole swing, not a single tick.
  const candidates: { strikeable: Strikeable; distSq: number }[] = [];
  let alreadyHit = 0;

  for (const entity of entities) {
    const strikeable = entity.get(Strikeable);
    if (!strikeable) continue;

    const damageable = entity.get(Damageable);
    if (damageable && !damageable.isAlive) continue;

    if (strikeable.wasHitBySwing(player.swingId)) {
      alreadyHit++;
      continue;
    }

    if (!isInStrikeCone(player, entity)) continue;
    if (!hasLineOfSight(world, player, entity)) continue;

    const dx = entity.x - player.x;
    const dy = entity.y - player.y;
    candidates.push({ strikeable, distSq: dx * dx + dy * dy });
  }

  const remaining = maxTargets - alreadyHit;
  if (remaining <= 0) return;

  candidates.sort((a, b) => a.distSq - b.distSq);
  for (let i = 0; i < Math.min(remaining, candidates.length); i++) {
    candidates[i].strikeable.receiveWeaponHit(ctx, player.swingId);
  }
}
