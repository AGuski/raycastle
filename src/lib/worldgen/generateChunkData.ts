import {
  breakableWallFaces,
  buildTerrainMask,
  findBreakableWallCandidates
} from './terrain';
import { chunkSeed, SeededRng } from './seededRng';
import { ChunkData, EntitySpec, Tile, WallDecor, WorldGenParams } from './types';
import { resolveEncounters } from './spawn/resolveEncounters';

function localIndex(lx: number, ly: number, chunkSize: number): number {
  return ly * chunkSize + lx;
}

interface ScatterExclude {
  excludeWx?: number;
  excludeWy?: number;
}

/**
 * Scatter entities on open cells, draining `rng` in row-major order.
 *
 * Mirrors decorate.ts `scatterOnOpenCells` exactly: one `rng.next()` draw per
 * open cell, an exclusion check by squared distance, then emit.
 */
function scatterOnOpen(
  tiles: Uint8Array,
  chunkSize: number,
  cx: number,
  cy: number,
  rng: SeededRng,
  density: number,
  clearRadius: number,
  exclude: ScatterExclude,
  emit: (wx: number, wy: number) => EntitySpec,
  out: EntitySpec[]
): void {
  const clearRadiusSq = clearRadius * clearRadius;

  for (let ly = 0; ly < chunkSize; ly++) {
    for (let lx = 0; lx < chunkSize; lx++) {
      const index = localIndex(lx, ly, chunkSize);
      if (tiles[index] !== Tile.Open) continue;
      if (rng.next() >= density) continue;

      const wx = cx * chunkSize + lx + 0.5;
      const wy = cy * chunkSize + ly + 0.5;

      if (exclude.excludeWx !== undefined && exclude.excludeWy !== undefined) {
        const dx = wx - exclude.excludeWx;
        const dy = wy - exclude.excludeWy;
        if (dx * dx + dy * dy < clearRadiusSq) continue;
      }

      out.push(emit(wx, wy));
    }
  }
}

/**
 * Pure chunk generation: emits plain data (tiles, wall decoration, entity specs)
 * with NO assets, DOM, or engine coupling.
 *
 * The RNG draw order and fork salts are kept byte-identical to the original
 * `generateChunk` so the materialised world is unchanged.
 */
export function generateChunkData(
  cx: number,
  cy: number,
  worldSeed: number,
  params: WorldGenParams,
  spawnExclude?: { x: number; y: number }
): ChunkData {
  const {
    chunkSize,
    wallDensity,
    lampDensity,
    lampPlayerClearRadius,
    enemyPlayerClearRadius,
    borderPortalCount,
    breakableWallDensity,
    paintingVariantCount
  } = params;

  const mask = buildTerrainMask(
    worldSeed,
    cx,
    cy,
    chunkSize,
    wallDensity,
    borderPortalCount
  );

  const rng = new SeededRng(chunkSeed(worldSeed, cx, cy));

  // --- tiles + per-cell wall decoration (mirrors applyTerrainToCells) ---
  const tiles = new Uint8Array(chunkSize * chunkSize);
  const wallDecor: (WallDecor | null)[] = new Array(chunkSize * chunkSize);

  for (let ly = 0; ly < chunkSize; ly++) {
    for (let lx = 0; lx < chunkSize; lx++) {
      const index = localIndex(lx, ly, chunkSize);
      if (mask[ly][lx]) {
        tiles[index] = Tile.Open;
        wallDecor[index] = null;
      } else {
        tiles[index] = Tile.Wall;
        // Same two draws, same order as createDecoratedBlock(assets, rng.fork(index)).
        const cellRng = rng.fork(index);
        const paintingSide = cellRng.nextInt(4) as 0 | 1 | 2 | 3;
        const paintingIndex = cellRng.nextInt(paintingVariantCount);
        wallDecor[index] = { paintingSide, paintingIndex };
      }
    }
  }

  const exclude: ScatterExclude = {
    excludeWx: spawnExclude?.x,
    excludeWy: spawnExclude?.y
  };

  const entities: EntitySpec[] = [];

  // Lamps — fork(0x4c41), static bucket.
  scatterOnOpen(
    tiles,
    chunkSize,
    cx,
    cy,
    rng.fork(0x4c41),
    lampDensity,
    lampPlayerClearRadius,
    exclude,
    (wx, wy) => ({ kind: 'lamp', wx, wy }),
    entities
  );

  // Breakable walls — fork(0x8d00), cellEntities bucket.
  {
    const wallRng = rng.fork(0x8d00);
    const candidates = findBreakableWallCandidates(mask, chunkSize);

    for (const { lx, ly } of candidates) {
      if (wallRng.next() >= breakableWallDensity) continue;

      const wx = cx * chunkSize + lx;
      const wy = cy * chunkSize + ly;

      entities.push({
        kind: 'breakableWall',
        wx,
        wy,
        faces: breakableWallFaces(mask, lx, ly)
      });
    }
  }

  // Actors — biome-driven encounter packs, dynamic bucket. Replaces the old
  // independent per-kind scatter passes. Uses its own fork salts internally, so
  // lamp/wall determinism above is untouched.
  resolveEncounters(
    tiles,
    chunkSize,
    cx,
    cy,
    worldSeed,
    rng,
    enemyPlayerClearRadius,
    exclude,
    entities
  );

  return { cx, cy, chunkSize, tiles, wallDecor, entities };
}
