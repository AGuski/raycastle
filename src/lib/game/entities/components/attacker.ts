import { CONFIG } from '../../../core/config';
import { hasLineOfSight } from '../../../engine/lineOfSight';
import { rollDamage } from '../../combat/damageRoll';
import { isInStrikeCone } from '../../systems/weaponStrike';
import { Component, ComponentContext } from '../component';
import { Entity } from '../entity';
import { Damageable } from './damageable';
import { Strikeable } from './strikeable';

/** Per-enemy attack timing and geometry. */
export interface AttackProfile {
  /**
   * The enemy's combat distance (world units): it holds station just inside this
   * (chase stops at range − 0.1), winds up when the player is within it, and the
   * strike cone reaches exactly this far at the connect frame. One value drives
   * both spacing and reach.
   */
  range: number;
  /** Half-angle of the strike cone in radians. */
  halfAngle: number;
  /** Telegraph duration before the strike commits (seconds). */
  windup: number;
  /** Active strike window over which the lunge plays and the hit lands. */
  strikeDuration: number;
  /** Vulnerable, stationary window after the strike (seconds). */
  recovery: number;
  /**
   * Cosmetic dart distance (world units): how far the sprite thrusts toward the
   * player on the strike before easing back over recovery. The entity itself
   * never moves, so this is pure "agility" flavour — lumbering wardens barely
   * twitch, skitterlings dash.
   */
  lunge: number;
  /** When false, the wind-up cannot be cancelled by knockback (heavies). */
  interruptible: boolean;
}

export interface AttackerConfig {
  damage: number;
  attackInterval: number;
  damageLuck?: number;
  attack: AttackProfile;
}

type Phase = 'idle' | 'windup' | 'strike' | 'recovery' | 'cooldown';

/** Hermite S-curve easing: 0→0, 1→1, with zero slope at both ends. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Telegraphed melee attack: approach → wind-up (visible tell) → strike (cosmetic
 * lunge + damage) → recovery (punish window) → cooldown. The wind-up halts
 * movement and drives a telegraph glow; the strike springs the sprite toward the
 * player and back (a visual-only dart) while the hit lands from the enemy's
 * held position, so a player in range when it committed gets hit unless they
 * actively break line or angle.
 */
export class Attacker implements Component {
  private entity!: Entity;
  private phase: Phase = 'idle';
  private timer = 0;
  private _telegraph = 0;
  private lungeDirX = 0;
  private lungeDirY = 0;
  private _lungeX = 0;
  private _lungeY = 0;
  private didConnect = false;

  constructor(private readonly config: AttackerConfig) {}

  onAttach(entity: Entity): void {
    this.entity = entity;
  }

  /** 0–1 telegraph intensity for the windup glow; peaks on the strike. */
  getTelegraph(): number {
    return this._telegraph;
  }

  /**
   * Cosmetic strike offset (world units) added to the rendered sprite position.
   * Non-zero only mid-strike; the entity's logical position never changes.
   */
  getLungeOffset(): { x: number; y: number } {
    return { x: this._lungeX, y: this._lungeY };
  }

  /** True while committed to an attack (movement should halt). */
  isBusy(): boolean {
    return (
      this.phase === 'windup' ||
      this.phase === 'strike' ||
      this.phase === 'recovery'
    );
  }

  update(ctx: ComponentContext): void {
    const damageable = this.entity.get(Damageable);
    if (damageable && !damageable.isAlive) {
      this.phase = 'idle';
      this._telegraph = 0;
      this._lungeX = 0;
      this._lungeY = 0;
      return;
    }

    // Knockback interrupts a wind-up unless this enemy is too heavy to stagger.
    if (
      this.config.attack.interruptible &&
      (this.phase === 'windup' || this.phase === 'strike') &&
      this.entity.get(Strikeable)?.isKnockedBack()
    ) {
      this.reset('cooldown', this.config.attackInterval);
    }

    this.timer -= ctx.dt;

    switch (this.phase) {
      case 'idle':
        if (this.canReachPlayer(ctx)) this.reset('windup', this.config.attack.windup);
        break;
      case 'windup':
        this._telegraph = this.windupGlow();
        if (this.timer <= 0) this.beginStrike(ctx);
        break;
      case 'strike':
        this._telegraph = 1;
        this.resolveStrike(ctx);
        if (this.timer <= 0) this.reset('recovery', this.config.attack.recovery);
        break;
      case 'recovery':
        this._telegraph = 0;
        if (this.timer <= 0) this.reset('cooldown', this.config.attackInterval);
        break;
      case 'cooldown':
        this._telegraph = 0;
        if (this.timer <= 0) this.phase = 'idle';
        break;
    }

    this.updateLungeOffset();
  }

