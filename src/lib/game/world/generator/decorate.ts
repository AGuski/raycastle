import { Block, BlockSide, BlockSides } from '../../block';
import { ActorSpawnConfig, createStrikeableActor } from '../../entities/spawnActor';
import { Entity } from '../../entities/entity';
import { spawnStaticSprite } from '../../entities/staticSprite';
import { SpriteSheet } from '../../spriteSheet';
import { MAP_EMPTY, MapCell } from '../../../types';
import { localIndex } from '../chunk';
import { SeededRng } from '../../../worldgen/seededRng';

export interface DecorationAssets {
  wallImage: SpriteSheet;
  paintings: BlockSide[];
  lampstand: SpriteSheet;
  zombie: SpriteSheet;
  garrison?: SpriteSheet;
  hunterLich?: SpriteSheet;
  crackDecal: SpriteSheet;
}

export function createDecoratedBlock(
  assets: DecorationAssets,
  rng: SeededRng
): Block {
  const sides: BlockSides = [
    { texture: assets.wallImage },
    { texture: assets.wallImage },
    { texture: assets.wallImage },
    { texture: assets.wallImage }
  ];
  const paintingOn = rng.nextInt(4);
  const painting = assets.paintings[rng.nextInt(assets.paintings.length)];
  sides[paintingOn] = painting;
  return new Block(sides);
}

export interface ScatterParams {
  density: number;
  excludeWx?: number;
  excludeWy?: number;
  clearRadius: number;
}

export interface LampScatterParams {
  lampDensity: number;
  excludeWx?: number;
  excludeWy?: number;
  clearRadius: number;
}

export interface ActorScatterParams {
  enemyDensity: number;
  excludeWx?: number;
  excludeWy?: number;
  clearRadius: number;
}

export function applyTerrainToCells(
  mask: boolean[][],
  chunkSize: number,
  assets: DecorationAssets,
  rng: SeededRng
): MapCell[] {
  const cells: MapCell[] = new Array(chunkSize * chunkSize);

  for (let ly = 0; ly < chunkSize; ly++) {
    for (let lx = 0; lx < chunkSize; lx++) {
      const index = localIndex(lx, ly, chunkSize);
      cells[index] = mask[ly][lx]
        ? MAP_EMPTY
        : createDecoratedBlock(assets, rng.fork(index));
    }
  }

  return cells;
}

function scatterOnOpenCells<T>(
  cells: MapCell[],
  chunkSize: number,
  cx: number,
  cy: number,
  rng: SeededRng,
  params: ScatterParams,
  create: (wx: number, wy: number) => T
): T[] {
  const items: T[] = [];
  const clearRadiusSq = params.clearRadius * params.clearRadius;

  for (let ly = 0; ly < chunkSize; ly++) {
    for (let lx = 0; lx < chunkSize; lx++) {
      const index = localIndex(lx, ly, chunkSize);
      if (cells[index] !== MAP_EMPTY) continue;
      if (rng.next() >= params.density) continue;

      const wx = cx * chunkSize + lx + 0.5;
      const wy = cy * chunkSize + ly + 0.5;

      if (params.excludeWx !== undefined && params.excludeWy !== undefined) {
        const dx = wx - params.excludeWx;
        const dy = wy - params.excludeWy;
        if (dx * dx + dy * dy < clearRadiusSq) continue;
      }

      items.push(create(wx, wy));
    }
  }

  return items;
}

export function scatterLamps(
  cells: MapCell[],
  chunkSize: number,
  cx: number,
  cy: number,
  rng: SeededRng,
  assets: DecorationAssets,
  params: LampScatterParams
): Entity[] {
  return scatterOnOpenCells(
    cells,
    chunkSize,
    cx,
    cy,
    rng,
    {
      density: params.lampDensity,
      excludeWx: params.excludeWx,
      excludeWy: params.excludeWy,
      clearRadius: params.clearRadius
    },
    (wx, wy) => spawnStaticSprite(assets.lampstand, wx, wy)
  );
}

export function scatterActors(
  cells: MapCell[],
  chunkSize: number,
  cx: number,
  cy: number,
  rng: SeededRng,
  assets: DecorationAssets,
  config: ActorSpawnConfig,
  params: ActorScatterParams,
  texture: SpriteSheet = assets.zombie
): Entity[] {
  return scatterOnOpenCells(
    cells,
    chunkSize,
    cx,
    cy,
    rng,
    {
      density: params.enemyDensity,
      excludeWx: params.excludeWx,
      excludeWy: params.excludeWy,
      clearRadius: params.clearRadius
    },
    (wx, wy) => createStrikeableActor(texture, wx, wy, config)
  );
}
