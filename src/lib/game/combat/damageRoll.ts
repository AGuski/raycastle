/** Roll damage with a luck spread: multiplier in [1 - luck, 1 + luck]. */
export function rollDamage(base: number, luck: number): number {
  const multiplier = 1 - luck + Math.random() * luck * 2;
  return Math.max(1, Math.round(base * multiplier));
}
