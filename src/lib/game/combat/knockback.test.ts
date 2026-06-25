import { describe, expect, it } from 'vitest';
import { resolveKnockbackDistance } from './knockback';

describe('resolveKnockbackDistance', () => {
  const strength = 0.5;

  it('applies full knockback at zero resistance (zombie baseline)', () => {
    expect(resolveKnockbackDistance(strength, 0)).toBe(0.5);
  });

  it('amplifies knockback for lightweight negative resistance', () => {
    expect(resolveKnockbackDistance(strength, -1)).toBe(1);
  });

  it('nearly blocks knockback for heavy resistance', () => {
    expect(resolveKnockbackDistance(strength, 0.95)).toBeCloseTo(0.025);
  });
});
