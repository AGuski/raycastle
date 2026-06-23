import { Entity } from '../../entities/entity';
import { Chunk } from '../chunk';
import { GeneratorParams } from '../levelRecipe';
import { generateChunkData, WorldGenParams } from '../../../worldgen';
import { materializeChunk } from '../materializeChunk';
import { DecorationAssets } from './decorate';

export interface GenerateChunkResult {
  chunk: Chunk;
  entities: Entity[];
}

/**
 * Build the asset-free generation params from the game-layer GeneratorParams,
 * tagging on the painting variant count (which the pure layer can't read).
 */
function toWorldGenParams(
  params: GeneratorParams,
  paintingVariantCount: number
): WorldGenParams {
  return {
    chunkSize: params.chunkSize,
    wallDensity: params.wallDensity,
    lampDensity: params.lampDensity,
    lampPlayerClearRadius: params.lampPlayerClearRadius,
    enemyDensity: params.enemyDensity,
    enemyPlayerClearRadius: params.enemyPlayerClearRadius,
    garrisonDensity: params.garrisonDensity,
    hunterLichDensity: params.hunterLichDensity,
    borderPortalCount: params.borderPortalCount,
    breakableWallDensity: params.breakableWallDensity,
    paintingVariantCount
  };
}

export function generateChunk(
  cx: number,
  cy: number,
  worldSeed: number,
  params: GeneratorParams,
  assets: DecorationAssets,
  spawnExclude?: { x: number; y: number }
): GenerateChunkResult {
  const data = generateChunkData(
    cx,
    cy,
    worldSeed,
    toWorldGenParams(params, assets.paintings.length),
    spawnExclude
  );
  return materializeChunk(data, assets);
}
