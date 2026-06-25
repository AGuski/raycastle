import { describe, expect, it } from 'vitest';
import { Block, BlockSide } from '../../block';
import { spriteSheet } from '../../spriteSheet';
import { Entity } from '../../entities/entity';
import { BreakableWall } from '../../entities/components/breakableWall';
import { CellAnchor } from '../../entities/components/cellAnchor';
import { MAP_EMPTY, MapCell } from '../../../types';
import { Chunk } from '../chunk';
import { defaultGeneratorParams } from '../levelRecipe';
import { hashSeed } from '../../../worldgen/seededRng';
import { SeededRng, chunkSeed } from '../../../worldgen/seededRng';
import { buildTerrainMask } from '../../../worldgen/terrain';
import { generateChunkData } from '../../../worldgen';

import { generateChunk } from './generateChunk';
import { DecorationAssets, applyTerrainToCells, scatterLamps } from './decorate';
import { scatterBreakableWalls } from './breakableWalls';

const CHUNK_SIZE = 16;
const WORLD_SEED = hashSeed('parity-world');
const SPAWN = { x: 0.5, y: 0.5 };

function mockBitmap() {
  return { image: {} as HTMLImageElement, width: 1, height: 1 };
}

/**
 * Mock assets with FOUR distinct painting variants so paintingVariantCount (4)
 * matches the real game and painting-index draws stay in range, and with
 * distinct sprite sheets per actor so the materialised textures are
 * distinguishable.
 */
function mockAssets(): DecorationAssets {
  const wallImage = spriteSheet(mockBitmap());
  const paintings: BlockSide[] = [
    { texture: spriteSheet(mockBitmap()) },
    { texture: spriteSheet(mockBitmap()) },
    { texture: spriteSheet(mockBitmap()) },
    { texture: spriteSheet(mockBitmap()) }
  ];
  return {
    wallImage,
    paintings,
    lampstand: spriteSheet(mockBitmap()),
    zombie: spriteSheet(mockBitmap()),
    garrison: spriteSheet(mockBitmap()),
    hunterLich: spriteSheet(mockBitmap()),
    warden: spriteSheet(mockBitmap()),
    skitterling: spriteSheet(mockBitmap()),
    crackDecal: spriteSheet(mockBitmap())
  };
}

const PARAMS = { ...defaultGeneratorParams(), chunkSize: CHUNK_SIZE };

/**
 * Reference for the buckets the spawn overhaul did NOT touch: terrain tiles,
 * lamps, and breakable walls. Actors are intentionally excluded here — they are
 * now produced by the biome encounter resolver (covered by its own tests and the
 * golden checksum below), and deliberately diverge from the old per-kind scatter.
 *
 * Lamps (fork 0x4c41) and breakable walls (fork 0x8d00) draw from independent
 * forks of the chunk-root rng, so they remain byte-identical to the original
 * orchestrator regardless of the actor changes.
 */
function legacyTerrainAndProps(
  cx: number,
  cy: number,
  assets: DecorationAssets
): { chunk: Chunk; entities: Entity[] } {
  const {
    chunkSize,
    wallDensity,
    lampDensity,
    lampPlayerClearRadius,
    borderPortalCount,
    breakableWallDensity
  } = PARAMS;

  const mask = buildTerrainMask(WORLD_SEED, cx, cy, chunkSize, wallDensity, borderPortalCount);
  const rng = new SeededRng(chunkSeed(WORLD_SEED, cx, cy));
  const cells = applyTerrainToCells(mask, chunkSize, assets, rng);
  const scatterExclude = { excludeWx: SPAWN.x, excludeWy: SPAWN.y };

  const staticEntities = scatterLamps(cells, chunkSize, cx, cy, rng.fork(0x4c41), assets, {
    lampDensity,
    clearRadius: lampPlayerClearRadius,
    ...scatterExclude
  });

  const cellEntities = scatterBreakableWalls(mask, cells, chunkSize, cx, cy, rng.fork(0x8d00), {
    density: breakableWallDensity
  }, assets.crackDecal);

  return { chunk: new Chunk(cx, cy, cells, staticEntities, cellEntities), entities: [] };
}

