import { describe, expect, it, vi } from 'vitest';
import { rollMovementSpeed } from './rollMovementSpeed';

describe('rollMovementSpeed', () => {
  it('returns base speed when spread is zero', () => {
    expect(rollMovementSpeed(2, 0)).toBe(2);
  });

  it('returns base speed when base is zero', () => {
    expect(rollMovementSpeed(0, 0.25)).toBe(0);
  });

  it('scales within ±spread of base', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollMovementSpeed(10, 0.25)).toBeCloseTo(7.5);

    vi.spyOn(Math, 'random').mockReturnValue(1);
    expect(rollMovementSpeed(10, 0.25)).toBeCloseTo(12.5);

    vi.mocked(Math.random).mockRestore();
  });
});
