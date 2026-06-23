import { Block } from '../../block';
import { Entity } from '../../entities/entity';
import { spawnHiddenDoor } from '../../entities/spawnHiddenDoor';
import { MAP_EMPTY, MapCell } from '../../../types';
import { localIndex } from '../chunk';
import { SeededRng } from '../../../worldgen/seededRng';
import {
  findHiddenDoorCandidates,
  isHiddenDoorCandidate
} from '../../../worldgen/terrain';

// Re-exported from the pure worldgen layer so existing imports keep working.
export { findHiddenDoorCandidates, isHiddenDoorCandidate };

export interface HiddenDoorScatterParams {
  density: number;
  openRadius: number;
  excludeWx?: number;
  excludeWy?: number;
  clearRadius: number;
}

export function scatterHiddenDoors(
  mask: boolean[][],
  cells: MapCell[],
  chunkSize: number,
  cx: number,
  cy: number,
  rng: SeededRng,
  params: HiddenDoorScatterParams
): Entity[] {
  const candidates = findHiddenDoorCandidates(mask, chunkSize);
  const doors: Entity[] = [];
  const clearRadiusSq = params.clearRadius * params.clearRadius;

  for (const { lx, ly } of candidates) {
    if (rng.next() >= params.density) continue;

    const wx = cx * chunkSize + lx;
    const wy = cy * chunkSize + ly;
    const centerX = wx + 0.5;
    const centerY = wy + 0.5;

    if (params.excludeWx !== undefined && params.excludeWy !== undefined) {
      const dx = centerX - params.excludeWx;
      const dy = centerY - params.excludeWy;
      if (dx * dx + dy * dy < clearRadiusSq) continue;
    }

    const cell = cells[localIndex(lx, ly, chunkSize)];
    if (cell === MAP_EMPTY || !(cell instanceof Block)) continue;

    doors.push(spawnHiddenDoor(wx, wy, cell, params.openRadius));
  }

  return doors;
}