/** Stable, comparable signature of a cell array. */
function tileSignature(cells: MapCell[]): string {
  return cells
    .map((c) => {
      if (c === MAP_EMPTY) return '.';
      if (c instanceof Block) {
        // Encode which side carries the non-wall painting and which variant.
        const wallTex = c.sides[0].texture;
        let side = -1;
        for (let i = 0; i < 4; i++) {
          if (c.sides[i].texture !== wallTex) {
            side = i;
            break;
          }
        }
        return `W${side}`;
      }
      return '?';
    })
    .join(',');
}

function entitySig(e: Entity): string {
  const x = e.x.toFixed(4);
  const y = e.y.toFixed(4);
  if (e.get(BreakableWall)) {
    const anchor = e.get(CellAnchor);
    return `wall@${anchor?.wx},${anchor?.wy}:${x},${y}`;
  }
  return `lamp@${x},${y}`;
}

/** Terrain + lamps + breakable walls only — the buckets the overhaul preserves. */
function propsSignature(result: { chunk: Chunk }) {
  return {
    tiles: tileSignature(result.chunk.cells),
    static: result.chunk.entities.map((e) => entitySig(e)),
    cell: result.chunk.cellEntities.map((e) => entitySig(e))
  };
}

describe('worldgen parity: terrain/lamp/wall buckets unchanged by spawn overhaul', () => {
  const coords: { cx: number; cy: number }[] = [];
  for (let cy = -1; cy <= 1; cy++) {
    for (let cx = -1; cx <= 1; cx++) {
      coords.push({ cx, cy });
    }
  }

  it('produces byte-identical terrain/props across a 3x3 neighborhood', () => {
    for (const { cx, cy } of coords) {
      const assetsA = mockAssets();
      const assetsB = mockAssets();
      const legacy = legacyTerrainAndProps(cx, cy, assetsA);
      const next = generateChunk(cx, cy, WORLD_SEED, PARAMS, assetsB, SPAWN);

      expect(propsSignature(next), `chunk (${cx},${cy})`).toEqual(propsSignature(legacy));
    }
  });

  it('covers a chunk that contains at least one breakable wall', () => {
    let found = false;
    for (const { cx, cy } of coords) {
      const assets = mockAssets();
      const next = generateChunk(cx, cy, WORLD_SEED, PARAMS, assets, SPAWN);
      if (next.chunk.cellEntities.some((e) => e.get(BreakableWall))) {
        found = true;
        for (const wall of next.chunk.cellEntities) {
          const anchor = wall.get(CellAnchor)!;
          const lx = anchor.wx - cx * CHUNK_SIZE;
          const ly = anchor.wy - cy * CHUNK_SIZE;
          const cell = next.chunk.cells[ly * CHUNK_SIZE + lx];
          expect(cell).toBeInstanceOf(Block);
        }
      }
    }
    expect(found, 'expected at least one breakable wall in the sampled region').toBe(
      true
    );
  });

  it('data layer is deterministic for a fixed seed (golden checksum)', () => {
    const data = generateChunkData(0, 0, WORLD_SEED, {
      ...PARAMS,
      paintingVariantCount: 4
    }, SPAWN);

    // Golden snapshot of the pure data for chunk (0,0). Locks determinism so a
    // future change to RNG order or draw counts is caught immediately.
    const wallCount = Array.from(data.tiles).filter((t) => t === 1).length;
    const decorCount = data.wallDecor.filter((d) => d !== null).length;
    const kinds = data.entities.reduce<Record<string, number>>((acc, e) => {
      acc[e.kind] = (acc[e.kind] ?? 0) + 1;
      return acc;
    }, {});

    expect({
      chunkSize: data.chunkSize,
      tilesLen: data.tiles.length,
      wallCount,
      decorCount,
      entityCount: data.entities.length,
      kinds
    }).toMatchSnapshot();
  });

  it('locks deterministic encounter output across the 3x3 neighborhood', () => {
    // Aggregate actor counts so the snapshot guards the pack resolver, not just
    // one (possibly empty) chunk. Catches RNG-order or tuning regressions.
    const actorKinds: Record<string, number> = {};
    for (const { cx, cy } of coords) {
      const data = generateChunkData(cx, cy, WORLD_SEED, { ...PARAMS, paintingVariantCount: 4 }, SPAWN);
      for (const e of data.entities) {
        if (e.kind === 'lamp' || e.kind === 'breakableWall') continue;
        actorKinds[e.kind] = (actorKinds[e.kind] ?? 0) + 1;
      }
    }
    expect(actorKinds).toMatchSnapshot();
  });
});
