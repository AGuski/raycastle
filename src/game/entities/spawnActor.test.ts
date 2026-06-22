import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../core/config';
import { contactDetectRadius, distanceBetween } from '../contact';
import { Block } from '../block';
import { Renderable } from './components/renderable';
import { ContactSensor } from './components/contactSensor';
import { spawnActor } from './spawnActor';
import { Entity } from './entity';
import { spriteSheet } from '../spriteSheet';
import { hasLineOfSight } from '../../engine/lineOfSight';
import { MAP_EMPTY, MapCell, Point } from '../../types';
import { ComponentContext } from './component';

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
  deltaTime = 0;

  constructor(private readonly cells: MapCell[][]) {}

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

function tickActor(
  entity: Entity,
  dt: number,
  target: Point,
  world: TestWorld
): void {
  world.deltaTime += dt;
  entity.update({
    dt,
    time: world.deltaTime,
    world,
    player: {
      x: target.x,
      y: target.y,
      direction: 0,
      sheathed: false,
      swingProgress: 0,
      swingId: 0
    }
  } satisfies ComponentContext);
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

describe('spawnActor', () => {
  it('moves toward the target when line of sight is clear', () => {
    const world = new TestWorld([
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const actor = spawnActor(mockTexture(), 0.5, 0.5, {
      speed: 2,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true
    });

    tickActor(actor, 1, { x: 3.5, y: 0.5 }, world);

    expect(actor.x).toBeGreaterThan(0.5);
    expect(actor.y).toBeCloseTo(0.5, 5);
  });

  it('stays put when a wall blocks line of sight', () => {
    const wall = mockWall();
    const world = new TestWorld([
      [MAP_EMPTY, wall, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const actor = spawnActor(mockTexture(), 0.5, 0.5, {
      speed: 2,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true
    });

    tickActor(actor, 1, { x: 3.5, y: 0.5 }, world);

    expect(actor.x).toBe(0.5);
    expect(actor.y).toBe(0.5);
  });

  it('stops at contact range instead of reaching the target', () => {
    const world = new TestWorld([
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const actor = spawnActor(mockTexture(), 0.5, 0.5, {
      speed: 10,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true
    });
    const target = { x: 0.5, y: 2.5 };

    tickActor(actor, 1, target, world);

    expect(distanceBetween(actor, target)).toBeCloseTo(
      CONFIG.contact.stopRadius,
      5
    );
    expect(actor.get(ContactSensor)!.inContact).toBe(true);
  });

  it('does not move while already in contact', () => {
    const world = new TestWorld([
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const actor = spawnActor(mockTexture(), 0.5, 0.9, {
      speed: 2,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true
    });

    tickActor(actor, 1, { x: 0.5, y: 1 }, world);

    expect(actor.x).toBe(0.5);
    expect(actor.y).toBe(0.9);
    expect(actor.get(ContactSensor)!.inContact).toBe(true);
  });

  it('registers contact within detect range before reaching stop radius', () => {
    const world = new TestWorld([
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const target = { x: 0.5, y: 1.0 };
    const stop = CONFIG.contact.stopRadius;
    const detect = contactDetectRadius();
    const gap = (detect - stop) * 0.5;
    const actor = spawnActor(mockTexture(), 0.5, 1.0 - stop - gap, {
      speed: 0,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true
    });

    tickActor(actor, 1, target, world);

    expect(distanceBetween(actor, target)).toBeGreaterThan(stop);
    expect(distanceBetween(actor, target)).toBeLessThanOrEqual(detect);
    expect(actor.get(ContactSensor)!.inContact).toBe(true);
  });

  it('reports proximity via ContactSensor.isNear', () => {
    const actor = spawnActor(mockTexture(), 1, 1, {
      speed: 1,
      sightRange: 10,
      proximityRadius: 2,
      chaseOnSight: false
    });
    const sensor = actor.get(ContactSensor)!;

    expect(sensor.isNear({ x: 2, y: 1.5 })).toBe(true);
    expect(sensor.isNear({ x: 5, y: 5 })).toBe(false);
  });

  it('advances animation time while moving', () => {
    const world = new TestWorld([
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const actor = spawnActor(mockTexture(), 0.5, 0.5, {
      speed: 2,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true
    });

    tickActor(actor, 0.5, { x: 3.5, y: 0.5 }, world);

    expect(actor.get(Renderable)!.animationTime).toBe(0.5);
  });

  it('scales animation time by animationSpeed', () => {
    const world = new TestWorld([
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const actor = spawnActor(mockTexture(), 0.5, 0.5, {
      speed: 2,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: true,
      animationSpeed: 2
    });

    tickActor(actor, 0.5, { x: 3.5, y: 0.5 }, world);

    expect(actor.get(Renderable)!.animationTime).toBe(1);
  });

  it('advances animation time while idle when hover is configured', () => {
    const world = new TestWorld([
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY],
      [MAP_EMPTY, MAP_EMPTY, MAP_EMPTY, MAP_EMPTY]
    ]);
    const actor = spawnActor(mockTexture(), 0.5, 0.5, {
      speed: 2,
      sightRange: 10,
      proximityRadius: 1,
      chaseOnSight: false,
      hover: { frequency: 1, amplitude: 0.05 }
    });

    tickActor(actor, 0.5, { x: 3.5, y: 0.5 }, world);

    expect(actor.get(Renderable)!.animationTime).toBe(0.5);
  });
});
