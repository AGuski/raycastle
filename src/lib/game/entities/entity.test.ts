import { describe, expect, it, vi } from 'vitest';
import { Component, ComponentContext } from './component';
import { Entity } from './entity';
import { Renderable } from './components/renderable';
import { Strikeable } from './components/strikeable';
import { spawnStaticSprite } from './staticSprite';
import { spriteSheet } from '../spriteSheet';
import { MAP_EMPTY } from '../../types';
import { CONFIG } from '../../core/config';

function mockBitmap(width: number, height: number) {
  return {
    image: {} as HTMLImageElement,
    width,
    height
  };
}

class MockComponent implements Component {
  onAttach = vi.fn();
  update = vi.fn();
  dispose = vi.fn();
}

class FirstTickComponent implements Component {
  update(): void {
    tickOrder.push('first');
  }
}

class SecondTickComponent implements Component {
  update(): void {
    tickOrder.push('second');
  }
}

const tickOrder: string[] = [];

const ctx: ComponentContext = {
  dt: 0.016,
  time: 1,
  world: {
    getBlock: () => MAP_EMPTY,
    isOpen: () => true
  },
  player: {
    x: 0,
    y: 0,
    direction: 0,
    sheathed: false,
    swingProgress: 0,
    swingId: 0
  }
};

describe('Entity', () => {
  it('adds, looks up, and checks components by type', () => {
    const entity = new Entity(1, 2);
    const component = new MockComponent();
    entity.add(component);

    expect(entity.has(MockComponent)).toBe(true);
    expect(entity.get(MockComponent)).toBe(component);
    expect(component.onAttach).toHaveBeenCalledWith(entity);
  });

  it('ticks components in insertion order', () => {
    tickOrder.length = 0;
    const entity = new Entity(0, 0)
      .add(new FirstTickComponent())
      .add(new SecondTickComponent());

    entity.update(ctx);

    expect(tickOrder).toEqual(['first', 'second']);
  });

  it('forwards update and dispose to attached components', () => {
    const entity = new Entity(0, 0);
    const component = new MockComponent();
    entity.add(component);

    entity.update(ctx);
    entity.dispose();

    expect(component.update).toHaveBeenCalledWith(ctx);
    expect(component.dispose).toHaveBeenCalled();
  });
});

describe('Renderable', () => {
  it('exposes a Sprite view tied to entity position', () => {
    const texture = spriteSheet(mockBitmap(64, 64));
    const entity = new Entity(3, 4).add(new Renderable(texture));
    const renderable = entity.get(Renderable)!;
    const view = renderable.view;

    expect(view.x).toBe(3);
    expect(view.y).toBe(4);
    expect(view.texture).toBe(texture);
    expect(view.getHitFlash?.(0)).toBe(0);

    entity.x = 5;
    entity.y = 6;
    expect(view.x).toBe(5);
    expect(view.y).toBe(6);
  });

  it('reads hit flash from a sibling Strikeable component', () => {
    const texture = spriteSheet(mockBitmap(64, 64));
    const entity = new Entity(0, 0)
      .add(new Renderable(texture))
      .add(new Strikeable());
    const strikeable = entity.get(Strikeable)!;
    const view = entity.get(Renderable)!.view;

    strikeable.markHit(1, 5);
    expect(view.getHitFlash?.(5)).toBeGreaterThan(0);
    expect(view.getHitFlash?.(5 + CONFIG.weapon.strike.hitFlashDuration)).toBe(0);
  });
});

describe('spawnStaticSprite', () => {
  it('creates an entity with a render view at the given position', () => {
    const texture = spriteSheet(mockBitmap(64, 64));
    const entity = spawnStaticSprite(texture, 2, 3);
    const view = entity.get(Renderable)!.view;

    expect(view.x).toBe(2);
    expect(view.y).toBe(3);
    expect(view.texture).toBe(texture);
  });
});
