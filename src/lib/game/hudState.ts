import type { Player } from './player';

export interface HudSnapshot {
  health: number;
  maxHealth: number;
}

/** Plain singleton HUD snapshot; the game loop publishes, Svelte reads. */
export const hudState: HudSnapshot = {
  health: 100,
  maxHealth: 100
};

export function publishHud(player: Player): void {
  hudState.health = player.health;
  hudState.maxHealth = player.maxHealth;
}
