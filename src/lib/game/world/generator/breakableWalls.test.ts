import { describe, expect, it } from 'vitest';
import { Block } from '../../block';
import { BreakableWall, resolveBreakableWallWeaponStrike } from '../../entities/components/breakableWall';
import { CellAnchor } from '../../entities/components/cellAnchor';
import { spawnBreakableWall } from '../../entities/spawnBreakableWall';
import { spriteSheet } from '../../spriteSheet';
import { MAP_EMPTY } from '../../../types';
import {
  breakableWallFaces,
  findBreakableWallCandidates,
  isBreakableWallCandidate,
  scatterBreakableWalls
} from './breakableWalls';
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

describe('isBreakableWallCandidate', () => {
  it('accepts a north-south passage through an east-west wall', () => {
    const mask = maskFromRows([
      '.....',
      '.....',
      '.###.',
      '.....',
      '.....'
    ]);
    expect(isBreakableWallCandidate(mask, 2, 2)).toBe(true);
  });

  it('accepts an east-west passage through a north-south wall', () => {
    const mask = maskFromRows([
      '.....',
      '..#..',
      '..#..',
      '..#..',
      '.....'
    ]);
    expect(isBreakableWallCandidate(mask, 2, 2)).toBe(true);
  });

  it('rejects open cells and solid blocks without the pattern', () => {
    const mask = maskFromRows([
      '.....',
      '.....',
      '.....',
      '.....',
      '.....'
    ]);
    expect(isBreakableWallCandidate(mask, 2, 2)).toBe(false);
  });
});

describe('breakableWallFaces', () => {
  it('faces north and south for an east-west wall strip', () => {
    const mask = maskFromRows([
      '.....',
      '.....',
      '.###.',
      '.....',
      '.....'
    ]);
    expect(breakableWallFaces(mask, 2, 2)).toEqual([3, 1]);
  });

  it('faces east and west for a north-south wall strip', () => {
    const mask = maskFromRows([
      '.....',
      '..#..',
      '..#..',
      '..#..',
      '.....'
    ]);
    expect(breakableWallFaces(mask, 2, 2)).toEqual([2, 0]);
  });
});

describe('scatterBreakableWalls', () => {
  it('places walls only on matching wall cells with seeded density', () => {
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

    const walls = scatterBreakableWalls(
      mask,
      cells,
      chunkSize,
      0,
      0,
      new SeededRng(42),
      { density: 1 }
    );

    expect(walls.length).toBeGreaterThan(0);
    for (const wall of walls) {
      expect(wall.get(CellAnchor)).toBeDefined();
      expect(wall.get(BreakableWall)).toBeDefined();
    }
  });
});

describe('BreakableWall', () => {
  it('clears the anchored cell when destroyed', () => {
    const block = mockBlock();
    const wall = spawnBreakableWall(5, 5, block, [3, 1]);
    let cell: typeof MAP_EMPTY | Block = block;
    const cellEntities: typeof wall[] = [wall];

    const world = {
      getBlock: () => cell,
      isOpen: () => cell === MAP_EMPTY,
      setCell: (_wx: number, _wy: number, next: typeof MAP_EMPTY | Block) => {
        cell = next;
      },
      removeCellEntity: (entity: typeof wall) => {
        const index = cellEntities.indexOf(entity);
        if (index !== -1) cellEntities.splice(index, 1);
      }
    };

    const ctx = {
      dt: 0.016,
      time: 0,
      world,
      player: {
        x: 5.5,
        y: 5.5,
        direction: 0,
        sheathed: false,
        swingProgress: 0,
        swingId: 0
      }
    };

    wall.get(BreakableWall)!.destroy(ctx);
    expect(cell).toBe(MAP_EMPTY);
    expect(cellEntities).toHaveLength(0);
  });
});

describe('resolveBreakableWallWeaponStrike', () => {
  it('destroys the wall struck along the player view ray', () => {
    const block = mockBlock();
    const wall = spawnBreakableWall(5, 5, block, [3, 1]);
    let cell: typeof MAP_EMPTY | Block = block;
    const cellEntities = [wall];

    const world = {
      getBlock: (x: number, y: number) => {
        const wx = Math.floor(x);
        const wy = Math.floor(y);
        if (wx === 5 && wy === 5) return cell;
        return MAP_EMPTY;
      },
      isOpen: (x: number, y: number) => {
        const wx = Math.floor(x);
        const wy = Math.floor(y);
        if (wx === 5 && wy === 5) return cell === MAP_EMPTY;
        return true;
      },
      setCell: (_wx: number, _wy: number, next: typeof MAP_EMPTY | Block) => {
        cell = next;
      },
      removeCellEntity: (entity: typeof wall) => {
        const index = cellEntities.indexOf(entity);
        if (index !== -1) cellEntities.splice(index, 1);
      }
    };

    const ctx = {
      dt: 0,
      time: 0,
      world,
      player: {
        x: 5.5,
        y: 6.2,
        direction: -Math.PI / 2,
        sheathed: false,
        swingProgress: 0.5,
        swingId: 1
      }
    };

    expect(resolveBreakableWallWeaponStrike(ctx, cellEntities)).toBe(true);
    expect(cell).toBe(MAP_EMPTY);
    expect(cellEntities).toHaveLength(0);
  });
});

describe('findBreakableWallCandidates', () => {
  it('skips chunk borders', () => {
    const chunkSize = 5;
    const mask = maskFromRows([
      '.....',
      '..#..',
      '.#.#.',
      '..#..',
      '.....'
    ]);
    const candidates = findBreakableWallCandidates(mask, chunkSize);
    expect(
      candidates.every(
        ({ lx, ly }) => lx > 0 && lx < chunkSize - 1 && ly > 0 && ly < chunkSize - 1
      )
    ).toBe(true);
  });
});
