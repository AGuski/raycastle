/**
 * Encounter resolver: turns a chunk's open cells into clustered packs of actors.
 *
 * Two stages:
 *   1. Anchor pass — one RNG stream marks a few open cells as encounter anchors
 *      (replaces the old per-kind scatter passes).
 *   2. Resolve pass — at each anchor, pick the chunk's biome, weight-pick a pack
 *      from its table, roll member counts + companions, and scatter the bodies
 *      around the anchor with sub-tile offsets.
 *
 * Fully deterministic: every roll derives from the chunk-root `rng` via stable
 * fork salts, so the same seed yields byte-identical actor positions. Bodies are
 * clamped to open cells of the *current* chunk, keeping chunks independently
 * generatable for infinite streaming.
 */

import { SeededRng } from '../seededRng';
import { EntitySpec, Tile } from '../types';
import { getPack, PackMember, SpawnPack } from './packs';
import {
  Biome,
  chunkDanger,
  encounterDensityOf,
  resolveBiome,
  SpawnTableEntry
} from './biomes';

const TAU = Math.PI * 2;
/** Per-body attempts to find an open cell before falling back to the anchor. */
const MAX_PLACEMENT_TRIES = 8;

/** Fork salt for the anchor-selection stream (one draw per open cell). */
const ANCHOR_SALT = 0xe2c0;
/** Fork salt for per-anchor pack resolution. */
const DETAIL_SALT = 0x9e3d;

interface Anchor {
  lx: number;
  ly: number;
  /** World-space cell centre. */
  wx: number;
  wy: number;
}

interface ScatterExclude {
  excludeWx?: number;
  excludeWy?: number;
}

function isOpenCell(
  tiles: Uint8Array,
  chunkSize: number,
  cx: number,
  cy: number,
  wx: number,
  wy: number
): boolean {
  const lx = Math.floor(wx) - cx * chunkSize;
  const ly = Math.floor(wy) - cy * chunkSize;
  if (lx < 0 || lx >= chunkSize || ly < 0 || ly >= chunkSize) return false;
  return tiles[ly * chunkSize + lx] === Tile.Open;
}

/**
 * Pick which pack anchors here, proportional to each entry's expected count. The
 * cell already passed the "some pack anchors" test, so this just splits that hit
 * across packs. Splitting proportionally keeps each pack's effective per-cell
 * probability equal to its own share, independent of the others.
 */
function pickPack(table: SpawnTableEntry[], rng: SeededRng): SpawnPack | undefined {
  let total = 0;
  for (const entry of table) total += entry.packsPerChunk;
  if (total <= 0) return undefined;

  let roll = rng.next() * total;
  for (const entry of table) {
    roll -= entry.packsPerChunk;
    if (roll < 0) return getPack(entry.pack);
  }
  return getPack(table[table.length - 1].pack);
}

/** Resolve one pack member group into placed entity specs. */
function placeMember(
  member: PackMember,
  pack: SpawnPack,
  anchor: Anchor,
  tiles: Uint8Array,
  chunkSize: number,
  cx: number,
  cy: number,
  rng: SeededRng,
  out: EntitySpec[]
): void {
  const span = member.count.max - member.count.min + 1;
  const count = member.count.min + rng.nextInt(span);
  const spread = member.spread ?? pack.spread;

  for (let i = 0; i < count; i++) {
    let wx = anchor.wx;
    let wy = anchor.wy;

    if (spread > 0) {
      let placed = false;
      for (let t = 0; t < MAX_PLACEMENT_TRIES; t++) {
        const angle = rng.next() * TAU;
        // sqrt keeps the radius uniform across the disc instead of centre-heavy.
        const radius = Math.sqrt(rng.next()) * spread;
        const bx = anchor.wx + Math.cos(angle) * radius;
        const by = anchor.wy + Math.sin(angle) * radius;
        if (isOpenCell(tiles, chunkSize, cx, cy, bx, by)) {
          wx = bx;
          wy = by;
          placed = true;
          break;
        }
      }
      // On failure fall back to the (always-open) anchor cell so counts hold and
      // nothing spawns inside a wall.
      void placed;
    }

    out.push({ kind: member.kind, wx, wy });
  }
}

function resolvePack(
  pack: SpawnPack,
  anchor: Anchor,
  tiles: Uint8Array,
  chunkSize: number,
  cx: number,
  cy: number,
  rng: SeededRng,
  out: EntitySpec[]
): void {
  pack.members.forEach((member, index) => {
    // The leader (index 0) always spawns; later members honour `chance`.
    if (index > 0 && member.chance !== undefined && rng.next() >= member.chance) {
      return;
    }
    placeMember(member, pack, anchor, tiles, chunkSize, cx, cy, rng, out);
  });
}

export function resolveEncounters(
  tiles: Uint8Array,
  chunkSize: number,
  cx: number,
  cy: number,
  worldSeed: number,
  rng: SeededRng,
  clearRadius: number,
  exclude: ScatterExclude,
  out: EntitySpec[]
): void {
  const ctx = { cx, cy, danger: chunkDanger(worldSeed, cx, cy) };
  const biome: Biome = resolveBiome(ctx);
  // Overall anchor probability per open cell = sum of the table's absolute rates.
  const encounterDensity = encounterDensityOf(biome);

  // --- Stage 1: anchor selection (one draw per open cell, row-major) ---
  const anchorRng = rng.fork(ANCHOR_SALT);
  const clearRadiusSq = clearRadius * clearRadius;
  const anchors: Anchor[] = [];

  for (let ly = 0; ly < chunkSize; ly++) {
    for (let lx = 0; lx < chunkSize; lx++) {
      if (tiles[ly * chunkSize + lx] !== Tile.Open) continue;
      if (anchorRng.next() >= encounterDensity) continue;

      const wx = cx * chunkSize + lx + 0.5;
      const wy = cy * chunkSize + ly + 0.5;

      if (exclude.excludeWx !== undefined && exclude.excludeWy !== undefined) {
        const dx = wx - exclude.excludeWx;
        const dy = wy - exclude.excludeWy;
        if (dx * dx + dy * dy < clearRadiusSq) continue;
      }

      anchors.push({ lx, ly, wx, wy });
    }
  }

  // --- Stage 2: resolve each anchor with an independent per-anchor stream ---
  const detailRng = rng.fork(DETAIL_SALT);
  anchors.forEach((anchor, index) => {
    const packRng = detailRng.fork(index);
    const pack = pickPack(biome.table, packRng);
    if (!pack) return;
    resolvePack(pack, anchor, tiles, chunkSize, cx, cy, packRng, out);
  });
}
