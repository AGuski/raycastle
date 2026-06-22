import { TAU } from '../../core/config';

/**
 * A per-frame 2D transform applied to a single (non-sheet) sprite to fake
 * procedural animation by moving the rendered billboard around in screen space.
 *
 * Translation and scale are expressed as fractions of the sprite's screen-space
 * width and height so animators stay resolution-independent. The renderer pivots
 * rotation and scale around the billboard's bottom-center ("legs").
 */
export interface SpriteTransform {
  /** Rotation in radians around the bottom-center pivot. */
  rotation: number;
  /** Offset as fractions of sprite width (x) and height (y); positive y lifts up. */
  translation: { x: number; y: number };
  /** Uniform scale; 1 = no change. */
  scale: number;
}

/** Produces a {@link SpriteTransform} for a given playback time (seconds). */
export interface SpriteAnimator {
  transformAt(time: number): SpriteTransform;
}

export const IDENTITY_TRANSFORM: SpriteTransform = {
  rotation: 0,
  translation: { x: 0, y: 0 },
  scale: 1
};

export function isIdentityTransform(transform: SpriteTransform): boolean {
  return (
    transform.rotation === 0 &&
    transform.translation.x === 0 &&
    transform.translation.y === 0 &&
    transform.scale === 1
  );
}

export interface BounceWalkConfig {
  /** Sway cycles per second. */
  frequency: number;
  /** Peak rotation in radians (how far the body tilts to each side). */
  swayAngle: number;
  /** Peak vertical lift as a fraction of sprite height. */
  bobHeight: number;
}

export const DEFAULT_BOUNCE_WALK: BounceWalkConfig = {
  frequency: 2.6,
  swayAngle: 0.14,
  bobHeight: 0.05
};

/**
 * Mimics the South Park "rocking" walk: the body pivots side to side around the
 * feet while bobbing upward at each extreme of the sway. The bob runs at double
 * the sway frequency so the character lifts as it rocks onto either foot and
 * settles when passing back through upright.
 */
export class BounceWalkAnimator implements SpriteAnimator {
  constructor(private readonly config: BounceWalkConfig = DEFAULT_BOUNCE_WALK) {}

  transformAt(time: number): SpriteTransform {
    const phase = time * this.config.frequency * TAU;
    return {
      rotation: Math.sin(phase) * this.config.swayAngle,
      translation: { x: 0, y: Math.abs(Math.sin(phase)) * this.config.bobHeight },
      scale: 1
    };
  }
}
