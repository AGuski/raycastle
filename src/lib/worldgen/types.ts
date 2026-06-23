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

export type EntityKind = 'lamp' | 'zombie' | 'garrison' | 'hunterLich' | 'hiddenDoor';

/** A single spawned thing, located in world coordinates. */
export interface EntitySpec {
  kind: EntityKind;
  /** World-space center x (cell + 0.5 for scatter; cell origin for doors — see below). */
  wx: number;
  /** World-space center y. */
  wy: number;
  /** Reveal radius, present only for hidden doors. */
  openRadius?: number;
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
  enemyDensity: number;
  enemyPlayerClearRadius: number;
  garrisonDensity: number;
  hunterLichDensity: number;
  borderPortalCount: { min: number; max: number };
  hiddenDoorDensity: number;
  hiddenDoorOpenRadius: number;
  hiddenDoorPlayerClearRadius: number;
  /** Number of painting variants; must equal assets.paintings.length. */
  paintingVariantCount: number;
}
