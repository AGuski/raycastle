/**
 * Biome / spawn-table layer: owns *where and how often* packs spawn. This is the
 * single place that maps an environment (chunk coords, danger rating, future
 * biome id) to a list of pack references. Packs stay pure recipes; only this
 * layer knows the environment, so rebalancing an area never touches a pack.
 *
 * Rates are ABSOLUTE and INDEPENDENT: each entry's `rate` is the per-open-cell
 * probability that *that* pack anchors, so its expected count is `rate · openCells`
 * regardless of the other entries. Tuning one pack never disturbs another — there
 * is no shared denominator. The biome's overall encounter density is simply the
 * sum of its rates (see encounterDensityOf), not a separate knob to keep in sync.
 *
 * v1 ships one neutral biome and a constant danger, so output is uniform. The
 * seam (PackContext.danger + resolveBiome branching) is in place so biomes and
 * danger ratings can be added later as pure data without reworking the resolver.
 */

import { hash01 } from '../seededRng';

/**
 * A pack reference within a biome. Plain serializable data — no function calls —
 * so spawn tables can be authored, stored, and loaded as JSON.
 */
export interface SpawnTableEntry {
  /** Pack id from the SPAWN_PACKS registry. */
  pack: string;
  /**
   * Expected number of this pack per chunk. Independent of every other entry:
   * tune one line without disturbing the rest. Converted to a per-cell anchor
   * probability at resolve time (see {@link encounterDensityOf}).
   */
  packsPerChunk: number;
}

/**
 * Approximate open cells in a default chunk (32×32 at ~0.45 wall density leaves
 * ~60% open). The bridge between the intuitive `packsPerChunk` authoring unit
 * and the per-cell probability the resolver works in. The real per-chunk open
 * count varies, but the relationship is linear so the dial stays faithful and
 * pack-independent.
 */
const NOMINAL_OPEN_CELLS_PER_CHUNK = 600;

export interface Biome {
  id: string;
  /** Packs eligible to spawn, each with its own expected count per chunk. */
  table: SpawnTableEntry[];
}

/**
 * A biome's overall per-open-cell anchor probability: the summed expected packs
 * per chunk, converted from the authoring unit to a per-cell rate.
 */
export function encounterDensityOf(biome: Biome): number {
  let total = 0;
  for (const entry of biome.table) total += entry.packsPerChunk;
  return total / NOMINAL_OPEN_CELLS_PER_CHUNK;
}

/** Everything the environment exposes to biome selection. */
export interface PackContext {
  cx: number;
  cy: number;
  /** 0..1 danger rating for this chunk. Reserved for biome/weighting logic. */
  danger: number;
}

/**
 * Default biome: every pack is eligible. Each number is "expected packs per
 * chunk" — tune one line without touching the rest; the values are independent.
 */
export const DEFAULT_BIOME: Biome = {
  id: 'default',
  table: [
    { pack: 'zombie-horde-small', packsPerChunk: 6 },
    { pack: 'zombie-horde-medium', packsPerChunk: 1 },
    { pack: 'zombie-horde-large', packsPerChunk: 1 },
    { pack: 'skitterling-swarm', packsPerChunk: 7 },
    { pack: 'garrison-patrol', packsPerChunk: 0.2 },
    { pack: 'lone-warden', packsPerChunk: 5 },
    { pack: 'lone-lich', packsPerChunk: 5 }
  ]
};

/**
 * Deterministic 0..1 danger rating for a chunk. Low-frequency hash noise so
 * neighbouring chunks correlate loosely. Unused by v1 selection, but stable and
 * ready for biome/weighting logic to consume.
 */
export function chunkDanger(worldSeed: number, cx: number, cy: number): number {
  return hash01(worldSeed ^ 0x0da7, Math.floor(cx / 4), Math.floor(cy / 4));
}

/**
 * Map a chunk's environment to the biome that governs its spawns. The only place
 * that decides pack likelihood from the environment — branch here (on danger,
 * coords, or a future biome map) when biomes arrive.
 */
export function resolveBiome(_ctx: PackContext): Biome {
  return DEFAULT_BIOME;
}
