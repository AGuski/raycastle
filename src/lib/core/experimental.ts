/**
 * Runtime-toggleable experimental rendering flags. Plain singleton (no Svelte
 * runes) so render passes and tests can import it freely; the in-game
 * ExperimentalMenu mutates it and the passes poll it each frame.
 */
export interface ExperimentalFlags {
  /** Emboss + roaming-torch relight on actor sprites tagged `volumetric`. */
  volumetricSprites: boolean;
  /** Same relight applied to the player's held weapon sprite. */
  volumetricWeapon: boolean;
}

export const experimental: ExperimentalFlags = {
  volumetricSprites: true,
  volumetricWeapon: false
};
