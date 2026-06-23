import { describe, expect, it } from 'vitest';
import { CONFIG } from '../core/config';
import { contactDetectRadius, distanceBetween, isInContact } from './contact';

describe('contactDetectRadius', () => {
  it('extends stop radius by the detect margin', () => {
    expect(contactDetectRadius()).toBe(
      CONFIG.contact.stopRadius + CONFIG.contact.detectMargin
    );
  });
});

describe('isInContact', () => {
  it('returns true when points are within the radius', () => {
    expect(isInContact({ x: 0, y: 0 }, { x: 0.4, y: 0 }, 0.5)).toBe(true);
  });

  it('returns false when points are outside the radius', () => {
    expect(isInContact({ x: 0, y: 0 }, { x: 0.6, y: 0 }, 0.5)).toBe(false);
  });

  it('returns true at exactly the radius boundary', () => {
    expect(isInContact({ x: 0, y: 0 }, { x: 0.5, y: 0 }, 0.5)).toBe(true);
  });
});

describe('distanceBetween', () => {
  it('measures euclidean distance', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
