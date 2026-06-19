import { Bitmap, Block, BlockSide, BlockSides } from '../../block';
import { Sprite } from '../../entities/sprite';
import { MAP_EMPTY, MapCell } from '../../../types';
import { localIndex } from '../chunk';
import { SeededRng } from './seededRng';

export interface DecorationAssets {
  wallImage: Bitmap;
  paintings: BlockSide[];
  lampstand: Bitmap;
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

export interface LampScatterParams {
  lampDensity: number;
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

export function scatterLamps(
  cells: MapCell[],
  chunkSize: number,
  cx: number,
  cy: number,
  rng: SeededRng,
  assets: DecorationAssets,
  params: LampScatterParams
): Sprite[] {
  const sprites: Sprite[] = [];
  const clearRadiusSq = params.clearRadius * params.clearRadius;

  for (let ly = 0; ly < chunkSize; ly++) {
    for (let lx = 0; lx < chunkSize; lx++) {
      const index = localIndex(lx, ly, chunkSize);
      if (cells[index] !== MAP_EMPTY) continue;
      if (rng.next() >= params.lampDensity) continue;

      const wx = cx * chunkSize + lx + 0.5;
      const wy = cy * chunkSize + ly + 0.5;

      if (params.excludeWx !== undefined && params.excludeWy !== undefined) {
        const dx = wx - params.excludeWx;
        const dy = wy - params.excludeWy;
        if (dx * dx + dy * dy < clearRadiusSq) continue;
      }

      sprites.push(new Sprite(assets.lampstand, wx, wy));
    }
  }

  return sprites;
}
