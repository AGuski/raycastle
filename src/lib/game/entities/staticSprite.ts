import { SpriteSheet } from '../spriteSheet';
import { Renderable } from './components/renderable';
import { Entity } from './entity';

/** Static world prop composed from position and a render view only. */
export function spawnStaticSprite(
  texture: SpriteSheet,
  x: number,
  y: number
): Entity {
  return new Entity(x, y).add(new Renderable(texture));
}
