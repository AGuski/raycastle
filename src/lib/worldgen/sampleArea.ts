import { generateChunkData } from './generateChunkData';
import { ChunkData, EntitySpec, Tile, WorldGenParams } from './types';

export interface AreaSample {
  /** Tile at a world cell. Cells outside generated chunks fall back to Wall. */
  tileAt(wx: number, wy: number): Tile;
  /** Every entity whose cell lies within the sampled square. */
  entities: EntitySpec[];
}

function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

/**
 * Sample a square region centred on (centerWx, centerWy) with the given radius
 * in tiles. Generates every chunk the square touches (memoised by cx,cy via the
 * supplied cache) and exposes a tile lookup plus the entities inside the square.
 *
 * Pure: depends only on the worldgen layer.
 */
export function sampleArea(
  worldSeed: number,
  params: WorldGenParams,
  centerWx: number,
  centerWy: number,
  radiusTiles: number,
  cache: Map<string, ChunkData> = new Map(),
  spawnExclude?: { x: number; y: number }
): AreaSample {
  const { chunkSize } = params;
  const minWx = centerWx - radiusTiles;
  const maxWx = centerWx + radiusTiles;
  const minWy = centerWy - radiusTiles;
  const maxWy = centerWy + radiusTiles;

  const minCx = floorDiv(minWx, chunkSize);
  const maxCx = floorDiv(maxWx, chunkSize);
  const minCy = floorDiv(minWy, chunkSize);
  const maxCy = floorDiv(maxWy, chunkSize);

  const chunks = new Map<string, ChunkData>();

  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const key = `${cx},${cy}`;
      let data = cache.get(key);
      if (!data) {
        data = generateChunkData(cx, cy, worldSeed, params, spawnExclude);
        cache.set(key, data);
      }
      chunks.set(key, data);
    }
  }

  const tileAt = (wx: number, wy: number): Tile => {
    const cx = floorDiv(wx, chunkSize);
    const cy = floorDiv(wy, chunkSize);
    const data = chunks.get(`${cx},${cy}`) ?? cache.get(`${cx},${cy}`);
    if (!data) return Tile.Wall;
    const lx = wx - cx * chunkSize;
    const ly = wy - cy * chunkSize;
    return data.tiles[ly * chunkSize + lx] as Tile;
  };

  const entities: EntitySpec[] = [];
  for (const data of chunks.values()) {
    for (const spec of data.entities) {
      // Doors carry a cell origin, actors/lamps carry a +0.5 centre; flooring
      // both lands on the owning cell.
      const cellWx = Math.floor(spec.wx);
      const cellWy = Math.floor(spec.wy);
      if (cellWx >= minWx && cellWx <= maxWx && cellWy >= minWy && cellWy <= maxWy) {
        entities.push(spec);
      }
    }
  }

  return { tileAt, entities };
}
