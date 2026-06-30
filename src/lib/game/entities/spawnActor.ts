import { CONFIG } from '../../core/config';
import { SpriteSheet } from '../spriteSheet';
import { SpriteEffect } from './spriteEffect';
import { Attacker, AttackProfile } from './components/attacker';
import { ChaseMovement } from './components/chaseMovement';
import { ContactSensor } from './components/contactSensor';
import { Damageable } from './components/damageable';
import { Renderable } from './components/renderable';
import { Solid } from './components/solid';
import { Strikeable } from './components/strikeable';
import { Entity } from './entity';
import { rollMovementSpeed } from './rollMovementSpeed';
import {
  BounceWalkAnimator,
  BounceWalkConfig,
  HoverAnimator,
  HoverConfig
} from './spriteAnimator';

/** Health, attack damage, and telegraphed-attack timing for hostile actors. */
export interface ActorCombatConfig {
  maxHealth: number;
  damage: number;
  attackInterval: number;
  damageLuck?: number;
  attack: AttackProfile;
}

/** Tuning data for composing a moving actor entity at spawn time. */
export interface ActorSpawnConfig {
  speed: number;
  sightRange: number;
  proximityRadius: number;
  chaseOnSight: boolean;
  /** Multiplier on default animation rate; 1 = normal, <1 slower, >1 faster. */
  animationSpeed?: number;
  /** Procedural bounce-walk transform for single-frame sprites. */
  bounceWalk?: BounceWalkConfig;
  /** Smooth vertical hover; animates even while idle. */
  hover?: HoverConfig;
  /** Optional fragment shader applied when this actor is drawn. */
  spriteEffect?: SpriteEffect;
  /**
   * Knockback resistance: 0 = baseline (zombie), negative = lightweight,
   * near 1 = almost immovable. Combined with weapon knockbackStrength at hit time.
   */
  knockbackResistance?: number;
  /** When set, body-blocks the player within this radius (world units). */
  blockRadius?: number;
  /** Health, contact damage, and attack cadence. */
  combat?: ActorCombatConfig;
}

export interface SpawnActorOptions {
  /** Adds weapon-hit response (flash, knockback). Default false. */
  strikeable?: boolean;
  /** When false, chase speed matches config exactly (for tests). Default true. */
  randomizeSpeed?: boolean;
}

/** Composes an actor entity from movement, render, and sensor components. */
export function spawnActor(
  texture: SpriteSheet,
  x: number,
  y: number,
  config: ActorSpawnConfig,
  options: SpawnActorOptions = {}
): Entity {
  const entity = new Entity(x, y);

  let animator;
  if (config.hover) {
    animator = new HoverAnimator(config.hover);
  } else if (config.bounceWalk) {
    animator = new BounceWalkAnimator(config.bounceWalk);
  }

  if (options.strikeable) {
    entity.add(new Strikeable(config.knockbackResistance ?? 0));
  }

  if (config.blockRadius) {
    entity.add(new Solid(config.blockRadius));
  }

  if (config.combat) {
    entity.add(new Damageable(config.combat.maxHealth));
    entity.add(
      new Attacker({
        damage: config.combat.damage,
        attackInterval: config.combat.attackInterval,
        damageLuck: config.combat.damageLuck,
        attack: config.combat.attack
      })
    );
  }

  if (config.chaseOnSight) {
    const randomizeSpeed = options.randomizeSpeed ?? true;
    const speed = randomizeSpeed
      ? rollMovementSpeed(config.speed, CONFIG.actors.movementSpeedSpread)
      : config.speed;

    // Hold station just inside attack range so heavies (long range) zone space
    // while skirmishers (short range) press in close, then attack from there.
    const stopRadius = config.combat
      ? Math.max(CONFIG.contact.stopRadius, config.combat.attack.range - 0.1)
      : undefined;

    entity.add(
      new ChaseMovement({
        speed,
        sightRange: config.sightRange,
        stopRadius
      })
    );
  }

  entity.add(new ContactSensor(config.proximityRadius));

  // Added last so animation sees movement from earlier components this tick.
  entity.add(
    new Renderable(
      texture,
      animator,
      config.spriteEffect ?? 'none',
      config.animationSpeed ?? 1,
      !!config.hover
    )
  );

  return entity;
}

/** Hostile actor that can be hit by the player's weapon. */
export function createStrikeableActor(
  texture: SpriteSheet,
  x: number,
  y: number,
  config: ActorSpawnConfig
): Entity {
  return spawnActor(texture, x, y, config, { strikeable: true });
}
