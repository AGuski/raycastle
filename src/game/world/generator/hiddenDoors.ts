import { Block } from '../../block';
import { Entity } from '../../entities/entity';
import { spawnHiddenDoor } from '../../entities/spawnHiddenDoor';
import { MAP_EMPTY, MapCell } from '../../../types';
import { localIndex } from '../chunk';
import { SeededRng } from './seededRng';

export interface HiddenDoorScatterParams {
  density: number;
  openRadius: number;
  excludeWx?: number;
  excludeWy?: number;
  clearRadius: number;
}

/** True when a wall cell separates open space on one axis and walls on the other. */
export function isHiddenDoorCandidate(
  mask: boolean[][],
  lx: number,
  ly: number
): boolean {
  const open = (x: number, y: number) => mask[y][x];
  const wall = (x: number, y: number) => !mask[y][x];

  const nsOpen = open(lx, ly - 1) && open(lx, ly + 1);
  const ewWall = wall(lx - 1, ly) && wall(lx + 1, ly);

  const ewOpen = open(lx - 1, ly) && open(lx + 1, ly);
  const nsWall = wall(lx, ly - 1) && wall(lx, ly + 1);

  return (nsOpen && ewWall) || (ewOpen && nsWall);
}

export function findHiddenDoorCandidates(
  mask: boolean[][],
  chunkSize: number
): { lx: number; ly: number }[] {
  const candidates: { lx: number; ly: number }[] = [];

  for (let ly = 1; ly < chunkSize - 1; ly++) {
    for (let lx = 1; lx < chunkSize - 1; lx++) {
      if (mask[ly][lx]) continue;
      if (isHiddenDoorCandidate(mask, lx, ly)) {
        candidates.push({ lx, ly });
      }
    }
  }

  return candidates;
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
