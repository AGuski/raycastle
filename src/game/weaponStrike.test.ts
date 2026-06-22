import { describe, expect, it } from 'vitest';
import { CONFIG } from '../core/config';
import { isInStrikeCone, isStrikeActive } from './weaponStrike';

const viewer = { x: 0, y: 0, direction: 0, sheathed: false, swingProgress: 0.5, swingId: 1 };

describe('isInStrikeCone', () => {
  it('hits targets straight ahead within range', () => {
    const within = CONFIG.weapon.strike.range * 0.5;
    expect(isInStrikeCone(viewer, { x: within, y: 0 })).toBe(true);
  });

  it('misses targets outside the lateral cone', () => {
    expect(isInStrikeCone(viewer, { x: 1, y: 1 })).toBe(false);
  });

  it('misses targets behind the viewer', () => {
    expect(isInStrikeCone(viewer, { x: -1, y: 0 })).toBe(false);
  });

  it('misses targets beyond strike range', () => {
    expect(
      isInStrikeCone(viewer, { x: CONFIG.weapon.strike.range + 1, y: 0 })
    ).toBe(false);
  });
});

describe('isStrikeActive', () => {
  it('is active inside the configured window', () => {
    const { activeStart, activeEnd } = CONFIG.weapon.strike;
    expect(isStrikeActive((activeStart + activeEnd) * 0.5)).toBe(true);
  });

  it('is inactive during wind-up', () => {
    expect(isStrikeActive(0)).toBe(false);
  });
});
