import { Renderable } from './components/renderable';
import { Entity } from './entity';
import { Sprite } from './sprite';

/** Collects render views from entities that carry a Renderable component. */
export function spritesFromEntities(entities: Iterable<Entity>): Sprite[] {
  const sprites: Sprite[] = [];
  for (const entity of entities) {
    const renderable = entity.get(Renderable);
    if (renderable) sprites.push(renderable.view);
  }
  return sprites;
}
