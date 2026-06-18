import { Block } from './block';
import { Sprite } from './sprite';

export type ControlState = 'left' | 'right' | 'forward' | 'backward';

export interface ControlStates {
  left: boolean;
  right: boolean;
  forward: boolean;
  backward: boolean;
}

export type MapCell = Block | 0 | -1;

export interface Point {
  x: number;
  y: number;
}

export interface RayStep {
  x: number;
  y: number;
  block: MapCell;
  distance: number;
  length2?: number;
  sprite?: Sprite;
  shading?: number;
  offset?: number;
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
