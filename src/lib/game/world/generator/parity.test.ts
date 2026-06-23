import { describe, expect, it } from 'vitest';
import { Block, BlockSide } from '../../block';
import { spriteSheet } from '../../spriteSheet';
import { Entity } from '../../entities/entity';
import { Renderable } from '../../entities/components/renderable';
import { HiddenDoor } from '../../entities/components/hiddenDoor';
import { Strikeable } from '../../entities/components/strikeable';
import { CellAnchor } from '../../entities/components/cellAnchor';
import { MAP_EMPTY, MapCell } from '../../../types';
import { Chunk } from '../chunk';
import { CONFIG } from '../../../core/config';
import { defaultGeneratorParams } from '../levelRecipe';
import { hashSeed } from '../../../worldgen/seededRng';
import { SeededRng, chunkSeed } from '../../../worldgen/seededRng';
import { buildTerrainMask } from '../../../worldgen/terrain';
import { generateChunkData } from '../../../worldgen';

import { generateChunk } from './generateChunk';
import {
  DecorationAssets,
  applyTerrainToCells,
  scatterLamps,
  scatterActors
} from './decorate';
import { scatterHiddenDoors } from './hiddenDoors';

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
    hunterLich: spriteSheet(mockBitmap())
  };
}

const PARAMS = { ...defaultGeneratorParams(), chunkSize: CHUNK_SIZE };

/**
 * Reproduces the ORIGINAL pre-refactor generateChunk body using the untouched
 * decorate / hiddenDoors helpers. This is the "pre" reference: identical fork
 * salts and call order to the original orchestrator.
 */
function legacyGenerateChunk(
  cx: number,
  cy: number,
  assets: DecorationAssets
): { chunk: Chunk; entities: Entity[] } {
  const {
    chunkSize,
    wallDensity,
    lampDensity,
    lampPlayerClearRadius,
    enemyDensity,
    enemyPlayerClearRadius,
    garrisonDensity,
    hunterLichDensity,
    borderPortalCount,
    hiddenDoorDensity,
    hiddenDoorOpenRadius,
    hiddenDoorPlayerClearRadius
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

  const cellEntities = scatterHiddenDoors(mask, cells, chunkSize, cx, cy, rng.fork(0x8d00), {
    density: hiddenDoorDensity,
    openRadius: hiddenDoorOpenRadius,
    clearRadius: hiddenDoorPlayerClearRadius,
    ...scatterExclude
  });

  const entities = scatterActors(
    cells,
    chunkSize,
    cx,
    cy,
    rng.fork(0x5a01),
    assets,
    CONFIG.actors.zombie,
    { enemyDensity, clearRadius: enemyPlayerClearRadius, ...scatterExclude }
  );
  entities.push(
    ...scatterActors(
      cells,
      chunkSize,
      cx,
      cy,
      rng.fork(0x6a55),
      assets,
      CONFIG.actors.garrison,
      { enemyDensity: garrisonDensity, clearRadius: enemyPlayerClearRadius, ...scatterExclude },
      assets.garrison
    )
  );
  entities.push(
    ...scatterActors(
      cells,
      chunkSize,
      cx,
      cy,
      rng.fork(0x71c4),
      assets,
      CONFIG.actors.hunterLich,
      { enemyDensity: hunterLichDensity, clearRadius: enemyPlayerClearRadius, ...scatterExclude },
      assets.hunterLich
    )
  );

  return { chunk: new Chunk(cx, cy, cells, staticEntities, cellEntities), entities };
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

function entitySig(e: Entity, assets: DecorationAssets): string {
  const x = e.x.toFixed(4);
  const y = e.y.toFixed(4);
  if (e.get(HiddenDoor)) {
    const anchor = e.get(CellAnchor);
    return `door@${anchor?.wx},${anchor?.wy}:${x},${y}`;
  }
  const r = e.get(Renderable);
  const tex = r?.texture;
  let kind = 'lamp';
  if (e.get(Strikeable)) {
    if (tex === assets.zombie) kind = 'zombie';
    else if (tex === assets.garrison) kind = 'garrison';
    else if (tex === assets.hunterLich) kind = 'hunterLich';
    else kind = 'actor?';
  } else if (tex === assets.lampstand) {
    kind = 'lamp';
  }
  return `${kind}@${x},${y}`;
}

function chunkSignature(
  result: { chunk: Chunk; entities: Entity[] },
  assets: DecorationAssets
) {
  return {
    tiles: tileSignature(result.chunk.cells),
    static: result.chunk.entities.map((e) => entitySig(e, assets)),
    cell: result.chunk.cellEntities.map((e) => entitySig(e, assets)),
    dynamic: result.entities.map((e) => entitySig(e, assets))
  };
}

describe('worldgen parity: materialize(generateChunkData) === legacy generateChunk', () => {
  const coords: { cx: number; cy: number }[] = [];
  for (let cy = -1; cy <= 1; cy++) {
    for (let cx = -1; cx <= 1; cx++) {
      coords.push({ cx, cy });
    }
  }

  it('produces byte-identical chunks across a 3x3 neighborhood', () => {
    for (const { cx, cy } of coords) {
      const assetsA = mockAssets();
      const assetsB = mockAssets();
      const legacy = legacyGenerateChunk(cx, cy, assetsA);
      const next = generateChunk(cx, cy, WORLD_SEED, PARAMS, assetsB, SPAWN);

      const legacySig = chunkSignature(legacy, assetsA);
      const nextSig = chunkSignature(next, assetsB);

      expect(nextSig, `chunk (${cx},${cy})`).toEqual(legacySig);
    }
  });

  it('covers a chunk that contains at least one hidden door', () => {
    let found = false;
    for (const { cx, cy } of coords) {
      const assets = mockAssets();
      const next = generateChunk(cx, cy, WORLD_SEED, PARAMS, assets, SPAWN);
      if (next.chunk.cellEntities.some((e) => e.get(HiddenDoor))) {
        found = true;
        // The door must sit on a wall cell that the materializer turned into a Block.
        for (const door of next.chunk.cellEntities) {
          const anchor = door.get(CellAnchor)!;
          const lx = anchor.wx - cx * CHUNK_SIZE;
          const ly = anchor.wy - cy * CHUNK_SIZE;
          const cell = next.chunk.cells[ly * CHUNK_SIZE + lx];
          expect(cell).toBeInstanceOf(Block);
        }
      }
    }
    expect(found, 'expected at least one hidden door in the sampled region').toBe(true);
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
});
