import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../core/config';
import { MAP_EMPTY } from '../../types';
import { Strikeable } from './strikeable';

class MockHost {
  constructor(
    public x: number,
    public y: number
  ) {}
}

const openWorld = {
  getBlock: () => MAP_EMPTY,
  isOpen: () => true
};

describe('Strikeable', () => {
  it('tracks which swing landed and exposes flash intensity', () => {
    const strikeable = new Strikeable(new MockHost(1, 0));
    strikeable.markHit(3, 10);
    expect(strikeable.wasHitBySwing(3)).toBe(true);
    expect(strikeable.getHitFlash(10)).toBeGreaterThan(0);
    expect(strikeable.getHitFlash(10 + CONFIG.weapon.strike.hitFlashDuration)).toBe(0);
  });

  it('does not move instantly on knockback', () => {
    const host = new MockHost(1, 0);
    const strikeable = new Strikeable(host);
    strikeable.applyKnockback({ x: 0, y: 0 }, 0.5);
    expect(host.x).toBe(1);
  });

  it('smoothly pushes the host over knockback duration', () => {
    const host = new MockHost(1, 0);
    const strikeable = new Strikeable(host);
    strikeable.applyKnockback({ x: 0, y: 0 }, 0.5);
    strikeable.update(CONFIG.weapon.strike.knockbackDuration * 0.5, openWorld);
    expect(host.x).toBeGreaterThan(1);
    expect(host.x).toBeLessThan(1.5);
    strikeable.update(CONFIG.weapon.strike.knockbackDuration * 0.5, openWorld);
    expect(host.x).toBeCloseTo(1.5, 4);
  });
});
