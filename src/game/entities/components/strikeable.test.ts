import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../../core/config';
import { MAP_EMPTY } from '../../../types';
import { ComponentContext } from '../component';
import { Entity } from '../entity';
import { Strikeable } from './strikeable';

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
});
