/**
 * Pure, isomorphic world-generation data types.
 *
 * This module imports NOTHING from the DOM, rendering engine, asset pipeline,
 * or game config. It describes worlds as plain data so the same generator can
 * run in the browser game, in node tests, and in the admin inspector.
 */

export const enum Tile {
  Open = 0,
  Wall = 1
}

/**
 * Hostile actor kinds. This union is the canonical spawn vocabulary: the pack
 * registry, the materialise bindings, and the per-actor CONFIG are all keyed by
 * it, so adding a member here makes the compiler point at every place that must
 * gain a binding.
 */
export type ActorKind =
  | 'zombie'
  | 'garrison'
  | 'hunterLich'
  | 'warden'
  | 'skitterling';

export type EntityKind = 'lamp' | 'breakableWall' | ActorKind;

/** Cardinal wall-face indices matching the game Block sides array. */
export type WallFace = 0 | 1 | 2 | 3;

/** A single spawned thing, located in world coordinates. */
export interface EntitySpec {
  kind: EntityKind;
  /** World-space center x (cell + 0.5 for scatter; cell origin for walls — see below). */
  wx: number;
  /** World-space center y. */
  wy: number;
  /** Corridor-facing sides for crack decals (breakable walls only). */
  faces?: [WallFace, WallFace];
}

/** Decoration baked onto a wall cell (which side carries the painting, and which variant). */
export interface WallDecor {
  paintingSide: 0 | 1 | 2 | 3;
  paintingIndex: number;
}

/** Fully materialisable description of one chunk. */
export interface ChunkData {
  cx: number;
  cy: number;
  chunkSize: number;
  /** Row-major Tile values, length chunkSize * chunkSize. */
  tiles: Uint8Array;
  /** Per-cell wall decoration, aligned with `tiles`; null for open cells. */
  wallDecor: (WallDecor | null)[];
  entities: EntitySpec[];
}

/**
 * Asset-free subset of GeneratorParams needed for generation, plus the painting
 * variant count (the pure layer cannot see the asset list, so the caller must
 * pass how many painting variants exist — it MUST equal assets.paintings.length).
 */
export interface WorldGenParams {
  chunkSize: number;
  wallDensity: number;
  lampDensity: number;
  lampPlayerClearRadius: number;
  /**
   * Encounters are suppressed within this radius of the player spawn. How *often*
   * encounters spawn and *what* they are is owned by the biome spawn tables
   * (see spawn/biomes.ts), not by params.
   */
  enemyPlayerClearRadius: number;
  borderPortalCount: { min: number; max: number };
  breakableWallDensity: number;
  /** Number of painting variants; must equal assets.paintings.length. */
  paintingVariantCount: number;
}
