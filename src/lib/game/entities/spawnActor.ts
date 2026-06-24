import { SpriteSheet } from '../spriteSheet';
import { SpriteEffect } from './spriteEffect';
import { Attacker } from './components/attacker';
import { ChaseMovement } from './components/chaseMovement';
import { ContactSensor } from './components/contactSensor';
import { Damageable } from './components/damageable';
import { Renderable } from './components/renderable';
import { Strikeable } from './components/strikeable';
import { Entity } from './entity';
import {
  BounceWalkAnimator,
  BounceWalkConfig,
  HoverAnimator,
  HoverConfig
} from './spriteAnimator';

/** Health, contact damage, and attack cadence for hostile actors. */
export interface ActorCombatConfig {
  maxHealth: number;
  damage: number;
  attackInterval: number;
  damageLuck?: number;
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
  /** Health, contact damage, and attack cadence. */
  combat?: ActorCombatConfig;
}

export interface SpawnActorOptions {
  /** Adds weapon-hit response (flash, knockback). Default false. */
  strikeable?: boolean;
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
    entity.add(new Strikeable());
  }

  if (config.combat) {
    entity.add(new Damageable(config.combat.maxHealth));
    entity.add(
      new Attacker({
        damage: config.combat.damage,
        attackInterval: config.combat.attackInterval,
        damageLuck: config.combat.damageLuck
      })
    );
  }

  if (config.chaseOnSight) {
    entity.add(
      new ChaseMovement({
        speed: config.speed,
        sightRange: config.sightRange
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
