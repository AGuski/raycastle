import { Block } from '../../block';
import { Entity } from '../../entities/entity';
import { spawnBreakableWall } from '../../entities/spawnBreakableWall';
import { MAP_EMPTY, MapCell } from '../../../types';
import { localIndex } from '../chunk';
import { SeededRng } from '../../../worldgen/seededRng';
import {
  breakableWallFaces,
  findBreakableWallCandidates,
  isBreakableWallCandidate
} from '../../../worldgen/terrain';

export { findBreakableWallCandidates, isBreakableWallCandidate, breakableWallFaces };

export interface BreakableWallScatterParams {
  density: number;
}

export function scatterBreakableWalls(
  mask: boolean[][],
  cells: MapCell[],
  chunkSize: number,
  cx: number,
  cy: number,
  rng: SeededRng,
  params: BreakableWallScatterParams
): Entity[] {
  const candidates = findBreakableWallCandidates(mask, chunkSize);
  const walls: Entity[] = [];

  for (const { lx, ly } of candidates) {
    if (rng.next() >= params.density) continue;

    const wx = cx * chunkSize + lx;
    const wy = cy * chunkSize + ly;

    const cell = cells[localIndex(lx, ly, chunkSize)];
    if (cell === MAP_EMPTY || !(cell instanceof Block)) continue;

    walls.push(
      spawnBreakableWall(wx, wy, cell, breakableWallFaces(mask, lx, ly))
    );
  }

  return walls;
}
