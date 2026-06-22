import { describe, expect, it } from 'vitest';
import { BounceWalkAnimator } from './spriteAnimator';

const CONFIG = { frequency: 0.25, swayAngle: 0.2, bobHeight: 0.1 };

describe('BounceWalkAnimator', () => {
  it('rests upright with no translation at the start of the cycle', () => {
    const t = new BounceWalkAnimator(CONFIG).transformAt(0);
    expect(t.rotation).toBeCloseTo(0, 6);
    expect(t.translation).toEqual({ x: 0, y: 0 });
    expect(t.scale).toBe(1);
  });

  it('tilts fully and lifts at the sway extremes', () => {
    // frequency 0.25 puts the quarter-cycle (phase pi/2) at t = 1.
    const right = new BounceWalkAnimator(CONFIG).transformAt(1);
    expect(right.rotation).toBeCloseTo(0.2, 6);
    expect(right.translation.y).toBeCloseTo(0.1, 6);

    const left = new BounceWalkAnimator(CONFIG).transformAt(3);
    expect(left.rotation).toBeCloseTo(-0.2, 6);
    expect(left.translation.y).toBeCloseTo(0.1, 6);
  });

  it('passes back through upright with the lift settled at mid-sway', () => {
    const t = new BounceWalkAnimator(CONFIG).transformAt(2);
    expect(t.rotation).toBeCloseTo(0, 6);
    expect(t.translation.y).toBeCloseTo(0, 6);
  });

  it('keeps the vertical lift non-negative across the whole cycle', () => {
    const animator = new BounceWalkAnimator(CONFIG);
    for (let time = 0; time < 4; time += 0.13) {
      expect(animator.transformAt(time).translation.y).toBeGreaterThanOrEqual(0);
    }
  });
});
