import { describe, expect, it } from 'vitest';
import { Block } from '../block';
import { ActorEntity } from '../entities/actorEntity';
import { spriteSheet } from '../spriteSheet';
import { hasLineOfSight } from '../../engine/lineOfSight';
import { MAP_EMPTY, MapCell } from '../../types';

function mockTexture() {
  return spriteSheet({
    image: {} as HTMLImageElement,
    width: 1,
    height: 1
  });
}

function mockWall(): Block {
  const texture = mockTexture();
  return new Block([
    { texture },
    { texture },
    { texture },
    { texture }
  ]);
}

class TestWorld {
  private readonly cells: MapCell[][];

  constructor(cells: MapCell[][]) {
    this.cells = cells;
  }

  getBlock(x: number, y: number): MapCell {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const row = this.cells[fy];
    if (!row) return mockWall();
    return row[fx] ?? mockWall();
  }

  isOpen(x: number, y: number): boolean {
    return this.getBlock(x, y) === MAP_EMPTY;
  }
}

describe('hasLineOfSight', () => {
  it('returns true through an open corridor', () => {
    const world = new TestWorld([
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);

    expect(hasLineOfSight(world, { x: 0.5, y: 0.5 }, { x: 2.5, y: 0.5 })).toBe(true);
  });

  it('returns false when a wall blocks the path', () => {
    const wall = mockWall();
    const world = new TestWorld([
      [MAP_EMPTY, wall, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);

    expect(hasLineOfSight(world, { x: 0.5, y: 0.5 }, { x: 2.5, y: 0.5 })).toBe(false);
  });
});

describe('ActorEntity.update', () => {
  it('moves toward the target when line of sight is clear', () => {
    const world = new TestWorld([
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const actor = new ActorEntity(mockTexture(), 0.5, 0.5, {
      speed: 2,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true
    });

    actor.update(1, { x: 3.5, y: 0.5 }, world);

    expect(actor.x).toBeGreaterThan(0.5);
    expect(actor.y).toBeCloseTo(0.5, 5);
  });

  it('stays put when a wall blocks line of sight', () => {
    const wall = mockWall();
    const world = new TestWorld([
      [MAP_EMPTY, wall, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const actor = new ActorEntity(mockTexture(), 0.5, 0.5, {
      speed: 2,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true
    });

    actor.update(1, { x: 3.5, y: 0.5 }, world);

    expect(actor.x).toBe(0.5);
    expect(actor.y).toBe(0.5);
  });

  it('reports proximity via isNear', () => {
    const actor = new ActorEntity(mockTexture(), 1, 1, {
      speed: 1,
      sightRange: 10,
      proximityRadius: 2,
      chaseOnSight: false
    });

    expect(actor.isNear({ x: 2, y: 1.5 })).toBe(true);
    expect(actor.isNear({ x: 5, y: 5 })).toBe(false);
  });

  it('advances animation time while moving', () => {
    const world = new TestWorld([
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const actor = new ActorEntity(mockTexture(), 0.5, 0.5, {
      speed: 2,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true
    });

    actor.update(0.5, { x: 3.5, y: 0.5 }, world);

    expect(actor.animationTime).toBe(0.5);
  });

  it('scales animation time by animationSpeed', () => {
    const world = new TestWorld([
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const actor = new ActorEntity(mockTexture(), 0.5, 0.5, {
      speed: 2,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true,
      animationSpeed: 2
    });

    actor.update(0.5, { x: 3.5, y: 0.5 }, world);

    expect(actor.animationTime).toBe(1);
  });
});
