import { describe, expect, it } from 'vitest';
import { MAP_EMPTY } from '../../../types';
import { ComponentContext, GameWorld } from '../component';
import { Entity } from '../entity';
import { Attacker, AttackProfile } from './attacker';
import { Strikeable } from './strikeable';

const PROFILE: AttackProfile = {
  range: 1.5,
  halfAngle: 1.0,
  reach: 2,
  windup: 0.5,
  strikeDuration: 0.2,
  recovery: 0.3,
  lunge: 0,
  interruptible: true
};

function makeWorld(): GameWorld & { deltaTime: number; damageDealt: number } {
  return {
    getBlock: () => MAP_EMPTY,
    isOpen: () => true,
    deltaTime: 0,
    damageDealt: 0,
    damagePlayer(amount: number) {
      this.damageDealt += amount;
    }
  } as GameWorld & { deltaTime: number; damageDealt: number };
}

function ctx(
  world: GameWorld,
  dt: number,
  player = { x: 0, y: 0 }
): ComponentContext {
  return {
    dt,
    time: 0,
    world,
    player: {
      ...player,
      direction: 0,
      sheathed: false,
      swingProgress: 0,
      swingId: 0
    }
  };
}

/** Steps the attacker `steps` times by `dt` and returns the world. */
function step(
  attacker: Attacker,
  world: GameWorld,
  dt: number,
  steps: number,
  player?: { x: number; y: number }
): void {
  for (let i = 0; i < steps; i++) attacker.update(ctx(world, dt, player));
}

function makeAttacker(profile: AttackProfile = PROFILE): {
  entity: Entity;
  attacker: Attacker;
} {
  const entity = new Entity(1, 0); // distance 1 from the player at origin
  const attacker = new Attacker({
    damage: 10,
    attackInterval: 0.4,
    attack: profile
  });
  entity.add(new Strikeable(0));
  entity.add(attacker);
  return { entity, attacker };
}

describe('Attacker state machine', () => {
  it('stays idle and deals no damage while the player is out of range', () => {
    const world = makeWorld();
    const { attacker } = makeAttacker();
    step(attacker, world, 0.1, 5, { x: 10, y: 0 });
    expect(attacker.isBusy()).toBe(false);
    expect(attacker.getTelegraph()).toBe(0);
    expect(world.damageDealt).toBe(0);
  });

  it('winds up with a rising telegraph when the player is in range', () => {
    const world = makeWorld();
    const { attacker } = makeAttacker();
    step(attacker, world, 0.1, 1); // enter windup
    const early = attacker.getTelegraph();
    step(attacker, world, 0.1, 2);
    expect(attacker.isBusy()).toBe(true);
    expect(attacker.getTelegraph()).toBeGreaterThan(early);
    expect(world.damageDealt).toBe(0); // no damage before the strike commits
  });

  it('lands damage on the strike, then recovers and cools down', () => {
    const world = makeWorld();
    const { attacker } = makeAttacker();
    // windup (0.5) then into the strike (0.2): connect happens mid-strike.
    step(attacker, world, 0.1, 8);
    expect(world.damageDealt).toBeGreaterThan(0);

    // Telegraph clears once past the strike, and busy ends after recovery.
    step(attacker, world, 0.1, 6);
    expect(attacker.getTelegraph()).toBe(0);
    expect(attacker.isBusy()).toBe(false);
  });

  it('connects only once per strike', () => {
    const world = makeWorld();
    const { attacker } = makeAttacker();
    step(attacker, world, 0.05, 30);
    // A single strike resolves one damage application (≈10), not repeated hits.
    expect(world.damageDealt).toBeGreaterThan(0);
    expect(world.damageDealt).toBeLessThan(20);
  });

  it('keeps the entity stationary; the lunge is a cosmetic offset only', () => {
    const world = makeWorld();
    const entity = new Entity(1, 0); // distance 1 from the player at origin
    const attacker = new Attacker({
      damage: 10,
      attackInterval: 0.4,
      attack: { ...PROFILE, lunge: 0.5, windup: 0.1, strikeDuration: 0.2 }
    });
    entity.add(new Strikeable(0));
    entity.add(attacker);

    let maxOffset = 0;
    for (let i = 0; i < 8; i++) {
      attacker.update(ctx(world, 0.05));
      // The logical position never moves, however large the lunge.
      expect(entity.x).toBe(1);
      expect(entity.y).toBe(0);
      maxOffset = Math.max(maxOffset, Math.abs(attacker.getLungeOffset().x));
    }

    // The sprite darts toward the player (negative x, toward origin)...
    expect(maxOffset).toBeGreaterThan(0);
    // ...and eases back to rest over the recovery window (0.3s here).
    step(attacker, world, 0.05, 8);
    const rest = attacker.getLungeOffset();
    expect(Math.abs(rest.x)).toBe(0);
    expect(Math.abs(rest.y)).toBe(0);
  });

  it('knockback interrupts a wind-up for interruptible enemies', () => {
    const world = makeWorld();
    const { entity, attacker } = makeAttacker();
    step(attacker, world, 0.1, 2); // mid wind-up
    expect(attacker.isBusy()).toBe(true);

    entity.get(Strikeable)!.applyKnockback({ x: 0, y: 0 }, 0.5);
    attacker.update(ctx(world, 0.1));
    expect(attacker.isBusy()).toBe(false); // bumped to cooldown
    expect(world.damageDealt).toBe(0); // strike never landed
  });

  it('heavy (non-interruptible) enemies commit through knockback', () => {
    const world = makeWorld();
    const { entity, attacker } = makeAttacker({
      ...PROFILE,
      interruptible: false
    });
    step(attacker, world, 0.1, 2); // mid wind-up
    entity.get(Strikeable)!.applyKnockback({ x: 0, y: 0 }, 0.5);
    attacker.update(ctx(world, 0.1));
    expect(attacker.isBusy()).toBe(true); // still committed
  });
});
