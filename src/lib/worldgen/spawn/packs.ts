/**
 * Spawn-pack registry: pure, environment-agnostic recipes for "how to spawn a
 * group of actors". A pack knows nothing about how likely it is to appear — that
 * is decided by the biome spawn tables (see ./biomes.ts). A pack defined once is
 * reused by any number of biomes at any weight, so flavours (small/medium/large
 * hordes) are just separate packs, and rarity tuning never duplicates a recipe.
 */

import { ActorKind } from '../types';

/** Inclusive integer range used for member counts. */
export interface CountDist {
  min: number;
  max: number;
}

/** One group of identical actors within a pack. */
export interface PackMember {
  kind: ActorKind;
  count: CountDist;
  /**
   * Probability this member group appears at all (0..1, default 1). Use it for
   * companions — e.g. a lich that *sometimes* rides along with a zombie horde.
   * The first member of a pack (the leader) ignores this and always spawns.
   */
  chance?: number;
  /** Override the pack's cluster radius for this member (tiles). */
  spread?: number;
}

/** A reusable encounter recipe. `members[0]` is the leader / cluster anchor. */
export interface SpawnPack {
  id: string;
  /** Base cluster radius in tiles; 0 = everyone on the anchor cell. */
  spread: number;
  members: PackMember[];
}

export const SPAWN_PACKS: SpawnPack[] = [
  {
    id: 'zombie-horde-small',
    spread: 2,
    members: [{ kind: 'zombie', count: { min: 4, max: 7 } }]
  },
  {
    id: 'zombie-horde-medium',
    spread: 3,
    members: [
      { kind: 'zombie', count: { min: 8, max: 14 } },
      { kind: 'hunterLich', count: { min: 1, max: 1 }, chance: 0.2 }
    ]
  },
  {
    id: 'zombie-horde-large',
    spread: 4,
    members: [
      { kind: 'zombie', count: { min: 16, max: 28 } },
      { kind: 'hunterLich', count: { min: 1, max: 2 }, chance: 0.45 }
    ]
  },
  {
    id: 'skitterling-swarm',
    spread: 1.5,
    members: [{ kind: 'skitterling', count: { min: 3, max: 6 } }]
  },
  {
    id: 'garrison-patrol',
    spread: 0,
    members: [{ kind: 'garrison', count: { min: 1, max: 1 } }]
  },
  {
    id: 'lone-warden',
    spread: 0,
    members: [{ kind: 'warden', count: { min: 1, max: 1 } }]
  },
  {
    id: 'lone-lich',
    spread: 0,
    members: [{ kind: 'hunterLich', count: { min: 1, max: 1 } }]
  }
];

const PACK_BY_ID = new Map(SPAWN_PACKS.map((p) => [p.id, p]));

export function getPack(id: string): SpawnPack | undefined {
  return PACK_BY_ID.get(id);
}
