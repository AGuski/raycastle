import { describe, expect, it } from 'vitest';
import { Block } from '../../block';
import { CellAnchor } from '../../entities/components/cellAnchor';
import { HiddenDoor } from '../../entities/components/hiddenDoor';
import { spawnHiddenDoor } from '../../entities/spawnHiddenDoor';
import { spriteSheet } from '../../spriteSheet';
import { MAP_EMPTY } from '../../../types';
import {
  findHiddenDoorCandidates,
  isHiddenDoorCandidate,
  scatterHiddenDoors
} from './hiddenDoors';
import { SeededRng } from '../../../worldgen/seededRng';

function mockBlock(): Block {
  const texture = spriteSheet({
    image: {} as HTMLImageElement,
    width: 1,
    height: 1
  });
  return new Block([
    { texture },
    { texture },
    { texture },
    { texture }
  ]);
}

function maskFromRows(rows: string[]): boolean[][] {
  return rows.map((row) =>
    [...row].map((ch) => ch === '.')
  );
}

describe('isHiddenDoorCandidate', () => {
  it('accepts a north-south passage through an east-west wall', () => {
    const mask = maskFromRows([
      '.....',
      '.....',
      '.###.',
      '.....',
      '.....'
    ]);
    expect(isHiddenDoorCandidate(mask, 2, 2)).toBe(true);
  });

  it('accepts an east-west passage through a north-south wall', () => {
    const mask = maskFromRows([
      '.....',
      '..#..',
      '..#..',
      '..#..',
      '.....'
    ]);
    expect(isHiddenDoorCandidate(mask, 2, 2)).toBe(true);
  });

  it('rejects open cells and solid blocks without the pattern', () => {
    const mask = maskFromRows([
      '.....',
      '.....',
      '.....',
      '.....',
      '.....'
    ]);
    expect(isHiddenDoorCandidate(mask, 2, 2)).toBe(false);
  });
});

describe('scatterHiddenDoors', () => {
  it('places doors only on matching wall cells with seeded density', () => {
    const mask = maskFromRows([
      '.......',
      '..###..',
      '..#.#..',
      '..###..',
      '.......'
    ]);
    const chunkSize = mask.length;
    const cells = mask.flatMap((row) =>
      row.map((open) => (open ? MAP_EMPTY : mockBlock()))
    );

    const doors = scatterHiddenDoors(
      mask,
      cells,
      chunkSize,
      0,
      0,
      new SeededRng(42),
      { density: 1, openRadius: 1.2, clearRadius: 0 }
    );

    expect(doors.length).toBeGreaterThan(0);
    for (const door of doors) {
      expect(door.get(CellAnchor)).toBeDefined();
      expect(door.get(HiddenDoor)).toBeDefined();
    }
  });
});

describe('HiddenDoor', () => {
  it('opens and closes the anchored cell as the player moves in and out', () => {
    const block = mockBlock();
    const door = spawnHiddenDoor(5, 5, block, 1.2);
    let cell: typeof MAP_EMPTY | Block = block;

    const world = {
      getBlock: () => cell,
      isOpen: () => cell === MAP_EMPTY,
      setCell: (_wx: number, _wy: number, next: typeof MAP_EMPTY | Block) => {
        cell = next;
      }
    };

    const ctx = (player: { x: number; y: number }) => ({
      dt: 0.016,
      time: 0,
      world,
      player: {
        x: player.x,
        y: player.y,
        direction: 0,
        sheathed: false,
        swingProgress: 0,
        swingId: 0
      }
    });

    door.update(ctx({ x: 0, y: 0 }));
    expect(cell).toBe(block);

    door.update(ctx({ x: 5.5, y: 5.5 }));
    expect(cell).toBe(MAP_EMPTY);

    door.update(ctx({ x: 10, y: 10 }));
    expect(cell).toBe(block);
  });
});

describe('findHiddenDoorCandidates', () => {
  it('skips chunk borders', () => {
    const chunkSize = 5;
    const mask = maskFromRows([
      '.....',
      '..#..',
      '.#.#.',
      '..#..',
      '.....'
    ]);
    const candidates = findHiddenDoorCandidates(mask, chunkSize);
    expect(candidates.every(({ lx, ly }) => lx > 0 && lx < chunkSize - 1 && ly > 0 && ly < chunkSize - 1)).toBe(true);
  });
});
