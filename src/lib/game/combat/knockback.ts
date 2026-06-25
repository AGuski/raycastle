/**
 * Effective shove distance from player knockback strength and actor resistance.
 * Resistance 0 = baseline; negative = lightweight (extra knockback); near 1 =
 * almost immovable (warden).
 */
export function resolveKnockbackDistance(
  strength: number,
  resistance: number
): number {
  return strength * Math.max(0, 1 - resistance);
}
