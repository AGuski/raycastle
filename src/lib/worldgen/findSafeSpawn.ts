import { generateChunkData } from './generateChunkData';
import { ChunkData, Tile, WorldGenParams } from './types';

export interface SpawnHint {
  x: number;
  y: number;
  direction?: number;
}

export interface SafeSpawn {
  x: number;
  y: number;
  direction: number;
}

function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

function tileAt(
  wx: number,
  wy: number,
  worldSeed: number,
  params: WorldGenParams,
  cache: Map<string, ChunkData>,
  spawnExclude?: { x: number; y: number }
): Tile {
  const { chunkSize } = params;
  const cx = floorDiv(wx, chunkSize);
  const cy = floorDiv(wy, chunkSize);
  const key = `${cx},${cy}`;
  let data = cache.get(key);
  if (!data) {
    data = generateChunkData(cx, cy, worldSeed, params, spawnExclude);
    cache.set(key, data);
  }
  const lx = wx - cx * chunkSize;
  const ly = wy - cy * chunkSize;
  return data.tiles[ly * chunkSize + lx] as Tile;
}

function isOpen(
  wx: number,
  wy: number,
  worldSeed: number,
  params: WorldGenParams,
  cache: Map<string, ChunkData>,
  spawnExclude?: { x: number; y: number }
): boolean {
  return tileAt(wx, wy, worldSeed, params, cache, spawnExclude) === Tile.Open;
}

/**
 * Pure mirror of `ChunkManager.findSafeSpawn`: prefer the hinted cell centre,
 * then search outward in square rings, then fall back to the hint after a carve.
 */
export function findSafeSpawn(
  worldSeed: number,
  params: WorldGenParams,
  hint: SpawnHint = { x: 0.5, y: 0.5, direction: 0 },
  spawnExclude?: { x: number; y: number }
): SafeSpawn {
  const direction = hint.direction ?? 0;
  const exclude = spawnExclude ?? { x: hint.x, y: hint.y };
  const cache = new Map<string, ChunkData>();
  const px = Math.floor(hint.x);
  const py = Math.floor(hint.y);

  if (isOpen(px, py, worldSeed, params, cache, exclude)) {
    return { x: hint.x, y: hint.y, direction };
  }

  const { chunkSize } = params;
  for (let radius = 1; radius <= chunkSize; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const wx = px + dx;
        const wy = py + dy;
        if (isOpen(wx, wy, worldSeed, params, cache, exclude)) {
          return { x: wx + 0.5, y: wy + 0.5, direction };
        }
      }
    }
  }

  // Matches the game carve fallback: the hinted centre is used after carving.
  return { x: hint.x, y: hint.y, direction };
}
