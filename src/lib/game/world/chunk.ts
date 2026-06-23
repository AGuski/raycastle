import { MapCell } from '../../types';
import { Entity } from '../entities/entity';

export interface ChunkCoord {
  cx: number;
  cy: number;
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function worldToChunk(
  wx: number,
  wy: number,
  chunkSize: number
): ChunkCoord {
  return {
    cx: Math.floor(wx / chunkSize),
    cy: Math.floor(wy / chunkSize)
  };
}

export function worldToLocal(
  wx: number,
  wy: number,
  chunkSize: number
): { lx: number; ly: number; cx: number; cy: number } {
  const cx = Math.floor(wx / chunkSize);
  const cy = Math.floor(wy / chunkSize);
  const lx = ((wx % chunkSize) + chunkSize) % chunkSize;
  const ly = ((wy % chunkSize) + chunkSize) % chunkSize;
  return { lx, ly, cx, cy };
}

export function localIndex(lx: number, ly: number, chunkSize: number): number {
  return ly * chunkSize + lx;
}

export class Chunk {
  constructor(
    public readonly cx: number,
    public readonly cy: number,
    public readonly cells: MapCell[],
    /** Static props in this chunk (lamps, etc.). */
    public readonly entities: Entity[],
    /** Smart grid cells (breakable walls, etc.). */
    public readonly cellEntities: Entity[] = []
  ) {}
}
