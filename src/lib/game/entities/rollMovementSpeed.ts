/** Chase speed at spawn: base × uniform[1 − spread, 1 + spread]. */
export function rollMovementSpeed(base: number, spread: number): number {
  if (base <= 0 || spread <= 0) return base;
  const factor = 1 + (Math.random() * 2 - 1) * spread;
  return base * factor;
}
