import { describe, expect, it } from 'vitest';
import { CONFIG } from '../core/config';
import { swingTransformAt } from './weaponSwing';

describe('swingTransformAt', () => {
  it('starts at the wind-up pose', () => {
    const t = swingTransformAt(0);
    expect(t.rotation).toBeCloseTo(CONFIG.weapon.swing.start.rotation, 6);
    expect(t.translation.y).toBeGreaterThan(0);
  });

  it('ends at the follow-through pose', () => {
    const t = swingTransformAt(1);
    expect(t.rotation).toBeCloseTo(CONFIG.weapon.swing.end.rotation, 6);
    expect(t.translation.y).toBeLessThan(0);
  });

  it('moves monotonically downward through the swing', () => {
    const mid = swingTransformAt(0.5);
    const start = swingTransformAt(0);
    const end = swingTransformAt(1);
    expect(mid.translation.y).toBeLessThan(start.translation.y);
    expect(mid.translation.y).toBeGreaterThan(end.translation.y);
  });
});
