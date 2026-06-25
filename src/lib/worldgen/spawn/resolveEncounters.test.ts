import { describe, expect, it } from 'vitest';
import { resolveEncounters } from './resolveEncounters';
import { chunkSeed, SeededRng } from '../seededRng';
import { EntitySpec, Tile } from '../types';

const CHUNK = 32;
const SEED = 1234567;

function openTiles(size: number): Uint8Array {
  // Uint8Array defaults to 0 === Tile.Open.
  return new Uint8Array(size * size);
}

function run(cx: number, cy: number, tiles: Uint8Array): EntitySpec[] {
  const out: EntitySpec[] = [];
  const rng = new SeededRng(chunkSeed(SEED, cx, cy));
  resolveEncounters(tiles, CHUNK, cx, cy, SEED, rng, 4, {}, out);
  return out;
}

/** Collect actors across a 2x2 neighbourhood so we always have a populated set. */
function runRegion(tiles: Uint8Array): { cx: number; cy: number; specs: EntitySpec[] }[] {
  const region = [];
  for (let cy = 0; cy <= 1; cy++) {
    for (let cx = 0; cx <= 1; cx++) {
      region.push({ cx, cy, specs: run(cx, cy, tiles) });
    }
  }
  return region;
}

describe('resolveEncounters', () => {
  it('is deterministic for a fixed seed', () => {
    const tiles = openTiles(CHUNK);
    expect(run(0, 0, tiles)).toEqual(run(0, 0, tiles));
  });

  it('places every actor on an open cell within the current chunk', () => {
    // Checkerboard-ish walls; plenty of open cells remain for anchors.
    const tiles = openTiles(CHUNK);
    for (let i = 0; i < tiles.length; i++) {
      if (i % 3 === 0) tiles[i] = Tile.Wall;
    }

    for (let cy = 0; cy <= 1; cy++) {
      for (let cx = 0; cx <= 1; cx++) {
        for (const spec of run(cx, cy, tiles)) {
          const lx = Math.floor(spec.wx) - cx * CHUNK;
          const ly = Math.floor(spec.wy) - cy * CHUNK;
          expect(lx, 'in chunk x').toBeGreaterThanOrEqual(0);
          expect(lx).toBeLessThan(CHUNK);
          expect(ly, 'in chunk y').toBeGreaterThanOrEqual(0);
          expect(ly).toBeLessThan(CHUNK);
          expect(tiles[ly * CHUNK + lx], 'cell open').toBe(Tile.Open);
        }
      }
    }
  });

  it('produces clustered packs with sub-tile offsets (multiple bodies per area)', () => {
    const tiles = openTiles(CHUNK);
    const all = runRegion(tiles).flatMap((r) => r.specs);

    expect(all.length).toBeGreaterThan(0);
    expect(all.every((s) => s.kind !== 'lamp' && s.kind !== 'breakableWall')).toBe(true);

    // At least some actors sit off the cell centre (fractional part !== 0.5),
    // proving sub-tile clustering rather than one-per-cell scatter.
    const offCentre = all.some((s) => {
      const fx = s.wx - Math.floor(s.wx);
      const fy = s.wy - Math.floor(s.wy);
      return Math.abs(fx - 0.5) > 1e-6 || Math.abs(fy - 0.5) > 1e-6;
    });
    expect(offCentre).toBe(true);
  });

  it('only emits actor kinds from the registry', () => {
    const tiles = openTiles(CHUNK);
    const kinds = new Set(runRegion(tiles).flatMap((r) => r.specs).map((s) => s.kind));
    const allowed = new Set(['zombie', 'garrison', 'hunterLich', 'warden', 'skitterling']);
    for (const k of kinds) expect(allowed.has(k)).toBe(true);
  });
});
