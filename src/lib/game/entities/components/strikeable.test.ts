import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../../core/config';
import { resolveKnockbackDistance } from '../../combat/knockback';
import { MAP_EMPTY } from '../../../types';
import { ComponentContext } from '../component';
import { Entity } from '../entity';
import { Damageable } from './damageable';
import { Strikeable, resolveActorWeaponStrike } from './strikeable';

const openWorld = {
  getBlock: () => MAP_EMPTY,
  isOpen: () => true
};

const ctx = (dt: number): ComponentContext => ({
  dt,
  time: 0,
  world: openWorld,
  player: {
    x: 0,
    y: 0,
    direction: 0,
    sheathed: false,
    swingProgress: 0,
    swingId: 0
  }
});

describe('Strikeable', () => {
  it('tracks which swing landed and exposes flash intensity', () => {
    const entity = new Entity(1, 0);
    const strikeable = new Strikeable();
    entity.add(strikeable);

    strikeable.markHit(3, 10);
    expect(strikeable.wasHitBySwing(3)).toBe(true);
    expect(strikeable.getHitFlash(10)).toBeGreaterThan(0);
    expect(strikeable.getHitFlash(10 + CONFIG.weapon.strike.hitFlashDuration)).toBe(0);
  });

  it('does not move instantly on knockback', () => {
    const entity = new Entity(1, 0);
    entity.add(new Strikeable());
    const strikeable = entity.get(Strikeable)!;

    strikeable.applyKnockback({ x: 0, y: 0 }, 0.5);
    expect(entity.x).toBe(1);
  });

  it('smoothly pushes the host over knockback duration', () => {
    const entity = new Entity(1, 0);
    entity.add(new Strikeable());
    const strikeable = entity.get(Strikeable)!;

    strikeable.applyKnockback({ x: 0, y: 0 }, 0.5);
    strikeable.update(ctx(CONFIG.weapon.strike.knockbackDuration * 0.5));
    expect(entity.x).toBeGreaterThan(1);
    expect(entity.x).toBeLessThan(1.5);
    strikeable.update(ctx(CONFIG.weapon.strike.knockbackDuration * 0.5));
    expect(entity.x).toBeCloseTo(1.5, 4);
  });

  it('scales knockback by resistance when receiving a weapon hit', () => {
    const heavy = new Entity(1, 0);
    heavy.add(new Strikeable(0.95));
    const heavyStrikeable = heavy.get(Strikeable)!;

    heavyStrikeable.receiveWeaponHit(
      {
        ...ctx(0),
        time: 1,
        player: { x: 0, y: 0, direction: 0, sheathed: false, swingProgress: 0.5, swingId: 1 }
      },
      1
    );

    const light = new Entity(1, 0);
    light.add(new Strikeable(-1));
    const lightStrikeable = light.get(Strikeable)!;

    lightStrikeable.receiveWeaponHit(
      {
        ...ctx(0),
        time: 1,
        player: { x: 0, y: 0, direction: 0, sheathed: false, swingProgress: 0.5, swingId: 1 }
      },
      1
    );

    const strength = CONFIG.weapon.strike.knockbackStrength;
    expect(resolveKnockbackDistance(strength, 0.95)).toBeCloseTo(0.025);
    expect(resolveKnockbackDistance(strength, -1)).toBe(1);
    expect(heavyStrikeable.isKnockedBack()).toBe(true);
    expect(lightStrikeable.isKnockedBack()).toBe(true);
  });

  it('caps a swing at maxTargets, striking the closest in the cone first', () => {
    // Five enemies dead-center in the forward cone at increasing distance.
    const xs = [0.2, 0.3, 0.4, 0.5, 0.6];
    const enemies = xs.map((x) => {
      const e = new Entity(x, 0);
      e.add(new Strikeable(0));
      e.add(new Damageable(100));
      return e;
    });

    const swingCtx: ComponentContext = {
      ...ctx(0),
      time: 1,
      player: { x: 0, y: 0, direction: 0, sheathed: false, swingProgress: 0.5, swingId: 7 }
    };

    resolveActorWeaponStrike(swingCtx, enemies);

    const hit = enemies.map((e) => e.get(Strikeable)!.wasHitBySwing(7));
    expect(hit).toEqual([true, true, true, false, false]);
    expect(hit.filter(Boolean).length).toBe(CONFIG.weapon.strike.maxTargets);
  });

  it('keeps the per-swing cap across multiple active frames', () => {
    const xs = [0.2, 0.3, 0.4, 0.5, 0.6];
    const enemies = xs.map((x) => {
      const e = new Entity(x, 0);
      e.add(new Strikeable(0));
      e.add(new Damageable(100));
      return e;
    });
    const swingCtx: ComponentContext = {
      ...ctx(0),
      time: 1,
      player: { x: 0, y: 0, direction: 0, sheathed: false, swingProgress: 0.5, swingId: 7 }
    };

    // Same swing resolved twice (two active frames) must not exceed the cap.
    resolveActorWeaponStrike(swingCtx, enemies);
    resolveActorWeaponStrike(swingCtx, enemies);

    const hitCount = enemies.filter((e) => e.get(Strikeable)!.wasHitBySwing(7)).length;
    expect(hitCount).toBe(CONFIG.weapon.strike.maxTargets);
  });
});
