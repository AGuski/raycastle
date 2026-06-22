import { CONFIG } from '../../../core/config';
import { Entity } from '../../entities/entity';
import { Chunk } from '../chunk';
import { GeneratorParams } from '../levelRecipe';
import {
  applyTerrainToCells,
  DecorationAssets,
  scatterActors,
  scatterLamps
} from './decorate';
import { buildTerrainMask } from './terrain';
import { chunkSeed, SeededRng } from './seededRng';
import { scatterHiddenDoors } from './hiddenDoors';

export interface GenerateChunkResult {
  chunk: Chunk;
  entities: Entity[];
}

export function generateChunk(
  cx: number,
  cy: number,
  worldSeed: number,
  params: GeneratorParams,
  assets: DecorationAssets,
  spawnExclude?: { x: number; y: number }
): GenerateChunkResult {
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
  const cells = applyTerrainToCells(mask, chunkSize, assets, rng);
  const scatterExclude = {
    excludeWx: spawnExclude?.x,
    excludeWy: spawnExclude?.y
  };

  const staticEntities = scatterLamps(cells, chunkSize, cx, cy, rng.fork(0x4c41), assets, {
    lampDensity,
    clearRadius: lampPlayerClearRadius,
    ...scatterExclude
  });

  const cellEntities = scatterHiddenDoors(
    mask,
    cells,
    chunkSize,
    cx,
    cy,
    rng.fork(0x8d00),
    {
      density: hiddenDoorDensity,
      openRadius: hiddenDoorOpenRadius,
      clearRadius: hiddenDoorPlayerClearRadius,
      ...scatterExclude
    }
  );

  const entities = scatterActors(
    cells,
    chunkSize,
    cx,
    cy,
    rng.fork(0x5a01),
    assets,
    CONFIG.actors.zombie,
    {
      enemyDensity,
      clearRadius: enemyPlayerClearRadius,
      ...scatterExclude
    }
  );

  if (assets.garrison) {
    entities.push(
      ...scatterActors(
        cells,
        chunkSize,
        cx,
        cy,
        rng.fork(0x6a55),
        assets,
        CONFIG.actors.garrison,
        {
          enemyDensity: garrisonDensity,
          clearRadius: enemyPlayerClearRadius,
          ...scatterExclude
        },
        assets.garrison
      )
    );
  }

  if (assets.hunterLich) {
    entities.push(
      ...scatterActors(
        cells,
        chunkSize,
        cx,
        cy,
        rng.fork(0x71c4),
        assets,
        CONFIG.actors.hunterLich,
        {
          enemyDensity: hunterLichDensity,
          clearRadius: enemyPlayerClearRadius,
          ...scatterExclude
        },
        assets.hunterLich
      )
    );
  }

  return {
    chunk: new Chunk(cx, cy, cells, staticEntities, cellEntities),
    entities
  };
}
