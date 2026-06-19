import { Block } from './game/block';

export type ControlState = 'left' | 'right' | 'forward' | 'backward';

export interface ControlStates {
  left: boolean;
  right: boolean;
  forward: boolean;
  backward: boolean;
}

export const MAP_EMPTY = 0 as const;
export const MAP_OUT_OF_BOUNDS = -1 as const;

export type MapCell = Block | typeof MAP_EMPTY | typeof MAP_OUT_OF_BOUNDS;

export interface Point {
  x: number;
  y: number;
}

export interface RayStep {
  x: number;
  y: number;
  block: MapCell;
  distance: number;
  length2: number;
  shading: number;
  offset: number;
}

export interface WallProjection {
  top: number;
  height: number;
}

export interface GridStep {
  x: number;
  y: number;
  length2: number;
}

export function isOpenCell(
  cell: MapCell
): cell is typeof MAP_EMPTY | typeof MAP_OUT_OF_BOUNDS {
  return cell === MAP_EMPTY || cell === MAP_OUT_OF_BOUNDS;
}
