import { Chunk } from '../chunk';
import { GeneratorParams } from '../levelRecipe';
import {
  applyTerrainToCells,
  DecorationAssets,
  scatterLamps
} from './decorate';
import { buildTerrainMask } from './terrain';
import { chunkSeed, SeededRng } from './seededRng';

export function generateChunk(
  cx: number,
  cy: number,
  worldSeed: number,
  params: GeneratorParams,
  assets: DecorationAssets,
  spawnExclude?: { x: number; y: number }
): Chunk {
  const { chunkSize, wallDensity, lampDensity, lampPlayerClearRadius, borderPortalCount } =
    params;

  const mask = buildTerrainMask(
    worldSeed,
    cx,
    cy,
    chunkSize,
    wallDensity,
    borderPortalCount
  );

  const rng = new SeededRng(chunkSeed(worldSeed, cx, cy));
  const cells = applyTerrainToCells(mask, chunkSize, assets, rng);
  const sprites = scatterLamps(cells, chunkSize, cx, cy, rng.fork(0x4c41), assets, {
    lampDensity,
    excludeWx: spawnExclude?.x,
    excludeWy: spawnExclude?.y,
    clearRadius: lampPlayerClearRadius
  });

  return new Chunk(cx, cy, cells, sprites);
}