  private reset(phase: Phase, duration: number): void {
    this.phase = phase;
    this.timer = duration;
    if (phase !== 'windup' && phase !== 'strike') this._telegraph = 0;
  }

  /** Whether the player is within attack range with a clear line of sight. */
  private canReachPlayer(ctx: ComponentContext): boolean {
    const { player, world } = ctx;
    const dx = player.x - this.entity.x;
    const dy = player.y - this.entity.y;
    if (Math.hypot(dx, dy) > this.config.attack.range) return false;
    return hasLineOfSight(world, this.entity, player);
  }

  private windupGlow(): number {
    const p = 1 - Math.max(0, this.timer) / this.config.attack.windup;
    // Rising throb: the flicker accelerates as the strike nears.
    const throb = 0.55 + 0.45 * Math.sin(p * p * 38);
    return Math.min(1, p * throb);
  }

  private beginStrike(ctx: ComponentContext): void {
    const dx = ctx.player.x - this.entity.x;
    const dy = ctx.player.y - this.entity.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.lungeDirX = dx / dist;
    this.lungeDirY = dy / dist;
    this.didConnect = false;
    this.reset('strike', this.config.attack.strikeDuration);
  }

  /** Resolve the hit once, at the connect frame (mid-strike). */
  private resolveStrike(ctx: ComponentContext): void {
    const { attack } = this.config;
    const elapsed = attack.strikeDuration - Math.max(0, this.timer);
    const progress = elapsed / attack.strikeDuration;
    // Connect once, halfway through the strike, against the player's CURRENT
    // position — running straight no longer dodges; you must break angle/range.
    if (this.didConnect || progress < 0.5) return;
    this.didConnect = true;
    this.tryHitPlayer(ctx);
  }

  /**
   * Visual-only spring: the sprite thrusts toward the player over the strike,
   * then eases back to rest over the (much longer) recovery. The entity never
   * moves, so it keeps its spacing; the dart distance reads as the enemy's
   * agility. Spreading the retract across recovery — rather than cramming the
   * whole out-and-back into the brief strike — keeps big lunges from snapping in
   * and out too fast.
   */
  private updateLungeOffset(): void {
    const { attack } = this.config;
    let extend = 0;
    if (this.phase === 'strike') {
      const q = Math.min(1, (attack.strikeDuration - Math.max(0, this.timer)) / attack.strikeDuration);
      extend = attack.lunge * smoothstep(q); // ease out to full reach
    } else if (this.phase === 'recovery') {
      const r = Math.min(1, (attack.recovery - Math.max(0, this.timer)) / attack.recovery);
      extend = attack.lunge * (1 - smoothstep(r)); // ease back to rest
    }
    this._lungeX = this.lungeDirX * extend;
    this._lungeY = this.lungeDirY * extend;
  }

  private tryHitPlayer(ctx: ComponentContext): void {
    const { player, world } = ctx;
    const direction = Math.atan2(
      player.y - this.entity.y,
      player.x - this.entity.x
    );
    const viewer = { x: this.entity.x, y: this.entity.y, direction };
    const inCone = isInStrikeCone(
      viewer,
      player,
      this.config.attack.range,
      this.config.attack.halfAngle
    );
    if (!inCone) return;
    if (!hasLineOfSight(world, this.entity, player)) return;

    const luck = this.config.damageLuck ?? CONFIG.combat.defaultDamageLuck;
    world.damagePlayer?.(rollDamage(this.config.damage, luck));
  }
}
